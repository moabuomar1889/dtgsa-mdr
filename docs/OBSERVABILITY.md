# Observability

Scrape health/readiness, HTTP latency/status, queue depth/retries/dead letters,
PostgreSQL connections/size/slow queries, Drive reconciliation and tamper
events, email/webhook delivery, authentication anomalies, backup age, TLS
expiry, disk, memory, CPU, container restarts, and temp usage.

Alert rules live in `deploy/monitoring/alerts.yml`. Route critical alerts to the
operations owner and security incidents to the security owner. Metrics labels
must use application, environment, status class, and safe opaque IDs only;
never document names, people, Drive IDs, file names, or content.

Structured logs include UTC timestamp, level, app, commit, environment,
correlation ID, and safe request/job/event IDs. Tokens, cookies, secrets,
signed URLs, content, signatures, and unnecessary PII are redacted. Retain
application logs 30 days and security/audit evidence per approved retention
policy.
