// Usage: node scripts/with-env.mjs <env-file> <command> [args...]
// Runs a command with the variables from an env file. The file wins over the shell, so a test
// build always uses the test values. (`node --env-file` cannot be used here: Next.js passes
// Node's flags to its worker threads, and workers reject --env-file.)
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

const [file, command, ...args] = process.argv.slice(2);
if (!file || !command) {
    console.error("usage: node scripts/with-env.mjs <env-file> <command> [args...]");
    process.exit(2);
}

const env = { ...process.env, ...parseEnv(readFileSync(file, "utf8")) };
const result = spawnSync(command, args, { stdio: "inherit", env });
if (result.error) {
    console.error(result.error.message);
    process.exit(1);
}
process.exit(result.status ?? 1);
