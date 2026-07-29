"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

export const ACCENTS = [
  { id: "iris", label: "Iris", seed: "#9184d9" },
  { id: "teal", label: "Teal", seed: "#5fb5a8" },
  { id: "amber", label: "Amber", seed: "#c9a35f" },
  { id: "rose", label: "Rose", seed: "#c97f8a" },
  { id: "slate", label: "Slate", seed: "#7f8aa8" },
  { id: "emerald", label: "Emerald", seed: "#6bb583" },
] as const

export type ThemeMode = "dark" | "light"

type ThemeContextValue = {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
  accent: string
  setAccent: (seed: string) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readInitialMode(): ThemeMode {
  if (typeof document === "undefined") return "dark"
  return document.documentElement.dataset.theme === "light" ? "light" : "dark"
}

function readInitialAccent(): string {
  if (typeof window === "undefined") return ACCENTS[0].seed
  try {
    const stored = localStorage.getItem("dtg.accent")
    return /^#[0-9a-f]{6}$/i.test(stored ?? "") ? stored! : ACCENTS[0].seed
  } catch {
    return ACCENTS[0].seed
  }
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used inside AppThemeProvider")
  }
  return context
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(readInitialMode)
  const [accent, setAccent] = useState<string>(readInitialAccent)

  useEffect(() => {
    document.documentElement.dataset.theme = mode
    document.documentElement.style.setProperty("--accent-seed", accent)
    localStorage.setItem("dtg.mode", mode)
    localStorage.setItem("dtg.accent", accent)
  }, [mode, accent])

  return (
    <ThemeContext.Provider
      value={{
        mode,
        setMode,
        toggleMode: () =>
          setMode((current) => (current === "dark" ? "light" : "dark")),
        accent,
        setAccent,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
