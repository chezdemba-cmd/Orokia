import fp from "fastify-plugin";
import type { FastifyInstance, FastifyError } from "fastify";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export default fp(async function errorHandlerPlugin(fastify: FastifyInstance) {
  fastify.setErrorHandler((error: FastifyError | ApiError, _request, reply) => {
    if (error instanceof ApiError) {
      reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message, fieldErrors: error.fieldErrors },
      });
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      reply.status(404).send({ error: { code: "NOT_FOUND", message: "Ressource introuvable." } });
      return;
    }

    if (error instanceof ZodError) {
      reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Requête invalide",
          fieldErrors: error.flatten().fieldErrors,
        },
      });
      return;
    }

    const statusCode = ("statusCode" in error ? error.statusCode : undefined) ?? 500;
    if (statusCode >= 500) {
      fastify.log.error(error);
    }
    reply.status(statusCode).send({
      error: {
        code: statusCode >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR",
        message: statusCode >= 500 ? "Erreur interne" : error.message,
      },
    });
  });
});
