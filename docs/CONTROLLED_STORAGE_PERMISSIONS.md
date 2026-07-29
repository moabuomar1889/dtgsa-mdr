# Controlled Storage Permissions

Date: 2026-07-29

Direct Drive access is limited to the service identity, authorized DC
administrators, system administrators, and an emergency Workspace
administrator. Managers and ordinary employees receive platform-authorized
streaming only, never raw Drive IDs or Drive links.

The adapter detects and removes `anyone`, domain-wide, and unknown principal
permissions. Permission fingerprints are stored for reconciliation. Every
platform open/download is audited; administrative inspection follows the same
service and audit path.

Shared proxy caching is disabled with `private, no-store`, MIME sniffing is
disabled, and range responses include bounded content-range headers.
