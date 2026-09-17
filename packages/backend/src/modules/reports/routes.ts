import type { FastifyInstance } from "fastify";
import { requireRole } from "../../middleware/authenticate.js";
import { ReportsService } from "./service.js";
import { withEcoleScope } from "../../lib/tenant-context.js";

const STAFF_ROLES = ["DIRECTION", "CENSEUR", "ENSEIGNANT", "SECRETAIRE"];

export async function reportsRoutes(app: FastifyInstance) {
  app.get("/dashboard", { preHandler: [app.authenticate, requireRole(...STAFF_ROLES)] }, async (request, reply) => {
    const ecoleId = request.user!.ecoleId;
    const summary = await withEcoleScope(app.prisma, ecoleId, (tx) => new ReportsService(tx).getDashboardSummary(ecoleId));
    reply.send(summary);
  });

  app.get("/niveaux", { preHandler: [app.authenticate, requireRole(...STAFF_ROLES)] }, async (request, reply) => {
    const ecoleId = request.user!.ecoleId;
    const stats = await withEcoleScope(app.prisma, ecoleId, (tx) => new ReportsService(tx).getNiveauStats(ecoleId));
    reply.send({ stats });
  });
}
