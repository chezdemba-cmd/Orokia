import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { createTimetableSlotSchema } from "@orokia/shared";
import { requireRole } from "../../middleware/authenticate.js";
import { TimetableService } from "./service.js";
import { withEcoleScope } from "../../lib/tenant-context.js";

const STAFF_ROLES = ["DIRECTION", "CENSEUR", "ENSEIGNANT", "SECRETAIRE"];
const EDIT_ROLES = ["DIRECTION", "CENSEUR"];

export async function classeTimetableRoutes(app: FastifyInstance) {
  const withTypes = app.withTypeProvider<ZodTypeProvider>();

  withTypes.get(
    "/:id/timetable",
    {
      preHandler: [app.authenticate, requireRole(...STAFF_ROLES)],
      schema: { params: z.object({ id: z.string() }) },
    },
    async (request, reply) => {
      const ecoleId = request.user!.ecoleId;
      const slots = await withEcoleScope(app.prisma, ecoleId, (tx) => new TimetableService(tx).getForClasse(request.params.id, ecoleId));
      reply.send({ slots });
    },
  );

  withTypes.post(
    "/:id/timetable",
    {
      preHandler: [app.authenticate, requireRole(...EDIT_ROLES)],
      schema: { params: z.object({ id: z.string() }), body: createTimetableSlotSchema },
    },
    async (request, reply) => {
      const ecoleId = request.user!.ecoleId;
      const result = await withEcoleScope(app.prisma, ecoleId, (tx) =>
        new TimetableService(tx).createSlot(request.params.id, ecoleId, request.body),
      );
      reply.send(result);
    },
  );
}

export async function timetableSlotRoutes(app: FastifyInstance) {
  const withTypes = app.withTypeProvider<ZodTypeProvider>();

  withTypes.delete(
    "/:id",
    {
      preHandler: [app.authenticate, requireRole(...EDIT_ROLES)],
      schema: { params: z.object({ id: z.string() }) },
    },
    async (request, reply) => {
      const ecoleId = request.user!.ecoleId;
      await withEcoleScope(app.prisma, ecoleId, (tx) => new TimetableService(tx).deleteSlot(request.params.id, ecoleId));
      reply.send({ ok: true });
    },
  );
}
