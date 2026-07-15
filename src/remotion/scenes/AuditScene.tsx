import { productFilmSteps } from "../data/demo-data";
import { FilmScene } from "./FilmScene";

export function AuditScene() {
  return <FilmScene step={productFilmSteps[5]} index={5} />;
}
