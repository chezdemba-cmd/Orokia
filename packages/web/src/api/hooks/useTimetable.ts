import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../client";

export interface TimetableSlot {
  id: string;
  jour: number;
  heureDebut: string;
  dureeMinutes: number;
  salle: string;
  etat: "OK" | "ANNULE" | "DEPLACE" | "CONFLIT";
  matiere: string;
  enseignant: string;
}

export function useClasseTimetableQuery(classeId: string | undefined) {
  return useQuery({
    queryKey: ["classes", classeId, "timetable"],
    queryFn: () => apiRequest<{ slots: TimetableSlot[] }>(`/classes/${classeId}/timetable`).then((r) => r.slots),
    enabled: !!classeId,
  });
}

export interface CreateSlotInput {
  subjectId: string;
  teacherId: string;
  jour: number;
  heureDebut: string;
  dureeMinutes: number;
  salle: string;
}

export function useCreateSlotMutation(classeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSlotInput) =>
      apiRequest<{ conflictsOnDay: number }>(`/classes/${classeId}/timetable`, { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes", classeId, "timetable"] }),
  });
}

export function useDeleteSlotMutation(classeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slotId: string) => apiRequest<{ ok: boolean }>(`/timetable/${slotId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes", classeId, "timetable"] }),
  });
}
