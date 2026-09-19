import type { IncomingMessage, ServerResponse } from "node:http";
// Généré au build par scripts/build-api.mjs (voir vercel.json) — un seul
// fichier CJS autonome, plutôt que de compter sur Vercel pour retrouver les
// dépendances d'un monorepo pnpm (symlinks workspace) au moment de préparer
// la fonction.
import { buildApp } from "./_bundled-app.cjs";

// Réutilisé entre invocations "chaudes" de la même fonction — évite de
// reconstruire l'app Fastify (et une nouvelle connexion Prisma) à chaque requête.
let appPromise: ReturnType<typeof buildApp> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!appPromise) appPromise = buildApp();
  const app = await appPromise;
  await app.ready();

  // Les routes Fastify (voir app.ts) ne portent pas le préfixe /api — le
  // même que la réécriture faite par le proxy Vite en dev (vite.config.ts).
  if (req.url) req.url = req.url.replace(/^\/api/, "") || "/";

  app.server.emit("request", req, res);
}
