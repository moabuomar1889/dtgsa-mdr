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

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used inside AppThemeProvider")
  }
  return context
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("dark")
  const [accent, setAccent] = useState<string>(ACCENTS[0].seed)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      const storedMode = document.documentElement.dataset.theme
      const storedAccent =
        document.documentElement.style.getPropertyValue("--accent-seed")

      setMode(storedMode === "light" ? "light" : "dark")
      if (/^#[0-9a-f]{6}$/i.test(storedAccent)) {
        setAccent(storedAccent)
      }
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (!ready) return

    document.documentElement.dataset.theme = mode
    document.documentElement.style.setProperty("--accent-seed", accent)
    localStorage.setItem("dtg.mode", mode)
    localStorage.setItem("dtg.accent", accent)
  }, [mode, accent, ready])

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
