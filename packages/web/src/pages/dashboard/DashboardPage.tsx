import { StaffLayout } from "../../app/layouts/StaffLayout";
import { KpiCard } from "../../components/KpiCard";
import { useDashboardQuery } from "../../api/hooks/useDashboard";
import { formatFrNumber } from "@orokia/shared";

const NIVEAU_LABELS: Record<string, string> = { PRIMAIRE: "Primaire", COLLEGE: "Collège", LYCEE: "Lycée" };
const JOUR_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  return JOUR_LABELS[d.getDay()];
}

export function DashboardPage() {
  const { data, isLoading, error } = useDashboardQuery();

  return (
    <StaffLayout>
      <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Tableau de bord</div>
      <div style={{ color: "var(--color-text-muted)", fontSize: 13.5, marginBottom: 24 }}>
        Vue d'ensemble de l'établissement — Trimestre 1, année 2025–2026.
      </div>

      {isLoading && <div style={{ color: "var(--color-text-muted)" }}>Chargement…</div>}
      {error && <div style={{ color: "var(--color-danger)" }}>Impossible de charger le tableau de bord.</div>}

      {data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <KpiCard label="Élèves inscrits" value={String(data.effectifTotal)} sub={`${data.classesCount} classes`} />
            <KpiCard label="Enseignants" value={String(data.enseignantsCount)} />
            <KpiCard
              label="Moyenne générale"
              value={data.moyenneGenerale !== null ? formatFrNumber(data.moyenneGenerale) : "—"}
              sub="Toutes classes confondues"
            />
            <KpiCard
              label="Taux de présence"
              value={data.tauxPresence !== null ? `${formatFrNumber(data.tauxPresence)} %` : "—"}
              accent={data.tauxPresence !== null && data.tauxPresence < 90 ? "var(--color-danger)" : "var(--color-success)"}
            />
            <KpiCard
              label="Absences à traiter"
              value={String(data.absencesATraiter)}
              sub="Non justifiées"
              accent={data.absencesATraiter > 0 ? "var(--color-orange)" : undefined}
            />
          </div>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <div
              style={{
                flex: "2 1 380px",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: 20,
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 16 }}>Présence — 5 derniers jours</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 140 }}>
                {data.presenceParJour.map((d) => (
                  <div key={d.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)" }}>
                      {formatFrNumber(d.taux)}%
                    </div>
                    <div
                      style={{
                        width: "100%",
                        maxWidth: 36,
                        height: Math.max(6, (d.taux / 100) * 100),
                        background: d.taux < 90 ? "var(--color-orange)" : "var(--color-blue)",
                        borderRadius: 6,
                      }}
                    />
                    <div style={{ fontSize: 11.5, color: "var(--color-text-faint)" }}>{formatDateLabel(d.date)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                flex: "1 1 260px",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: 20,
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 16 }}>Moyenne par niveau</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {data.moyenneParNiveau.map((n) => {
                  const bareme = n.niveau === "PRIMAIRE" ? 10 : 20;
                  const pct = n.moyenne !== null ? Math.min(100, (n.moyenne / bareme) * 100) : 0;
                  return (
                    <div key={n.niveau}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
                        <span style={{ fontWeight: 700 }}>{NIVEAU_LABELS[n.niveau]}</span>
                        <span style={{ color: "var(--color-text-muted)" }}>
                          {n.moyenne !== null ? `${formatFrNumber(n.moyenne)}/${bareme}` : "—"}
                        </span>
                      </div>
                      <div style={{ background: "var(--color-bg)", borderRadius: 999, height: 8, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: "var(--color-blue)", borderRadius: 999 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </StaffLayout>
  );
}
