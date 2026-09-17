import { PrismaClient } from "@prisma/client";

// connection_limit=1, dédié à testPrisma uniquement (pas à app.prisma, qui garde un pool
// normal pour éviter tout auto-blocage des transactions imbriquées) : une seule connexion
// pour que le SET (session, pas LOCAL) de contournement RLS ci-dessous s'applique à toutes
// les requêtes de fixtures.
function withSingleConnection(url: string | undefined): string | undefined {
  if (!url) return url;
  return `${url}${url.includes("?") ? "&" : "?"}connection_limit=1`;
}

export const testPrisma = new PrismaClient({
  datasources: { db: { url: withSingleConnection(process.env.DATABASE_URL) } },
});

const TABLES = [
  "audit_logs",
  "otp_challenges",
  "refresh_tokens",
  "message_read_receipts",
  "messages",
  "conversation_participants",
  "conversations",
  "announcements",
  "class_log_acks",
  "devoirs",
  "class_logs",
  "escalation_events",
  "attendances",
  "timetable_slots",
  "report_card_lines",
  "report_cards",
  "grades",
  "terms",
  "payments",
  "tuition_fees",
  "payroll_lines",
  "guardian_students",
  "guardians",
  "students",
  "teacher_assignments",
  "classes",
  "teachers",
  "profiles",
  "accounts",
  "subjects",
  "ecoles",
];

/** Vide toutes les tables entre chaque test — isolation simple sur une base réelle dédiée. */
export async function resetDatabase() {
  await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} CASCADE`);
  // Les fixtures (factory.ts) écrivent directement via testPrisma, hors de tout contexte
  // d'école — RLS désactivée pour cette connexion dédiée (connection_limit=1 sur .env.test).
  await testPrisma.$executeRawUnsafe(`SET app.bypass_rls = 'on'`);
}
