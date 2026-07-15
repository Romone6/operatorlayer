import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("marketing homepage product-demo contract", () => {
  it("keeps the Remotion source, scripts, and rendered media paths aligned", async () => {
    const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as { scripts: Record<string, string> };

    expect(packageJson.scripts["remotion:studio"]).toBe("remotion studio src/remotion/Root.tsx");
    expect(packageJson.scripts["remotion:render"]).toContain("OperantProductDemo");
    expect(packageJson.scripts["remotion:render"]).toContain("public/media/operant-product-demo.mp4");
    expect(packageJson.scripts["remotion:still"]).toContain("public/media/operant-product-demo-poster.png");

    for (const file of [
      "src/remotion/Root.tsx",
      "src/remotion/OperantProductDemo.tsx",
      "src/remotion/scenes/DraftScene.tsx",
      "src/remotion/scenes/PolicyEvidenceScene.tsx",
      "src/remotion/scenes/RiskScoringScene.tsx",
      "src/remotion/scenes/ReviewRepairScene.tsx",
      "src/remotion/scenes/AuditScene.tsx",
      "src/remotion/data/demo-data.ts",
      "public/media/operant-product-demo.mp4",
      "public/media/operant-product-demo-poster.png",
    ]) {
      expect(existsSync(join(root, file)), file).toBe(true);
    }
  });
});
