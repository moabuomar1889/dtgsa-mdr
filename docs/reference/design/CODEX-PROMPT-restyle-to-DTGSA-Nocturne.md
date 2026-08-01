# Codex task — replace shadcn/ui with the DTGSA "Nocturne" design system

Paste everything below into Codex as the task prompt. It is written to be executed against an existing
Next/React + Tailwind + shadcn codebase without changing a single line of business logic.

---

## 0. Mission

Strip shadcn/ui and every trace of its theme out of this repo, and re-skin the app with the **DTGSA Nocturne**
design system defined in this document. The app's behaviour must be **byte-for-byte identical** afterwards:
same routes, same data fetching, same mutations, same form validation, same permissions, same tests.
This is a **presentation-layer replacement only**.

### Hard rules

1. **Do not touch** anything under `app/api/**`, `server/**`, `lib/**` (except pure styling helpers), `prisma/**`,
   `db/**`, migrations, auth config, env handling, route handlers, server actions, or any file whose changes
   would alter a network request, a query, or a database write.
2. **Do not rename** routes, files that export pages/layouts, props, event handler names, form field `name`
   attributes, `data-testid` attributes, or ARIA labels/roles. Tests and E2E selectors must keep passing.
3. **Do not change** state management, hooks, react-query/SWR keys, zod schemas, or validation messages.
4. Every visual change must be **mechanical**: swap the element/class layer, keep children, keep handlers,
   keep conditional-render logic.
5. Work in **small commits, one surface at a time**, and run `pnpm build && pnpm lint && pnpm test` after each.
   Never bulk-rewrite the whole `components/` tree in a single pass.
6. If a shadcn component carries real behaviour you'd otherwise lose (focus trap, portal, roving tabindex,
   scroll lock, `aria-*` wiring), **keep the behaviour** — rebuild it on the same Radix primitive and only
   replace its class names. Only fully delete components whose value was purely cosmetic.

---

## 1. Inventory first (no edits in this step)

Produce a short report before changing anything:

```bash
# what shadcn brought in
cat package.json
ls -R components/ui 2>/dev/null
rg -n "@/components/ui/" --stats
rg -n "class-variance-authority|clsx|tailwind-merge|cva\(|cn\(" --stats
rg -n "@radix-ui/" package.json
rg -n "hsl\(var\(--|--background|--foreground|--primary|--muted|--ring|--card|--popover" -g "*.css" -g "*.ts" -g "*.tsx"
cat tailwind.config.* ; cat components.json 2>/dev/null
rg -n "next-themes|ThemeProvider|darkMode" --stats
```

Output a table: **shadcn primitive → number of usages → which Radix package it wraps → keep behaviour? (yes/no)**.
Then follow the migration order in §7.

---

## 2. What to remove

### 2.1 Packages (uninstall)

```
@shadcn/ui (if present)  class-variance-authority  tailwindcss-animate
tailwind-merge (only if unused after the codemod)  clsx (only if unused after the codemod)
next-themes (replaced by our own tiny provider — see §5)
```

Keep every `@radix-ui/react-*` package that is still imported after §6 (dialog, dropdown-menu, popover,
select, tooltip, tabs, checkbox, switch, radio-group, scroll-area). Radix is unstyled and is our
accessibility backbone — **do not remove Radix**.

```bash
pnpm remove class-variance-authority tailwindcss-animate next-themes
# then, only if rg shows zero remaining imports:
pnpm remove tailwind-merge clsx
pnpm prune
```

### 2.2 Files (delete)

```
components/ui/**                # entire shadcn generated folder — rebuilt as components/dtg/** in §6
components.json                 # shadcn CLI manifest
lib/utils.ts                    # ONLY if it exists purely for cn(); if it holds other helpers, delete just cn()
styles/shadcn*.css, app/theme.css, any *.css defining --background/--foreground/--primary/--ring
```

### 2.3 Config to purge

* `tailwind.config.*` — delete the entire `theme.extend.colors` block that maps to
  `hsl(var(--background))` etc., delete `borderRadius: { lg: "var(--radius)" ... }`, delete the
  `tailwindcss-animate` plugin, delete `darkMode: ["class"]` (we use `data-theme`).
* `globals.css` — delete every `@layer base { :root { --background: … } .dark { … } }` block and any
  `@apply bg-background text-foreground` base rules.
* Remove `<ThemeProvider attribute="class">` from the root layout; replace with `<AppThemeProvider>` (§5).

### 2.4 Class-name purge (codemod)

Any Tailwind class that references a shadcn token must go. Run this and fix every hit:

```bash
rg -n "bg-background|text-foreground|bg-card|bg-popover|text-muted-foreground|bg-primary|text-primary-foreground|bg-secondary|bg-accent(?!-)|border-input|ring-offset-background|bg-destructive|rounded-md|shadow-sm" -g "*.tsx"
```

Mapping table (mechanical find/replace):

| shadcn class | Nocturne replacement |
| --- | --- |
| `bg-background` | `bg-[var(--bg)]` |
| `bg-card`, `bg-popover` | `bg-[var(--panel)]` |
| `bg-muted`, `bg-secondary` | `bg-[var(--raise)]` |
| `text-foreground` | `text-[var(--text)]` |
| `text-muted-foreground` | `text-[var(--soft)]` |
| `border`, `border-input`, `border-border` | `border border-[var(--line)]` (inputs/buttons: `border-[var(--edge)]`) |
| `bg-primary` | `bg-[var(--accent)]` |
| `text-primary`, `text-primary-foreground` | `text-[var(--accent-txt)]` / `text-[var(--on-accent)]` |
| `bg-destructive` | `bg-[var(--bad)]` |
| `ring-ring`, `focus-visible:ring-2` | `focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2` |
| `rounded-md` / `rounded-lg` | `rounded-[7px]` / `rounded-[9px]` |
| `shadow-sm` / `shadow-lg` | none / `shadow-[var(--shadow)]` |

**Tailwind itself stays** — it is only a utility engine, not part of shadcn. Do not attempt a
Tailwind→plain-CSS rewrite; that would be a needless risk.

---

## 3. The Nocturne token layer (create `styles/nocturne.css`, import once in the root layout)

This is the entire theme. **Every colour in the app must come from these variables — no raw hex in components.**

```css
/* ---------- Nocturne: one accent seed, everything else derived ---------- */
:root {
  /* the ONLY colour the user picks. Change this and the whole UI re-tints. */
  --accent-seed: #9184d9;

  /* surfaces (dark is the default theme) */
  --bg:#161826; --panel:#1b1d2b; --panel2:#191b28; --head:#1a1c2a; --raise:#1e2030; --sel:#22243a;
  --line:#2c2f3d; --line2:#212330; --edge:#3f424d;
  --text:#e9e9ed; --muted:#b2b6ca; --soft:#9397ab; --dim:#75798c;
  --track:#2f3242;
  --ok:#7fc9a1; --warn:#d9c184; --bad:#d98d84;
  --shadow:0 16px 40px rgba(0,0,0,.6);

  /* derived accents — never set these by hand */
  --accent:      var(--accent-seed);
  --accent-txt:  color-mix(in oklab, var(--accent-seed) 62%, #ffffff 38%);
  --accent-line: color-mix(in oklab, var(--accent-seed) 62%, var(--bg) 38%);
  --accent-bg:   color-mix(in oklab, var(--accent-seed) 14%, transparent);
  --accent-bg2:  color-mix(in oklab, var(--accent-seed) 8%,  transparent);
  --on-accent:   var(--bg);

  /* geometry + type — fixed, do not invent new values */
  --r-sm:5px; --r:7px; --r-md:8px; --r-lg:9px; --r-xl:10px;
  --font: Inter, system-ui, sans-serif;
  --mono: ui-monospace, Menlo, monospace;
}

[data-theme="light"] {
  --bg:#f2f3f8; --panel:#ffffff; --panel2:#f7f8fc; --head:#ffffff; --raise:#fbfbfe; --sel:#f0eefb;
  --line:#e2e4ee; --line2:#edeef5; --edge:#d3d6e2;
  --text:#1b1d2b; --muted:#4d5162; --soft:#6c7183; --dim:#8b90a2;
  --track:#e7e8f1;
  --ok:#3d8f6a; --warn:#96701c; --bad:#b4544a;
  --shadow:0 16px 40px rgba(27,29,43,.14);

  --accent:      color-mix(in oklab, var(--accent-seed) 82%, #000000 18%);
  --accent-txt:  color-mix(in oklab, var(--accent-seed) 70%, #000000 30%);
  --accent-line: color-mix(in oklab, var(--accent-seed) 45%, #ffffff 55%);
  --accent-bg:   color-mix(in oklab, var(--accent-seed) 12%, transparent);
  --accent-bg2:  color-mix(in oklab, var(--accent-seed) 6%,  transparent);
  --on-accent:   #ffffff;
}

html, body {
  margin:0; height:100%;
  background:var(--bg); color:var(--text);
  font-family:var(--font); font-size:13px;
  -webkit-font-smoothing:antialiased;
}
*, *::before, *::after { box-sizing:border-box; }
a { color:var(--accent); text-decoration:none; }
a:hover { color:var(--accent-txt); }
::selection { background:var(--accent-bg); }
:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
::-webkit-scrollbar { width:10px; height:10px; }
::-webkit-scrollbar-thumb { background:var(--edge); border-radius:5px; }
::-webkit-scrollbar-track { background:transparent; }

/* the three interaction primitives the whole UI relies on */
[data-h] { cursor:pointer; }
[data-h]:hover { background:var(--accent-bg2); }
[data-r] { cursor:pointer; }                      /* table rows */
[data-r]:hover { background:var(--accent-bg2); }
[data-b] { cursor:pointer; user-select:none; }    /* bordered buttons */
[data-b]:hover { border-color:var(--accent); color:var(--accent-txt); }

@keyframes toast-in { from { opacity:0; transform:translate(-50%,8px); } to { opacity:1; transform:translate(-50%,0); } }
```

Fonts + icons in the root layout `<head>` (Inter via `next/font` is fine and preferred):

```html
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css">
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/fill/style.css">
```

Icons are **Phosphor** (`<i className="ph ph-paper-plane-tilt" />`, filled variant `ph-fill ph-seal-check`).
If lucide-react is already installed you may keep it, but pick **one** icon set app-wide — do not mix.
Icon sizes: 13–15px inline, 14px in nav/rows, 16px in panel headers. Never larger in dense UI.

Optionally expose the tokens to Tailwind so `bg-panel` works:

```js
// tailwind.config.js → theme.extend.colors
colors: {
  bg:'var(--bg)', panel:'var(--panel)', panel2:'var(--panel2)', head:'var(--head)',
  raise:'var(--raise)', sel:'var(--sel)', line:'var(--line)', line2:'var(--line2)', edge:'var(--edge)',
  text:'var(--text)', muted:'var(--muted)', soft:'var(--soft)', dim:'var(--dim)',
  accent:'var(--accent)', 'accent-txt':'var(--accent-txt)', 'accent-line':'var(--accent-line)',
  'accent-bg':'var(--accent-bg)', 'accent-bg2':'var(--accent-bg2)', 'on-accent':'var(--on-accent)',
  ok:'var(--ok)', warn:'var(--warn)', bad:'var(--bad)', track:'var(--track)',
}
```

---

## 4. Design language — the rules a reviewer will check

**Character:** dense, quiet, engineering-grade. A document-control desk, not a marketing site.
Flat surfaces separated by 1px hairlines, no gradients, no drop shadows except on floating layers,
no rounded "card with coloured left border", no emoji, no illustrations.

**Type scale** (px, Inter): `9.5` uppercase section eyebrows (letter-spacing `.09em`) · `10–10.5` mono
metadata/codes · `11–11.5` secondary text and table cells · `12–12.5` body/buttons · `13` panel titles
and default `body` · `15` sub-page titles · `19–22` page titles (weight 500, letter-spacing `-0.02em`)
· `24–26` KPI numbers (weight 600, letter-spacing `-0.03em`). Weights used: 400, 500, 600 only.

**Every document number, project code, revision, transmittal number, count and percentage is set in
`var(--mono)`** — this is the signature of the system. Codes are `--accent-txt`, project codes `--accent`.

**Spacing:** page padding `18–24px`; panel padding `12–15px`; grid `gap:12–14px`; row padding `9px 14px`;
nav item padding `7px 9px`; flex/grid `gap` for every sibling group (never margins between siblings).

**Radii:** rows/nav/buttons `7px`, panels/cards `9px`, popovers/modals `10px`, pills/badges `4px`,
progress bars `2–4px`. Nothing fully rounded except avatars and count bubbles.

**Borders:** `--line` for panel and header borders, `--line2` for in-table row dividers, `--edge` for
interactive borders (buttons, inputs, switcher). Hover on a bordered control → border `--accent`,
text `--accent-txt`. Active nav item → `background:var(--accent-bg)` + `box-shadow:inset 2px 0 0 var(--accent)`.

**Semantic colour is meaning, never decoration:** `--bad` overdue/rejected/Code 3, `--warn` at risk /
awaiting reply / Code 2, `--ok` approved/Code 1/complete, `--accent` "this needs you". Neutral text
otherwise. A screen should read mostly neutral with a few coloured signals.

**Shell geometry (must match exactly):**
* Top bar `height:50px`, `padding:0 16px`, `background:var(--head)`, `border-bottom:1px solid var(--line)`,
  `z-index:40`. Contents: brand · project switcher · search (`flex:1`, `max-width:300px`, `⌘K` chip) ·
  right cluster `margin-left:auto` (theme toggle, notifications bell with accent bubble, user block with
  23px avatar + name/role, sign-out icon). Brand, switcher, right cluster are all `flex:none` + `nowrap`;
  only search shrinks.
* Left sidebar `width:208px`, `background:var(--panel2)`, `padding:12px 10px`, uppercase eyebrow group
  labels, one nav row per item with icon + label + right-aligned mono count, bottom-pinned progress card.
* Content column scrolls independently. Detail/analytics screens may add a right rail
  `width:310px`, `background:var(--panel2)`, `border-left:1px solid var(--line)`.
* Tables are CSS **grid** with fixed px column widths and one `1fr` title column — never `<table>` auto layout.
  Header row: `background:var(--head)`, 10px uppercase `--dim` labels.

**Empty states:** one centred 11.5px `--dim` sentence stating the queue is clear. No illustrations, no CTA blocks.

---

## 5. Accent colour switching (required feature)

Because every accent token is derived from `--accent-seed` via `color-mix`, switching the accent is a
one-property write. Implement exactly this.

```tsx
// components/dtg/theme-provider.tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";

export const ACCENTS = [
  { id: "iris",    label: "Iris",    seed: "#9184d9" }, // default
  { id: "teal",    label: "Teal",    seed: "#5fb5a8" },
  { id: "amber",   label: "Amber",   seed: "#c9a35f" },
  { id: "rose",    label: "Rose",    seed: "#c97f8a" },
  { id: "slate",   label: "Slate",   seed: "#7f8aa8" },
  { id: "emerald", label: "Emerald", seed: "#6bb583" },
] as const;

type Mode = "dark" | "light";
type Ctx = {
  mode: Mode; setMode: (m: Mode) => void; toggleMode: () => void;
  accent: string; setAccent: (seed: string) => void;   // accepts any hex — supports a custom picker
};
const ThemeCtx = createContext<Ctx | null>(null);
export const useTheme = () => {
  const c = useContext(ThemeCtx);
  if (!c) throw new Error("useTheme must be used inside AppThemeProvider");
  return c;
};

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("dark");
  const [accent, setAccent] = useState<string>(ACCENTS[0].seed);

  // hydrate from storage (and later: from the user's saved preference on the server)
  useEffect(() => {
    const m = localStorage.getItem("dtg.mode") as Mode | null;
    const a = localStorage.getItem("dtg.accent");
    if (m) setMode(m);
    if (a) setAccent(a);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode);
    document.documentElement.style.setProperty("--accent-seed", accent);
    localStorage.setItem("dtg.mode", mode);
    localStorage.setItem("dtg.accent", accent);
  }, [mode, accent]);

  return (
    <ThemeCtx.Provider value={{ mode, setMode, toggleMode: () => setMode(m => (m === "dark" ? "light" : "dark")), accent, setAccent }}>
      {children}
    </ThemeCtx.Provider>
  );
}
```

Requirements:

1. Mount `<AppThemeProvider>` in the root layout, wrapping everything; put `data-theme="dark"` and
   `style="--accent-seed:#9184d9"` on the server-rendered `<html>` so there is **no flash** before hydration
   (inline a 4-line script that reads `localStorage` before paint, same trick next-themes used).
2. Add **Settings → Appearance** with: a Theme radio (Dark / Light), an accent swatch row rendering
   `ACCENTS` (each a 22px circle of its seed; the selected one gets a 2px `--accent-txt` ring), and a
   "Custom" hex input that calls `setAccent(hex)` on a valid 6-digit hex. Persist the choice per user via
   whatever preference mechanism the app already has (add a column/field only if one already exists for
   user settings — otherwise localStorage only, and say so in the PR).
3. Keep the header's light/dark toggle button wired to `toggleMode()`.
4. Charts, progress bars, funnels, sparklines and SVGs must read `var(--accent)` / `var(--ok)` /
   `var(--warn)` / `var(--bad)` — `rg -n "#[0-9a-fA-F]{6}" components/ app/` must return **zero** hits
   outside `styles/nocturne.css` and `theme-provider.tsx`.
5. Contrast: after adding any accent, `--on-accent` text on `--accent` fill must clear 4.5:1. The two
   derivations in §3 hold for mid-lightness seeds; reject seeds lighter than ~L 80 or darker than ~L 35
   in the custom input with an inline 11px `--bad` hint.

---

## 6. Component replacements (`components/dtg/**`)

Rebuild only what's used. Each replacement keeps the **same public props** as the shadcn one it replaces so
call sites change by import path only. All of these are ~15-line components — no variance library, no `cn()`;
compose class strings with a template literal or plain `style` objects.

| shadcn | Nocturne replacement | Spec |
| --- | --- | --- |
| `Button` | `<Btn variant>` | `variant="primary"`: `padding:7px 12px; border:1px solid var(--accent); border-radius:8px; color:var(--accent-txt); font-size:12px; font-weight:500` (solid CTA only when it's the single page action: `background:var(--accent); color:var(--on-accent)`). `variant="ghost"`: same box, `border-color:var(--edge); color:var(--muted)`. `variant="quiet"`: no border, `color:var(--soft)`. `size="sm"`: `padding:4px 8px; font-size:11px`. Always add `data-b`. |
| `Card` | `<Panel title actions>` | `border:1px solid var(--line); border-radius:9px; background:var(--panel); overflow:hidden`. Optional header strip: `display:flex; align-items:center; gap:9px; padding:10px 14px; border-bottom:1px solid var(--line)`; 14px accent icon, 13px/500 title, mono count pill, right-aligned 11px `--dim` context line. |
| `Table` | `<Grid cols>` | CSS grid, fixed px widths + one `1fr`. Header `background:var(--head)`, cells `padding:9px 14px`, rows `border-bottom:1px solid var(--line2)` + `data-r`. Row click = navigate; inner action buttons must `stopPropagation`. |
| `Badge` | `<Pill tone>` | `font-family:var(--mono); font-size:10.5px; border-radius:4px; padding:1px 6px`; tone → `accent \| ok \| warn \| bad \| neutral` mapping to `color`/`background:var(--accent-bg)` etc. |
| `Input`, `Textarea` | `<Field>` | `padding:8px 11px; border:1px solid var(--edge); border-radius:8px; background:var(--raise); font-size:12px; color:var(--text)`; placeholder `--dim`; focus → `border-color:var(--accent)`. Label above: 11px `--dim`, `gap:5px` column. |
| `Select`, `DropdownMenu`, `Popover` | keep Radix, restyle | Content: `background:var(--panel); border:1px solid var(--edge); border-radius:10px; box-shadow:var(--shadow); padding:8px`. Items: `padding:7px 8px; border-radius:7px` + `data-h`. |
| `Dialog`/`Sheet` | keep Radix Dialog, restyle | Overlay `background:rgba(0,0,0,.55)` (light: `rgba(27,29,43,.35)`). Content `width:440–640px; background:var(--panel); border:1px solid var(--edge); border-radius:12px; box-shadow:var(--shadow)`; header 15px/500 + 11px `--dim` subtitle; footer right-aligned `gap:8px`. |
| `Tabs` | `<Tabs>` | Segmented: outer `padding:2px; border:1px solid var(--edge); border-radius:8px; background:var(--raise)`; active tab `background:var(--accent-bg); color:var(--accent-txt); font-weight:500; border-radius:6px; padding:5px 12px`. Underline variant for in-page sections: 12px labels, 2px `--accent` bottom border on active. |
| `Toast`/`Sonner` | `<Toast>` | Fixed `bottom:22px; left:50%; transform:translateX(-50%)`, `background:var(--sel); border:1px solid var(--accent-line); border-radius:9px; padding:11px 16px; box-shadow:var(--shadow)`, filled check icon + 12px text, `animation:toast-in .18s ease-out`, auto-dismiss 2.6s. |
| `Tooltip` | keep Radix, restyle | `background:var(--sel); border:1px solid var(--edge); border-radius:6px; padding:5px 8px; font-size:11px`. |
| `Progress` | `<Bar pct tone>` | `height:5–7px; border-radius:3px; background:var(--track)`; fill `var(--accent)` (or `--bad` under 50%, `--ok` at/over 80% when the bar means completion). |
| `Avatar` | `<Avatar initials>` | `23px` circle, `background:var(--accent-bg); color:var(--accent-txt); font-size:9.5px; font-weight:600`. |
| `Skeleton` | `<Skel>` | `background:var(--raise)`, 1.2s opacity pulse only — no shimmer sweep. |
| `Separator` | plain `<div>` | `height:1px; background:var(--line)` (or `--line2` inside tables). |
| `Accordion`, `Checkbox`, `Switch`, `RadioGroup` | keep Radix, restyle | Checked/on = `--accent` fill with `--on-accent` mark; off = `--edge` border on `--raise`. Hit area ≥ 16px, row target ≥ 32px. |
| `Alert`, `Toaster` decorative wrappers, `AspectRatio`, `Carousel`, `HoverCard` (if unused) | **delete** | — |

Codemod for call sites:

```bash
# example, run per primitive, then fix types
rg -l "@/components/ui/button" -g "*.tsx" | xargs sed -i '' \
  -e 's#@/components/ui/button#@/components/dtg/btn#' -e 's#<Button#<Btn#g' -e 's#</Button>#</Btn>#g'
```

Do this **one primitive per commit**, and after each: `pnpm build && pnpm test`.

---

## 7. Migration order

1. **Inventory report** (§1) — no code changes. Post it as the PR description draft.
2. **Token layer**: add `styles/nocturne.css`, `AppThemeProvider`, no-flash inline script, purge shadcn
   token blocks from `globals.css` + `tailwind.config`. App will look broken-ish here; that's expected.
3. **Shell**: top bar, sidebar, content column, right rail. Get geometry from §4 exactly.
4. **Primitives**: Btn → Panel → Pill → Field → Grid → Tabs → Dialog → Toast → the rest, one commit each,
   deleting each `components/ui/*` file as its replacement lands.
5. **Screens**, highest traffic first: desk/home queues → registers (tables) → document detail →
   transmittals → settings → auth/sign-in → onboarding wizard → mobile views.
6. **Settings → Appearance** (theme + accent picker) and remove `next-themes`.
7. **Cleanup**: `pnpm remove` the packages in §2.1, delete `components/ui`, `components.json`, `cn()`;
   run the greps in §8 until they're all clean.

---

## 8. Acceptance checklist (all must pass)

```bash
pnpm build && pnpm lint && pnpm test && pnpm test:e2e
rg -n "@/components/ui/" ; rg -n "class-variance-authority|cva\(|\bcn\(" ; rg -n "next-themes"
rg -n "hsl\(var\(--(background|foreground|primary|ring|border|card|popover|muted)" 
rg -n "#[0-9a-fA-F]{6}" app/ components/ --glob '!**/nocturne.css' --glob '!**/theme-provider.tsx'
rg -n "dark:" -g "*.tsx"        # must be empty: theming is data-theme + vars, not dark: variants
```

* Zero hits on every grep above.
* No `git diff` under `app/api/**`, `server/**`, `prisma/**`, `lib/db*`, auth config, or any schema file.
* Every `data-testid` present before is still present.
* Dark and light both render every screen with no invisible text; hairlines visible in both.
* Changing the accent in Settings retints header, nav active state, buttons, pills, charts, progress bars
  and focus rings **instantly, without reload**, in both modes.
* Reload preserves mode + accent with **no flash** of the wrong theme.
* Keyboard: tab order unchanged, `:focus-visible` ring visible on every control, dialogs still trap focus
  and restore it on close, Esc still closes.
* Dense-layout sanity: top bar exactly 50px, sidebar exactly 208px, table rows 32–36px tall, no text
  below 9.5px, no horizontal scrollbar at 1280px width.
* Lighthouse a11y ≥ the pre-migration score. Axe: no new violations.

---

## 9. Deliverable

A PR titled **"Replace shadcn/ui with DTGSA Nocturne design system (visual only)"** containing:

* the inventory report from §1,
* per-commit list showing one surface/primitive each,
* before/after screenshots of: home desk, a register table, document detail, a dialog, settings appearance,
  in **dark + light × two accents**,
* an explicit statement of what was intentionally NOT touched (logic, API, schema, tests),
* and a note of any place where a shadcn behaviour had to be re-implemented, with how it was verified.

If any instruction here conflicts with keeping the app working, **keep the app working and flag it in the PR**
instead of guessing.
