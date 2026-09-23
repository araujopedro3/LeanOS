import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const checks = [
  ["TypeScript", ["node_modules/typescript/bin/tsc", "--noEmit", "--incremental", "false"]],
  ["ESLint", ["node_modules/eslint/bin/eslint.js", ".", "--max-warnings", "0"]],
  ["Tests", ["--import", "./tests/register.mjs", "--test", "tests/*.test.mjs"]],
];
for (const [label, args] of checks) {
  console.log(`\n${label}`);
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
