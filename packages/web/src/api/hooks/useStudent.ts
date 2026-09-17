import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../client";
import type { Niveau } from "./useClasses";

export interface StudentDetail {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  dateInscription: string;
  classe: { id: string; nom: string; niveau: Niveau };
  moyenneGenerale: number | null;
  rang: number | null;
  absences: number;
  retards: number;
  matieres: { subjectId: string; nom: string; devoir1: number | null; devoir2: number | null; composition: number | null; moyenne: number | null }[];
  tuteurs: { nom: string; lien: string; telephone: string; canalPrefere: string }[];
}

export function useStudentQuery(studentId: string | undefined) {
  return useQuery({
    queryKey: ["students", studentId],
    queryFn: () => apiRequest<StudentDetail>(`/students/${studentId}`),
    enabled: !!studentId,
  });
}
