import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "urgent" | "secondary";

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: { background: "var(--color-blue)", color: "#fff", border: "1px solid var(--color-blue)" },
  urgent: { background: "var(--color-orange)", color: "#fff", border: "1px solid var(--color-orange)" },
  secondary: { background: "#fff", color: "var(--color-text)", border: "1px solid var(--color-border)" },
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", style, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      style={{
        ...variantStyles[variant],
        borderRadius: "var(--radius-lg)",
        padding: "14px 20px",
        fontSize: 15,
        fontWeight: 800,
        fontFamily: "var(--font-sans)",
        cursor: "pointer",
        minHeight: "var(--touch-target)",
        ...style,
      }}
    />
  );
}
