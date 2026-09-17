import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../client";

export interface AnnouncementItem {
  id: string;
  titre: string;
  corps: string;
  cible: string;
  statut: "BROUILLON" | "PROGRAMMEE" | "PUBLIEE";
  createdAt: string;
  publieAt: string | null;
}

export function useAnnouncementsQuery() {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: () => apiRequest<{ announcements: AnnouncementItem[] }>("/announcements").then((r) => r.announcements),
  });
}

export function useCreateAnnouncementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { titre: string; corps: string; cible: string; statut: "BROUILLON" | "PROGRAMMEE" | "PUBLIEE" }) =>
      apiRequest("/announcements", { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  });
}
