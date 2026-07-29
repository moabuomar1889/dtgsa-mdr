# DTGSA Nocturne UI Inventory

## Scope

This report records the presentation baseline before the DTGSA Nocturne
migration. The migration is restricted to the visual and interaction-component
layer. Routes, server actions, API handlers, data access, permissions, form
field names, validation, test selectors, and application state are protected.

## Baseline

- Application: `apps/mdr-web`
- Page routes: 33
- React presentation files under `src/app` and `src/components`: 78
- Generated UI files: 24
- Active generated primitives: 22
- Generated primitive imports: 169
- Files importing generated primitives: 51
- Theme authority: `next-themes` with Shadcn class tokens
- Utility composition: `class-variance-authority`, `clsx`, and `tailwind-merge`
- Icon authority: `lucide-react`
- Styling engine retained: Tailwind CSS

## Primitive Inventory

| Shadcn primitive | Imports | Files | Behavior authority                      | Keep behavior? |
| ---------------- | ------: | ----: | --------------------------------------- | -------------- |
| Avatar           |       1 |     1 | Radix Avatar                            | Yes            |
| Badge            |      32 |    32 | Radix Slot for `asChild`                | Yes            |
| Button           |      16 |    16 | Radix Slot for `asChild`                | Yes            |
| Card             |      29 |    29 | Cosmetic React wrapper                  | No             |
| Chart            |       2 |     2 | Recharts                                | Yes            |
| Checkbox         |       2 |     2 | Radix Checkbox                          | Yes            |
| Drawer           |       1 |     1 | Vaul Drawer                             | Yes            |
| Dropdown Menu    |       3 |     3 | Radix Dropdown Menu                     | Yes            |
| Input            |      21 |    21 | Native input                            | No             |
| Label            |      12 |    12 | Radix Label                             | Yes            |
| Select           |       6 |     6 | Radix Select                            | Yes            |
| Separator        |       3 |     3 | Radix Separator                         | Yes            |
| Sheet            |       1 |     1 | Radix Dialog                            | Yes            |
| Sidebar          |       7 |     7 | Local state, Radix Slot, Sheet, Tooltip | Yes            |
| Skeleton         |       1 |     1 | Cosmetic React wrapper                  | No             |
| Sonner           |       1 |     1 | Sonner toast runtime                    | Yes            |
| Table            |      15 |    15 | Native table semantics                  | Yes            |
| Tabs             |       4 |     4 | Radix Tabs                              | Yes            |
| Textarea         |       8 |     8 | Native textarea                         | No             |
| Toggle           |       1 |     1 | Radix Toggle                            | Yes            |
| Toggle Group     |       1 |     1 | Radix Toggle Group                      | Yes            |
| Tooltip          |       2 |     2 | Radix Tooltip                           | Yes            |

Inactive generated wrappers:

- Breadcrumb
- Dialog

## Dependencies Introduced By The Current UI Layer

Remove after all imports are migrated:

- `shadcn`
- `class-variance-authority`
- `next-themes`
- `tw-animate-css`
- `tailwind-merge`, if no non-UI imports remain
- `clsx`, if no non-UI imports remain

Retain:

- `radix-ui`
- `vaul`
- `sonner`
- `recharts`
- `lucide-react`
- Tailwind CSS

The supplied prototype uses Phosphor icons, but the specification explicitly
allows retaining Lucide when it is already installed. Lucide remains the single
icon authority to avoid introducing a second runtime icon set.

## Theme And Class Baseline

The current theme is defined in `src/app/globals.css` through Shadcn semantic
variables such as `--background`, `--foreground`, `--primary`, `--card`,
`--muted`, `--ring`, and sidebar variants. The same file imports
`shadcn/tailwind.css`, `tw-animate-css`, and uses a `.dark` class variant.

Current presentation files contain:

- Shadcn semantic utility classes such as `bg-background`, `bg-card`,
  `text-muted-foreground`, and `border-border`
- `dark:` variants
- large rounded surfaces and decorative gradients
- raw chart color values outside a central design-token layer

All are migration targets. Final theme selection will use `data-theme` and the
Nocturne variable layer.

## Protected Behavior

The following behavior must remain unchanged while wrappers are restyled:

- focus traps, portals, escape handling, and focus restoration
- select, menu, checkbox, toggle, and tab keyboard interaction
- mobile sidebar and drawer state
- toast dispatch and lifecycle
- chart rendering and tooltip data
- native table semantics
- `asChild` composition
- every route, action, handler, form field name, validation message, ARIA
  attribute, and test selector

## Migration Order

1. Add Nocturne tokens and the local theme provider.
2. Rebuild the 50 px header and 208 px responsive sidebar.
3. Replace visual wrappers while retaining the behavior authorities above.
4. Migrate high-traffic screens, then remaining app, settings, auth, and portal
   surfaces.
5. Add Appearance controls for theme and accent selection.
6. Remove Shadcn-only packages, utilities, files, classes, and tokens.
7. Verify build, lint, tests, local E2E, keyboard behavior, dark/light modes,
   accent persistence, browser console, responsive layout, and visual fidelity.
