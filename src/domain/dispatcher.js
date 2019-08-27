import Observable from "zen-observable";
import { write } from "../data/database";

const pool = new Map();

function buildKeys(payload) {
  if (Array.isArray(payload) || typeof payload != "object") {
    return payload == null ? "" : `${payload}`;
  }

  const keys = Object.keys(payload).sort();

  return keys.reduce((memo, key, i) => {
    return `${i === 0 ? "?" : "&"}${memo}${key}=${payload[key]}`;
  }, "");
}

function parseError(subject) {
  if (subject instanceof DOMException) {
    return subject.message;
  } else if (subject instanceof Error) {
    return subject.message;
  }

  return subject.target.error.message;
}

async function dispatch(worker, method, { id, type, payload }) {
  const result = await method.call(worker, payload);
  const key = `${type}(${buildKeys(payload)})`;

  if (result instanceof Observable === false) {
    worker.postMessage({ id, payload: result, status: "next" });
    worker.postMessage({ id, payload: null, status: "complete" });

    return;
  }

  const subscription = result.subscribe({
    next: payload => {
      write("dispatches", [{ type, time: Date.now() }]);
      worker.postMessage({ id, payload, status: "next" });
    },
    error: event => {
      worker.postMessage({ id, payload: parseError(event), status: "error" });
    },
    complete: () => {
      worker.postMessage({ id, payload: null, status: "complete" });
    }
  });

  pool.set(id, subscription);
}

export function listen(worker, methods) {
  worker.addEventListener("message", event => {
    const { type, id } = event.data;

    if (type === "__unsubscribe") {
      if (pool.has(id)) {
        pool.get(id).unsubscribe();
        pool.delete(id);
      }
    } else {
      const method = methods[event.data.type];
      dispatch(worker, method, event.data);
    }
  });
}
