# DTGSA Nocturne UI Migration Report

## Outcome

The MDR web application now uses the DTGSA Nocturne presentation system across its application shell, shared primitives, operational screens, local acceptance surface, and cover-designer workspace. The migration is visual only: routes, handlers, server actions, authorization, persistence, schemas, and workflow behavior were not changed.

The supplied prototype at `C:\Users\moabu\Desktop\DTGSA MDR - Prototype.dc.html` was used as the visual reference. The pre-change Shadcn inventory is recorded in `docs/reports/NOCTURNE_UI_INVENTORY.md`.

## Delivered Surfaces

- Nocturne dark and light token themes with one derived accent seed.
- A no-flash theme bootstrap and browser-local persistence.
- Settings > Appearance with dark/light controls, six accent presets, and a validated custom hex input.
- Exact 50px top bar and 208px desktop sidebar, plus an accessible mobile off-canvas sidebar.
- DTG-owned buttons, badges, panels, fields, tables, tabs, menus, dialogs, sheets, drawers, charts, tooltips, and feedback surfaces under `components/dtg`.
- Dense neutral operational styling for dashboard, PDI, MDR, transmittals, replies, settings, admin, auth, portals, local acceptance, and the cover designer.
- One Lucide icon set throughout the active application.

## Removed

- `components/ui` generated primitives and all active imports from that namespace.
- `components.json`.
- The old `cn()` helper.
- `class-variance-authority`, `clsx`, `tailwind-merge`, `shadcn`, `tw-animate-css`, and `next-themes`.
- Legacy Shadcn color aliases, theme variants, gradients, and component-level hard-coded colors.

Radix, Vaul, Sonner, and Recharts remain because they provide behavior and accessibility rather than visual styling.

## Behavior Preservation

Radix-backed focus management, portals, Escape handling, menu keyboard behavior, and dialog semantics were retained. Vaul drawer behavior, Sonner notifications, and Recharts rendering were retained. Existing component names and public props remain compatible so presentation call sites changed without changing event handlers, form names, mutations, or selectors.

The existing semantic HTML table API was retained instead of replacing every table with CSS grid because doing so would have changed markup behavior and accessibility contracts. Width containment and compact row styling provide the required dense register presentation without altering table behavior.

## Verification

| Gate                       | Result                                     |
| -------------------------- | ------------------------------------------ |
| TypeScript                 | Passed                                     |
| ESLint                     | Passed                                     |
| MDR production build       | Passed                                     |
| Architecture validator     | Passed                                     |
| Unit tests                 | 135 passed                                 |
| Local E2E                  | 2 passed                                   |
| Browser console            | No errors or warnings on clean navigation  |
| Mobile dashboard           | No page-level horizontal overflow at 390px |
| Theme persistence          | Passed across clean-tab reload             |
| Custom accent validation   | Passed; out-of-range lightness rejected    |
| Keyboard sidebar dismissal | Passed with Escape                         |
| Nocturne acceptance greps  | Zero prohibited active-source hits         |

The full characterization run reached 203 of 204 tests. The single failing integration test is the unchanged `Phase 10 PostgreSQL leases recover and delivery attempts reject duplicates` assertion. It enqueues with the real current time but leases with the fixed timestamp `2026-07-30T00:00:00Z`; on 2026-07-30 after midnight the queued job is not yet eligible, so the lease is `undefined`. The failure reproduced with the local demo stopped and on three fresh disposable databases. No job-engine, server, test, or database code was changed during this visual migration.

## Visual Evidence

- [Dashboard, dark Iris](assets/nocturne/dashboard-dark-iris.png)
- [MDR register, dark Iris](assets/nocturne/mdr-register-dark-iris.png)
- [Appearance settings, light Teal](assets/nocturne/settings-light-teal.png)
- [Mobile sidebar, light Teal](assets/nocturne/mobile-sidebar-light-teal.png)

## Intentionally Untouched

- API routes and network contracts.
- Server services and actions.
- Prisma schema, migrations, and database behavior.
- Authentication and authorization rules.
- Form field names, validation messages, and workflow transitions.
- Existing application route inventory.

Appearance preferences use `localStorage` because the repository has no approved user-preference persistence model. No schema field was introduced.
