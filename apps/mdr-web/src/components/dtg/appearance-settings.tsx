"use client"

import { useState } from "react"
import { Check, Moon, Sun } from "lucide-react"

import { joinClasses } from "@/components/dtg/classes"
import {
  ACCENTS,
  useTheme,
  type ThemeMode,
} from "@/components/dtg/theme-provider"

function channelToLinear(value: number) {
  const channel = value / 255
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4
}

function oklabLightness(hex: string) {
  const channels = [1, 3, 5].map((index) =>
    channelToLinear(Number.parseInt(hex.slice(index, index + 2), 16))
  )
  const [red, green, blue] = channels
  const l = Math.cbrt(
    0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue
  )
  const m = Math.cbrt(
    0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue
  )
  const s = Math.cbrt(
    0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue
  )

  return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
}

function accentError(value: string) {
  if (!/^#[0-9a-f]{6}$/i.test(value)) {
    return "Enter a valid 6-digit hex color."
  }

  const lightness = oklabLightness(value)
  if (lightness < 0.35 || lightness > 0.8) {
    return "Choose a mid-lightness color so interface text remains readable."
  }

  return null
}

export function AppearanceSettings() {
  const { accent, mode, setAccent, setMode } = useTheme()
  const [customAccent, setCustomAccent] = useState(accent)
  const error = accentError(customAccent)

  function chooseMode(nextMode: ThemeMode) {
    setMode(nextMode)
  }

  function updateCustomAccent(value: string) {
    const normalized = value.startsWith("#") ? value : `#${value}`
    setCustomAccent(normalized)
    if (!accentError(normalized)) {
      setAccent(normalized)
    }
  }

  return (
    <section aria-labelledby="appearance-title" className="grid gap-5">
      <div>
        <h2
          id="appearance-title"
          className="text-[15px] font-medium tracking-[-0.02em]"
        >
          Appearance
        </h2>
        <p className="text-soft mt-1 text-[11.5px]">
          Theme and accent preferences are stored in this browser and apply
          instantly.
        </p>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-dim text-[9.5px] font-medium tracking-[0.09em] uppercase">
          Theme
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:max-w-xs">
          {[
            { value: "dark" as const, label: "Dark", icon: Moon },
            { value: "light" as const, label: "Light", icon: Sun },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={mode === option.value}
              onClick={() => chooseMode(option.value)}
              className={joinClasses(
                "flex h-9 items-center justify-center gap-2 rounded-[7px] border px-3 text-[12px] font-medium",
                mode === option.value
                  ? "border-accent bg-accent-bg text-accent-txt"
                  : "border-edge bg-raise text-muted"
              )}
            >
              <option.icon className="size-3.5" />
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="text-dim text-[9.5px] font-medium tracking-[0.09em] uppercase">
          Accent
        </legend>
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map((option) => {
            const selected = accent.toLowerCase() === option.seed.toLowerCase()
            return (
              <button
                key={option.id}
                type="button"
                aria-label={`Use ${option.label} accent`}
                aria-pressed={selected}
                title={option.label}
                onClick={() => {
                  setAccent(option.seed)
                  setCustomAccent(option.seed)
                }}
                className={joinClasses(
                  "border-edge flex size-[30px] items-center justify-center rounded-full border",
                  selected && "outline-accent-txt outline-2 outline-offset-2"
                )}
                style={{ backgroundColor: option.seed }}
              >
                {selected ? (
                  <Check className="text-on-accent size-3.5" />
                ) : null}
              </button>
            )
          })}
        </div>
      </fieldset>

      <label className="text-dim grid max-w-xs gap-1.5 text-[11px]">
        Custom accent
        <input
          value={customAccent}
          onChange={(event) => updateCustomAccent(event.target.value)}
          spellCheck={false}
          aria-invalid={Boolean(error)}
          aria-describedby="custom-accent-hint"
          className="border-edge bg-raise text-text focus:border-accent h-9 rounded-[8px] border px-3 font-mono text-[12px] outline-none"
        />
        <span
          id="custom-accent-hint"
          className={joinClasses(
            "text-[11px]",
            error ? "text-bad" : "text-dim"
          )}
        >
          {error ?? "Valid mid-lightness accent. Saved automatically."}
        </span>
      </label>
    </section>
  )
}
