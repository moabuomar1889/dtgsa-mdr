# Client Response Matrix

Date: 2026-07-29

## Independent Effects

| Effect                       | Meaning                                    |
| ---------------------------- | ------------------------------------------ |
| `outcomeClass`               | Internal reporting classification          |
| `countsAsApproved`           | Counts toward an approved state            |
| `finalApproval`              | Represents final client approval           |
| `rectificationRequired`      | Comments must be rectified                 |
| `newRevisionRequired`        | A new external revision is mandatory       |
| `internalReapprovalRequired` | The new revision repeats internal approval |
| `resubmissionRequired`       | The result must return to the client       |
| `temporaryUseAllowed`        | Interim use is explicitly permitted        |
| `closureAllowed`             | Lifecycle closure is permitted             |
| `newDocumentNumberRequired`  | Follow-up must use a new base number       |
| `returnedFileRequired`       | A primary returned file is mandatory       |
| `expectedFileKind`           | Required primary evidence type             |

Validation rejects contradictory policies. A rejected outcome cannot count as
approved. Final approval must count as approved and explicitly permit closure.
A new document number requires a revision path.

## Outcome Classes

Supported values are `REJECTED`, `REJECTED_WITH_COMMENTS`,
`CONDITIONALLY_APPROVED`, `APPROVED_WITH_COMMENTS`, `REVISION_REQUIRED`,
`FINAL_APPROVED`, `INFORMATION_ONLY`, `HOLD`, `CANCELLED`, and `CUSTOM`.

## File Kinds

Primary evidence supports `FULL_DOCUMENT`, `COVER_ONLY`, `COMMENT_SHEET`,
`APPROVAL_LETTER`, `RESPONSE_FORM`, `TRANSMITTAL`, and `OTHER`. Attachments
preserve markups, spreadsheets, correspondence, additional sheets, and
supporting files independently from the one primary file.

## Development Fixtures

`AIR_PRODUCTS_DEV`, `JIGPC_DEV`, and `CONDITIONAL_CODE_2_DEV` are development
and test templates only. Production cannot create fixture-backed policies.
Their code values do not create platform-wide rules.

The conditional Code 2 fixture demonstrates that one code may count as
conditionally approved while still requiring rectification, a new revision,
full internal reapproval, and resubmission. Another client's Code 2 may mean
rejected with comments. The selected published policy is the only authority.
