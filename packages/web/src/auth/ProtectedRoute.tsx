import { Navigate } from "react-router-dom";
import type { Role } from "@orokia/shared";
import { useSession } from "./session-context";

export function ProtectedRoute({ allow, children }: { allow?: Role[]; children: React.ReactNode }) {
  const { user, isLoading } = useSession();

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)" }}>
        Chargement…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allow && !allow.includes(user.role)) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Accès refusé</div>
        <div style={{ color: "var(--color-text-muted)", fontSize: 13.5 }}>
          Votre rôle ({user.role}) ne permet pas d'accéder à cette page.
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
