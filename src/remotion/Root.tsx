import { Composition, registerRoot } from "remotion";
import { OperantProductDemo } from "./OperantProductDemo";

export function RemotionRoot() {
  return (
    <Composition
      id="OperantProductDemo"
      component={OperantProductDemo}
      durationInFrames={900}
      fps={30}
      width={1600}
      height={1000}
    />
  );
}

registerRoot(RemotionRoot);
