# Prepared By Manager Specification

Date: 2026-07-29

## Requirement

Every publishable cover contains a visible `SIGNATURE_BOX` whose
`workflowStepKey` is `prepared`. The box is a formal evidence presentation
area, not a decorative image.

## Visible Content

The renderer displays:

```text
Prepared By: <Manager Name>
<Signature Appearance>
<Job Title / Department>
Date: <Signing Date>
<Decision>
Ref: <Evidence Reference>
```

The role label, workflow step, and optional specific assignment are stored in
the template snapshot. Multiple manager boxes are supported through distinct
workflow step keys and element identifiers.

## Trust Boundary

The signature image is appearance only. Approval authority comes from the
immutable approval evidence and Package Hash binding created by the workflow
engine. The generated cover includes an evidence reference and can record the
workflow snapshot used during generation. Missing or invalid appearance bytes
do not create authority and do not prevent rendering the evidence text.

Signature bytes are loaded server-side from controlled storage, embedded with
preserved aspect ratio, and are never delivered to the designer as a raw
storage URL.
