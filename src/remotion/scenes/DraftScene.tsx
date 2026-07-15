import { productFilmSteps } from "../data/demo-data";
import { FilmScene } from "./FilmScene";

export function DraftScene() {
  return <FilmScene step={productFilmSteps[0]} index={0} />;
}
