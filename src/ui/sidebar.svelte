<script>
  import { client } from "../data/client";
  import { flat, observe } from "svelte-observable";
  import { writable, derived } from "svelte/store";
  import PushStream from "../base/push-stream";
  import { onMount, beforeUpdate } from "svelte";

  export let id = 1;

  let store = writable(id);

  let activeId = new PushStream();

  beforeUpdate(() => {
    store.set(id);
  });

  let pokemon = flat(
    derived(store, id => client.pokemon("getPokemon", { id }))
  );
</script>

<style>
  .LayoutSidebar {
    background: #333;
    color: white;
    padding: 24px;
    flex: 0 0;
    overflow: auto;
    min-width: 320px;
  }
</style>

<aside class="LayoutSidebar">
  {#await $pokemon then pokemon}
    <h3>{pokemon.name}</h3>
    <pre>{JSON.stringify(pokemon, null, 2)}</pre>
  {/await}
</aside>
