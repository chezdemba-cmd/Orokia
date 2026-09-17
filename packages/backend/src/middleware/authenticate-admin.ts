import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { verifySuperAdminToken, type SuperAdminTokenPayload } from "../lib/jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    superAdmin?: SuperAdminTokenPayload;
  }
  interface FastifyInstance {
    authenticateSuperAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async function authenticateAdminPlugin(fastify: FastifyInstance) {
  fastify.decorate("authenticateSuperAdmin", async (request: FastifyRequest, reply: FastifyReply) => {
    const header = request.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

    if (!token) {
      reply.status(401).send({ error: { code: "UNAUTHENTICATED", message: "Authentification requise." } });
      return;
    }

    try {
      request.superAdmin = verifySuperAdminToken(token);
    } catch {
      reply.status(401).send({ error: { code: "UNAUTHENTICATED", message: "Session invalide ou expirée." } });
    }
  });
});
