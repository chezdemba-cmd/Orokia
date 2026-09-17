import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "../helpers/app.js";
import { resetDatabase, testPrisma } from "../helpers/db.js";
import { createAccountWithProfile, createEcole, createTerm, issueTestAccessToken, Role } from "../helpers/factory.js";

let app: FastifyInstance;

beforeEach(async () => {
  await resetDatabase();
  app = await buildTestApp();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("Application des rôles", () => {
  it("refuse à une Secrétaire de publier un trimestre (réservé à la Direction) et journalise l'accès refusé", async () => {
    const ecole = await createEcole();
    const term = await createTerm(ecole.id, 1, "OUVERTE");
    const { account, profile } = await createAccountWithProfile(ecole.id, "+22370030001", Role.SECRETAIRE);
    const token = issueTestAccessToken(account.id, profile.id, ecole.id, Role.SECRETAIRE);

    const res = await app.inject({
      method: "POST",
      url: `/terms/${term.id}/publish`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(403);

    const logs = await testPrisma.auditLog.findMany({ where: { action: "ACCESS_DENIED", actorProfileId: profile.id } });
    expect(logs).toHaveLength(1);
  });

  it("autorise la Direction à publier le trimestre", async () => {
    const ecole = await createEcole();
    const term = await createTerm(ecole.id, 1, "OUVERTE");
    const { account, profile } = await createAccountWithProfile(ecole.id, "+22370030002", Role.DIRECTION);
    const token = issueTestAccessToken(account.id, profile.id, ecole.id, Role.DIRECTION);

    const res = await app.inject({
      method: "POST",
      url: `/terms/${term.id}/publish`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const updatedTerm = await testPrisma.term.findUniqueOrThrow({ where: { id: term.id } });
    expect(updatedTerm.statut).toBe("CLOTUREE");
  });

  it("refuse une requête sans jeton d'accès", async () => {
    const ecole = await createEcole();
    const term = await createTerm(ecole.id, 1, "OUVERTE");

    const res = await app.inject({ method: "POST", url: `/terms/${term.id}/publish` });
    expect(res.statusCode).toBe(401);
  });
});
