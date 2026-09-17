import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { Niveau } from "@prisma/client";
import { buildTestApp } from "../helpers/app.js";
import { resetDatabase, testPrisma } from "../helpers/db.js";
import {
  createAccountWithProfile,
  createClasse,
  createEcole,
  createStudent,
  createSubject,
  createTeacher,
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

describe("Idempotence de l'appel", () => {
  it("rejouer le même appel ne crée pas de doublons (upsert sur studentId+sessionId+date)", async () => {
    const ecole = await createEcole();
    const classe = await createClasse(ecole.id, Niveau.PRIMAIRE, "Classe Appel");
    const subject = await createSubject(ecole.id, "Français");
    const studentA = await createStudent(ecole.id, classe.id, "A-0001", "Traoré", "Awa");
    const studentB = await createStudent(ecole.id, classe.id, "A-0002", "Diarra", "Modibo");

    const { account: teacherAccount, profile: teacherProfile } = await createAccountWithProfile(ecole.id, "+22370020001", Role.ENSEIGNANT);
    const teacher = await createTeacher(ecole.id, teacherProfile.id, "ENS-T01");
    const token = issueTestAccessToken(teacherAccount.id, teacherProfile.id, ecole.id, Role.ENSEIGNANT);

    const slot = await testPrisma.timetableSlot.create({
      data: { classeId: classe.id, subjectId: subject.id, teacherId: teacher.id, jour: 1, heureDebut: "08:00", dureeMinutes: 60, salle: "Salle 1", anneeScolaire: "2025-2026" },
    });

    const date = "2026-01-15";
    const payload = {
      sessionId: slot.id,
      date,
      entries: [
        { studentId: studentA.id, type: "PRESENT" },
        { studentId: studentB.id, type: "ABSENT" },
      ],
    };

    const first = await app.inject({
      method: "POST",
      url: `/classes/${classe.id}/attendance/bulk`,
      headers: { authorization: `Bearer ${token}` },
      payload,
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: "POST",
      url: `/classes/${classe.id}/attendance/bulk`,
      headers: { authorization: `Bearer ${token}` },
      payload,
    });
    expect(second.statusCode).toBe(200);

    const rows = await testPrisma.attendance.findMany({ where: { sessionId: slot.id, date: new Date(date) } });
    expect(rows).toHaveLength(2);

    const forStudentB = rows.find((r) => r.studentId === studentB.id);
    expect(forStudentB?.type).toBe("ABSENT");

    // Rejouer avec une valeur différente pour B doit mettre à jour la même ligne, pas en ajouter une.
    const third = await app.inject({
      method: "POST",
      url: `/classes/${classe.id}/attendance/bulk`,
      headers: { authorization: `Bearer ${token}` },
      payload: { sessionId: slot.id, date, entries: [{ studentId: studentB.id, type: "RETARD" }] },
    });
    expect(third.statusCode).toBe(200);

    const rowsAfter = await testPrisma.attendance.findMany({ where: { sessionId: slot.id, date: new Date(date) } });
    expect(rowsAfter).toHaveLength(2);
    expect(rowsAfter.find((r) => r.studentId === studentB.id)?.type).toBe("RETARD");
  });
});
