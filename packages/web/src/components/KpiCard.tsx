export function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        flex: "1 1 200px",
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-muted)", letterSpacing: "0.05em" }}>
        {label.toUpperCase()}
      </span>
      <span style={{ fontSize: 26, fontWeight: 800, color: accent ?? "var(--color-text)" }}>{value}</span>
      {sub && <span style={{ fontSize: 12, color: "var(--color-text-faint)" }}>{sub}</span>}
    </div>
  );
}
