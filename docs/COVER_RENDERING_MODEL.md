# Cover Rendering Model

Date: 2026-07-29

## Authoritative Renderer

`@dtg/pdf-engine` renders visual covers directly with `pdf-lib`. Browser
screenshots are not authoritative. Standard PDF fonts are embedded without
unlicensed assets, PDF metadata dates are fixed, object streams are disabled,
and a stable input produces stable bytes and SHA-256 output hash.

## Inputs

The renderer receives an immutable template snapshot, allowlisted values,
server-loaded signature appearance bytes and evidence references, a dynamic
project response legend, approved image bytes, and a verification URL.

Relative coordinates are converted to PDF points using the selected A4, A3, or
custom page size and orientation. Text is escaped and bounded. Overflow is a
rendering error. Images and signatures preserve aspect ratio. QR codes are
generated as actual error-corrected PNG symbols and embedded in the PDF.

## Historical Reproduction

For a visual cover, storage paths include the output hash. The database records
the exact template version and snapshot, workflow snapshot when available,
template content hash, renderer version, output hash, and file object. Repeated
generation of identical deterministic bytes reuses the immutable file object.

## Compatibility

If no published visual version resolves, the service uses the existing managed
DOCX and LibreOffice pipeline. If that is unavailable or fails, the legacy
generated PDF cover remains the final compatibility fallback. Visual rendering
failure is recorded in the system log rather than silently changing the
published template.
