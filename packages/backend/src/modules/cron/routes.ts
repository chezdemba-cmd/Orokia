import type { FastifyInstance } from "fastify";
import { AttendanceService } from "../attendance/service.js";
import { withRlsBypass } from "../../lib/tenant-context.js";
import { env } from "../../config/env.js";

/**
 * Déclenché par Vercel Cron (voir vercel.json) au lieu du setInterval de
 * server.ts, qui ne survit pas entre deux invocations serverless. Job
 * système transverse à toutes les écoles — RLS désactivée via bypass.
 */
export async function cronRoutes(app: FastifyInstance) {
  app.get("/escalations", async (request, reply) => {
    const auth = request.headers.authorization;
    if (!env.CRON_SECRET || auth !== `Bearer ${env.CRON_SECRET}`) {
      reply.status(401).send({ error: { code: "UNAUTHORIZED", message: "Accès refusé." } });
      return;
    }
    const count = await withRlsBypass(app.prisma, (tx) => new AttendanceService(tx).checkEscalations());
    reply.send({ escalations: count });
  });
}
