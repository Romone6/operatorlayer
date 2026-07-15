import { productFilmSteps } from "../data/demo-data";
import { FilmScene } from "./FilmScene";

export function PolicyEvidenceScene() {
  return <FilmScene step={productFilmSteps[1]} index={1} />;
}
