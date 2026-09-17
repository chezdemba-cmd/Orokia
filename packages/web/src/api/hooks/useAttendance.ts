import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../client";

export type AttendanceType = "PRESENT" | "ABSENT" | "RETARD" | "EXCUSE";

export interface AttendanceRow {
  studentId: string;
  matricule: string;
  nom: string;
  prenom: string;
  type: AttendanceType;
  justificatif: string | null;
}

export function useAttendanceSessionQuery(classeId: string | undefined, sessionId: string | undefined, date: string) {
  return useQuery({
    queryKey: ["attendance", classeId, sessionId, date],
    queryFn: () =>
      apiRequest<{ session: { id: string; heureDebut: string; matiere: string }; rows: AttendanceRow[] }>(
        `/classes/${classeId}/attendance?sessionId=${sessionId}&date=${date}`,
      ),
    enabled: !!classeId && !!sessionId && !!date,
  });
}

export function useSaveAttendanceMutation(classeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { sessionId: string; date: string; entries: { studentId: string; type: AttendanceType; justificatif?: string | null }[] }) =>
      apiRequest<{ saved: number }>(`/classes/${classeId}/attendance/bulk`, { method: "POST", body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", classeId] });
      queryClient.invalidateQueries({ queryKey: ["reports", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}
