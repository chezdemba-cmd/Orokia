import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { justifyAbsenceSchema } from "@orokia/shared";
import { requireRole } from "../../middleware/authenticate.js";
import { FamilyService } from "./service.js";
import { withEcoleScope } from "../../lib/tenant-context.js";

export async function familyRoutes(app: FastifyInstance) {
  const withTypes = app.withTypeProvider<ZodTypeProvider>();

  // --- Parent ---

  app.get("/children", { preHandler: [app.authenticate, requireRole("PARENT")] }, async (request, reply) => {
    const ecoleId = request.user!.ecoleId;
    const children = await withEcoleScope(app.prisma, ecoleId, (tx) => new FamilyService(tx).getFamily(request.user!.profileId, ecoleId));
    reply.send({ children });
  });

  withTypes.get(
    "/children/:studentId/accueil",
    { preHandler: [app.authenticate, requireRole("PARENT")], schema: { params: z.object({ studentId: z.string() }) } },
    async (request, reply) => {
      const ecoleId = request.user!.ecoleId;
      const data = await withEcoleScope(app.prisma, ecoleId, (tx) =>
        new FamilyService(tx).getChildAccueil(request.user!.profileId, request.params.studentId, ecoleId),
      );
      reply.send(data);
    },
  );

  withTypes.get(
    "/children/:studentId/schedule",
    { preHandler: [app.authenticate, requireRole("PARENT")], schema: { params: z.object({ studentId: z.string() }) } },
    async (request, reply) => {
      const ecoleId = request.user!.ecoleId;
      const data = await withEcoleScope(app.prisma, ecoleId, (tx) =>
        new FamilyService(tx).getChildSchedule(request.user!.profileId, request.params.studentId, ecoleId),
      );
      reply.send({ slots: data });
    },
  );

  withTypes.get(
    "/children/:studentId/grades",
    { preHandler: [app.authenticate, requireRole("PARENT")], schema: { params: z.object({ studentId: z.string() }) } },
    async (request, reply) => {
      const ecoleId = request.user!.ecoleId;
      const data = await withEcoleScope(app.prisma, ecoleId, (tx) =>
        new FamilyService(tx).getChildGrades(request.user!.profileId, request.params.studentId, ecoleId),
      );
      reply.send(data);
    },
  );

  withTypes.get(
    "/children/:studentId/attendance",
    { preHandler: [app.authenticate, requireRole("PARENT")], schema: { params: z.object({ studentId: z.string() }) } },
    async (request, reply) => {
      const ecoleId = request.user!.ecoleId;
      const data = await withEcoleScope(app.prisma, ecoleId, (tx) =>
        new FamilyService(tx).getChildAttendance(request.user!.profileId, request.params.studentId, ecoleId),
      );
      reply.send({ attendances: data });
    },
  );

  withTypes.post(
    "/children/:studentId/attendance/:attendanceId/justify",
    {
      preHandler: [app.authenticate, requireRole("PARENT")],
      schema: { params: z.object({ studentId: z.string(), attendanceId: z.string() }), body: justifyAbsenceSchema },
    },
    async (request, reply) => {
      const ecoleId = request.user!.ecoleId;
      const updated = await withEcoleScope(app.prisma, ecoleId, (tx) =>
        new FamilyService(tx).justifyAbsence(
          request.user!.profileId,
          request.params.studentId,
          request.params.attendanceId,
          request.body.motif,
          ecoleId,
          request.user!.profileId,
        ),
      );
      reply.send(updated);
    },
  );

  // --- Élève ---

  app.get("/me/accueil", { preHandler: [app.authenticate, requireRole("ELEVE")] }, async (request, reply) => {
    const ecoleId = request.user!.ecoleId;
    const data = await withEcoleScope(app.prisma, ecoleId, (tx) => new FamilyService(tx).getSelfAccueil(request.user!.profileId, ecoleId));
    reply.send(data);
  });

  app.get("/me/schedule", { preHandler: [app.authenticate, requireRole("ELEVE")] }, async (request, reply) => {
    const ecoleId = request.user!.ecoleId;
    const data = await withEcoleScope(app.prisma, ecoleId, (tx) => new FamilyService(tx).getSelfSchedule(request.user!.profileId, ecoleId));
    reply.send({ slots: data });
  });

  app.get("/me/grades", { preHandler: [app.authenticate, requireRole("ELEVE")] }, async (request, reply) => {
    const ecoleId = request.user!.ecoleId;
    const data = await withEcoleScope(app.prisma, ecoleId, (tx) => new FamilyService(tx).getSelfGrades(request.user!.profileId, ecoleId));
    reply.send(data);
  });

  app.get("/me/homework", { preHandler: [app.authenticate, requireRole("ELEVE")] }, async (request, reply) => {
    const ecoleId = request.user!.ecoleId;
    const data = await withEcoleScope(app.prisma, ecoleId, (tx) => new FamilyService(tx).getSelfHomework(request.user!.profileId, ecoleId));
    reply.send({ homework: data });
  });
}
