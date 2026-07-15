import { productFilmSteps } from "../data/demo-data";
import { FilmScene } from "./FilmScene";

export function RiskScoringScene() {
  return <FilmScene step={productFilmSteps[2]} index={2} />;
}
