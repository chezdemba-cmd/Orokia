import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { requireRole } from "../../middleware/authenticate.js";
import { AccountsService } from "./service.js";
import { withEcoleScope } from "../../lib/tenant-context.js";

export async function accountsRoutes(app: FastifyInstance) {
  const withTypes = app.withTypeProvider<ZodTypeProvider>();

  app.get("/", { preHandler: [app.authenticate, requireRole("DIRECTION")] }, async (request, reply) => {
    const ecoleId = request.user!.ecoleId;
    const accounts = await withEcoleScope(app.prisma, ecoleId, (tx) => new AccountsService(tx).list(ecoleId));
    reply.send({ accounts });
  });

  withTypes.patch(
    "/:id/suspend",
    { preHandler: [app.authenticate, requireRole("DIRECTION")], schema: { params: z.object({ id: z.string() }) } },
    async (request, reply) => {
      const ecoleId = request.user!.ecoleId;
      const account = await withEcoleScope(app.prisma, ecoleId, (tx) =>
        new AccountsService(tx).setEtat(request.params.id, ecoleId, "SUSPENDU", request.user!.profileId),
      );
      reply.send(account);
    },
  );

  withTypes.patch(
    "/:id/activate",
    { preHandler: [app.authenticate, requireRole("DIRECTION")], schema: { params: z.object({ id: z.string() }) } },
    async (request, reply) => {
      const ecoleId = request.user!.ecoleId;
      const account = await withEcoleScope(app.prisma, ecoleId, (tx) =>
        new AccountsService(tx).setEtat(request.params.id, ecoleId, "ACTIF", request.user!.profileId),
      );
      reply.send(account);
    },
  );
}
