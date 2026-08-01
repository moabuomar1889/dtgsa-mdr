# UI Audit Diagnostics

These evidence tools were preserved from the final Claude scratchpad because
they produced or supported the UI weight, streaming, and authorization findings.
They are not part of the default test suite.

Run them only against the loopback local-acceptance runtime:

```powershell
pnpm.cmd local:demo
node scripts/diagnostics/ui-audit/ttfb.mjs
node scripts/diagnostics/ui-audit/authz.mjs
node scripts/diagnostics/ui-audit/probe2.mjs
node scripts/diagnostics/ui-audit/status.mjs
```

`uiaudit.spec.ts` is the Playwright payload and DOM measurement harness. It may
be run with an explicit Playwright configuration after confirming that the test
directory accepts diagnostic files.

`stash_audit.sh` is the evidence script used to compare the four superseded
stash commits with the former `92d485a` baseline. It requires Bash, preserves
that historical baseline intentionally, and is not a current release gate.

The one-shot patch scripts and earlier superseded benchmark variants were not
archived. They had already been applied or replaced and were not reusable
evidence tools.
