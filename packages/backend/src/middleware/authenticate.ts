import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { verifyAccessToken, type AccessTokenPayload } from "../lib/jwt.js";
import { recordAudit } from "../lib/audit.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: AccessTokenPayload;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async function authenticatePlugin(fastify: FastifyInstance) {
  fastify.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    const header = request.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

    if (!token) {
      reply.status(401).send({ error: { code: "UNAUTHENTICATED", message: "Authentification requise." } });
      return;
    }

    try {
      request.user = verifyAccessToken(token);
    } catch {
      reply.status(401).send({ error: { code: "UNAUTHENTICATED", message: "Session invalide ou expirée." } });
    }
  });
});

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user || !roles.includes(request.user.role)) {
      if (request.user) {
        await recordAudit(request.server.prisma, {
          ecoleId: request.user.ecoleId,
          actorProfileId: request.user.profileId,
          action: "ACCESS_DENIED",
          entityType: "Route",
          entityId: request.routeOptions?.url ?? request.url,
        });
      }
      reply.status(403).send({ error: { code: "FORBIDDEN", message: "Accès refusé pour ce rôle." } });
    }
  };
}
