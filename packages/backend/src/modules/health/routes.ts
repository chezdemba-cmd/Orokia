import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (_request, reply) => {
    await app.prisma.$queryRaw`SELECT 1`;
    reply.send({ status: "ok", timestamp: new Date().toISOString() });
  });
}
