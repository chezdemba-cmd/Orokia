import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../client";

export interface ClassLogEntry {
  id: string;
  date: string;
  titre: string;
  contenu: string;
  matiere: string;
  enseignant: string;
  devoir: { consigne: string; echeance: string } | null;
  signatures: { signes: number; total: number };
}

export function useClassLogsQuery(classeId: string | undefined) {
  return useQuery({
    queryKey: ["class-logs", classeId],
    queryFn: () => apiRequest<{ logs: ClassLogEntry[] }>(`/classes/${classeId}/class-logs`).then((r) => r.logs),
    enabled: !!classeId,
  });
}

export function useCreateClassLogMutation(classeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { subjectId: string; date: string; titre: string; contenu: string; devoir?: { consigne: string; echeance: string } | null }) =>
      apiRequest(`/classes/${classeId}/class-logs`, { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["class-logs", classeId] }),
  });
}
