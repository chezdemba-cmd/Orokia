import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { adminApiRequest } from "../api/admin-client";
import { setAdminAccessToken } from "./admin-token-store";

interface AdminUser {
  accountId: string;
}

interface AdminSessionContextValue {
  admin: AdminUser | null;
  completeSession: (accessToken: string) => Promise<void>;
  logout: () => void;
}

const AdminSessionContext = createContext<AdminSessionContextValue | undefined>(undefined);

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);

  const completeSession = useCallback(async (accessToken: string) => {
    setAdminAccessToken(accessToken);
    const me = await adminApiRequest<AdminUser>("/me");
    setAdmin(me);
  }, []);

  const logout = useCallback(() => {
    setAdminAccessToken(null);
    setAdmin(null);
  }, []);

  return <AdminSessionContext.Provider value={{ admin, completeSession, logout }}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession(): AdminSessionContextValue {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) throw new Error("useAdminSession doit être utilisé dans un AdminSessionProvider");
  return ctx;
}
