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

const srcCorpus = join(root, "../src/replay/corpus");
const distCorpus = join(root, "../dist/replay/corpus");
if (existsSync(srcCorpus)) {
  mkdirSync(distCorpus, { recursive: true });
  cpSync(srcCorpus, distCorpus, { recursive: true });
}
