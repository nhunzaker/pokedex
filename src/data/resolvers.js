import { db } from "../data/database";
import { fetchGenerationOne, fetchPokemon } from "../data/pokedex";

export const resolvers = {
  getAllPokemon() {
    fetchGenerationOne().then(data => {
      db.update("Pokemon", data);
    });

    db.getAll("Pokemon");
  },
  getPokemon({ id }) {
    fetchPokemon(id).then(data => {
      db.update("Pokemon", [data]);
    });

    db.find("Pokemon", id);
  }
};
