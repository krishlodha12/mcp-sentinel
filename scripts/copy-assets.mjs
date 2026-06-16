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

const srcTapSignals = join(root, "../src/tap/runtime-signals.json");
const distTapSignals = join(root, "../dist/tap/runtime-signals.json");
if (existsSync(srcTapSignals)) {
  mkdirSync(dirname(distTapSignals), { recursive: true });
  cpSync(srcTapSignals, distTapSignals);
}
