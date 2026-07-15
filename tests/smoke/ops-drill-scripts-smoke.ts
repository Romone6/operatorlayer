import { spawnSync } from "node:child_process";
import { join } from "node:path";

function runScript(scriptName: string) {
  const scriptPath = join(process.cwd(), "scripts", scriptName);
  const result = spawnSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, "-DryRun"],
    {
      encoding: "utf8",
    }
  );

  if (result.status !== 0) {
    throw new Error(
      `${scriptName} failed (exit ${result.status ?? "unknown"}):\n${result.stdout}\n${result.stderr}`
    );
  }

  const output = `${result.stdout}\n${result.stderr}`;
  if (!output.includes("DRY-RUN mode enabled")) {
    throw new Error(`${scriptName} did not report DRY-RUN mode.`);
  }
}

function main() {
  runScript("ops-backup-restore-drill.ps1");
  runScript("ops-queue-replay-drill.ps1");
  runScript("ops-provider-outage-drill.ps1");
  console.log("ops-drill-scripts-smoke:ok");
}

main();
