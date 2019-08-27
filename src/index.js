import { h, render, update, Component } from "preact";
import { Client } from "./ui/client";
import "./ui/style.css";

const client = new Client(new Worker("./domain/pokemon.js"));

class Pokedex extends Component {
  constructor(props) {
    super(props);

    this.state = {
      pokemon: []
    };
  }

  componentDidMount() {
    client.request("getAllPokemon").subscribe(pokemon => {
      this.setState({ pokemon });
    });
  }

  render(_, { pokemon }) {
    return (
      <ul>
        {pokemon.map(monster => {
          const src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${monster.id +
            1}.png`;

          return (
            <li key={monster.id} class="Entry">
              <figure>
                <img src={src} width="96" height="96" />
                <figcaption>{monster.name}</figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
    );
  }
}

render(<Pokedex />, document.getElementById("app"));
