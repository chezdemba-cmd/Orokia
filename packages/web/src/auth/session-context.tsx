import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiRequest } from "../api/client";
import { setAccessToken } from "../api/token-store";
import type { SessionUser } from "../api/hooks/useAuth";

interface SessionContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  completeSession: (accessToken: string) => Promise<void>;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const completeSession = useCallback(async (accessToken: string) => {
    setAccessToken(accessToken);
    const me = await apiRequest<SessionUser>("/auth/me");
    setUser(me);
  }, []);

  const logout = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    // Tente une reconnexion silencieuse via le cookie de refresh (rechargement de page).
    apiRequest<{ accessToken: string }>("/auth/refresh", { method: "POST" })
      .then(async (res) => {
        await completeSession(res.accessToken);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SessionContext.Provider value={{ user, isLoading, completeSession, logout }}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession doit être utilisé dans un SessionProvider");
  return ctx;
}
