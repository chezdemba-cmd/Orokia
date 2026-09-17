import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { saveGradesSchema, gradeCorrectionSchema } from "@orokia/shared";
import { requireRole } from "../../middleware/authenticate.js";
import { GradesService } from "./service.js";
import { withEcoleScope } from "../../lib/tenant-context.js";

const GRADE_WRITE_ROLES = ["DIRECTION", "CENSEUR", "ENSEIGNANT"];
const STAFF_ROLES = ["DIRECTION", "CENSEUR", "ENSEIGNANT", "SECRETAIRE"];

export async function gradesRoutes(app: FastifyInstance) {
  const withTypes = app.withTypeProvider<ZodTypeProvider>();

  withTypes.get(
    "/grid",
    {
      preHandler: [app.authenticate, requireRole(...STAFF_ROLES)],
      schema: {
        querystring: z.object({ classeId: z.string(), subjectId: z.string(), termId: z.string().optional() }),
      },
    },
    async (request, reply) => {
      const { classeId, subjectId, termId } = request.query;
      const ecoleId = request.user!.ecoleId;
      const grid = await withEcoleScope(app.prisma, ecoleId, (tx) => new GradesService(tx).getGrid(classeId, subjectId, ecoleId, termId));
      reply.send(grid);
    },
  );

  withTypes.put(
    "/grid",
    {
      preHandler: [app.authenticate, requireRole(...GRADE_WRITE_ROLES)],
      schema: {
        body: saveGradesSchema.extend({ classeId: z.string(), subjectId: z.string() }),
      },
    },
    async (request, reply) => {
      const { classeId, subjectId, entries } = request.body;
      const count = await withEcoleScope(app.prisma, request.user!.ecoleId, (tx) =>
        new GradesService(tx).saveGrid(classeId, subjectId, entries, request.user!),
      );
      reply.send({ saved: count });
    },
  );

  withTypes.patch(
    "/:id/correction",
    {
      preHandler: [app.authenticate, requireRole("DIRECTION", "CENSEUR")],
      schema: { params: z.object({ id: z.string() }), body: gradeCorrectionSchema },
    },
    async (request, reply) => {
      const updated = await withEcoleScope(app.prisma, request.user!.ecoleId, (tx) =>
        new GradesService(tx).correctGrade(request.params.id, request.body, request.user!),
      );
      reply.send(updated);
    },
  );
}

export async function termsRoutes(app: FastifyInstance) {
  const withTypes = app.withTypeProvider<ZodTypeProvider>();

  withTypes.post(
    "/:id/publish",
    {
      preHandler: [app.authenticate, requireRole("DIRECTION")],
      schema: { params: z.object({ id: z.string() }) },
    },
    async (request, reply) => {
      const result = await withEcoleScope(app.prisma, request.user!.ecoleId, (tx) =>
        new GradesService(tx).publishTerm(request.params.id, request.user!),
      );
      reply.send(result);
    },
  );
}

export async function reportCardsRoutes(app: FastifyInstance) {
  const withTypes = app.withTypeProvider<ZodTypeProvider>();

  withTypes.get(
    "/:studentId",
    {
      preHandler: [app.authenticate, requireRole(...STAFF_ROLES)],
      schema: { params: z.object({ studentId: z.string() }), querystring: z.object({ termId: z.string().optional() }) },
    },
    async (request, reply) => {
      const ecoleId = request.user!.ecoleId;
      const bulletin = await withEcoleScope(app.prisma, ecoleId, (tx) =>
        new GradesService(tx).getReportCard(request.params.studentId, ecoleId, request.query.termId),
      );
      reply.send(bulletin);
    },
  );
}
