import { createHmac, timingSafeEqual, randomInt } from "node:crypto";
import { env } from "../../config/env.js";

export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtpCode(code: string): string {
  return createHmac("sha256", env.OTP_HASH_SECRET).update(code).digest("hex");
}

export function verifyOtpCode(code: string, hash: string): boolean {
  const candidate = Buffer.from(hashOtpCode(code));
  const expected = Buffer.from(hash);
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}
