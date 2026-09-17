import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

function loadEnvFile(path: string): Record<string, string> {
  const content = readFileSync(path, "utf-8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[key] = value;
  }
  return env;
}

const testEnv = loadEnvFile(fileURLToPath(new URL("./.env.test", import.meta.url)));

export default defineConfig({
  test: {
    include: ["test/integration/**/*.test.ts"],
    env: testEnv,
    hookTimeout: 20_000,
    testTimeout: 20_000,
    // Séquentiel : les tests partagent une base réelle nettoyée entre chaque test.
    fileParallelism: false,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
});
