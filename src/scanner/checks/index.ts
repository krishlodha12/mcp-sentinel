import type { SecurityCheck } from "../types.js";
import { hiddenInstructionsCheck } from "./hidden-instructions.js";
import { base64PayloadCheck, schemaInjectionCheck } from "./base64-payloads.js";
import { commandInjectionCheck } from "./command-injection.js";
import { broadPermissionsCheck } from "./broad-permissions.js";
import { unpinnedVersionsCheck } from "./unpinned-versions.js";
import { cvePatternsCheck } from "./cve-patterns.js";
import {
  secretsInConfigCheck,
  remoteTransportCheck,
} from "./secrets-and-transport.js";
import { promptResourceCheck } from "./prompt-resource.js";

export const ALL_CHECKS: SecurityCheck[] = [
  hiddenInstructionsCheck,
  base64PayloadCheck,
  schemaInjectionCheck,
  commandInjectionCheck,
  broadPermissionsCheck,
  unpinnedVersionsCheck,
  cvePatternsCheck,
  secretsInConfigCheck,
  remoteTransportCheck,
  promptResourceCheck,
];

export function getCheck(id: string): SecurityCheck | undefined {
  return ALL_CHECKS.find((c) => c.id === id);
}

export function listChecks(): { id: string; name: string; description: string }[] {
  return ALL_CHECKS.map(({ id, name, description }) => ({ id, name, description }));
}
