import { verify as argon2Verify } from "@node-rs/argon2";

import { ApiError } from "../../plugins/error-handler.js";
import { generateOtpCode, hashOtpCode, verifyOtpCode } from "../../lib/otp/hash.js";
import { smsProvider } from "../../lib/otp/sms-provider.js";
import { signSuperAdminToken } from "../../lib/jwt.js";
import type { Db } from "../../lib/tenant-context.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

export class AdminAuthService {
  constructor(private prisma: Db) {}

  async login(telephone: string, motDePasse: string) {
    const account = await this.prisma.account.findUnique({ where: { telephoneE164: telephone } });
    if (!account || !account.isSuperAdmin) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Numéro ou mot de passe incorrect.");
    }
    const passwordOk = await argon2Verify(account.passwordHash, motDePasse);
    if (!passwordOk) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Numéro ou mot de passe incorrect.");
    }

    const code = generateOtpCode();
    const challenge = await this.prisma.otpChallenge.create({
      data: {
        accountId: account.id,
        codeHash: hashOtpCode(code),
        channel: "SMS",
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        maxAttempts: OTP_MAX_ATTEMPTS,
      },
    });
    await smsProvider.sendOtp(account.telephoneE164, code, "SMS");
    return { challengeId: challenge.id, devCode: process.env.NODE_ENV !== "production" ? code : undefined };
  }

  async verifyOtp(challengeId: string, code: string) {
    const challenge = await this.prisma.otpChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge || challenge.consumedAt) {
      throw new ApiError(400, "OTP_INVALID", "Code invalide ou déjà utilisé.");
    }
    if (challenge.expiresAt < new Date()) {
      throw new ApiError(400, "OTP_EXPIRED", "Code expiré, demandez-en un nouveau.");
    }
    if (challenge.attempts >= challenge.maxAttempts) {
      throw new ApiError(423, "OTP_LOCKED", "Trop de tentatives, compte temporairement bloqué.");
    }

    const ok = verifyOtpCode(code, challenge.codeHash);
    if (!ok) {
      const attempts = challenge.attempts + 1;
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts, consumedAt: attempts >= challenge.maxAttempts ? new Date() : undefined },
      });
      throw new ApiError(401, "OTP_INCORRECT", `Code incorrect. Tentatives restantes : ${challenge.maxAttempts - attempts}.`);
    }
    await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });

    const account = await this.prisma.account.findUniqueOrThrow({ where: { id: challenge.accountId } });
    if (!account.isSuperAdmin) {
      throw new ApiError(403, "FORBIDDEN", "Accès refusé.");
    }

    const accessToken = signSuperAdminToken({ accountId: account.id, scope: "SUPER_ADMIN" });
    return { accessToken };
  }
}
