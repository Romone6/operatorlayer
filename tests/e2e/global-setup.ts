import fs from "node:fs";
import path from "node:path";

async function globalSetup() {
  const storePath = path.join(process.cwd(), ".operatorlayer-memory-store.json");
  if (fs.existsSync(storePath)) {
    fs.unlinkSync(storePath);
  }
}

export default globalSetup;
