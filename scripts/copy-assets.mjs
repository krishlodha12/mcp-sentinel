import { cpSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const srcPublic = join(root, "../src/web/public");
const distPublic = join(root, "../dist/web/public");

if (existsSync(srcPublic)) {
  mkdirSync(distPublic, { recursive: true });
  cpSync(srcPublic, distPublic, { recursive: true });
}
