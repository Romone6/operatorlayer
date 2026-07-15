import { productFilmSteps } from "../data/demo-data";
import { FilmScene } from "./FilmScene";

export function ReviewRepairScene() {
  return <FilmScene step={productFilmSteps[4]} index={4} />;
}
