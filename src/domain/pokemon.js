import { getAll, find, write } from "../data/database";
import { listen } from "./dispatcher";
import { getGenerationOne } from "../data/pokedex";

async function fetchPokemon() {
  let pokemon = await getGenerationOne();

  write("pokemon", pokemon);
}

function getAllPokemon() {
  fetchPokemon();

  return getAll("pokemon");
}

function getPokemon({ id }) {
  return find("pokemon", id);
}

listen(self, { getAllPokemon, getPokemon });
