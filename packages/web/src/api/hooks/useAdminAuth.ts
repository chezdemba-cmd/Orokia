import { useMutation } from "@tanstack/react-query";
import { adminApiRequest } from "../admin-client";

export type AdminLoginResult =
  | { status: "OTP_REQUIRED"; challengeId: string; devCode?: string }
  | { status: "AUTHENTICATED"; accessToken: string };

export function useAdminLoginMutation() {
  return useMutation({
    mutationFn: (input: { telephone: string; motDePasse: string }) =>
      adminApiRequest<AdminLoginResult>("/login", { method: "POST", body: input }),
  });
}

export function useAdminOtpVerifyMutation() {
  return useMutation({
    mutationFn: (input: { challengeId: string; code: string }) =>
      adminApiRequest<AdminLoginResult>("/otp/verify", { method: "POST", body: input }),
  });
}
