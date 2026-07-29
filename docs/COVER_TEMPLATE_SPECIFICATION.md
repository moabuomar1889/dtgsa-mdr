# Cover Template Specification

Date: 2026-07-29

## Ownership

Document Control owns visual cover layouts in `mdr-web`. The reusable
`@dtg/cover-designer` package owns schema, validation, inheritance, relative
layout, image safety, and reducer contracts. `@dtg/pdf-engine` owns
authoritative PDF rendering.

## Page and Elements

Schema version `1` supports A4, A3, and custom page dimensions in portrait or
landscape. Every element uses page-relative `x`, `y`, `width`, and `height`
values between zero and one. Templates remain structured JSON and are never
stored as screenshots.

Supported elements are static text, bound text, image, line, rectangle, table,
metadata block, revision table, QR code, verification code, Package Hash,
signature box, client response legend, client reviewer, client signature,
client review date, and custom field.

## Bindings

Bindings are selected from a fixed allowlist covering client, project,
document identifiers and metadata, workflow participants, signer attributes,
client response data, and verification data. Arbitrary expressions and code
are not accepted. Publication fails for an unknown binding, invalid page,
duplicate element identifier, out-of-bounds element, invalid signature box, or
missing Prepared By Manager box.

## Inheritance

The deterministic resolution order is organization, client, project, document
type, and discipline. Priority and publication time break ties within an
equally specific scope. A selected inherited version can be cloned into a new
draft without mutating its source.

## Lifecycle

Versions move through Draft, Published, Superseded, and Archived. Publication
stores the canonical snapshot and SHA-256 content hash. PostgreSQL prevents
content or child-element mutation after publication. A new publication
supersedes the prior published version for the template.

Generated covers record the exact template version, template snapshot,
workflow snapshot when available, content hash, renderer version, output hash,
and immutable file object.

## Security

Template administration requires `templatesManage`. Server actions
reauthenticate and reauthorize. Scope identifiers must exist and match their
declared scope type. Images are size and MIME restricted. SVG scripts, event
handlers, external references, `foreignObject`, and JavaScript URLs are
rejected. Signature asset URLs are never exposed to the client.
