// Vérifie que le bundle esbuild démarre avec du Node.js pur (pas tsx), et que
// la reconstruction de req.url à partir de ?path=... (voir api/handler.ts)
// fonctionne pour un chemin multi-segments avec query string.
import { buildApp } from "../api/_bundled-app.cjs";

const app = await buildApp();
await app.ready();

function reconstruct(rewrittenUrl) {
  const url = new URL(rewrittenUrl, "http://internal");
  const path = url.searchParams.get("path") ?? "";
  url.searchParams.delete("path");
  const qs = url.searchParams.toString();
  return `/${path}${qs ? `?${qs}` : ""}`;
}

console.log("reconstruct /api/handler?path=health ->", reconstruct("/api/handler?path=health"));
console.log("reconstruct /api/handler?path=auth/login ->", reconstruct("/api/handler?path=auth/login"));
console.log(
  "reconstruct /api/handler?path=payroll&periode=2026-09 ->",
  reconstruct("/api/handler?path=payroll&periode=2026-09"),
);

const health = await app.inject({ method: "GET", url: reconstruct("/api/handler?path=health") });
console.log("HEALTH:", health.statusCode, health.body);

const login = await app.inject({
  method: "POST",
  url: reconstruct("/api/handler?path=auth/login"),
  payload: { telephone: "+22370100001", motDePasse: "Orokia2026!" },
});
console.log("LOGIN (multi-segment):", login.statusCode, login.body);

await app.close();
process.exit(health.statusCode === 200 && login.statusCode === 200 ? 0 : 1);
