import { Database } from "../base/database";
import gql from "graphql-tag";
import { buildSchema } from "../base/schema";

const DEFINITIONS = gql`
  type Pokemon {
    id: ID @key
    name: String
    sprites: Object
    types: [Type]
  }

  type Type {
    name: String @key
  }

  type Query {
    getAllPokemon: [Pokemon]
    getPokemon(id: ID): Pokemon
  }
`;

const Query = gql`
  query GetPokemon($id: ID!) {
    getPokemon(id: $id) {
      id
      name
      sprites
      types {
        name
      }
    }
  }
`;

const Schema = buildSchema(DEFINITIONS);

export const db = new Database("Pokemon", 7, Schema);

// entity / attribute / value / tx
// attribute / entity / value / tx
// attribute / value / entity / tx
// value / attribute / entity / tx
