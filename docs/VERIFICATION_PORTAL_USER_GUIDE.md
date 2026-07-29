# Verification Portal User Guide

Date: 2026-07-29

Open `https://verify.dtgapps.cc`, scan the QR code or enter the unpredictable
verification code. To check a local file, select it in the optional file field.
The browser calculates SHA-256 locally and shows progress. File bytes are not
uploaded. Cancel before completion to discard the local operation.

Submit the code to view the policy-allowed result. `VALID` means the selected
evidence and recorded chain match. `TAMPER_DETECTED` or `INVALID_HASH` means
the selected bytes do not match. Other statuses explain manifest, seal, key,
file, or version problems without revealing internal data.

Employees with project access can use `/verification` in the MDR application
to inspect approver identity and role snapshots, workflow cycles, review
evidence, manifests, file hashes, client responses, audit summaries, and seal
details.

An authoritative Main file is the controlled source. A client response file is
external evidence. A generated download is a temporary derivative. Matching
one type does not convert it into another.
