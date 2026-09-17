import type { FastifyInstance } from "fastify";
import { requireRole } from "../../middleware/authenticate.js";
import { withEcoleScope } from "../../lib/tenant-context.js";

export async function auditRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [app.authenticate, requireRole("DIRECTION", "CENSEUR")] }, async (request, reply) => {
    const ecoleId = request.user!.ecoleId;
    const logs = await withEcoleScope(app.prisma, ecoleId, (tx) =>
      tx.auditLog.findMany({
        where: { ecoleId },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { actor: { include: { teacher: true } } },
      }),
    );
    reply.send({
      logs: logs.map((l) => ({
        id: l.id,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        motif: l.motif,
        before: l.before,
        after: l.after,
        createdAt: l.createdAt,
        acteur: l.actor?.teacher?.nom ?? l.actor?.role ?? "Système",
      })),
    });
  });
}
