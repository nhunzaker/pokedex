import { getAll, find, write } from "../base/database";
import { listen } from "../base/dispatcher";
import { getGenerationOne } from "../data/pokedex";

async function fetchPokemon() {
  let pokemon = await getGenerationOne();

  return write("pokemon", pokemon);
}

function getAllPokemon() {
  fetchPokemon();

  return getAll("pokemon");
}

function getPokemon({ id }) {
  return find("pokemon", id);
}

listen(self, { getAllPokemon, getPokemon });
