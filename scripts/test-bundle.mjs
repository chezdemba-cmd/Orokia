// Vérifie que le bundle esbuild démarre réellement avec du Node.js pur (pas
// tsx), exactement comme le ferait la fonction serverless Vercel — y compris
// une requête qui touche vraiment Prisma (résolution du moteur natif).
import { buildApp } from "../api/_bundled-app.cjs";

const app = await buildApp();
await app.ready();

const health = await app.inject({ method: "GET", url: "/health" });
console.log("HEALTH:", health.statusCode, health.body);

const login = await app.inject({
  method: "POST",
  url: "/auth/login",
  payload: { telephone: "+22370100001", motDePasse: "Orokia2026!" },
});
console.log("LOGIN:", login.statusCode, login.body);

await app.close();
process.exit(health.statusCode === 200 && login.statusCode === 200 ? 0 : 1);
