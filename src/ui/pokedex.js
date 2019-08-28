import { h, Component } from "preact";
import { createClient } from "../base/client";
import "./style.css";

const pokemonClient = createClient(new Worker("../domain/pokemon.js"));

export class Pokedex extends Component {
  constructor(props) {
    super(props);

    this.state = {
      pokemon: []
    };
  }

  componentDidMount() {
    pokemonClient("getAllPokemon").subscribe(pokemon => {
      this.setState({ pokemon });
    });
  }

  render(_, { pokemon }) {
    return (
      <div class="Layout">
        <main class="LayoutBody">
          <ul className="EntryList">
            {pokemon.map(monster => {
              const src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${monster.id +
                1}.png`;

              return (
                <li key={monster.id} class="Entry">
                  <figure>
                    <img
                      alt={`${monster.name} sprite`}
                      src={src}
                      loading="lazy"
                      width="96"
                      height="96"
                    />
                    <figcaption>{monster.name}</figcaption>
                  </figure>
                </li>
              );
            })}
          </ul>
        </main>
        <aside class="LayoutSidebar">
          <header>Sidebar</header>
        </aside>
      </div>
    );
  }
}
