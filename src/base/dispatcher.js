import { getDispatchId } from "./parameters";
import { serializeError } from "./errors";
import { receive, send } from "./messaging";

const pool = new Map();

function dispatch(worker, method, { id, type, payload }) {
  const key = getDispatchId(type, payload);

  const result = method.call(worker, payload);

  const subscription = result.subscribe({
    next: payload => {
      send(worker, { id, payload, status: "next" });
    },
    error: event => {
      send(worker, {
        id,
        payload: serializeError(event),
        status: "error"
      });
    },
    complete: () => {
      send(worker, { id, payload: null, status: "complete" });
    }
  });

  pool.set(key, subscription);
}

export function listen(worker, methods) {
  const onMessage = receive(data => {
    const { type, id } = data;

    if (type === "__unsubscribe" && pool.has(id)) {
      pool.get(id).unsubscribe();
      pool.delete(id);
    } else {
      dispatch(worker, methods[type], data);
    }
  });

  worker.addEventListener("message", onMessage);
}
