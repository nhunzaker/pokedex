import { Observable } from "./observable";
import PushStream from "./push-stream";

function getItem(store, key, callback) {
  const job = store.get(key);

  job.onsuccess = event => {
    callback(event.target.result);
  };

  job.onerror = event => {
    throw event.target.error;
  };
}

function wrap(operation, observer) {
  operation.onerror = event => {
    observer.error(event.target.error);
  };

  operation.onsuccess = event => {
    observer.next(event.target.result);
  };
}

function inflate(db, schema) {
  for (let type in schema) {
    const { key } = schema[type];

    if (type === "Query" || type === "Mutation") {
      continue;
    }

    if (db.objectStoreNames.contains(type)) {
      db.deleteObjectStore(type);
    }

    db.createObjectStore(type, {
      keyPath: key
    });
  }
}

function maybeMerge(a, b) {
  if (a == null) {
    return b;
  }

  let copy = a;

  for (let prop in b) {
    if (copy[prop] != b[prop]) {
      if (copy === a) {
        copy = { ...copy };
      }
      copy[prop] = b[prop];
    }
  }

  return copy;
}

export class Database {
  constructor(name, version, schema) {
    let db = null;

    this.schema = schema;
    this.changes = new PushStream();

    this.connection = new Observable(observer => {
      if (db) {
        observer.next(db);
        return;
      }

      const request = indexedDB.open(name, version);

      request.onerror = error => {
        observer.error(error);
      };

      request.onupgradeneeded = event => {
        inflate(event.target.result, schema);
      };

      request.onsuccess = event => {
        db = event.target.result;
        observer.next(event.target.result);
      };

      return () => {
        if (db) {
          db.close();
          db = null;
        }
      };
    });
  }

  connect(callback) {
    return this.connection.flatMap(db => {
      return new Observable(callback.bind(null, db));
    });
  }

  watch(key, callback) {
    function check(diff) {
      if (diff.has(key)) {
        callback();
      }
    }

    return this.changes.subscribe(check);
  }

  update(storeName, records) {
    let type = this.schema[storeName];

    records = [].concat(records);

    return this.connection.subscribe(db => {
      const changeset = new Set();
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      records.forEach(item => {
        const key = item[store.keyPath];

        getItem(store, key, data => {
          let next = data || {};
          let didChange = false;

          for (let key in type.fields) {
            if (key in item === false) {
              continue;
            }

            let dataType = type.fields[key].type;
            let lastValue = data ? data[key] : undefined;
            let nextValue = item[key];

            if (dataType in this.schema) {
              this.update(dataType, nextValue);

              let subDefinition = this.schema[dataType];

              if (type.fields[key].isList) {
                nextValue = nextValue.map(item => item[subDefinition.key]);
              } else {
                nextValue = nextValue[subDefinition.key];
              }
            }

            if (dataType === "Object") {
              nextValue = maybeMerge(lastValue, nextValue);
            }

            if (nextValue !== next[key]) {
              if (didChange === false) {
                next = { ...next };
                didChange = true;
              }

              next[key] = nextValue;
            }
          }

          if (didChange) {
            store.put(next);
            changeset.add(`${storeName}`);
            changeset.add(`${storeName}-${key}`);
          }
        });
      });

      transaction.oncomplete = () => {
        this.changes.next(changeset);
      };

      transaction.onerror = event => {
        throw event.target.error;
      };
    });
  }

  getAll(storeName) {
    return this.connect((db, observer) => {
      function query() {
        const operation = db
          .transaction(storeName, "readonly")
          .objectStore(storeName)
          .getAll();

        wrap(operation, observer);
      }

      query();

      return this.watch(storeName, query);
    });
  }

  find(storeName, key) {
    return this.connect((db, observer) => {
      function query() {
        const job = db
          .transaction(storeName, "readonly")
          .objectStore(storeName)
          .get(key);

        return wrap(job, observer);
      }

      query();

      return this.watch(`${storeName}-${key}`, query);
    });
  }
}
