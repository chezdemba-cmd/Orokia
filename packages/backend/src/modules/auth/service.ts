import type { PrismaClient } from "@prisma/client";
import { verify as argon2Verify } from "@node-rs/argon2";

import { ROLES_REQUIRING_2FA, type Role } from "@orokia/shared";
import { ApiError } from "../../plugins/error-handler.js";
import { recordAudit } from "../../lib/audit.js";
import { withRlsBypass, type Db } from "../../lib/tenant-context.js";
import { generateOtpCode, hashOtpCode, verifyOtpCode } from "../../lib/otp/hash.js";
import { smsProvider } from "../../lib/otp/sms-provider.js";
import {
  generateRefreshToken,
  hashRefreshToken,
  REFRESH_TOKEN_TTL_MS,
  signAccessToken,
  signLoginToken,
  verifyLoginToken,
} from "../../lib/jwt.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const ROLE_LABELS: Record<Role, string> = {
  DIRECTION: "Direction",
  CENSEUR: "Censeur",
  SECRETAIRE: "Secrétariat",
  ENSEIGNANT: "Enseignant",
  PARENT: "Parent",
  ELEVE: "Élève",
};

function profileLabel(role: Role, ecoleNom: string, extra?: string) {
  const base = extra ? `${ROLE_LABELS[role]} — ${extra}` : ROLE_LABELS[role];
  return `${base} (${ecoleNom})`;
}

interface SessionBundle {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

interface ProfileContext {
  id: string;
  role: Role;
  ecoleId: string;
  etat: "ACTIF" | "SUSPENDU";
}

export class AuthService {
  /**
   * `rootPrisma` : requis pour journaliser un refus indépendamment de la
   * transaction en cours — le service tourne dans une transaction ouverte par
   * `withRlsBypass` (voir routes.ts) qui sera annulée par le `throw` qui suit
   * (ex. compte suspendu) ; l'entrée d'audit doit survivre à ce rollback.
   */
  constructor(
    private prisma: Db,
    private rootPrisma: PrismaClient,
  ) {}

  private async issueSession(accountId: string, profile: ProfileContext, nom: string, via2fa: boolean): Promise<SessionBundle> {
    const accessToken = signAccessToken({ accountId, profileId: profile.id, ecoleId: profile.ecoleId, role: profile.role, nom, via2fa });
    const refreshToken = generateRefreshToken();
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await this.prisma.refreshToken.create({
      data: {
        accountId,
        profileId: profile.id,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: refreshExpiresAt,
      },
    });
    await this.prisma.account.update({ where: { id: accountId }, data: { lastSeenAt: new Date() } });

    return { accessToken, refreshToken, refreshExpiresAt };
  }

  private async startOtpChallenge(accountId: string, profileId: string, phone: string, channel: "SMS" | "VOICE") {
    const code = generateOtpCode();
    const challenge = await this.prisma.otpChallenge.create({
      data: {
        accountId,
        profileId,
        codeHash: hashOtpCode(code),
        channel,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        maxAttempts: OTP_MAX_ATTEMPTS,
      },
    });
    await smsProvider.sendOtp(phone, code, channel);
    return { challengeId: challenge.id, devCode: process.env.NODE_ENV !== "production" ? code : undefined };
  }

  async login(telephone: string, motDePasse: string) {
    const account = await this.prisma.account.findUnique({
      where: { telephoneE164: telephone },
      include: { profiles: { include: { teacher: true, studentLink: true, ecole: true } } },
    });

    if (!account) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Numéro ou mot de passe incorrect.");
    }

    const passwordOk = await argon2Verify(account.passwordHash, motDePasse);
    if (!passwordOk) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Numéro ou mot de passe incorrect.");
    }

    if (account.profiles.length === 0) {
      throw new ApiError(500, "NO_PROFILE", "Aucun profil associé à ce compte.");
    }

    if (account.profiles.length > 1) {
      return {
        status: "PROFILE_SELECTION_REQUIRED" as const,
        loginToken: signLoginToken({ accountId: account.id, purpose: "PROFILE_SELECTION" }),
        profiles: account.profiles.map((p) => ({
          profileId: p.id,
          role: p.role,
          label: profileLabel(p.role, p.ecole.nom, p.teacher?.nom),
        })),
      };
    }

    return this.proceedAfterProfileChosen(account.id, account.profiles[0]!, account.telephoneE164);
  }

  async selectProfile(loginToken: string, profileId: string) {
    let payload;
    try {
      payload = verifyLoginToken(loginToken);
    } catch {
      throw new ApiError(401, "INVALID_LOGIN_TOKEN", "Session de connexion expirée, veuillez recommencer.");
    }

    const profile = await this.prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile || profile.accountId !== payload.accountId) {
      throw new ApiError(400, "INVALID_PROFILE", "Profil invalide.");
    }

    const account = await this.prisma.account.findUniqueOrThrow({ where: { id: payload.accountId } });
    return this.proceedAfterProfileChosen(account.id, profile, account.telephoneE164);
  }

  private async proceedAfterProfileChosen(accountId: string, profile: ProfileContext, phone: string) {
    if (profile.etat === "SUSPENDU") {
      await withRlsBypass(this.rootPrisma, (tx) =>
        recordAudit(tx, {
          ecoleId: profile.ecoleId,
          actorProfileId: profile.id,
          action: "LOGIN_DENIED_SUSPENDED",
          entityType: "Profile",
          entityId: profile.id,
        }),
      );
      throw new ApiError(403, "ACCOUNT_SUSPENDED", "Cet accès est suspendu. Contactez la direction de l'établissement.");
    }

    const requires2fa = ROLES_REQUIRING_2FA.includes(profile.role);
    if (requires2fa) {
      const { challengeId, devCode } = await this.startOtpChallenge(accountId, profile.id, phone, "SMS");
      return { status: "OTP_REQUIRED" as const, challengeId, channel: "SMS" as const, devCode };
    }

    const nom = await this.resolveDisplayName(profile.id, profile.role);
    const session = await this.issueSession(accountId, profile, nom, false);
    return { status: "AUTHENTICATED" as const, ...session, role: profile.role, profileId: profile.id, ecoleId: profile.ecoleId };
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

    const profile = await this.prisma.profile.findUniqueOrThrow({ where: { id: challenge.profileId! } });
    if (profile.etat === "SUSPENDU") {
      throw new ApiError(403, "ACCOUNT_SUSPENDED", "Cet accès est suspendu. Contactez la direction de l'établissement.");
    }
    const nom = await this.resolveDisplayName(profile.id, profile.role);
    const session = await this.issueSession(challenge.accountId, profile, nom, true);
    return { status: "AUTHENTICATED" as const, ...session, role: profile.role, profileId: profile.id, ecoleId: profile.ecoleId };
  }

  async resendOtp(challengeId: string, channel: "SMS" | "VOICE") {
    const challenge = await this.prisma.otpChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge || challenge.consumedAt) {
      throw new ApiError(400, "OTP_INVALID", "Session de code invalide.");
    }
    const account = await this.prisma.account.findUniqueOrThrow({ where: { id: challenge.accountId } });
    const code = generateOtpCode();
    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { codeHash: hashOtpCode(code), expiresAt: new Date(Date.now() + OTP_TTL_MS), attempts: 0 },
    });
    await smsProvider.sendOtp(account.telephoneE164, code, channel);
    return { challengeId: challenge.id, channel, devCode: process.env.NODE_ENV !== "production" ? code : undefined };
  }

  async refresh(refreshToken: string) {
    const tokenHash = hashRefreshToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Session expirée, reconnectez-vous.");
    }
    const profile = await this.prisma.profile.findUniqueOrThrow({ where: { id: stored.profileId } });
    if (profile.etat === "SUSPENDU") {
      throw new ApiError(403, "ACCOUNT_SUSPENDED", "Cet accès est suspendu. Contactez la direction de l'établissement.");
    }
    const nom = await this.resolveDisplayName(profile.id, profile.role);
    const accessToken = signAccessToken({
      accountId: stored.accountId,
      profileId: profile.id,
      ecoleId: profile.ecoleId,
      role: profile.role,
      nom,
      via2fa: true,
    });
    return { accessToken, role: profile.role, profileId: profile.id, ecoleId: profile.ecoleId, nom };
  }

  async logout(refreshToken: string) {
    const tokenHash = hashRefreshToken(refreshToken);
    await this.prisma.refreshToken.updateMany({ where: { tokenHash }, data: { revokedAt: new Date() } });
  }

  private async resolveDisplayName(profileId: string, role: Role): Promise<string> {
    if (role === "ENSEIGNANT") {
      const teacher = await this.prisma.teacher.findUnique({ where: { profileId } });
      if (teacher) return teacher.nom;
    }
    return ROLE_LABELS[role];
  }
}
