import { createClient } from "../base/client";

export const client = {
  pokemon: createClient(new Worker("../domain/pokemon.js"))
};
