# Security Acceptance

Date: 2026-07-29

## Result

Code-level security acceptance is complete. The production dependency audit has
zero critical/high advisories after remediation. The all-dependency audit
retains one reviewed development-only toolchain advisory described below. Live
infrastructure acceptance remains blocked where it requires authorized
credentials, Docker, public domains, provider systems, or a staging environment.

## Acceptance Matrix

| Control                     | Result                    | Evidence                                                                          |
| --------------------------- | ------------------------- | --------------------------------------------------------------------------------- |
| Threat-model validation     | COMPLETE                  | `docs/THREAT_MODEL.md` and phase security suites                                  |
| Authentication bypass       | COMPLETE locally          | Production auth-mode rejection, OIDC state/nonce/PKCE tests                       |
| Cross-project/client access | COMPLETE locally          | Service, integration, portal, viewer, and database tests                          |
| Separation of duties bypass | COMPLETE locally          | Workflow conflict and transaction tests                                           |
| Override abuse              | COMPLETE locally          | Scoped, expiring, auditable override policy                                       |
| Session theft/revocation    | COMPLETE locally          | Opaque hashed sessions, rotation, revocation, recent auth                         |
| Magic Link replay           | COMPLETE locally          | One-use hash, expiry, attempt, replacement, replay tests                          |
| IDOR                        | COMPLETE locally          | Server-side project/client/assignment resolution                                  |
| CSRF                        | COMPLETE locally          | Double-submit tokens and hashed server session binding                            |
| XSS/CSP                     | COMPLETE locally          | Escaped React output and global CSP/security headers                              |
| Rate limiting               | COMPLETE locally          | Portal, verification, and integration request evidence                            |
| Webhook replay and SSRF     | COMPLETE locally          | Timestamp/event replay window and public HTTPS validation                         |
| File/MIME validation        | COMPLETE locally          | Picker, upload, delivery, size, MIME, and `nosniff` checks                        |
| Malware scan                | PARTIALLY_COMPLETE        | Durable job contract exists; live scanner is BLOCKED_EXTERNAL                     |
| Malicious PDF sandbox       | PARTIALLY_COMPLETE        | No shell interpolation and sandbox headers; live tool sandbox is BLOCKED_EXTERNAL |
| Drive permission drift      | COMPLETE locally          | Reconciliation and integrity state tests                                          |
| Main-file tamper            | COMPLETE locally          | SHA-256 and one-main-file enforcement                                             |
| Cover reuse                 | COMPLETE locally          | Package/template snapshot binding                                                 |
| Manifest tamper             | COMPLETE locally          | Canonical hash verification                                                       |
| Seal tamper                 | COMPLETE locally          | Ed25519 application-seal verification                                             |
| Audit tamper                | COMPLETE locally          | Append-only chain and tamper tests                                                |
| Secret scan                 | COMPLETE                  | Targeted repository scan found zero matches                                       |
| Dependency scan             | COMPLETE                  | Runtime upgrades, XLSX replacement, transitive overrides                          |
| SAST                        | COMPLETE locally          | Typecheck, ESLint, architecture checker, focused source review                    |
| Container scan              | BLOCKED_EXTERNAL          | Docker is not installed                                                           |
| Public-port review          | COMPLETE as configuration | Database/API/worker private; live scan is BLOCKED_EXTERNAL                        |

## Dependency Remediation

The final pass upgraded Next.js, React, Nodemailer, Docxtemplater, Sharp,
Supabase clients, PostCSS tooling, and vulnerable transitive packages. The
unmaintained `xlsx` package was replaced with the patched `@e965/xlsx` fork;
characterization tests prove the PDI XLSX column order, values, normalization,
empty workbook, and invalid input behavior.

The release-blocking runtime audit command is:

```powershell
pnpm audit --prod --audit-level high
```

It reports zero critical/high advisories. The full audit reports
`GHSA-mh99-v99m-4gvg` against development-only `brace-expansion@1.1.17`.
That version is the patched 1.x line, but the advisory metadata lists only
`>=5.0.8`; forcing 5.x into Minimatch 3 breaks ESLint and is rejected. The
compatible patched 1.x, 2.x, and 5.x lines are pinned, lint passes, and this
scanner classification is retained as a reviewed toolchain exception.

Low and moderate advisories remain tracked for maintenance. They do not permit
the production verdict to exceed `STAGING_READY`, and every new runtime high or
critical advisory must block release.

## Residual Risk

- The static CSP requires inline style/script compatibility for current Next.js
  rendering. A nonce-based production CSP is recommended after end-to-end
  browser verification.
- Malware, qpdf, KMS/HSM, provider egress, container, TLS, and public-port
  controls require authorized staging.
- Live credential issuance, rotation, and revocation must be exercised without
  exposing secrets in logs or reports.
