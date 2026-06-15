#!/usr/bin/env node
import { startMcpServer } from "./server.js";

startMcpServer().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
