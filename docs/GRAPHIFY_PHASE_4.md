# Graphify Phase 4

Date: 2026-07-29

## Comparison

| Metric      | Phase 3 | Phase 4 | Change |
| ----------- | ------: | ------: | -----: |
| Nodes       |   2,154 |   2,374 |   +220 |
| Edges       |   4,047 |   4,547 |   +500 |
| Communities |     197 |     206 |     +9 |

The increase represents the identity-domain package, OIDC and session
services, external portal controls, Directory reconciliation, admin actions
and UI, security tests, and supporting documentation.

## Observed Architecture

Focused traversal resolves the Google start and callback routes through
`beginGoogleWorkspaceSignIn`, `completeGoogleWorkspaceSignIn`, claims
validation, account linking, and `createInternalSession`.

External invitation actions resolve through
`createExternalPortalInvitation`, token delivery, redemption, isolated
sessions, scope checks, and PDI portal services. Directory admin actions
resolve through `synchronizeWorkspaceDirectory`, user reconciliation, mapping
grants, suspension, and `revokeAllUserSessions`.

The repository architecture validator reports five applications, nine
packages, and no workspace dependency cycles.

## Tool Recovery Note

The combined `graphify update .` path completed extraction but failed during
clustering with an internal callable error. The supported split sequence
completed successfully:

```text
graphify update . --no-cluster
graphify cluster-only . --no-label --no-viz
```

The route fixture warning is an expected zero-node JSON data file and does not
represent a missing code dependency.
