import { Observable } from "./observable";
import { getDispatchId } from "./parameters";
import { deserializeError } from "./errors";
import { send, receive } from "./messaging";

const cache = new Map();

export function createClient(worker) {
  return function request(type, payload) {
    let id = getDispatchId(type, payload);

    if (cache.has(id)) {
      return cache.get(id);
    }

    const message = { id, type, payload };

    const job = new Observable(observer => {
      const listener = receive(data => {
        if (data.id !== id) {
          return;
        }

        switch (data.status) {
          case "next":
            observer.next(data.payload);
            break;
          case "complete":
            cache.delete(id);
            observer.complete();
            break;
          case "error":
            observer.error(deserializeError(data.payload));
            break;
        }
      });

      worker.addEventListener("message", listener);

      send(worker, message);

      return () => {
        worker.removeEventListener("message", listener);
        send(worker, { id, type: "__unsubscribe" });
      };
    });

    cache.set(id, job);

    return job;
  };
}
