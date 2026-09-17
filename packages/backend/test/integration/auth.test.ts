import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "../helpers/app.js";
import { resetDatabase, testPrisma } from "../helpers/db.js";
import { createAccount, createEcole, createProfile, DEFAULT_PASSWORD, Role } from "../helpers/factory.js";

let app: FastifyInstance;

beforeEach(async () => {
  await resetDatabase();
  app = await buildTestApp();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("POST /auth/login — profil unique, sans 2FA", () => {
  it("authentifie directement un enseignant (pas de 2FA requise)", async () => {
    const ecole = await createEcole();
    const account = await createAccount("+22370000001");
    await createProfile(account.id, ecole.id, Role.ENSEIGNANT);

    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { telephone: "+22370000001", motDePasse: DEFAULT_PASSWORD },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("AUTHENTICATED");
    expect(body.accessToken).toEqual(expect.any(String));

    const me = await app.inject({ method: "GET", url: "/auth/me", headers: { authorization: `Bearer ${body.accessToken}` } });
    expect(me.statusCode).toBe(200);
    expect(me.json().role).toBe("ENSEIGNANT");
  });
});

describe("POST /auth/login — profil unique, 2FA requise", () => {
  it("exige un OTP pour la Direction avant d'émettre une session", async () => {
    const ecole = await createEcole();
    const account = await createAccount("+22370000002");
    await createProfile(account.id, ecole.id, Role.DIRECTION);

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { telephone: "+22370000002", motDePasse: DEFAULT_PASSWORD },
    });
    expect(login.statusCode).toBe(200);
    const loginBody = login.json();
    expect(loginBody.status).toBe("OTP_REQUIRED");
    expect(loginBody.devCode).toMatch(/^\d{6}$/);

    const wrongOtp = await app.inject({
      method: "POST",
      url: "/auth/otp/verify",
      payload: { challengeId: loginBody.challengeId, code: "000000" },
    });
    expect(wrongOtp.statusCode).toBe(401);

    const verify = await app.inject({
      method: "POST",
      url: "/auth/otp/verify",
      payload: { challengeId: loginBody.challengeId, code: loginBody.devCode },
    });
    expect(verify.statusCode).toBe(200);
    expect(verify.json().status).toBe("AUTHENTICATED");
  });
});

describe("POST /auth/login — multi-profil", () => {
  it("demande la sélection de profil puis applique la règle 2FA du profil choisi", async () => {
    const ecole = await createEcole();
    const account = await createAccount("+22370000003");
    const enseignantProfile = await createProfile(account.id, ecole.id, Role.ENSEIGNANT);
    await createProfile(account.id, ecole.id, Role.CENSEUR);

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { telephone: "+22370000003", motDePasse: DEFAULT_PASSWORD },
    });
    expect(login.statusCode).toBe(200);
    const loginBody = login.json();
    expect(loginBody.status).toBe("PROFILE_SELECTION_REQUIRED");
    expect(loginBody.profiles).toHaveLength(2);

    // Choisir le profil Enseignant (pas de 2FA) -> session immédiate.
    const select = await app.inject({
      method: "POST",
      url: "/auth/select-profile",
      payload: { loginToken: loginBody.loginToken, profileId: enseignantProfile.id },
    });
    expect(select.statusCode).toBe(200);
    expect(select.json().status).toBe("AUTHENTICATED");
  });

  it("route le profil Censeur du même compte vers l'OTP", async () => {
    const ecole = await createEcole();
    const account = await createAccount("+22370000004");
    await createProfile(account.id, ecole.id, Role.ENSEIGNANT);
    const censeurProfile = await createProfile(account.id, ecole.id, Role.CENSEUR);

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { telephone: "+22370000004", motDePasse: DEFAULT_PASSWORD },
    });
    const loginBody = login.json();

    const select = await app.inject({
      method: "POST",
      url: "/auth/select-profile",
      payload: { loginToken: loginBody.loginToken, profileId: censeurProfile.id },
    });
    expect(select.statusCode).toBe(200);
    expect(select.json().status).toBe("OTP_REQUIRED");
  });
});

describe("POST /auth/login — compte suspendu", () => {
  it("rejette la connexion et journalise la tentative", async () => {
    const ecole = await createEcole();
    const account = await createAccount("+22370000005");
    const profile = await createProfile(account.id, ecole.id, Role.ENSEIGNANT, { etat: "SUSPENDU" });

    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { telephone: "+22370000005", motDePasse: DEFAULT_PASSWORD },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("ACCOUNT_SUSPENDED");

    const logs = await testPrisma.auditLog.findMany({ where: { action: "LOGIN_DENIED_SUSPENDED", entityId: profile.id } });
    expect(logs).toHaveLength(1);
  });
});
