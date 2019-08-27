export async function getGenerationOne() {
  const response = await fetch(
    "https://pokeapi.co/api/v2/pokemon?offset=0&limit=151"
  );

  const { results } = await response.json();

  return results.map((pokemon, id) => ({ id, name: pokemon.name }));
}
