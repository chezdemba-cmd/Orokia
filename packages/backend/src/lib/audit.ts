import type { Prisma } from "@prisma/client";
import type { Db as TxClient } from "./tenant-context.js";

export interface AuditEntry {
  ecoleId: string;
  actorProfileId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  motif?: string | null;
}

export async function recordAudit(client: TxClient, entry: AuditEntry) {
  await client.auditLog.create({
    data: {
      ecoleId: entry.ecoleId,
      actorProfileId: entry.actorProfileId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      before: entry.before === undefined ? undefined : (entry.before as Prisma.InputJsonValue),
      after: entry.after === undefined ? undefined : (entry.after as Prisma.InputJsonValue),
      motif: entry.motif ?? null,
    },
  });
}
