/**
 * Stringifying JSON is apparently faster
 * https://nolanlawson.com/2016/02/29/high-performance-web-worker-messages/
 *
 * @todo Is stringifying still faster?
 */

export function send(worker, data) {
  worker.postMessage(JSON.stringify(data));
}

export function receive(callback) {
  return event => {
    try {
      callback(JSON.parse(event.data));
    } catch (error) {
      console.error("Unable to parse data: ", event.data);
    }
  };
}
