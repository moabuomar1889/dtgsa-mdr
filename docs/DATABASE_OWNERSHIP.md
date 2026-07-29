# Database Ownership

| Owner                               | Models                                                             |
| ----------------------------------- | ------------------------------------------------------------------ |
| `@dtg/database`                     | Client boundary, migrations, roles, health                         |
| `@dtg/document-control-domain`      | Documents, revisions, PDI, files, submissions, responses, comments |
| Future identity domain              | User identities, profiles, departments, delegations, overrides     |
| Future workflow engine              | Definitions, snapshots, cycles, steps, assignments, decisions      |
| Future signature domain             | Manifests, evidence, seals, timestamps, verification               |
| Future controlled-documents package | File objects, controlled files, integrity, reconciliation          |

Prisma remains one schema. Ownership governs services and migrations; it does
not create separate databases.
