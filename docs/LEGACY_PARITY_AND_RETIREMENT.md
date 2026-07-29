# Legacy Parity and Retirement

Date: 2026-07-29

Legacy code may be removed only after all of these gates pass:

1. Target path enabled.
2. Data migration and reconciliation complete.
3. Tests prove behavioral and evidence parity.
4. Rollback no longer required.
5. No remaining consumers.
6. Documentation and operations procedures updated.

Historical evidence is never deleted as part of runtime retirement.

| Legacy path                      | Target path                                       | Decision                      | Evidence needed before removal                                                   |
| -------------------------------- | ------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------- |
| Supabase password authentication | Google Workspace OIDC                             | RETAINED_DEPRECATED           | Live identity mapping, session cutover, rollback closure                         |
| Supabase-primary storage         | Controlled Google Drive                           | RETAINED_DEPRECATED           | Full inventory, controlled-copy reconciliation, permission and hash verification |
| Fixed workflow                   | Versioned workflow engine                         | RETAINED_DEPRECATED           | Production case migration, UI parity, no fixed-flow consumers                    |
| `SignatureEvent` trust path      | Package-bound approval evidence and platform seal | RETAINED_HISTORICAL_UNTRUSTED | Never delete history; consumers must use new evidence                            |
| Persistent merged package        | On-demand private expiring artifact               | RETAINED_DEPRECATED           | No legacy downloads or transmittals consume persistent packages                  |
| In-request email/PDF             | Durable worker and outbox                         | RETAINED_DEPRECATED           | All callers queue work and provider delivery is staging-verified                 |
| Compatibility exports            | Public package contracts                          | RETAINED_DEPRECATED           | Import inventory proves zero consumers                                           |

No legacy path was deleted in Phase 15. New production mode rejects legacy
internal password authentication, but migration code remains for controlled
rollback in non-production environments. Supabase storage remains materially
used by legacy MDR services, so claiming storage retirement would be false.

## Retirement Procedure

1. Capture a production-safe inventory without file content or secrets.
2. Reconcile identity, file, workflow, revision, response, and evidence counts.
3. Run target and legacy reads in comparison mode.
4. Resolve every mismatch and obtain owner sign-off.
5. Disable new writes to the legacy path.
6. Observe rollback and audit windows.
7. Remove consumers before exports or schemas.
8. Preserve historical rows and immutable evidence.
