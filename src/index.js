import Pokedex from "./ui/pokedex.svelte";

new Pokedex({ target: document.body });

if ("serviceWorker" in navigator) {
  if (process.env.NODE_ENV === "production") {
    navigator.serviceWorker.register(
      // Gets around issue with parcel compiling the service-worker script
      // that is generated during the build
      window.location.origin + "/service-worker.js"
    );
  } else {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (let registration of registrations) {
        registration.unregister();
      }
    });
  }
}
