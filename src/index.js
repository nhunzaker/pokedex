import { h, render } from "preact";
import { Pokedex } from "./ui/pokedex";

render(<Pokedex />, document.getElementById("app"));

if ("serviceWorker" in navigator) {
  if (process.env.NODE_ENV === "production") {
    navigator.serviceWorker.register(
      // Gets around issue with parcel compiling the service-worker script
      // that is generated during the build
      window.location.origin + "/service-worker.js"
    );
  }
}
