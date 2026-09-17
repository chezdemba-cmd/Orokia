import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "node:crypto";
import type { Role } from "@orokia/shared";
import { env } from "../config/env.js";

export interface AccessTokenPayload {
  accountId: string;
  profileId: string;
  ecoleId: string;
  role: Role;
  nom: string;
  via2fa: boolean;
}

const ACCESS_TOKEN_TTL = "15m";
const LOGIN_TOKEN_TTL = "10m";
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

/** Short-lived token issued after password check, used only to complete profile selection. */
export interface LoginTokenPayload {
  accountId: string;
  purpose: "PROFILE_SELECTION";
}

export function signLoginToken(payload: LoginTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: LOGIN_TOKEN_TTL });
}

export function verifyLoginToken(token: string): LoginTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as LoginTokenPayload;
}

/** Session d'un super-admin plateforme — n'est jamais rattachée à un Profile/école. */
export interface SuperAdminTokenPayload {
  accountId: string;
  scope: "SUPER_ADMIN";
}

const SUPER_ADMIN_TOKEN_TTL = "2h";

export function signSuperAdminToken(payload: SuperAdminTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: SUPER_ADMIN_TOKEN_TTL });
}

export function verifySuperAdminToken(token: string): SuperAdminTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as SuperAdminTokenPayload;
  if (decoded.scope !== "SUPER_ADMIN") {
    throw new Error("Jeton invalide pour ce contexte.");
  }
  return decoded;
}

export function generateRefreshToken(): string {
  return randomBytes(48).toString("hex");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
