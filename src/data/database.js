import mitt from "mitt";
import Observable from "zen-observable";

const DATABASE = "MyTestDatabase";
const VERSION = 1;

const changes = mitt();

const connection = new Observable(observer => {
  const request = indexedDB.open(DATABASE, VERSION);

  request.onerror = error => {
    observer.error(error);
  };

  request.onupgradeneeded = function(event) {
    const db = event.target.result;

    const pokemon = db.createObjectStore("pokemon", { keyPath: "id" });
    pokemon.createIndex("id", "id", { unique: true });

    const dispatches = db.createObjectStore("dispatches", { keyPath: "type" });
    dispatches.createIndex("type", "type", { unique: true });
  };

  request.onsuccess = function(event) {
    observer.next(event.target.result);
  };

  return () => db.close();
});

function get(store, key) {
  return new Promise((resolve, reject) => {
    const request = store.get(key);

    request.onerror = reject;

    request.onsuccess = function(event) {
      resolve(event.target.data);
    };
  });
}

export async function write(storeName, records) {
  return connection.forEach(db => {
    const changeset = new Set();

    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);

    records.forEach(async item => {
      store.put(item);

      changeset.add(`${storeName}`);
      changeset.add(`${storeName}-${item[store.keyPath]}`);
    });

    transaction.oncomplete = () => {
      changes.emit("change", changeset);
    };

    transaction.onerror = error => {
      throw error;
    };
  });
}

export async function getAll(storeName) {
  return connection.flatMap(db => {
    return new Observable(observer => {
      function query() {
        const store = db
          .transaction(storeName, "readonly")
          .objectStore(storeName);

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

        job.onerror = error => {
          observer.error(error);
        };
      }

      query();

      function check(diff) {
        if (diff.has(storeName)) {
          query();
        }
      }

      changes.on("change", check);

      return () => changes.off("change", check);
    });
  });
}

export async function find(storeName, key) {
  return connection.flatMap(db => {
    return new Observable(observer => {
      function query() {
        const store = db
          .transaction(storeName, "readonly")
          .objectStore(storeName);

        const job = store.get(key);

        job.onsuccess = function(event) {
          observer.next(event.target.result);
        };

        job.onerror = error => {
          observer.error(error);
        };
      }

      function check(diff) {
        if (diff.has(`${storeName}-${key}`)) {
          query();
        }
      }

      changes.on("change", check);

      return () => changes.off("change", check);
    });
  });
}
