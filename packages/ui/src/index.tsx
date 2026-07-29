import type { CSSProperties, ReactNode } from "react"

export type FoundationStatusProps = {
  title: string
  message: string
  children?: ReactNode
}

const styles: Record<string, CSSProperties> = {
  main: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "2rem",
    color: "#193028",
    background:
      "radial-gradient(circle at 15% 10%, #f4c95d55, transparent 35%), linear-gradient(135deg, #f7f3e8, #dce9e1)",
    fontFamily: "Georgia, Cambria, serif",
  },
  card: {
    width: "min(100%, 48rem)",
    padding: "clamp(2rem, 7vw, 5rem)",
    border: "1px solid #799286",
    borderRadius: "2rem 0.5rem 2rem 0.5rem",
    background: "#fffdf8dd",
    boxShadow: "0 24px 80px #19302822",
  },
  eyebrow: {
    fontFamily: "ui-monospace, monospace",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "#a34a28",
  },
  title: {
    margin: "0.7rem 0 1rem",
    fontSize: "clamp(2.5rem, 8vw, 5rem)",
    lineHeight: 0.95,
  },
  message: {
    maxWidth: "42rem",
    fontSize: "1.15rem",
    lineHeight: 1.7,
  },
}

export function FoundationStatus({
  title,
  message,
  children,
}: FoundationStatusProps) {
  return (
    <main style={styles.main}>
      <section style={styles.card}>
        <div style={styles.eyebrow}>DTG Signature Platform</div>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.message}>{message}</p>
        {children}
      </section>
    </main>
  )
}
