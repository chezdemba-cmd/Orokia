import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { saveAttendanceSchema } from "@orokia/shared";
import { requireRole } from "../../middleware/authenticate.js";
import { AttendanceService } from "./service.js";
import { withEcoleScope } from "../../lib/tenant-context.js";

const STAFF_ROLES = ["DIRECTION", "CENSEUR", "ENSEIGNANT", "SECRETAIRE"];
const WRITE_ROLES = ["DIRECTION", "CENSEUR", "ENSEIGNANT"];

export async function attendanceRoutes(app: FastifyInstance) {
  const withTypes = app.withTypeProvider<ZodTypeProvider>();

  withTypes.get(
    "/:id/attendance",
    {
      preHandler: [app.authenticate, requireRole(...STAFF_ROLES)],
      schema: { params: z.object({ id: z.string() }), querystring: z.object({ sessionId: z.string(), date: z.string() }) },
    },
    async (request, reply) => {
      const { sessionId, date } = request.query;
      const ecoleId = request.user!.ecoleId;
      const result = await withEcoleScope(app.prisma, ecoleId, (tx) =>
        new AttendanceService(tx).getSession(request.params.id, sessionId, date, ecoleId),
      );
      reply.send(result);
    },
  );

  withTypes.post(
    "/:id/attendance/bulk",
    {
      preHandler: [app.authenticate, requireRole(...WRITE_ROLES)],
      schema: { params: z.object({ id: z.string() }), body: saveAttendanceSchema },
    },
    async (request, reply) => {
      const ecoleId = request.user!.ecoleId;
      const count = await withEcoleScope(app.prisma, ecoleId, (tx) =>
        new AttendanceService(tx).saveBulk(request.params.id, ecoleId, request.body, request.user!.profileId),
      );
      reply.send({ saved: count });
    },
  );
}
