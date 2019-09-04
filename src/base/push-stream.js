import { Observable } from "./observable";

function send(p, message, value) {
  if (p._observer) {
    sendMessage(p._observer, message, value);
  } else if (p._observers) {
    var list = [];
    p._observers.forEach(function(to) {
      list.push(to);
    });
    list.forEach(function(to) {
      sendMessage(to, message, value);
    });
  }
}

function sendMessage(observer, message, value) {
  if (observer.closed) {
    return;
  }
  switch (message) {
    case "next":
      return observer.next(value);
    case "error":
      return observer.error(value);
    case "complete":
      return observer.complete();
  }
}

function hasObserver(p) {
  return p._observer || (p._observers && p._observers.size > 0);
}

function addObserver(p, observer) {
  if (p._observers) {
    p._observers.add(observer);
  } else if (!p._observer) {
    p._observer = observer;
  } else {
    p._observers = new Set();
    p._observers.add(p._observer);
    p._observers.add(observer);
    p._observer = null;
  }
}

function deleteObserver(p, observer) {
  if (p._observers) {
    p._observers.delete(observer);
  } else if (p._observer === observer) {
    p._observer = null;
  }
}

function notifyStart(stream, p, opts) {
  !hasObserver(p) && opts && opts.start && opts.start.call(stream);
}

function notifyPause(stream, p, opts) {
  !hasObserver(p) && opts && opts.pause && opts.pause.call(stream);
}

export default class PushStream {
  constructor(opts) {
    var p = this;

    this._active = false;
    this._lastValue = undefined;

    this._observer = null;
    this._observers = null;
    this._observable = new Observable(observer => {
      notifyStart(this, p, opts);
      addObserver(p, observer);

      return () => {
        this._lastValue = undefined;
        this._active = false;
        deleteObserver(p, observer);
        notifyPause(this, p, opts);
      };
    });
  }

  get observable() {
    return this._observable;
  }

  get observed() {
    return hasObserver(this);
  }

  next(x) {
    this._lastValue = x;
    this._active = true;
    send(this, "next", x);
  }

  error(e) {
    send(this, "error", e);
  }

  complete() {
    send(this, "complete");
  }

  subscribe(callback) {
    if (this._active) {
      if (typeof callback === "function") {
        callback(this._lastValue);
      } else if (
        typeof callback === "object" &&
        typeof callback.next === "function"
      ) {
        callback.next(this._lastValue);
      }
    }

    return this.observable.subscribe.apply(this.observable, arguments);
  }

  flatMap() {
    return this.observable.flatMap.apply(this.observable, arguments);
  }

  map() {
    return this.observable.flatMap.apply(this.observable, arguments);
  }
}
