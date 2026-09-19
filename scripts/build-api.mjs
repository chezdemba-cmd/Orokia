// Empaquette le backend Fastify (packages/backend/src/app.ts) en un seul
// fichier JS autonome pour la fonction serverless Vercel (api/[...slug].ts).
//
// Pourquoi : Vercel doit retrouver tout seul les dépendances d'un monorepo
// pnpm (symlinks workspace, "@orokia/shared") au moment de construire la
// fonction — ça s'est montré peu fiable en pratique. En empaquetant nous-
// mêmes tout le code applicatif (y compris @orokia/shared) dans un seul
// fichier, il ne reste plus qu'à résoudre les paquets natifs standards
// (@prisma/client, @node-rs/argon2), ce que Vercel gère correctement et de
// façon bien documentée.
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

await build({
  entryPoints: [resolve(root, "packages/backend/src/app.ts")],
  outfile: resolve(root, "api/_bundled-app.cjs"),
  bundle: true,
  platform: "node",
  // CJS, pas ESM : plusieurs dépendances (avvio, utilisée par Fastify) font
  // des require() dynamiques que le shim d'interop ESM d'esbuild ne sait pas
  // gérer pour les modules Node natifs (ex. "node:events"). En sortie CJS,
  // ces require() restent de vrais require() — aucun shim nécessaire.
  format: "cjs",
  target: "node20",
  sourcemap: false,
  // Paquets natifs (binaire .node ou moteur externe) — doivent rester de
  // vraies dépendances npm résolues à l'exécution, pas empaquetées en JS.
  external: ["@prisma/client", ".prisma/client", "@node-rs/argon2"],
  logLevel: "info",
});
