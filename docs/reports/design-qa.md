# Nocturne Design QA

## Reference

- Visual specification: `C:\Users\moabu\Desktop\CODEX-PROMPT-restyle-to-DTGSA-Nocturne.md`
- Interactive prototype: `C:\Users\moabu\Desktop\DTGSA MDR - Prototype.dc.html`
- Tested application: `http://127.0.0.1:3100`

## Result

Passed with one documented non-visual test limitation.

## Visual Checks

- Shell geometry: 50px header and 208px sidebar confirmed.
- Dark Iris: dashboard and MDR register inspected at 1280px.
- Light Teal: Appearance settings inspected at 1280px.
- Mobile: dashboard and sidebar inspected at 390x844 with no page overflow.
- Active navigation: only the exact active route receives the inset accent marker.
- Density: compact panel padding, 32-36px table rows, restrained type scale, and neutral surfaces confirmed.
- Color discipline: semantic status colors only; no gradients or hard-coded component colors.
- Radius discipline: full circles limited to avatars, count bubbles, accent swatches, and the drawer handle.

## Interaction Checks

- Theme changes immediately and persists after reload.
- Accent changes immediately and persists after reload.
- Invalid custom accent lightness shows an inline error and does not replace the active seed.
- Mobile sidebar opens as an accessible dialog and closes with Escape.
- Focus-managed Radix surfaces remain mounted through the DTG wrappers.
- Clean navigation produced no browser console errors, including no CSP `eval()` error.

## Evidence

- `assets/nocturne/dashboard-dark-iris.png`
- `assets/nocturne/mdr-register-dark-iris.png`
- `assets/nocturne/settings-light-teal.png`
- `assets/nocturne/mobile-sidebar-light-teal.png`
