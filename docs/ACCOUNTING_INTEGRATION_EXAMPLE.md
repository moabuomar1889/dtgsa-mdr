# Accounting Integration Example

Accounting receives an employee-advance request in its own application. Its
backend creates a General Request using the published `EMPLOYEE_ADVANCE`
version, source system `ACCOUNTING`, entity type `ADVANCE_REQUEST`, the
Accounting record ID, purpose, classification, amount, and reason.

The backend stores the returned request ID and deep link. The browser receives
only the deep link and a read-only status; it never receives the service-client
secret. Approval, review, signature evidence, PDF summary, audit, and webhook
delivery stay centralized.

Accounting subscribes to case and file events. Its receiver verifies the HMAC,
five-minute timestamp, and unique webhook ID before updating the advance
record. A retry therefore cannot release funds twice.
