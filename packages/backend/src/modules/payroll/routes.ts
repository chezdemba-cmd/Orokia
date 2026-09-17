import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { generatePayrollSchema } from "@orokia/shared";
import { requireRole } from "../../middleware/authenticate.js";
import { PayrollService } from "./service.js";
import { withEcoleScope } from "../../lib/tenant-context.js";

const FINANCE_ROLES = ["DIRECTION", "SECRETAIRE"];

export async function payrollRoutes(app: FastifyInstance) {
  const withTypes = app.withTypeProvider<ZodTypeProvider>();

  withTypes.get(
    "/",
    { preHandler: [app.authenticate, requireRole(...FINANCE_ROLES)], schema: { querystring: z.object({ periode: z.string() }) } },
    async (request, reply) => {
      const ecoleId = request.user!.ecoleId;
      const grid = await withEcoleScope(app.prisma, ecoleId, (tx) => new PayrollService(tx).getGrid(request.query.periode, ecoleId));
      reply.send({ grid });
    },
  );

  withTypes.post(
    "/generate",
    { preHandler: [app.authenticate, requireRole(...FINANCE_ROLES)], schema: { body: generatePayrollSchema } },
    async (request, reply) => {
      const ecoleId = request.user!.ecoleId;
      const result = await withEcoleScope(app.prisma, ecoleId, (tx) =>
        new PayrollService(tx).generate(request.body, ecoleId, request.user!.profileId),
      );
      reply.send(result);
    },
  );

  withTypes.get(
    "/:teacherId/payslip",
    {
      preHandler: [app.authenticate, requireRole(...FINANCE_ROLES)],
      schema: { params: z.object({ teacherId: z.string() }), querystring: z.object({ periode: z.string() }) },
    },
    async (request, reply) => {
      const ecoleId = request.user!.ecoleId;
      const payslip = await withEcoleScope(app.prisma, ecoleId, (tx) =>
        new PayrollService(tx).getPayslip(request.params.teacherId, request.query.periode, ecoleId),
      );
      reply.send(payslip);
    },
  );
}
