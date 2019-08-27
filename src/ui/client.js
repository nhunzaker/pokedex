import Observable from "zen-observable";

let requestId = Number.MIN_SAFE_INTEGER;

function provisionId() {
  if (requestId >= Number.MAX_SAFE_INTEGER) {
    requestId = Number.MIN_SAFE_INTEGER;
  } else {
    requestId += 1;
  }

  return requestId;
}

export class Client {
  constructor(worker) {
    this.worker = worker;
  }

  request(type, payload) {
    let id = provisionId();

    return new Observable(observer => {
      function listener(event) {
        if (event.data.id !== id) {
          return;
        }

        switch (event.data.status) {
          case "next":
            observer.next(event.data.payload);
            break;
          case "complete":
            observer.complete();
            break;
          case "error":
            observer.error(event.data.payload);
            break;
        }
      }

      this.worker.addEventListener("message", listener);

      this.worker.postMessage({ id, type, payload: payload });

      return () => {
        this.worker.removeEventListener("message", listener);
        this.worker.postMessage({ id, type: "__unsubscribe" });
      };
    });
  }
}
