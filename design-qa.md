# MDR Workspace Simplification and Client Cover Design QA

## Evidence

- Baseline screenshots: `.local-runtime/screenshots/audit-before-*.png`
- Final screenshots: `.local-runtime/screenshots/audit-after-*.png`
- Client workspace: `.local-runtime/screenshots/client-workspace-after.png`
- Spreadsheet cover reference: `.local-runtime/reference-analysis/source-cover-xlsx-page1.png`
- PDF cover reference: `.local-runtime/reference-analysis/source-cover-pdf-page1.png`
- Viewport: 1280 x 720 at device density 1.
- State: authenticated Document Control administrator, dark Nocturne theme, local acceptance data.
- Normalization: each baseline and final route was captured in the same browser, viewport, theme, identity, and database state.

## Full-View Comparison

The baseline pages mixed introductions, metrics, creation forms, configuration forms, and registers in one reading path. The final pages use one shared register-first shell: a compact heading, a responsive metric strip, the primary register or queue, and one focused side panel for creation. Lower-frequency administration is collapsed or moved behind a named action.

## Route Review

- Transmittals: the ten-input creation workflow moved into `New transmittal`; the transmittal register is now the first operational surface.
- MDR: the long explanatory hero was removed while document and revision workflow actions remain unchanged.
- Replies: reply capture moved into `Record reply`; evidence, filters, policy access, and reply history remain available.
- Tasks: four workflow queues now link directly to the exact MDR revision and share one action surface.
- Clients: creation moved into `New client`; every row now opens a dedicated client workspace.
- Masters: four creation forms moved into one reusable side panel; numbering and coding registers are primary.
- Identity: account-link reviews remain primary; directory, mapping, and invitation controls are collapsed by workflow.
- Users: the user register is primary; role and permission reference data are collapsed.
- Templates: current assets are primary; file upload is collapsed and browser-editable covers route through a client.

## Client Covers

- The JIGPC spreadsheet and Air Products PDF were visually inspected and converted into structured A4 preset documents.
- Both presets use real editable layout elements, allowlisted data bindings, client logo elements, signature boxes, review legends, and QR verification.
- A visual-cover draft can only be created from the application UI with a required client ID.
- Internal template codes are prefixed with the unique client code, and designer listings are filtered through active `CLIENT` inheritance rules.
- Client logos render from the client record in both the browser designer and generated PDF.
- Published cover versions remain immutable and continue through the existing audit and generation services.

## Client Preferences

- Preferences are managed at `/clients/[clientId]` and stored in the existing `ClientSetting` record.
- Editable defaults include timezone, upload size, transmittal size, response target, transmittal purpose, and cover inclusion rules.
- Transmittal creation now reads the selected client's response target, purpose, and package limit.
- Existing JSON preference keys are preserved when these controlled fields are updated.

## Interaction Evidence

- All nine requested routes rendered without a runtime, module, or server error.
- Main-screen input counts dropped to zero for Transmittals, Clients, Masters, Templates, Identity, and Users.
- The client workspace rendered preferences, logo management, and editable cover versions.
- `Open cover designer` displayed both supplied cover presets and two working draft actions.
- TypeScript, architecture, provider-retirement, and all 157 unit tests passed.

## Residual Polish

- P3: add server-side search to Clients and Masters when production registers exceed the current local data volume.
- P3: a client with a WebP or SVG logo should also store a raster rendering variant before PDF generation; the browser accepts those formats, while the deterministic PDF path currently embeds PNG and JPEG.

final result: passed
