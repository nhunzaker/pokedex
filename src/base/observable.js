// Adopted from Zen Observable:
// https://github.com/zenparsing/zen-observable

const hasSymbols = () => typeof Symbol === "function";
const hasSymbol = name => hasSymbols() && Boolean(Symbol[name]);
const getSymbol = name => (hasSymbol(name) ? Symbol[name] : "@@" + name);

if (hasSymbols() && !hasSymbol("observable")) {
  Symbol.observable = Symbol("observable");
}

const SymbolIterator = getSymbol("iterator");
const SymbolObservable = getSymbol("observable");
const SymbolSpecies = getSymbol("species");

// === Abstract Operations ===

function getMethod(obj, key) {
  let value = obj[key];

  if (value == null) return undefined;

  if (typeof value !== "function")
    throw new TypeError(value + " is not a function");

  return value;
}

function getSpecies(obj) {
  let ctor = obj.constructor;
  if (ctor !== undefined) {
    ctor = ctor[SymbolSpecies];
    if (ctor === null) {
      ctor = undefined;
    }
  }
  return ctor !== undefined ? ctor : Observable;
}

function isObservable(x) {
  return x instanceof Observable; // SPEC: Brand check
}

function hostReportError(e) {
  if (hostReportError.log) {
    hostReportError.log(e);
  } else {
    setTimeout(() => {
      throw e;
    });
  }
}

function enqueue(fn) {
  try {
    fn();
  } catch (error) {
    hostReportError(error);
  }
}

function cleanupSubscription(subscription) {
  let cleanup = subscription._cleanup;
  if (cleanup === undefined) return;

  subscription._cleanup = undefined;

  if (!cleanup) {
    return;
  }

  try {
    if (typeof cleanup === "function") {
      cleanup();
    } else {
      let unsubscribe = getMethod(cleanup, "unsubscribe");
      if (unsubscribe) {
        unsubscribe.call(cleanup);
      }
    }
  } catch (e) {
    hostReportError(e);
  }
}

function closeSubscription(subscription) {
  subscription._observer = undefined;
  subscription._queue = undefined;
  subscription._state = "closed";
}

function flushSubscription(subscription) {
  let queue = subscription._queue;
  if (!queue) {
    return;
  }
  subscription._queue = undefined;
  subscription._state = "ready";
  for (let i = 0; i < queue.length; ++i) {
    notifySubscription(subscription, queue[i].type, queue[i].value);
    if (subscription._state === "closed") break;
  }
}

function notifySubscription(subscription, type, value) {
  subscription._state = "running";

  let observer = subscription._observer;

  try {
    let m = getMethod(observer, type);
    switch (type) {
      case "next":
        if (m) m.call(observer, value);
        break;
      case "error":
        closeSubscription(subscription);
        if (m) m.call(observer, value);
        else throw value;
        break;
      case "complete":
        closeSubscription(subscription);
        if (m) m.call(observer);
        break;
    }
  } catch (e) {
    hostReportError(e);
  }

  if (subscription._state === "closed") cleanupSubscription(subscription);
  else if (subscription._state === "running") subscription._state = "ready";
}

function onNotify(subscription, type, value) {
  if (subscription._state === "closed") return;

  if (subscription._state === "buffering") {
    subscription._queue.push({ type, value });
    return;
  }

  if (subscription._state !== "ready") {
    subscription._state = "buffering";
    subscription._queue = [{ type, value }];
    enqueue(() => flushSubscription(subscription));
    return;
  }

  notifySubscription(subscription, type, value);
}

class Subscription {
  constructor(observer, subscriber) {
    // ASSERT: observer is an object
    // ASSERT: subscriber is callable

    this._cleanup = undefined;
    this._observer = observer;
    this._queue = undefined;
    this._state = "initializing";

    let subscriptionObserver = new SubscriptionObserver(this);

    try {
      this._cleanup = subscriber.call(undefined, subscriptionObserver);
    } catch (e) {
      subscriptionObserver.error(e);
    }

    if (this._state === "initializing") this._state = "ready";
  }

  get closed() {
    return this._state === "closed";
  }

  unsubscribe() {
    if (this._state !== "closed") {
      closeSubscription(this);
      cleanupSubscription(this);
    }
  }
}

class SubscriptionObserver {
  constructor(subscription) {
    this._subscription = subscription;
  }
  get closed() {
    return this._subscription._state === "closed";
  }
  next(value) {
    onNotify(this._subscription, "next", value);
  }
  error(value) {
    onNotify(this._subscription, "error", value);
  }
  complete() {
    onNotify(this._subscription, "complete");
  }
}

export class Observable {
  constructor(subscriber) {
    if (!(this instanceof Observable))
      throw new TypeError("Observable cannot be called as a function");

    if (typeof subscriber !== "function")
      throw new TypeError("Observable initializer must be a function");

    this._subscriber = subscriber;
  }

  subscribe(observer) {
    if (typeof observer !== "object" || observer === null) {
      observer = {
        next: observer,
        error: arguments[1],
        complete: arguments[2]
      };
    }
    return new Subscription(observer, this._subscriber);
  }

  map(fn) {
    if (typeof fn !== "function")
      throw new TypeError(fn + " is not a function");

    let C = getSpecies(this);

    return new C(observer =>
      this.subscribe({
        next(value) {
          try {
            value = fn(value);
          } catch (e) {
            return observer.error(e);
          }
          observer.next(value);
        },
        error(e) {
          observer.error(e);
        },
        complete() {
          observer.complete();
        }
      })
    );
  }

  flatMap(fn) {
    if (typeof fn !== "function")
      throw new TypeError(fn + " is not a function");

    let C = getSpecies(this);

    return new C(observer => {
      let subscriptions = [];

      let outer = this.subscribe({
        next(value) {
          if (fn) {
            try {
              value = fn(value);
            } catch (e) {
              return observer.error(e);
            }
          }

          let inner = C.from(value).subscribe({
            next(value) {
              observer.next(value);
            },
            error(e) {
              observer.error(e);
            },
            complete() {
              let i = subscriptions.indexOf(inner);
              if (i >= 0) subscriptions.splice(i, 1);
              completeIfDone();
            }
          });

          subscriptions.push(inner);
        },
        error(e) {
          observer.error(e);
        },
        complete() {
          completeIfDone();
        }
      });

      function completeIfDone() {
        if (outer.closed && subscriptions.length === 0) observer.complete();
      }

      return () => {
        subscriptions.forEach(s => s.unsubscribe());
        outer.unsubscribe();
      };
    });
  }

  [SymbolObservable]() {
    return this;
  }

  static from(x) {
    let C = typeof this === "function" ? this : Observable;

    if (x == null) throw new TypeError(x + " is not an object");

    let method = getMethod(x, SymbolObservable);
    if (method) {
      let observable = method.call(x);

      if (Object(observable) !== observable)
        throw new TypeError(observable + " is not an object");

      if (isObservable(observable) && observable.constructor === C)
        return observable;

      return new C(observer => observable.subscribe(observer));
    }

    if (hasSymbol("iterator")) {
      method = getMethod(x, SymbolIterator);
      if (method) {
        return new C(observer => {
          enqueue(() => {
            if (observer.closed) return;
            for (let item of method.call(x)) {
              observer.next(item);
              if (observer.closed) return;
            }
            observer.complete();
          });
        });
      }
    }

    if (Array.isArray(x)) {
      return new C(observer => {
        enqueue(() => {
          if (observer.closed) return;
          for (let i = 0; i < x.length; ++i) {
            observer.next(x[i]);
            if (observer.closed) return;
          }
          observer.complete();
        });
      });
    }

    throw new TypeError(x + " is not observable");
  }

  static of(...items) {
    let C = typeof this === "function" ? this : Observable;

    return new C(observer => {
      enqueue(() => {
        if (observer.closed) return;
        for (let i = 0; i < items.length; ++i) {
          observer.next(items[i]);
          if (observer.closed) return;
        }
        observer.complete();
      });
    });
  }

  static get [SymbolSpecies]() {
    return this;
  }
}

if (hasSymbols()) {
  Object.defineProperty(Observable, Symbol("extensions"), {
    value: {
      symbol: SymbolObservable,
      hostReportError
    },
    configurable: true
  });
}
