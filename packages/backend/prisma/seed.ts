import { PrismaClient, Niveau, StatutEmploi, Role, TermStatus } from "@prisma/client";
import { hash as argon2Hash } from "@node-rs/argon2";
import { recomputeConflictsForDay } from "../src/lib/timetable.js";
import { computeGrossPermanent, computeGrossVacataire, computePayroll } from "../src/lib/payroll.js";
import { generatePayslipVerificationId, generateReceiptVerificationId } from "../src/lib/verification-id.js";

// connection_limit=1 : une seule connexion dédiée pour tout le script, pour que le
// SET (session, pas LOCAL) de contournement RLS ci-dessous s'applique à toutes les requêtes.
function withSingleConnection(url: string | undefined): string | undefined {
  if (!url) return url;
  return `${url}${url.includes("?") ? "&" : "?"}connection_limit=1`;
}

const prisma = new PrismaClient({
  datasources: { db: { url: withSingleConnection(process.env.DATABASE_URL) } },
});

const ANNEE = "2025-2026";
const DEV_PASSWORD = "Orokia2026!";

const PRENOMS_F = ["Aïchata", "Fatoumata", "Mariam", "Aminata", "Kadiatou", "Djénéba", "Awa", "Rokia", "Salimata", "Oumou"];
const PRENOMS_M = ["Modibo", "Ibrahim", "Seydou", "Oumar", "Moussa", "Bakary", "Adama", "Drissa", "Boubacar", "Souleymane"];
const NOMS = ["Traoré", "Diarra", "Coulibaly", "Keïta", "Diallo", "Konaté", "Cissé", "Samaké", "Sidibé", "Bagayoko", "Touré", "Maïga"];

function pick<T>(arr: readonly T[], i: number): T {
  const item = arr[i % arr.length];
  if (item === undefined) throw new Error("pick() out of range");
  return item;
}

function randPhone(n: number): string {
  return `+22370${String(100000 + n).slice(-6)}`;
}

async function hash(password: string) {
  return argon2Hash(password);
}

async function main() {
  // Le seed écrit à travers toutes les écoles — RLS désactivée pour ce script.
  await prisma.$executeRawUnsafe(`SET app.bypass_rls = 'on'`);

  console.log("Seeding OROKIA — École Awa Danté...");

  const ecole = await prisma.ecole.create({
    data: {
      nom: "Groupe Scolaire Awa Danté",
      adresse: "Médina Coura, Bamako",
      telephone: "+22320123456",
      anneeScolaireActive: ANNEE,
    },
  });

  const [t1, , ,] = await Promise.all([
    prisma.term.create({ data: { ecoleId: ecole.id, numero: 1, anneeScolaire: ANNEE, statut: TermStatus.OUVERTE } }),
    prisma.term.create({ data: { ecoleId: ecole.id, numero: 2, anneeScolaire: ANNEE, statut: TermStatus.OUVERTE } }),
    prisma.term.create({ data: { ecoleId: ecole.id, numero: 3, anneeScolaire: ANNEE, statut: TermStatus.OUVERTE } }),
  ]);

  const subjectNames = [
    "Français", "Mathématiques", "Anglais", "Sciences Physiques", "SVT",
    "Histoire-Géographie", "EPS", "Bambara", "Philosophie", "ECM", "Informatique",
  ];
  const subjects = new Map<string, { id: string }>();
  for (const nom of subjectNames) {
    subjects.set(nom, await prisma.subject.create({ data: { nom, ecoleId: ecole.id } }));
  }

  // --- Direction / Censeur / Secrétaire ---
  const directionAccount = await prisma.account.create({
    data: {
      telephoneE164: randPhone(1),
      passwordHash: await hash(DEV_PASSWORD),
      twoFactorEnabled: true,
      profiles: { create: { role: Role.DIRECTION, ecoleId: ecole.id } },
    },
  });

  const censeurAccount = await prisma.account.create({
    data: {
      telephoneE164: randPhone(2),
      passwordHash: await hash(DEV_PASSWORD),
      twoFactorEnabled: true,
      profiles: { create: { role: Role.CENSEUR, ecoleId: ecole.id } },
    },
  });

  const secretaireAccount = await prisma.account.create({
    data: {
      telephoneE164: randPhone(3),
      passwordHash: await hash(DEV_PASSWORD),
      twoFactorEnabled: false, // deliberate: exercises the "2FA not enabled" warning on Comptes et permissions
      profiles: { create: { role: Role.SECRETAIRE, ecoleId: ecole.id } },
    },
  });

  console.log("Direction:", directionAccount.telephoneE164);
  console.log("Censeur:", censeurAccount.telephoneE164);
  console.log("Secrétaire:", secretaireAccount.telephoneE164);

  // --- Enseignants (8), one of them also holds a CENSEUR profile on the same phone
  // to exercise the multi-profile picker within the web staff app's scope. ---
  const teacherDefs = [
    { nom: "Ibrahim Samaké", statut: StatutEmploi.PERMANENT, matricule: "ENS-001" },
    { nom: "Aïchata Bagayoko", statut: StatutEmploi.PERMANENT, matricule: "ENS-002" },
    { nom: "Modibo Diarra", statut: StatutEmploi.PERMANENT, matricule: "ENS-003" },
    { nom: "Fatoumata Coulibaly", statut: StatutEmploi.VACATAIRE, matricule: "ENS-004" },
    { nom: "Seydou Konaté", statut: StatutEmploi.PERMANENT, matricule: "ENS-005" },
    { nom: "Mariam Traoré", statut: StatutEmploi.VACATAIRE, matricule: "ENS-006" },
    { nom: "Oumar Cissé", statut: StatutEmploi.PERMANENT, matricule: "ENS-007" },
    { nom: "Djénéba Sidibé", statut: StatutEmploi.VACATAIRE, matricule: "ENS-008" },
  ];

  const teachers: { id: string; nom: string; profileId: string }[] = [];
  let ibrahimAccountId = "";
  let ibrahimPhone = "";
  for (let i = 0; i < teacherDefs.length; i++) {
    const def = teacherDefs[i]!;
    const isMultiProfile = i === 0; // Ibrahim Samaké: Enseignant + Censeur on one phone
    const account = await prisma.account.create({
      data: {
        telephoneE164: randPhone(10 + i),
        passwordHash: await hash(DEV_PASSWORD),
        twoFactorEnabled: false,
      },
    });
    const teacherProfile = await prisma.profile.create({ data: { accountId: account.id, ecoleId: ecole.id, role: Role.ENSEIGNANT } });
    const teacher = await prisma.teacher.create({
      data: {
        ecoleId: ecole.id,
        profileId: teacherProfile.id,
        nom: def.nom,
        statutEmploi: def.statut,
        matriculeEmploye: def.matricule,
        salaireBase: def.statut === StatutEmploi.PERMANENT ? 185000 : null,
        tauxHoraire: def.statut === StatutEmploi.VACATAIRE ? 3500 : 2500,
      },
    });
    if (isMultiProfile) {
      await prisma.profile.create({ data: { accountId: account.id, ecoleId: ecole.id, role: Role.CENSEUR } });
      ibrahimAccountId = account.id;
      ibrahimPhone = account.telephoneE164;
      console.log(`Compte multi-profil (Enseignant + Censeur): ${account.telephoneE164}`);
    }
    teachers.push({ id: teacher.id, nom: def.nom, profileId: teacherProfile.id });
  }

  // --- Classes ---
  const classeDefs: { nom: string; niveau: Niveau; principalIdx: number }[] = [
    { nom: "3ᵉ Année", niveau: Niveau.PRIMAIRE, principalIdx: 1 },
    { nom: "5ᵉ Année", niveau: Niveau.PRIMAIRE, principalIdx: 2 },
    { nom: "7ᵉ B", niveau: Niveau.COLLEGE, principalIdx: 3 },
    { nom: "9ᵉ A", niveau: Niveau.COLLEGE, principalIdx: 4 },
    { nom: "11ᵉ TSE", niveau: Niveau.LYCEE, principalIdx: 0 },
    { nom: "Terminale TSE", niveau: Niveau.LYCEE, principalIdx: 6 },
  ];

  const classes: { id: string; nom: string; niveau: Niveau }[] = [];
  for (const def of classeDefs) {
    const classe = await prisma.classe.create({
      data: {
        ecoleId: ecole.id,
        nom: def.nom,
        niveau: def.niveau,
        anneeScolaire: ANNEE,
        professeurPrincipalId: teachers[def.principalIdx]!.id,
      },
    });
    classes.push(classe);
  }

  // --- Teacher assignments (subjects + coefficients per class) ---
  const subjectPlan: { nom: string; coefficient: number }[] =
    [
      { nom: "Français", coefficient: 4 },
      { nom: "Mathématiques", coefficient: 4 },
      { nom: "Anglais", coefficient: 2 },
      { nom: "Sciences Physiques", coefficient: 3 },
      { nom: "SVT", coefficient: 2 },
      { nom: "Histoire-Géographie", coefficient: 2 },
      { nom: "EPS", coefficient: 1 },
    ];

  const assignmentsByClass = new Map<
    string,
    { subjectId: string; subjectNom: string; coefficient: number; teacherId: string }[]
  >();

  for (const classe of classes) {
    const assignments: { subjectId: string; subjectNom: string; coefficient: number; teacherId: string }[] = [];
    for (let i = 0; i < subjectPlan.length; i++) {
      const plan = subjectPlan[i]!;
      const subject = subjects.get(plan.nom)!;
      const teacher = teachers[i % teachers.length]!;
      await prisma.teacherAssignment.create({
        data: {
          teacherId: teacher.id,
          teacherProfileId: teacher.profileId,
          subjectId: subject.id,
          classeId: classe.id,
          coefficient: plan.coefficient,
        },
      });
      assignments.push({ subjectId: subject.id, subjectNom: plan.nom, coefficient: plan.coefficient, teacherId: teacher.id });
    }
    assignmentsByClass.set(classe.id, assignments);
  }

  // --- Students + Guardians ---
  let studentCounter = 0;
  let guardianCounter = 0;
  const studentsByClass = new Map<string, { id: string; matricule: string; nom: string; prenom: string }[]>();
  const studentIdToGuardianId = new Map<string, string>();

  for (const classe of classes) {
    const effectif = 18;
    const classStudents: { id: string; matricule: string; nom: string; prenom: string }[] = [];
    // Two siblings share one guardian every 5th student, to exercise the guardian<->many-children relation.
    let pendingSiblingGuardianId: string | null = null;

    for (let i = 0; i < effectif; i++) {
      studentCounter++;
      const isFille = studentCounter % 2 === 0;
      const prenom = isFille ? pick(PRENOMS_F, studentCounter) : pick(PRENOMS_M, studentCounter);
      const nom = pick(NOMS, studentCounter + 3);
      const matricule = `AD-${2300 + studentCounter}`;

      const student = await prisma.student.create({
        data: {
          ecoleId: ecole.id,
          matricule,
          nom,
          prenom,
          dateNaissance: new Date(2026 - (classe.niveau === "PRIMAIRE" ? 9 : classe.niveau === "COLLEGE" ? 14 : 17), i % 12, (i % 27) + 1),
          classeId: classe.id,
          dateInscription: new Date(2021, 8, 1),
        },
      });

      let guardianId = pendingSiblingGuardianId;
      if (!guardianId) {
        guardianCounter++;
        const guardian = await prisma.guardian.create({
          data: {
            nom: `${pick(NOMS, guardianCounter)} ${isFille ? "Diarra" : "Koné"}`,
            lien: isFille ? "Mère" : "Père",
            telephoneE164: randPhone(200 + guardianCounter),
            canalPrefere: guardianCounter % 4 === 0 ? "sms" : "application",
          },
        });
        guardianId = guardian.id;
        if (i % 5 === 0) {
          pendingSiblingGuardianId = guardianId; // next student shares this guardian (sibling)
        }
      } else {
        pendingSiblingGuardianId = null;
      }

      await prisma.guardianStudent.create({ data: { guardianId, studentId: student.id } });
      studentIdToGuardianId.set(student.id, guardianId);
      classStudents.push({ id: student.id, matricule, nom, prenom });
    }
    studentsByClass.set(classe.id, classStudents);
  }

  // --- Comptes Parent/Élève réels (mobile) ---
  // Un tuteur avec deux enfants dans des classes différentes, pour exercer
  // la "Vue famille" multi-enfants côté app mobile.
  const firstClassStudents = studentsByClass.get(classes[0]!.id)!;
  const secondClassStudents = studentsByClass.get(classes[1]!.id)!;
  const crossClassGuardianId = studentIdToGuardianId.get(firstClassStudents[0]!.id)!;
  await prisma.guardianStudent.create({ data: { guardianId: crossClassGuardianId, studentId: secondClassStudents[0]!.id } });

  const crossClassGuardianAccount = await prisma.account.create({
    data: {
      telephoneE164: randPhone(300),
      passwordHash: await hash(DEV_PASSWORD),
      twoFactorEnabled: false,
    },
  });
  const crossClassGuardianProfile = await prisma.profile.create({ data: { accountId: crossClassGuardianAccount.id, ecoleId: ecole.id, role: Role.PARENT } });
  await prisma.guardian.update({ where: { id: crossClassGuardianId }, data: { profileId: crossClassGuardianProfile.id } });
  console.log(`Parent multi-enfants (${firstClassStudents[0]!.prenom} + ${secondClassStudents[0]!.prenom}) : ${crossClassGuardianAccount.telephoneE164}`);

  // Cinq autres tuteurs "classiques" (un seul enfant chacun) avec un vrai compte.
  const otherGuardianIds = [...new Set(studentIdToGuardianId.values())].filter((gId) => gId !== crossClassGuardianId);
  let parentAccountsCreated = 1;
  for (const guardianId of otherGuardianIds) {
    if (parentAccountsCreated >= 6) break;

    const account = await prisma.account.create({
      data: { telephoneE164: randPhone(300 + parentAccountsCreated), passwordHash: await hash(DEV_PASSWORD), twoFactorEnabled: false },
    });
    const profile = await prisma.profile.create({ data: { accountId: account.id, ecoleId: ecole.id, role: Role.PARENT } });
    await prisma.guardian.update({ where: { id: guardianId }, data: { profileId: profile.id } });
    parentAccountsCreated++;
  }
  console.log(`${parentAccountsCreated} comptes Parent créés (mot de passe ${DEV_PASSWORD}).`);

  // Trois comptes Élève réels.
  const studentAccountCandidates = [...firstClassStudents.slice(1, 3), ...secondClassStudents.slice(1, 2)];
  let studentAccountsCreated = 0;
  for (const s of studentAccountCandidates) {
    const account = await prisma.account.create({
      data: { telephoneE164: randPhone(320 + studentAccountsCreated), passwordHash: await hash(DEV_PASSWORD), twoFactorEnabled: false },
    });
    const profile = await prisma.profile.create({ data: { accountId: account.id, ecoleId: ecole.id, role: Role.ELEVE } });
    await prisma.student.update({ where: { id: s.id }, data: { profileId: profile.id } });
    studentAccountsCreated++;
    console.log(`Élève ${s.prenom} ${s.nom} : ${account.telephoneE164}`);
  }

  // --- Grades (Term 1) ---
  // Marks are drawn from a small deterministic-ish pseudo-random spread so the
  // dataset looks plausible without needing a real RNG dependency.
  function markFor(seed: number, max: number): number {
    const spread = ((seed * 37) % 61) / 60; // 0..1
    const value = max * (0.45 + spread * 0.5); // roughly 45%-95% of the barème
    return Math.round(value * 2) / 2; // demi-points
  }

  let gradesCreated = 0;
  for (const classe of classes) {
    const bareme = classe.niveau === "PRIMAIRE" ? 10 : 20;
    const assignments = assignmentsByClass.get(classe.id)!;
    const students = studentsByClass.get(classe.id)!;

    for (let si = 0; si < students.length; si++) {
      const student = students[si]!;
      for (const assignment of assignments) {
        // Classe 7ᵉ B (index 2) : les deux premiers élèves ont des notes strictement
        // identiques dans toutes les matières -> égalité volontaire pour tester le rang partagé.
        const isTieClass = classe.nom === "7ᵉ B";
        const markSeed = isTieClass && si < 2 ? studentsByClass.get(classe.id)!.length + assignments.indexOf(assignment) : si + assignments.indexOf(assignment) * 3;

        const devoir1 = markFor(markSeed + student.matricule.length, bareme);
        const devoir2 = markFor(markSeed * 2 + 1, bareme);

        // Classe "3ᵉ Année" (index 0), premier élève, matière Mathématiques :
        // composition volontairement manquante -> moyenne null, exclu du classement.
        const isIncompleteCase = classe.nom === "3ᵉ Année" && si === 0 && assignment.subjectNom === "Mathématiques";
        const composition = isIncompleteCase ? null : markFor(markSeed * 3 + 2, bareme);

        const average =
          devoir1 !== null && devoir2 !== null && composition !== null
            ? Math.round(((devoir1 + devoir2 + composition * 2) / 4) * 100) / 100
            : null;

        await prisma.grade.create({
          data: {
            studentId: student.id,
            subjectId: assignment.subjectId,
            classeId: classe.id,
            termId: t1.id,
            devoir1,
            devoir2,
            composition,
            average,
          },
        });
        gradesCreated++;
      }
    }
  }

  // --- Emploi du temps ---
  // Le premier créneau de chaque classe (08:00) sert aussi d'ancrage pour l'appel.
  // Deux classes partagent volontairement le même enseignant au même horaire un
  // même jour (Ibrahim Samaké, Français, 08:00) -> conflit détecté automatiquement
  // par recomputeConflictsForDay ci-dessous, sans intervention manuelle.
  const timetableByClass = new Map<string, { id: string }>();
  const jours = [1, 2, 3, 4, 5]; // lundi..vendredi
  const heures = ["08:00", "09:00", "10:00", "11:00"];

  for (let ci = 0; ci < classes.length; ci++) {
    const classe = classes[ci]!;
    const jour = jours[ci % jours.length]!;
    const assignments = assignmentsByClass.get(classe.id)!;

    for (let si = 0; si < heures.length; si++) {
      const assignment = assignments[si]!;
      const slot = await prisma.timetableSlot.create({
        data: {
          classeId: classe.id,
          subjectId: assignment.subjectId,
          teacherId: assignment.teacherId,
          jour,
          heureDebut: heures[si]!,
          dureeMinutes: 60,
          salle: `Salle ${ci + 1}`,
          anneeScolaire: ANNEE,
        },
      });
      if (si === 0) timetableByClass.set(classe.id, slot);
    }
  }

  let conflictsDetected = 0;
  for (const jour of jours) {
    conflictsDetected += await recomputeConflictsForDay(prisma, ANNEE, jour);
  }

  // --- Présences (5 derniers jours ouvrés) ---
  const ATTENDANCE_TYPES = ["PRESENT", "PRESENT", "PRESENT", "PRESENT", "PRESENT", "PRESENT", "PRESENT", "PRESENT", "RETARD", "ABSENT"] as const;
  let attendanceCreated = 0;
  let unjustifiedOldAbsenceFlagged = false;

  for (const classe of classes) {
    const students = studentsByClass.get(classe.id)!;
    const slot = timetableByClass.get(classe.id)!;

    for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - dayOffset);

      for (let si = 0; si < students.length; si++) {
        const student = students[si]!;
        const typeIndex = (si + dayOffset) % ATTENDANCE_TYPES.length;
        let type = ATTENDANCE_TYPES[typeIndex]!;

        // Une absence non justifiée volontairement vieille de 3 jours (> 48h),
        // sur le premier élève de la première classe : cible pour la future escalade.
        let justificatif: string | null = null;
        if (classe.nom === "3ᵉ Année" && si === 0 && dayOffset === 3) {
          type = "ABSENT";
          justificatif = null;
          unjustifiedOldAbsenceFlagged = true;
        } else if (type === "ABSENT" && Math.random() > 0.5) {
          justificatif = "Motif communiqué par la famille — en attente de validation.";
        }

        await prisma.attendance.create({
          data: {
            studentId: student.id,
            classeId: classe.id,
            sessionId: slot.id,
            date,
            type,
            justificatif,
          },
        });
        attendanceCreated++;
      }
    }
  }

  // --- Cahier de texte (2 séances sur la première classe) ---
  const anchorClasse = classes[0]!;
  const anchorAssignments = assignmentsByClass.get(anchorClasse.id)!;
  const teacherByAssignment = teachers[0]!; // Ibrahim Samaké, Français
  await prisma.classLog.create({
    data: {
      classeId: anchorClasse.id,
      subjectId: anchorAssignments[0]!.subjectId,
      teacherId: teacherByAssignment.id,
      date: new Date(),
      titre: "Lecture suivie — chapitre 3",
      contenu: "Lecture à voix haute, questions de compréhension, vocabulaire nouveau au tableau.",
      devoirs: { create: { consigne: "Relire le chapitre 3 et préparer un résumé de 5 lignes.", echeance: new Date(Date.now() + 2 * 86400000) } },
    },
  });
  await prisma.classLog.create({
    data: {
      classeId: anchorClasse.id,
      subjectId: anchorAssignments[0]!.subjectId,
      teacherId: teacherByAssignment.id,
      date: new Date(Date.now() - 86400000),
      titre: "Grammaire — les accords",
      contenu: "Exercices d'application sur l'accord sujet-verbe.",
    },
  });

  // --- Annonces ---
  const directionProfile = await prisma.profile.findFirstOrThrow({ where: { accountId: directionAccount.id } });
  const censeurProfile = await prisma.profile.findFirstOrThrow({ where: { accountId: censeurAccount.id } });
  await prisma.announcement.create({
    data: {
      ecoleId: ecole.id,
      titre: "Réunion de rentrée — parents d'élèves",
      corps: "La réunion de rentrée se tiendra le samedi 10h dans la cour principale.",
      cible: "Toute l'école",
      statut: "PUBLIEE",
      publieAt: new Date(),
      auteurProfileId: directionProfile.id,
    },
  });
  await prisma.announcement.create({
    data: {
      ecoleId: ecole.id,
      titre: "Journée sportive — 9e A",
      corps: "Prévoir tenue de sport pour la journée sportive de vendredi.",
      cible: "9ᵉ A",
      statut: "PROGRAMMEE",
      programmeAt: new Date(Date.now() + 5 * 86400000),
      auteurProfileId: censeurProfile.id,
    },
  });
  await prisma.announcement.create({
    data: {
      ecoleId: ecole.id,
      titre: "Brouillon — sortie pédagogique",
      corps: "À finaliser avec le censeur avant diffusion.",
      cible: "Lycée",
      statut: "BROUILLON",
      auteurProfileId: directionProfile.id,
    },
  });

  // --- Messagerie interne (Direction <-> premier enseignant) ---
  const firstTeacherProfile = await prisma.profile.findFirstOrThrow({ where: { id: teacherByAssignment.profileId } });
  const conversation = await prisma.conversation.create({
    data: {
      type: "DIRECT",
      participants: { create: [{ profileId: directionProfile.id }, { profileId: firstTeacherProfile.id }] },
    },
  });
  await prisma.message.create({
    data: { conversationId: conversation.id, senderProfileId: directionProfile.id, corps: "Bonjour, pouvez-vous transmettre les notes du T1 avant vendredi ?" },
  });
  await prisma.message.create({
    data: { conversationId: conversation.id, senderProfileId: firstTeacherProfile.id, corps: "Bien reçu, je m'en occupe aujourd'hui." },
  });

  // --- Écolage (frais de scolarité) + quelques encaissements ---
  const MONTANT_PAR_NIVEAU: Record<Niveau, number> = { PRIMAIRE: 85_000, COLLEGE: 110_000, LYCEE: 135_000 };
  let tuitionIndex = 0;
  let paymentsCreated = 0;
  for (const classe of classes) {
    const montantDu = MONTANT_PAR_NIVEAU[classe.niveau];
    for (const student of studentsByClass.get(classe.id)!) {
      tuitionIndex++;
      const fee = await prisma.tuitionFee.create({
        data: {
          studentId: student.id,
          anneeScolaire: ANNEE,
          montantDu,
          echeances: [
            { tier: 1, montant: Math.round(montantDu / 3) },
            { tier: 2, montant: Math.round(montantDu / 3) },
            { tier: 3, montant: montantDu - 2 * Math.round(montantDu / 3) },
          ],
        },
      });

      const mod = tuitionIndex % 3;
      if (mod === 0) {
        // Soldé : paiement intégral.
        await prisma.payment.create({
          data: {
            tuitionFeeId: fee.id,
            montant: montantDu,
            modePaiement: "ESPECES",
            remisPar: `${student.nom} (parent)`,
            verificationId: generateReceiptVerificationId(),
            saisiParProfileId: directionProfile.id,
          },
        });
        paymentsCreated++;
      } else if (mod === 1) {
        // À jour : paiement partiel (1er tiers).
        await prisma.payment.create({
          data: {
            tuitionFeeId: fee.id,
            montant: Math.round(montantDu / 3),
            modePaiement: "ORANGE_MONEY",
            referenceTransaction: `OM-${1000 + tuitionIndex}`,
            remisPar: `${student.nom} (parent)`,
            verificationId: generateReceiptVerificationId(),
            saisiParProfileId: directionProfile.id,
          },
        });
        paymentsCreated++;
      }
      // mod === 2 : aucun versement -> "En retard", cas de test pour la relance SMS.
    }
  }

  // --- Paie du mois courant ---
  const periodeCourante = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  let payslipsCreated = 0;
  for (let i = 0; i < teacherDefs.length; i++) {
    const def = teacherDefs[i]!;
    const teacher = teachers[i]!;
    const isPrincipal = classeDefs.some((c) => teachers[c.principalIdx] === teacher);

    const brut =
      def.statut === StatutEmploi.PERMANENT
        ? computeGrossPermanent(185_000, 15_000, isPrincipal ? 10_000 : 0)
        : computeGrossVacataire(3500, 40);
    const { inps, its, net } = computePayroll(brut);

    await prisma.payrollLine.create({
      data: {
        teacherId: teacher.id,
        periode: periodeCourante,
        montantBrut: brut,
        retenues: { inps, its },
        montantNet: net,
        detail: {
          heures: def.statut === StatutEmploi.VACATAIRE ? 40 : 0,
          tauxHoraire: def.statut === StatutEmploi.VACATAIRE ? 3500 : null,
          salaireBase: def.statut === StatutEmploi.PERMANENT ? 185_000 : null,
          indemniteTransport: def.statut === StatutEmploi.PERMANENT ? 15_000 : 0,
          primeResponsabilite: def.statut === StatutEmploi.PERMANENT && isPrincipal ? 10_000 : 0,
        },
        verificationId: generatePayslipVerificationId(periodeCourante, def.matricule),
        valideParProfileId: directionProfile.id,
      },
    });
    payslipsCreated++;
  }

  console.log(
    `Créé : ${classes.length} classes, ${studentCounter} élèves, ${guardianCounter} tuteurs, ${gradesCreated} notes (T1), ${attendanceCreated} présences, ${classes.length * heures.length} créneaux d'emploi du temps, ${tuitionIndex} dossiers d'écolage (${paymentsCreated} encaissements), ${payslipsCreated} fiches de paie (${periodeCourante}).`,
  );

  // --- Deuxième école (isolation multi-établissement) ---
  console.log("\nSeeding OROKIA — Groupe Scolaire Horizon (Ségou)...");

  const ecoleHorizon = await prisma.ecole.create({
    data: {
      nom: "Groupe Scolaire Horizon",
      adresse: "Ségou",
      telephone: "+22321654321",
      anneeScolaireActive: ANNEE,
    },
  });

  await Promise.all([
    prisma.term.create({ data: { ecoleId: ecoleHorizon.id, numero: 1, anneeScolaire: ANNEE, statut: TermStatus.OUVERTE } }),
    prisma.term.create({ data: { ecoleId: ecoleHorizon.id, numero: 2, anneeScolaire: ANNEE, statut: TermStatus.OUVERTE } }),
    prisma.term.create({ data: { ecoleId: ecoleHorizon.id, numero: 3, anneeScolaire: ANNEE, statut: TermStatus.OUVERTE } }),
  ]);

  const horizonSubjectNames = ["Français", "Mathématiques", "Anglais", "Sciences Physiques", "Histoire-Géographie"];
  const horizonSubjects = new Map<string, { id: string }>();
  for (const nom of horizonSubjectNames) {
    horizonSubjects.set(nom, await prisma.subject.create({ data: { nom, ecoleId: ecoleHorizon.id } }));
  }

  const horizonDirectionAccount = await prisma.account.create({
    data: {
      telephoneE164: randPhone(500),
      passwordHash: await hash(DEV_PASSWORD),
      twoFactorEnabled: true,
      profiles: { create: { role: Role.DIRECTION, ecoleId: ecoleHorizon.id } },
    },
  });
  await prisma.account.create({
    data: {
      telephoneE164: randPhone(501),
      passwordHash: await hash(DEV_PASSWORD),
      twoFactorEnabled: true,
      profiles: { create: { role: Role.CENSEUR, ecoleId: ecoleHorizon.id } },
    },
  });
  await prisma.account.create({
    data: {
      telephoneE164: randPhone(502),
      passwordHash: await hash(DEV_PASSWORD),
      twoFactorEnabled: false,
      profiles: { create: { role: Role.SECRETAIRE, ecoleId: ecoleHorizon.id } },
    },
  });

  const horizonTeacherDefs = [
    { nom: "Aly Diallo", statut: StatutEmploi.PERMANENT, matricule: "ENS-H01" },
    { nom: "Kadidia Touré", statut: StatutEmploi.PERMANENT, matricule: "ENS-H02" },
  ];
  const horizonTeachers: { id: string; nom: string; profileId: string }[] = [];
  for (const def of horizonTeacherDefs) {
    const account = await prisma.account.create({
      data: { telephoneE164: randPhone(510 + horizonTeachers.length), passwordHash: await hash(DEV_PASSWORD), twoFactorEnabled: false },
    });
    const profile = await prisma.profile.create({ data: { accountId: account.id, ecoleId: ecoleHorizon.id, role: Role.ENSEIGNANT } });
    const teacher = await prisma.teacher.create({
      data: {
        ecoleId: ecoleHorizon.id,
        profileId: profile.id,
        nom: def.nom,
        statutEmploi: def.statut,
        matriculeEmploye: def.matricule,
        salaireBase: def.statut === StatutEmploi.PERMANENT ? 175000 : null,
        tauxHoraire: def.statut === StatutEmploi.VACATAIRE ? 3200 : null,
      },
    });
    horizonTeachers.push({ id: teacher.id, nom: def.nom, profileId: profile.id });
  }

  // Ibrahim Samaké (déjà Enseignant + Censeur à Awa Danté) reçoit un profil Enseignant
  // supplémentaire à Horizon, sur le même téléphone -> démontre le compte global multi-écoles.
  const ibrahimHorizonProfile = await prisma.profile.create({ data: { accountId: ibrahimAccountId, ecoleId: ecoleHorizon.id, role: Role.ENSEIGNANT } });
  const ibrahimHorizonTeacher = await prisma.teacher.create({
    data: {
      ecoleId: ecoleHorizon.id,
      profileId: ibrahimHorizonProfile.id,
      nom: "Ibrahim Samaké",
      statutEmploi: StatutEmploi.VACATAIRE,
      matriculeEmploye: "ENS-H03",
      tauxHoraire: 3200,
    },
  });
  horizonTeachers.push({ id: ibrahimHorizonTeacher.id, nom: "Ibrahim Samaké", profileId: ibrahimHorizonProfile.id });
  console.log(`Profil Enseignant à Horizon ajouté sur le compte multi-école : ${ibrahimPhone}`);

  const horizonClasseDefs: { nom: string; niveau: Niveau; principalIdx: number }[] = [
    { nom: "6ᵉ A", niveau: Niveau.COLLEGE, principalIdx: 0 },
    { nom: "2nde A", niveau: Niveau.LYCEE, principalIdx: 1 },
  ];
  const horizonSubjectPlan: { nom: string; coefficient: number }[] = [
    { nom: "Français", coefficient: 4 },
    { nom: "Mathématiques", coefficient: 4 },
    { nom: "Anglais", coefficient: 2 },
  ];

  let horizonStudentCounter = 0;
  for (const def of horizonClasseDefs) {
    const classe = await prisma.classe.create({
      data: {
        ecoleId: ecoleHorizon.id,
        nom: def.nom,
        niveau: def.niveau,
        anneeScolaire: ANNEE,
        professeurPrincipalId: horizonTeachers[def.principalIdx]!.id,
      },
    });

    for (let i = 0; i < horizonSubjectPlan.length; i++) {
      const plan = horizonSubjectPlan[i]!;
      const subject = horizonSubjects.get(plan.nom)!;
      const teacher = horizonTeachers[i % horizonTeachers.length]!;
      await prisma.teacherAssignment.create({
        data: { teacherId: teacher.id, teacherProfileId: teacher.profileId, subjectId: subject.id, classeId: classe.id, coefficient: plan.coefficient },
      });
    }

    for (let i = 0; i < 10; i++) {
      horizonStudentCounter++;
      const isFille = horizonStudentCounter % 2 === 0;
      const prenom = isFille ? pick(PRENOMS_F, horizonStudentCounter) : pick(PRENOMS_M, horizonStudentCounter);
      const nom = pick(NOMS, horizonStudentCounter + 5);
      await prisma.student.create({
        data: {
          ecoleId: ecoleHorizon.id,
          matricule: `HZ-${100 + horizonStudentCounter}`,
          nom,
          prenom,
          dateNaissance: new Date(2026 - (def.niveau === "COLLEGE" ? 14 : 17), i % 12, (i % 27) + 1),
          classeId: classe.id,
          dateInscription: new Date(2021, 8, 1),
        },
      });
    }
  }

  console.log(`Créé : Groupe Scolaire Horizon — ${horizonClasseDefs.length} classes, ${horizonStudentCounter} élèves, ${horizonTeachers.length} enseignants.`);
  console.log("Direction Horizon:", horizonDirectionAccount.telephoneE164);

  // --- Super-admin plateforme (gestion des écoles, hors périmètre d'une école) ---
  const superAdminAccount = await prisma.account.create({
    data: {
      telephoneE164: randPhone(999),
      passwordHash: await hash(DEV_PASSWORD),
      twoFactorEnabled: true,
      isSuperAdmin: true,
    },
  });
  console.log("Super-admin plateforme:", superAdminAccount.telephoneE164);
  console.log("Cas de test volontaires : égalité de rang (7ᵉ B), moyenne incomplète (3ᵉ Année/Mathématiques),",
    `absence non justifiée > 48h ${unjustifiedOldAbsenceFlagged ? "(créée)" : "(NON créée — vérifier)"},`,
    `${conflictsDetected} créneau(x) en conflit détecté(s).`);
  console.log("\nMot de passe de tous les comptes (dev uniquement) :", DEV_PASSWORD);
  console.log("Seed terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
