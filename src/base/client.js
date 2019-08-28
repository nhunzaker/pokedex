import Observable from "zen-observable";
import { getDispatchId } from "./parameters";

const cache = new Map();

export function createClient(worker) {
  return function request(type, payload) {
    let id = getDispatchId(type, payload);

    if (cache.has(id)) {
      return cache.get(id);
    }

    const message = { id, type, payload };

    const job = new Observable(observer => {
      function listener(event) {
        if (event.data.id !== id) {
          return;
        }

        switch (event.data.status) {
          case "next":
            cache.delete(id);
            observer.next(event.data.payload);
            break;
          case "complete":
            cache.delete(id);
            observer.complete();
            break;
          case "error":
            observer.error(event.data.payload);
            break;
        }
      }

      worker.addEventListener("message", listener);
      worker.postMessage(message);

      return () => {
        worker.removeEventListener("message", listener);
        worker.postMessage({ id, type: "__unsubscribe" });
      };
    });

    cache.set(id, job);

    return job;
  };
}
