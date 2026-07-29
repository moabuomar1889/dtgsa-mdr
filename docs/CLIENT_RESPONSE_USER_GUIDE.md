# Client Response User Guide

Date: 2026-07-29

## Configure a Policy

Open `/settings/response-codes`. Create a client default draft or clone an
existing version for a project. Add numeric, letter, or text codes with exact
client wording, an internal label, file expectation, and independent effects.
Use Move up or Move down to set display order. Upload procedure or sample
references. Validate and publish the draft. Published content cannot be edited;
create the next draft version instead.

Development fixtures are shortcuts for local testing, not production rules.

## Register a Response

Open `/replies`, select the durable client submission, and select a code from
its resolved published policy. Review the effects preview before continuing.
Enter the incoming reference and dates, add a reviewer name when known, choose
the primary file kind, upload exactly one primary returned file and any
attachments, add comments, and confirm.

If the policy expects a different file kind or requires a returned file, the
server rejects incomplete evidence. A successful response becomes the current
external status while older responses remain visible.

## Create a Revision

When the response requires a new revision, use Create guided revision and
select the new working Main PDF. Enter the reason if it is not already clear
from the response. The platform creates the next revision, hashes the file,
creates a new manifest and Package Hash, restarts internal approval, and keeps
all old evidence. It does not copy signatures.

## Download Response Evidence

Choose the button labeled with the actual configured response label. The
request enters the durable worker. The worker assembles the returned evidence
according to its file kind and, when required, combines it with the exact Main
PDF from that client submission. The resulting artifact is private and
temporary.

If no published policy is shown, ask Document Control to publish a client
default or project override. If a job fails, use worker operations evidence
rather than repeating uploads or changing the controlled Main file.
