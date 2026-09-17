import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { createClassLogSchema } from "@orokia/shared";
import { requireRole } from "../../middleware/authenticate.js";
import { ClassLogService } from "./service.js";
import { withEcoleScope } from "../../lib/tenant-context.js";

const STAFF_ROLES = ["DIRECTION", "CENSEUR", "ENSEIGNANT", "SECRETAIRE"];

export async function classLogRoutes(app: FastifyInstance) {
  const withTypes = app.withTypeProvider<ZodTypeProvider>();

  withTypes.get(
    "/:id/class-logs",
    { preHandler: [app.authenticate, requireRole(...STAFF_ROLES)], schema: { params: z.object({ id: z.string() }) } },
    async (request, reply) => {
      const ecoleId = request.user!.ecoleId;
      const logs = await withEcoleScope(app.prisma, ecoleId, (tx) => new ClassLogService(tx).listForClasse(request.params.id, ecoleId));
      reply.send({ logs });
    },
  );

  withTypes.post(
    "/:id/class-logs",
    {
      preHandler: [app.authenticate, requireRole("ENSEIGNANT")],
      schema: { params: z.object({ id: z.string() }), body: createClassLogSchema },
    },
    async (request, reply) => {
      const ecoleId = request.user!.ecoleId;
      const log = await withEcoleScope(app.prisma, ecoleId, (tx) =>
        new ClassLogService(tx).create(request.params.id, ecoleId, request.body, request.user!.profileId),
      );
      reply.send(log);
    },
  );
}
