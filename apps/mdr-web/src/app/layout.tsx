import type { CSSProperties } from "react"
import type { Metadata } from "next"
import { IBM_Plex_Mono, Inter } from "next/font/google"
import Script from "next/script"
import { AppProviders } from "@/components/providers/app-providers"
import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
})

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
})

const themeBootstrap = `
try {
  const mode = localStorage.getItem("dtg.mode");
  const accent = localStorage.getItem("dtg.accent");
  if (mode === "light" || mode === "dark") document.documentElement.dataset.theme = mode;
  if (/^#[0-9a-f]{6}$/i.test(accent || "")) document.documentElement.style.setProperty("--accent-seed", accent);
} catch {}
`

export const metadata: Metadata = {
  title: {
    default: "DTGSA MDR",
    template: "%s | DTGSA MDR",
  },
  description:
    "Production-grade enterprise document control platform for PDI, MDR, workflows, transmittals, client replies, and auditability.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${inter.variable} ${ibmPlexMono.variable} h-full antialiased`}
      style={{ "--accent-seed": "var(--default-accent)" } as CSSProperties}
    >
      <body>
        <AppProviders>{children}</AppProviders>
        <Script
          id="dtg-theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeBootstrap }}
        />
      </body>
    </html>
  )
}
