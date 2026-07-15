import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { productFilmSteps } from "./data/demo-data";
import { FilmScene } from "./scenes/FilmScene";

export function OperantProductDemo() {
  const { fps } = useVideoConfig();
  const sceneFrames = 5 * fps;
  return (
    <AbsoluteFill>
      {productFilmSteps.map((step, index) => (
        <Sequence key={step.id} from={index * sceneFrames} durationInFrames={sceneFrames} premountFor={fps}>
          <FilmScene step={step} index={index} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
