# HR Integration Example

HR creates Leave, Business trip, Overtime, or Employee acknowledgement requests
through a server-side `@dtg/integration-sdk` client. The source record ID is the
HR request ID and the callback points to an allowlisted HR status page.

The employee follows the returned central approval link. Approvers review and
sign only in `approve-web`; HR does not copy signatures or reconstruct evidence.
HR displays the SDK status badge and processes signed status webhooks
idempotently.

The integration scope is limited to `requests:read` and `requests:write`, plus
the HR project/client restrictions. It cannot read document evidence, download
artifacts, manage integrations, or impersonate the employee.
