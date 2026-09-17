import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { createConversationSchema, sendMessageSchema } from "@orokia/shared";
import { requireRole } from "../../middleware/authenticate.js";
import { MessagingService } from "./service.js";
import { withEcoleScope } from "../../lib/tenant-context.js";

const STAFF_ROLES = ["DIRECTION", "CENSEUR", "ENSEIGNANT", "SECRETAIRE"];

export async function messagingRoutes(app: FastifyInstance) {
  const withTypes = app.withTypeProvider<ZodTypeProvider>();

  app.get("/contacts", { preHandler: [app.authenticate, requireRole(...STAFF_ROLES)] }, async (request, reply) => {
    const ecoleId = request.user!.ecoleId;
    const contacts = await withEcoleScope(app.prisma, ecoleId, (tx) =>
      new MessagingService(tx).listStaffProfiles(request.user!.profileId, ecoleId),
    );
    reply.send({ contacts });
  });

  app.get("/conversations", { preHandler: [app.authenticate, requireRole(...STAFF_ROLES)] }, async (request, reply) => {
    const conversations = await withEcoleScope(app.prisma, request.user!.ecoleId, (tx) =>
      new MessagingService(tx).listConversations(request.user!.profileId),
    );
    reply.send({ conversations });
  });

  withTypes.get(
    "/conversations/:id/messages",
    { preHandler: [app.authenticate, requireRole(...STAFF_ROLES)], schema: { params: z.object({ id: z.string() }) } },
    async (request, reply) => {
      const messages = await withEcoleScope(app.prisma, request.user!.ecoleId, (tx) =>
        new MessagingService(tx).getMessages(request.params.id, request.user!.profileId),
      );
      reply.send({ messages });
    },
  );

  withTypes.post(
    "/conversations",
    { preHandler: [app.authenticate, requireRole(...STAFF_ROLES)], schema: { body: createConversationSchema } },
    async (request, reply) => {
      const ecoleId = request.user!.ecoleId;
      const result = await withEcoleScope(app.prisma, ecoleId, (tx) =>
        new MessagingService(tx).createConversation(request.user!.profileId, request.body.recipientProfileId, request.body.message, ecoleId),
      );
      reply.send(result);
    },
  );

  withTypes.post(
    "/conversations/:id/messages",
    { preHandler: [app.authenticate, requireRole(...STAFF_ROLES)], schema: { params: z.object({ id: z.string() }), body: sendMessageSchema } },
    async (request, reply) => {
      const message = await withEcoleScope(app.prisma, request.user!.ecoleId, (tx) =>
        new MessagingService(tx).sendMessage(request.params.id, request.user!.profileId, request.body.corps),
      );
      reply.send(message);
    },
  );
}
