import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import type { Role } from "@orokia/shared";
import { useSession } from "../../auth/session-context";
import { useLogoutMutation } from "../../api/hooks/useAuth";
import { Button } from "../../components/Button";

const ROLE_LABELS: Record<string, string> = {
  DIRECTION: "Direction",
  CENSEUR: "Censeur",
  SECRETAIRE: "Secrétariat",
  ENSEIGNANT: "Enseignant",
  PARENT: "Parent",
  ELEVE: "Élève",
};

const NAV_ITEMS: { to: string; label: string; allow?: Role[] }[] = [
  { to: "/dashboard", label: "Tableau de bord" },
  { to: "/classes", label: "Classes et élèves" },
  { to: "/grades", label: "Notes et bulletins" },
  { to: "/timetable", label: "Emploi du temps" },
  { to: "/attendance", label: "Appel", allow: ["DIRECTION", "CENSEUR", "ENSEIGNANT"] },
  { to: "/class-log", label: "Cahier de texte" },
  { to: "/messaging", label: "Messagerie" },
  { to: "/announcements", label: "Annonces" },
  { to: "/accounts", label: "Comptes et permissions", allow: ["DIRECTION"] },
  { to: "/reports", label: "Rapports et statistiques" },
  { to: "/tuition", label: "Frais de scolarité", allow: ["DIRECTION", "SECRETAIRE"] },
  { to: "/payroll", label: "Paie des enseignants", allow: ["DIRECTION", "SECRETAIRE"] },
];

export function StaffLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useSession();
  const logoutMutation = useLogoutMutation();

  return (
    <div style={{ minHeight: "100vh", display: "flex" }}>
      <aside
        className="no-print"
        style={{
          width: 220,
          background: "var(--color-navy)",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <div style={{ padding: "20px 20px 24px" }}>
          <img src="/assets/orokia-logo.png" alt="OROKIA" style={{ height: 26, filter: "brightness(0) invert(1)" }} />
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 12px" }}>
          {NAV_ITEMS.filter((item) => !item.allow || (user && item.allow.includes(user.role))).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                padding: "11px 14px",
                borderRadius: 10,
                fontSize: 13.5,
                fontWeight: 700,
                color: isActive ? "#fff" : "rgba(255,255,255,0.65)",
                background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                textDecoration: "none",
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header
          className="no-print"
          style={{
            background: "var(--color-surface)",
            borderBottom: "1px solid var(--color-border)",
            padding: "14px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 16,
          }}
        >
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{user?.nom}</div>
            <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>{user ? ROLE_LABELS[user.role] : ""}</div>
          </div>
          <Button
            variant="secondary"
            onClick={() => logoutMutation.mutate(undefined, { onSuccess: logout })}
            style={{ padding: "8px 14px", fontSize: 13 }}
          >
            Déconnexion
          </Button>
        </header>

        <main style={{ flex: 1, padding: 28, background: "var(--color-bg)" }}>{children}</main>
      </div>
    </div>
  );
}
