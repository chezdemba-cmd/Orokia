import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../client";
import type { Role } from "@orokia/shared";

export interface Contact {
  profileId: string;
  role: Role;
  nom: string;
}

export interface ConversationSummary {
  id: string;
  nom: string;
  dernierMessage: string | null;
  heure: string;
  nonLus: number;
}

export interface MessageItem {
  id: string;
  corps: string;
  createdAt: string;
  expediteurEstMoi: boolean;
}

export function useContactsQuery() {
  return useQuery({
    queryKey: ["messaging", "contacts"],
    queryFn: () => apiRequest<{ contacts: Contact[] }>("/messaging/contacts").then((r) => r.contacts),
  });
}

export function useConversationsQuery() {
  return useQuery({
    queryKey: ["messaging", "conversations"],
    queryFn: () => apiRequest<{ conversations: ConversationSummary[] }>("/messaging/conversations").then((r) => r.conversations),
    refetchInterval: 15000,
  });
}

export function useConversationMessagesQuery(conversationId: string | undefined) {
  return useQuery({
    queryKey: ["messaging", "conversations", conversationId],
    queryFn: () => apiRequest<{ messages: MessageItem[] }>(`/messaging/conversations/${conversationId}/messages`).then((r) => r.messages),
    enabled: !!conversationId,
    refetchInterval: 8000,
  });
}

export function useCreateConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { recipientProfileId: string; message: string }) =>
      apiRequest<{ conversationId: string }>("/messaging/conversations", { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messaging", "conversations"] }),
  });
}

export function useSendMessageMutation(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (corps: string) => apiRequest(`/messaging/conversations/${conversationId}/messages`, { method: "POST", body: { corps } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messaging", "conversations", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["messaging", "conversations"] });
    },
  });
}
