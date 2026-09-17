type Tone = "success" | "warning" | "danger" | "neutral" | "info";

const TONE_STYLES: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: "#F0FDF4", fg: "#16A34A" },
  warning: { bg: "#FFF7ED", fg: "#C2410C" },
  danger: { bg: "#FEF2F2", fg: "#DC2626" },
  neutral: { bg: "#F1F5F9", fg: "#64748B" },
  info: { bg: "#EFF6FF", fg: "#2563EB" },
};

export function Badge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const style = TONE_STYLES[tone];
  return (
    <span
      style={{
        display: "inline-block",
        background: style.bg,
        color: style.fg,
        fontSize: 11.5,
        fontWeight: 800,
        padding: "4px 9px",
        borderRadius: 999,
        letterSpacing: "0.02em",
      }}
    >
      {label}
    </span>
  );
}
