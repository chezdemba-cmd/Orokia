import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../client";
import type { Niveau } from "./useClasses";

export interface SubjectOption {
  subjectId: string;
  nom: string;
  coefficient: number;
  teacherId: string;
  enseignant: string;
}

export interface GradeRow {
  studentId: string;
  matricule: string;
  nom: string;
  prenom: string;
  gradeId: string | null;
  devoir1: number | null;
  devoir2: number | null;
  composition: number | null;
  average: number | null;
}

export interface GradeGrid {
  classe: { id: string; nom: string; niveau: Niveau; bareme: number };
  subject: { id: string; nom: string };
  term: { id: string; numero: number; statut: "OUVERTE" | "CLOTUREE" };
  rows: GradeRow[];
}

export function useClassSubjectsQuery(classeId: string | undefined) {
  return useQuery({
    queryKey: ["classes", classeId, "subjects"],
    queryFn: () => apiRequest<{ subjects: SubjectOption[] }>(`/classes/${classeId}/subjects`).then((r) => r.subjects),
    enabled: !!classeId,
  });
}

export function useGradeGridQuery(classeId: string | undefined, subjectId: string | undefined) {
  return useQuery({
    queryKey: ["grades", "grid", classeId, subjectId],
    queryFn: () => apiRequest<GradeGrid>(`/grades/grid?classeId=${classeId}&subjectId=${subjectId}`),
    enabled: !!classeId && !!subjectId,
  });
}

export interface GradeEntryInput {
  studentId: string;
  devoir1: number | null;
  devoir2: number | null;
  composition: number | null;
}

export function useSaveGradesMutation(classeId: string | undefined, subjectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entries: GradeEntryInput[]) =>
      apiRequest<{ saved: number }>("/grades/grid", { method: "PUT", body: { classeId, subjectId, entries } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades", "grid", classeId, subjectId] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["reports", "dashboard"] });
    },
  });
}

export function usePublishTermMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (termId: string) => apiRequest<{ reportCardsCreated: number }>(`/terms/${termId}/publish`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export interface ReportCardData {
  verificationId: string;
  publishedAt: string;
  eleve: { nom: string; prenom: string; matricule: string; classe: string };
  terme: { numero: number; anneeScolaire: string };
  generalAverage: number | null;
  rank: number | null;
  nonClasse: boolean;
  moyenneDeClasse: number | null;
  lignes: { matiere: string; coefficient: number; devoir1: number | null; devoir2: number | null; composition: number | null; moyenne: number | null }[];
}

export function useReportCardQuery(studentId: string | undefined) {
  return useQuery({
    queryKey: ["report-cards", studentId],
    queryFn: () => apiRequest<ReportCardData>(`/report-cards/${studentId}`),
    enabled: !!studentId,
    retry: false,
  });
}
