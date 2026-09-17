import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { recordPaymentSchema } from "@orokia/shared";
import { requireRole } from "../../middleware/authenticate.js";
import { TuitionService } from "./service.js";
import { withEcoleScope } from "../../lib/tenant-context.js";

const FINANCE_ROLES = ["DIRECTION", "SECRETAIRE"];

export async function tuitionRoutes(app: FastifyInstance) {
  const withTypes = app.withTypeProvider<ZodTypeProvider>();

  app.get("/", { preHandler: [app.authenticate, requireRole(...FINANCE_ROLES)] }, async (request, reply) => {
    const ecoleId = request.user!.ecoleId;
    const fees = await withEcoleScope(app.prisma, ecoleId, (tx) => new TuitionService(tx).list(ecoleId));
    reply.send({ fees });
  });

  app.get("/summary", { preHandler: [app.authenticate, requireRole(...FINANCE_ROLES)] }, async (request, reply) => {
    const ecoleId = request.user!.ecoleId;
    const summary = await withEcoleScope(app.prisma, ecoleId, (tx) => new TuitionService(tx).getSummary(ecoleId));
    reply.send(summary);
  });

  app.get("/receipts/today", { preHandler: [app.authenticate, requireRole(...FINANCE_ROLES)] }, async (request, reply) => {
    const ecoleId = request.user!.ecoleId;
    const receipts = await withEcoleScope(app.prisma, ecoleId, (tx) => new TuitionService(tx).listReceiptsToday(ecoleId));
    reply.send({ receipts });
  });

  withTypes.post(
    "/students/:studentId/payments",
    {
      preHandler: [app.authenticate, requireRole(...FINANCE_ROLES)],
      schema: { params: z.object({ studentId: z.string() }), body: recordPaymentSchema },
    },
    async (request, reply) => {
      const ecoleId = request.user!.ecoleId;
      const receipt = await withEcoleScope(app.prisma, ecoleId, (tx) =>
        new TuitionService(tx).recordPayment(request.params.studentId, ecoleId, request.body, request.user!.profileId),
      );
      reply.send(receipt);
    },
  );
}
