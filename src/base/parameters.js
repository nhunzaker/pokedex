export function parameterize(payload) {
  if (Array.isArray(payload) || typeof payload != "object") {
    return payload == null ? "" : `${payload}`;
  }

  const params = new URLSearchParams();

  for (let key in payload) {
    params.set(key, payload[key]);
  }

  return params.toString();
}

export function getDispatchId(type, payload) {
  return `${type}?${parameterize(payload)}`;
}
