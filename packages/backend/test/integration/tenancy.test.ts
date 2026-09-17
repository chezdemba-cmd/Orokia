import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { Niveau } from "@prisma/client";
import { buildTestApp } from "../helpers/app.js";
import { resetDatabase, testPrisma } from "../helpers/db.js";
import {
  createAccount,
  createAccountWithProfile,
  createClasse,
  createEcole,
  createProfile,
  createTerm,
  DEFAULT_PASSWORD,
  issueTestAccessToken,
  Role,
} from "../helpers/factory.js";

let app: FastifyInstance;

beforeEach(async () => {
  await resetDatabase();
  app = await buildTestApp();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

async function setupTwoSchools() {
  const ecoleA = await createEcole();
  const ecoleB = await createEcole();
  const termA = await createTerm(ecoleA.id, 1, "OUVERTE");
  const termB = await createTerm(ecoleB.id, 1, "OUVERTE");
  const classeA = await createClasse(ecoleA.id, Niveau.COLLEGE, "Classe A");
  const classeB = await createClasse(ecoleB.id, Niveau.COLLEGE, "Classe B");

  const { account: accountA, profile: profileA } = await createAccountWithProfile(ecoleA.id, "+22370050001", Role.DIRECTION);
  const { account: accountB, profile: profileB } = await createAccountWithProfile(ecoleB.id, "+22370050002", Role.DIRECTION);
  const tokenA = issueTestAccessToken(accountA.id, profileA.id, ecoleA.id, Role.DIRECTION);
  const tokenB = issueTestAccessToken(accountB.id, profileB.id, ecoleB.id, Role.DIRECTION);

  return { ecoleA, ecoleB, termA, termB, classeA, classeB, accountA, profileA, tokenA, accountB, profileB, tokenB };
}

describe("Isolation multi-établissement", () => {
  it("GET /classes de l'École A ne retourne que les classes de l'École A", async () => {
    const { classeA, classeB, tokenA } = await setupTwoSchools();

    const res = await app.inject({ method: "GET", url: "/classes", headers: { authorization: `Bearer ${tokenA}` } });
    expect(res.statusCode).toBe(200);
    const ids = res.json().classes.map((c: { id: string }) => c.id);
    expect(ids).toContain(classeA.id);
    expect(ids).not.toContain(classeB.id);
  });

  it("GET /classes/:id avec l'id d'une classe d'une autre école renvoie 404", async () => {
    const { classeB, tokenA } = await setupTwoSchools();

    const res = await app.inject({ method: "GET", url: `/classes/${classeB.id}`, headers: { authorization: `Bearer ${tokenA}` } });
    expect(res.statusCode).toBe(404);
  });

  it("la Direction d'une école ne peut pas publier le trimestre d'une autre école", async () => {
    const { termB, tokenA } = await setupTwoSchools();

    const res = await app.inject({
      method: "POST",
      url: `/terms/${termB.id}/publish`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(404);

    const term = await testPrisma.term.findUniqueOrThrow({ where: { id: termB.id } });
    expect(term.statut).toBe("OUVERTE");
  });

  it("un compte avec un profil dans chaque école obtient le sélecteur, et chaque profil ne voit que sa propre école", async () => {
    const { ecoleA, ecoleB, classeA, classeB } = await setupTwoSchools();

    const account = await createAccount("+22370050099");
    const profileAtA = await createProfile(account.id, ecoleA.id, Role.ENSEIGNANT);
    await createProfile(account.id, ecoleB.id, Role.ENSEIGNANT);

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { telephone: "+22370050099", motDePasse: DEFAULT_PASSWORD },
    });
    expect(login.statusCode).toBe(200);
    const loginBody = login.json();
    expect(loginBody.status).toBe("PROFILE_SELECTION_REQUIRED");
    expect(loginBody.profiles).toHaveLength(2);

    const selectA = await app.inject({
      method: "POST",
      url: "/auth/select-profile",
      payload: { loginToken: loginBody.loginToken, profileId: profileAtA.id },
    });
    const tokenAtA = selectA.json().accessToken;

    const classesAtA = await app.inject({ method: "GET", url: "/classes", headers: { authorization: `Bearer ${tokenAtA}` } });
    const idsAtA = classesAtA.json().classes.map((c: { id: string }) => c.id);
    expect(idsAtA).toContain(classeA.id);
    expect(idsAtA).not.toContain(classeB.id);

    const selectB = await app.inject({
      method: "POST",
      url: "/auth/select-profile",
      payload: { loginToken: loginBody.loginToken, profileId: (await testPrisma.profile.findFirstOrThrow({ where: { accountId: account.id, ecoleId: ecoleB.id } })).id },
    });
    const tokenAtB = selectB.json().accessToken;

    const classesAtB = await app.inject({ method: "GET", url: "/classes", headers: { authorization: `Bearer ${tokenAtB}` } });
    const idsAtB = classesAtB.json().classes.map((c: { id: string }) => c.id);
    expect(idsAtB).toContain(classeB.id);
    expect(idsAtB).not.toContain(classeA.id);
  });

  it("GET /accounts de l'École A ne liste pas les profils de l'École B", async () => {
    const { profileA, profileB, tokenA } = await setupTwoSchools();

    const res = await app.inject({ method: "GET", url: "/accounts", headers: { authorization: `Bearer ${tokenA}` } });
    expect(res.statusCode).toBe(200);
    const profileIds = res.json().accounts.map((a: { profileId: string }) => a.profileId);
    expect(profileIds).toContain(profileA.id);
    expect(profileIds).not.toContain(profileB.id);
  });
});
