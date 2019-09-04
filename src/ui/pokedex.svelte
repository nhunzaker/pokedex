<script>
  import { client } from "../data/client";
  import { observe } from "svelte-observable";
  import Sidebar from "./sidebar.svelte";

  let selection = null;
  let pokemon = observe(client.pokemon("getAllPokemon"));

  function onSelect(id) {
    selection = id;
  }
</script>

<style>
  .Layout {
    display: flex;
    height: 100%;
  }

  .LayoutBody {
    flex: 1 1;
    overflow: auto;
  }

  .LayoutSidebar table {
    margin-top: 24px;
    width: 100%;
  }

  .EntryList {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    margin: 0;
    padding: 24px;
  }

  .Entry {
    margin: 0;
    padding: 0;
    list-style: none;
    will-change: all;
  }

  .Entry img {
    display: block;
  }

  .Entry button {
    border-radius: 4px;
    border: 1px solid rgba(0, 0, 0, 0.3);
    margin: 4px;
    padding: 12px;
    position: relative;
    overflow: hidden;
  }

  .EntryName {
    text-align: center;
    font-weight: bold;
  }
</style>

<div class="Layout">
  <main class="LayoutBody">
    {#await $pokemon}

    {:then pokemon}
      <ul class="EntryList">
        {#each pokemon as monster}
          <li class="Entry">
            <button type="button" on:click={() => onSelect(monster.id)}>
              <img
                alt={`${monster.name} sprite`}
                src={monster.sprites.front_default}
                loading="lazy"
                width="96"
                height="96"
              />
              <span class="EntryName">{monster.name}</span>
            </button>
          </li>
        {/each}
      </ul>
    {:catch error}
      Unable to retrieve pokemon
    {/await}
  </main>

  {#if selection != null}
    <Sidebar id={selection} />
  {/if}
</div>