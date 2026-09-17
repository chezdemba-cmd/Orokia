import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { createAnnouncementSchema } from "@orokia/shared";
import { requireRole } from "../../middleware/authenticate.js";
import { AnnouncementsService } from "./service.js";
import { withEcoleScope } from "../../lib/tenant-context.js";

const STAFF_ROLES = ["DIRECTION", "CENSEUR", "ENSEIGNANT", "SECRETAIRE"];
const WRITE_ROLES = ["DIRECTION", "CENSEUR"];

export async function announcementsRoutes(app: FastifyInstance) {
  const withTypes = app.withTypeProvider<ZodTypeProvider>();

  app.get("/", { preHandler: [app.authenticate, requireRole(...STAFF_ROLES)] }, async (request, reply) => {
    const ecoleId = request.user!.ecoleId;
    const announcements = await withEcoleScope(app.prisma, ecoleId, (tx) => new AnnouncementsService(tx).list(ecoleId));
    reply.send({ announcements });
  });

  withTypes.post(
    "/",
    { preHandler: [app.authenticate, requireRole(...WRITE_ROLES)], schema: { body: createAnnouncementSchema } },
    async (request, reply) => {
      const ecoleId = request.user!.ecoleId;
      const announcement = await withEcoleScope(app.prisma, ecoleId, (tx) =>
        new AnnouncementsService(tx).create(ecoleId, request.body, request.user!.profileId),
      );
      reply.send(announcement);
    },
  );
}
