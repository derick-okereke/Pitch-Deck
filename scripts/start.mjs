import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const cap = Number(process.env.NODE_HEAP_LIMIT_MB || 768);
if (!Number.isInteger(cap) || cap < 128) throw new Error("NODE_HEAP_LIMIT_MB must be an integer of at least 128.");
// An explicit hosting setting takes precedence over the repository default.
const hasHostCap = /--max[-_]old[-_]space[-_]size(?:=|\s)/.test(process.env.NODE_OPTIONS || "");
const child = spawn(process.execPath, [
  ...(hasHostCap ? [] : [`--max-old-space-size=${cap}`]),
  require.resolve("next/dist/bin/next"), "start", ...process.argv.slice(2),
], { stdio: "inherit", env: process.env });
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => child.kill(signal));
child.on("error", (error) => { console.error(error); process.exitCode = 1; });
child.on("exit", (code, signal) => { process.exitCode = code ?? (signal === "SIGKILL" ? 137 : 1); });
