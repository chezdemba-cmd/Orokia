import { getAdminAccessToken } from "../auth/admin-token-store";
import { ApiClientError } from "./client";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

/** Panneau super-admin : session isolée du reste de l'app (pas de refresh token, pas d'école). */
export async function adminApiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getAdminAccessToken();
  const response = await fetch(`/api/admin${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const err = data?.error ?? { code: "UNKNOWN_ERROR", message: "Une erreur est survenue." };
    throw new ApiClientError(response.status, err.code, err.message, err.fieldErrors);
  }

  return data as T;
}
