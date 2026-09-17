import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Role } from "@orokia/shared";
import { apiRequest } from "../client";
import { setAccessToken } from "../token-store";

export interface ProfileOption {
  profileId: string;
  role: Role;
  label: string;
}

export type LoginResult =
  | { status: "PROFILE_SELECTION_REQUIRED"; loginToken: string; profiles: ProfileOption[] }
  | { status: "OTP_REQUIRED"; challengeId: string; channel: "SMS" | "VOICE"; devCode?: string }
  | { status: "AUTHENTICATED"; accessToken: string };

export interface SessionUser {
  accountId: string;
  profileId: string;
  role: Role;
  nom: string;
  via2fa: boolean;
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: (input: { telephone: string; motDePasse: string }) =>
      apiRequest<LoginResult>("/auth/login", { method: "POST", body: input }),
  });
}

export function useSelectProfileMutation() {
  return useMutation({
    mutationFn: (input: { loginToken: string; profileId: string }) =>
      apiRequest<LoginResult>("/auth/select-profile", { method: "POST", body: input }),
  });
}

export function useOtpVerifyMutation() {
  return useMutation({
    mutationFn: (input: { challengeId: string; code: string }) =>
      apiRequest<LoginResult>("/auth/otp/verify", { method: "POST", body: input }),
  });
}

export function useOtpResendMutation() {
  return useMutation({
    mutationFn: (input: { challengeId: string; channel: "SMS" | "VOICE" }) =>
      apiRequest<{ challengeId: string; channel: string; devCode?: string }>("/auth/otp/resend", {
        method: "POST",
        body: input,
      }),
  });
}

export function useMeQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiRequest<SessionUser>("/auth/me"),
    enabled,
    retry: false,
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<{ ok: boolean }>("/auth/logout", { method: "POST" }),
    onSettled: () => {
      setAccessToken(null);
      queryClient.clear();
    },
  });
}
