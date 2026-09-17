import { z } from "zod";
import { ROLES } from "../constants/enums.js";

/** +223 (Mali) E.164 phone number — the unique login identifier. */
export const phoneE164Schema = z
  .string()
  .regex(/^\+223\d{8}$/, "Numéro invalide — format attendu +223XXXXXXXX");

export const loginSchema = z.object({
  telephone: phoneE164Schema,
  motDePasse: z.string().min(1, "Mot de passe requis"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const loginResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("PROFILE_SELECTION_REQUIRED"), loginToken: z.string(), profiles: z.array(
    z.object({ profileId: z.string(), role: z.enum(ROLES), label: z.string() })
  ) }),
  z.object({ status: z.literal("OTP_REQUIRED"), challengeId: z.string(), channel: z.enum(["SMS", "VOICE"]) }),
  z.object({ status: z.literal("AUTHENTICATED"), accessToken: z.string() }),
]);
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const selectProfileSchema = z.object({
  loginToken: z.string(),
  profileId: z.string(),
});
export type SelectProfileInput = z.infer<typeof selectProfileSchema>;

export const otpVerifySchema = z.object({
  challengeId: z.string(),
  code: z.string().length(6, "Le code doit comporter 6 chiffres").regex(/^\d{6}$/),
});
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;

export const otpResendSchema = z.object({
  challengeId: z.string(),
  channel: z.enum(["SMS", "VOICE"]).default("SMS"),
});
export type OtpResendInput = z.infer<typeof otpResendSchema>;

export const sessionUserSchema = z.object({
  accountId: z.string(),
  profileId: z.string(),
  role: z.enum(ROLES),
  nom: z.string(),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;
