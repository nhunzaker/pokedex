import { db } from "../data/database";
import { listen } from "../base/dispatcher";
import { fetchGenerationOne, fetchPokemon } from "../data/pokedex";

export function getAllPokemon() {
  fetchGenerationOne().then(data => {
    db.update("Pokemon", data);
  });

  return db.getAll("Pokemon");
}

export function getPokemon({ id }) {
  fetchPokemon(id).then(data => {
    db.update("Pokemon", [data]);
  });

  return db.find("Pokemon", id);
}

listen(self, { getAllPokemon, getPokemon });
