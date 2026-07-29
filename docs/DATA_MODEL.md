# Data Model

```mermaid
erDiagram
  User ||--o{ UserIdentity : has
  DocumentRevision ||--o{ ControlledMainFile : controls
  FileObject ||--o| ControlledMainFile : supplies
  WorkflowDefinition ||--o{ WorkflowDefinitionVersion : versions
  WorkflowDefinitionVersion ||--o{ WorkflowSnapshot : snapshots
  WorkflowSnapshot ||--o{ ApprovalCycle : governs
  DocumentRevision ||--o{ ApprovalCycle : runs
  DocumentRevision ||--o{ PackageManifest : records
  PackageManifest ||--o{ PackageManifestItem : contains
  ClientResponseCodeSet ||--o{ ClientResponseCodeSetVersion : versions
  ClientResponseCodeSetVersion ||--o{ ClientResponseCode : defines
  ClientResponsePolicySnapshot ||--o{ ClientResponse : governs
  OutboxEvent ||--o{ DeliveryAttempt : delivers
  BackgroundJob ||--o{ JobAttempt : attempts
```

The schema contains legacy and target models together. Relations required by
Phase 3 enforcement are explicit; other future-domain references use immutable
scalar identifiers until their owning runtime package is introduced.
