# DTGSA MDR Design Reference Archive

Date archived: 2026-08-01

These files were copied byte-for-byte from the owner-held desktop files and the
final Claude Design project scratch export before the former workspace was
retired.

## Preserved Originals

| File                                        | SHA-256                                                            |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `DTGSA MDR - Main Page Options.dc.html`     | `E4C27DB76B98C1CA00EEC3C1783438C4E60593D6FBF6B0B7554C9595B9806C9A` |
| `DTGSA MDR - Prototype.dc.html`             | `E284566A8FEC82AC155210E5F18AC14A09B4D1C4DF1DF9D93DC6CF6FA9B8BB0A` |
| `CODEX-PROMPT-restyle-to-DTGSA-Nocturne.md` | `40A342FD0E59D65C37E36D074EF9233ED396161201334B0B3A4F8D4D2FEF7D77` |
| `support.js`                                | `8FE7DF74405F3C55F49B7249C74EA1397E65D07DEA2B1BD3B4A489BEC2E28CBE` |

Both design documents reference `support.js` by relative path. They also load
Google Fonts and Phosphor CSS from external URLs when opened directly. They are
reference artifacts, not production application source.

The main-page options document preserves five design directions:

- 1a: prioritized My Desk action queue;
- 1b: approval pipeline board;
- 1c: register-first workspace;
- 1d: project command center;
- 1e: portfolio-first home and project-scoped navigation.

The implemented prototype follows 1a. Direction 1e remains the largest unported
information-architecture change. Directions 1b through 1d were not evaluated
during the implementation session and must be reviewed before future dashboard
redesign work.

## Missing Manual Export

The Claude Design project contained eight PNG uploads. The export interface
returned only a truncated 192 KiB fragment of one image, so no partial image is
committed here. Export the originals directly from the Design project UI before
deleting that project:

```text
uploads/draw-072d54f7-abdd-4499-8b90-3604039cbeb8.png
uploads/draw-1dd2d65a-cb72-43c3-8d0f-64a11ad330e8.png
uploads/draw-89515682-04ad-43a9-864e-15afbba71651.png
uploads/draw-8baee49f-c751-486f-af77-e12c145a826b.png
uploads/draw-da7fce95-0d36-4d16-a162-16b71b9dec73.png
uploads/draw-f540bbdc-b047-4e71-a825-4fcfc903cb0f.png
uploads/draw-fc8dc5a5-9016-44f4-aed9-162ffbaa955f.png
uploads/pasted-1785364135326-0.png
```

Do not treat the existing Nocturne migration screenshots as verified substitutes
for these eight source uploads.
