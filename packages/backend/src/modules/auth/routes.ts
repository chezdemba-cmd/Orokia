import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import rateLimit from "@fastify/rate-limit";
import {
  loginSchema,
  selectProfileSchema,
  otpVerifySchema,
  otpResendSchema,
} from "@orokia/shared";

import { AuthService } from "./service.js";
import { withRlsBypass } from "../../lib/tenant-context.js";

const REFRESH_COOKIE = "orokia_refresh";
const isProd = process.env.NODE_ENV === "production";

function isMobileClient(request: FastifyRequest): boolean {
  return request.headers["x-client"] === "mobile";
}

export async function authRoutes(app: FastifyInstance) {
  // Frein au brute-force sur le mot de passe et le code OTP — par IP.
  await app.register(rateLimit, { max: 30, timeWindow: "1 minute" });

  const withTypes = app.withTypeProvider<ZodTypeProvider>();

  function setRefreshCookie(reply: import("fastify").FastifyReply, token: string) {
    reply.setCookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
  }

  /** Web (navigateur) : refresh token en cookie httpOnly. Mobile (pas de jar de cookies) : renvoyé en clair dans le JSON, à stocker côté client dans un stockage sécurisé (ex. expo-secure-store). */
  function issueSession(request: FastifyRequest, reply: import("fastify").FastifyReply, accessToken: string, refreshToken: string) {
    setRefreshCookie(reply, refreshToken);
    if (isMobileClient(request)) {
      reply.send({ status: "AUTHENTICATED", accessToken, refreshToken });
      return;
    }
    reply.send({ status: "AUTHENTICATED", accessToken });
  }

  withTypes.post(
    "/login",
    { schema: { body: loginSchema }, config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const result = await withRlsBypass(app.prisma, (tx) => new AuthService(tx, app.prisma).login(request.body.telephone, request.body.motDePasse));
      if (result.status === "AUTHENTICATED") {
        issueSession(request, reply, result.accessToken, result.refreshToken);
        return;
      }
      reply.send(result);
    },
  );

  withTypes.post("/select-profile", { schema: { body: selectProfileSchema } }, async (request, reply) => {
    const result = await withRlsBypass(app.prisma, (tx) =>
      new AuthService(tx, app.prisma).selectProfile(request.body.loginToken, request.body.profileId),
    );
    if (result.status === "AUTHENTICATED") {
      issueSession(request, reply, result.accessToken, result.refreshToken);
      return;
    }
    reply.send(result);
  });

  withTypes.post(
    "/otp/verify",
    { schema: { body: otpVerifySchema }, config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const result = await withRlsBypass(app.prisma, (tx) => new AuthService(tx, app.prisma).verifyOtp(request.body.challengeId, request.body.code));
      issueSession(request, reply, result.accessToken, result.refreshToken);
    },
  );

  withTypes.post("/otp/resend", { schema: { body: otpResendSchema } }, async (request, reply) => {
    const result = await withRlsBypass(app.prisma, (tx) => new AuthService(tx, app.prisma).resendOtp(request.body.challengeId, request.body.channel));
    reply.send(result);
  });

  app.post("/refresh", async (request, reply) => {
    const token = request.cookies[REFRESH_COOKIE] ?? (request.body as { refreshToken?: string } | undefined)?.refreshToken;
    if (!token) {
      reply.status(401).send({ error: { code: "NO_REFRESH_TOKEN", message: "Aucune session." } });
      return;
    }
    const result = await withRlsBypass(app.prisma, (tx) => new AuthService(tx, app.prisma).refresh(token));
    reply.send({ accessToken: result.accessToken });
  });

  app.post("/logout", async (request, reply) => {
    const token = request.cookies[REFRESH_COOKIE] ?? (request.body as { refreshToken?: string } | undefined)?.refreshToken;
    if (token) await withRlsBypass(app.prisma, (tx) => new AuthService(tx, app.prisma).logout(token));
    reply.clearCookie(REFRESH_COOKIE, { path: "/" });
    reply.send({ ok: true });
  });

  app.get("/me", { preHandler: app.authenticate }, async (request, reply) => {
    reply.send({ ...request.user });
  });
}
