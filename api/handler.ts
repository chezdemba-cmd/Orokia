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

  // vercel.json réécrit /api/<chemin> vers /api/handler?path=<chemin> — le
  // catch-all de fichier (api/[...slug].ts) ne matchait, de façon reproductible,
  // que le premier segment sur ce projet ; on reconstruit donc le vrai chemin
  // nous-mêmes à partir du paramètre de requête plutôt que de compter dessus.
  if (req.url) {
    const url = new URL(req.url, "http://internal");
    const path = url.searchParams.get("path") ?? "";
    url.searchParams.delete("path");
    const qs = url.searchParams.toString();
    req.url = `/${path}${qs ? `?${qs}` : ""}`;
  }

  app.server.emit("request", req, res);
}
