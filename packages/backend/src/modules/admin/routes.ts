import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { loginSchema, otpVerifySchema, createEcoleSchema } from "@orokia/shared";
import { AdminAuthService } from "./auth.service.js";
import { AdminEcolesService } from "./ecoles.service.js";
import { withRlsBypass } from "../../lib/tenant-context.js";

export async function adminRoutes(app: FastifyInstance) {
  const withTypes = app.withTypeProvider<ZodTypeProvider>();

  withTypes.post("/login", { schema: { body: loginSchema } }, async (request, reply) => {
    const result = await withRlsBypass(app.prisma, (tx) => new AdminAuthService(tx).login(request.body.telephone, request.body.motDePasse));
    reply.send({ status: "OTP_REQUIRED" as const, ...result });
  });

  withTypes.post("/otp/verify", { schema: { body: otpVerifySchema } }, async (request, reply) => {
    const result = await withRlsBypass(app.prisma, (tx) => new AdminAuthService(tx).verifyOtp(request.body.challengeId, request.body.code));
    reply.send({ status: "AUTHENTICATED" as const, ...result });
  });

  app.get("/me", { preHandler: app.authenticateSuperAdmin }, async (request, reply) => {
    reply.send({ accountId: request.superAdmin!.accountId });
  });

  app.get("/ecoles", { preHandler: app.authenticateSuperAdmin }, async (_request, reply) => {
    const ecoles = await withRlsBypass(app.prisma, (tx) => new AdminEcolesService(tx).list());
    reply.send({ ecoles });
  });

  withTypes.post(
    "/ecoles",
    { preHandler: app.authenticateSuperAdmin, schema: { body: createEcoleSchema } },
    async (request, reply) => {
      const result = await withRlsBypass(app.prisma, (tx) => new AdminEcolesService(tx).create(request.body));
      reply.status(201).send(result);
    },
  );
}
