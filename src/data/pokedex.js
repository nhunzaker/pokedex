/**
 * Pokemon API:
 * https://pokeapi.co/
 */

import { http } from "../base/http";

const STATIC_URL = "https://raw.githubusercontent.com/PokeAPI";
const API_URL = "https://pokeapi.co/api/v2";

export async function fetchGenerationOne() {
  const { results } = await http(`${API_URL}/pokemon?offset=0&limit=151`);

  return results.map((pokemon, i) => {
    const id = i + 1;

    return {
      id,
      name: pokemon.name,
      sprites: {
        front_default: sprite(id)
      }
    };
  });
}

export async function fetchPokemon(id) {
  const monster = await http(`${API_URL}/pokemon/${id}`);

  return {
    id: monster.id,
    name: monster.name,
    sprites: monster.sprites,
    types: monster.types.map(t => t.type)
  };
}

function sprite(id) {
  return `${STATIC_URL}/sprites/master/sprites/pokemon/${id}.png`;
}
