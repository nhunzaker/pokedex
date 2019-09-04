export function serializeError(subject) {
  return {
    name: subject.name,
    message: subject.message,
    stack: subject.stack
  };
}

export function deserializeError({ name, message, stack }) {
  const error = new Error(message);

  error.name = name;
  error.stack = stack;

  return error;
}
