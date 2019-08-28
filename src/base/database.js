import Observable from "zen-observable";
import PushStream from "./push-stream";

const DATABASE = "MyTestDatabase";
const VERSION = 1;

const changes = new PushStream();

let db = null;
const connection = new Observable(observer => {
  if (db) {
    return observer.next(db);
  }

  const request = indexedDB.open(DATABASE, VERSION);

  request.onerror = error => {
    observer.error(error);
  };

  request.onupgradeneeded = function(event) {
    db = event.target.result;

    const pokemon = db.createObjectStore("pokemon", { keyPath: "id" });
    pokemon.createIndex("id", "id", { unique: true });
  };

  request.onsuccess = function(event) {
    db = event.target.result;
    observer.next(event.target.result);
  };
});

function connect(callback) {
  return connection.flatMap(db => {
    return new Observable(callback.bind(null, db));
  });
}

function watch(key, callback) {
  function check(diff) {
    if (diff.has(key)) {
      callback();
    }
  }

  return changes.observable.subscribe(check);
}

export function write(storeName, records) {
  connection.subscribe(db => {
    const changeset = new Set();
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);

    records.forEach(item => {
      store.put(item);

      changeset.add(`${storeName}`);
      changeset.add(`${storeName}-${item[store.keyPath]}`);
    });

    transaction.oncomplete = () => {
      changes.next(changeset);
    };

    transaction.onerror = error => {
      throw error;
    };
  });
}

function accumulate(store, observer) {
  const job = store.openCursor();
  const items = [];

  job.onsuccess = function(event) {
    const cursor = event.target.result;

    if (cursor) {
      items.push(cursor.value);
      cursor.continue();
    } else {
      observer.next(items);
    }
  };

  job.onerror = error => observer.error(error);
}

export function getAll(storeName) {
  return connect((db, observer) => {
    function query() {
      const store = db
        .transaction(storeName, "readonly")
        .objectStore(storeName);

      accumulate(store, observer);
    }

    query();

    return watch(storeName, query);
  });
}

export function find(storeName, key) {
  return connect((db, observer) => {
    const store = db.transaction(storeName, "readonly").objectStore(storeName);

    function query() {
      const job = store.get(key);

      job.onsuccess = function(event) {
        observer.next(event.target.result);
      };

      job.onerror = error => {
        observer.error(error);
      };
    }

    return watch(`${storeName}-${key}`, query);
  });
}

export function findOnce(storeName, key, fallback) {
  return new Promise((resolve, reject) => {
    const observable = connect((db, observer) => {
      const job = db
        .transaction(storeName, "readonly")
        .objectStore(storeName)
        .get(key);

      job.onsuccess = function(event) {
        observer.next(event.target.result || fallback);
        observer.complete();
      };

      job.onerror = error => {
        observer.error(error);
      };
    });

    observable.subscribe({
      next: resolve,
      error: reject
    });
  });
}
