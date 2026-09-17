import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../client";
import type { Role } from "@orokia/shared";

export interface AccountItem {
  profileId: string;
  telephone: string;
  role: Role;
  nom: string | null;
  etat: "ACTIF" | "SUSPENDU";
  twoFactorEnabled: boolean;
  lastSeenAt: string | null;
}

export function useAccountsQuery() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: () => apiRequest<{ accounts: AccountItem[] }>("/accounts").then((r) => r.accounts),
  });
}

export function useSetAccountEtatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ profileId, etat }: { profileId: string; etat: "ACTIF" | "SUSPENDU" }) =>
      apiRequest(`/accounts/${profileId}/${etat === "SUSPENDU" ? "suspend" : "activate"}`, { method: "PATCH" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  motif: string | null;
  createdAt: string;
  acteur: string;
}

export function useAuditLogQuery() {
  return useQuery({
    queryKey: ["audit-log"],
    queryFn: () => apiRequest<{ logs: AuditLogEntry[] }>("/audit-log").then((r) => r.logs),
  });
}
