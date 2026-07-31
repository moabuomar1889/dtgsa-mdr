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

  // The inline bootstrap in the root layout already applied the stored theme to
  // <html> before first paint, so this effect only reconciles React state with
  // what is on screen. The state updates stay in a microtask to keep them out
  // of the effect body (react-hooks/set-state-in-effect); the visible theme
  // does not depend on this timing any more.
  useEffect(() => {
    queueMicrotask(() => {
      let nextMode: ThemeMode = "dark"
      let nextAccent: string = ACCENTS[0].seed

      try {
        nextMode =
          localStorage.getItem("dtg.mode") === "light" ? "light" : "dark"
        const storedAccent = localStorage.getItem("dtg.accent")
        if (storedAccent && /^#[0-9a-f]{6}$/i.test(storedAccent)) {
          nextAccent = storedAccent
        }
      } catch {
        // Storage can be unavailable in hardened browser contexts.
      }

      document.documentElement.dataset.theme = nextMode
      document.documentElement.style.setProperty("--accent-seed", nextAccent)
      setMode(nextMode)
      setAccent(nextAccent)
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (!ready) return

    document.documentElement.dataset.theme = mode
    document.documentElement.style.setProperty("--accent-seed", accent)
    try {
      localStorage.setItem("dtg.mode", mode)
      localStorage.setItem("dtg.accent", accent)
    } catch {
      // Keep in-memory theming functional when persistence is unavailable.
    }
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
