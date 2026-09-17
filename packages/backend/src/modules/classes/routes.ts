import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { requireRole } from "../../middleware/authenticate.js";
import { ClassesService } from "./service.js";
import { withEcoleScope } from "../../lib/tenant-context.js";

const STAFF_ROLES = ["DIRECTION", "CENSEUR", "ENSEIGNANT", "SECRETAIRE"];

export async function classesRoutes(app: FastifyInstance) {
  const withTypes = app.withTypeProvider<ZodTypeProvider>();

  withTypes.get(
    "/",
    {
      preHandler: [app.authenticate, requireRole(...STAFF_ROLES)],
      schema: { querystring: z.object({ niveau: z.enum(["PRIMAIRE", "COLLEGE", "LYCEE"]).optional() }) },
    },
    async (request, reply) => {
      const ecoleId = request.user!.ecoleId;
      const classes = await withEcoleScope(app.prisma, ecoleId, (tx) => new ClassesService(tx).list(ecoleId, request.query.niveau));
      reply.send({ classes });
    },
  );

  withTypes.get(
    "/:id",
    {
      preHandler: [app.authenticate, requireRole(...STAFF_ROLES)],
      schema: { params: z.object({ id: z.string() }) },
    },
    async (request, reply) => {
      const ecoleId = request.user!.ecoleId;
      const roster = await withEcoleScope(app.prisma, ecoleId, (tx) => new ClassesService(tx).getRoster(request.params.id, ecoleId));
      reply.send(roster);
    },
  );

  withTypes.get(
    "/:id/subjects",
    {
      preHandler: [app.authenticate, requireRole(...STAFF_ROLES)],
      schema: { params: z.object({ id: z.string() }) },
    },
    async (request, reply) => {
      const ecoleId = request.user!.ecoleId;
      const subjects = await withEcoleScope(app.prisma, ecoleId, (tx) => new ClassesService(tx).getSubjects(request.params.id, ecoleId));
      reply.send({ subjects });
    },
  );
}
