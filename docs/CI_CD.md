# CI and CD

Pull requests run install, lint, typecheck, the disposable PostgreSQL complete
suite, architecture, documentation, dependency audit, sequential builds, and
five container builds with SBOM/provenance. GitHub secret scanning and CodeQL
must be enabled in repository settings; add Gitleaks as a required organization
check.

Protect `main`: pull request required, one owner review, conversations resolved,
linear history, no force push, and all quality/container/security checks
required. Coolify deploys only a verified merged commit. Production uses a
protected GitHub/Coolify environment with owner approval; no direct workstation
deployment is allowed.
