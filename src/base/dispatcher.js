import { getDispatchId } from "./parameters";

const pool = new Map();

function parseError(subject) {
  if (subject instanceof DOMException) {
    return subject.message;
  } else if (subject instanceof Error) {
    return subject.message;
  }

  return subject.target.error.message;
}

function dispatch(worker, method, { id, type, payload }) {
  const key = getDispatchId(type, payload);

  const result = method.call(worker, payload);

  const subscription = result.subscribe({
    next: payload => {
      worker.postMessage({ id, payload, status: "next" });
    },
    error: event => {
      worker.postMessage({ id, payload: parseError(event), status: "error" });
    },
    complete: () => {
      worker.postMessage({ id, payload: null, status: "complete" });
    }
  });

  pool.set(key, subscription);
}

export function listen(worker, methods, options = {}) {
  worker.addEventListener("message", event => {
    const { type, id } = event.data;

    if (type === "__unsubscribe") {
      if (pool.has(id)) {
        pool.get(id).unsubscribe();
        pool.delete(id);
      }
    } else {
      const method = methods[event.data.type];
      dispatch(worker, method, event.data, options);
    }
  });
}
