import { API_URL } from "./config";
import { getAccessToken, getStoredRefreshToken, setAccessToken } from "./token-store";

export class ApiClientError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

let refreshInFlight: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = await getStoredRefreshToken();
      if (!refreshToken) return null;
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Client": "mobile" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { accessToken: string };
      setAccessToken(data.accessToken);
      return data.accessToken;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function rawRequest(path: string, options: RequestOptions): Promise<Response> {
  const token = getAccessToken();
  return fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "X-Client": "mobile",
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const response = await rawRequest(path, options);

  if (response.status === 401 && !isRetry && path !== "/auth/login") {
    const newToken = await tryRefresh();
    if (newToken) {
      return apiRequest<T>(path, options, true);
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const err = data?.error ?? { code: "UNKNOWN_ERROR", message: "Une erreur est survenue." };
    throw new ApiClientError(response.status, err.code, err.message, err.fieldErrors);
  }

  return data as T;
}
