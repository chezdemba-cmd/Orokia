import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { requireRole } from "../../middleware/authenticate.js";
import { StudentsService } from "./service.js";
import { withEcoleScope } from "../../lib/tenant-context.js";

const STAFF_ROLES = ["DIRECTION", "CENSEUR", "ENSEIGNANT", "SECRETAIRE"];

export async function studentsRoutes(app: FastifyInstance) {
  const withTypes = app.withTypeProvider<ZodTypeProvider>();

  withTypes.get(
    "/:id",
    {
      preHandler: [app.authenticate, requireRole(...STAFF_ROLES)],
      schema: { params: z.object({ id: z.string() }) },
    },
    async (request, reply) => {
      const ecoleId = request.user!.ecoleId;
      const detail = await withEcoleScope(app.prisma, ecoleId, (tx) => new StudentsService(tx).getDetail(request.params.id, ecoleId));
      reply.send(detail);
    },
  );
}
