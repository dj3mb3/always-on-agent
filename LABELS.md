# Label taxonomy

Canonical label names used by both the seeding script (`scripts/seed_github_issues.sh`) and the recurring routine (`ROUTINE_PROMPT.md`). Keep names exactly as written below — the routine matches on these strings to decide what it has already done.

## Severity (incident triage)

| Label | Meaning |
|---|---|
| `sev:P0` | Broad/all-customer impact |
| `sev:P1` | Single tenant/enterprise customer impact |
| `sev:P2` | Systemic but degraded/intermittent, not a full outage — use only when a runbook's severity guide doesn't map cleanly onto P0/P1/P3 |
| `sev:P3` | Single user / narrow / minor impact |

## Runbook traceability

| Label | Meaning |
|---|---|
| `runbook:auth-502` | Matched `runbooks/auth-502-windows.md` |
| `runbook:cdn-latency` | Matched `runbooks/cdn-upload-latency.md` |
| `runbook:payment-degraded` | Matched `runbooks/payment-service-degraded.md` |

## State / workflow gates

| Label | Meaning |
|---|---|
| `triaged` | Incident issue has received its initial triage comment — idempotency gate, skip on future runs |
| `not-incident` | Issue is not an operational incident (e.g. a feature request) — applied instead of a severity label |
| `needs-human-review` | Agent could not confidently classify severity or root cause — explicit low-confidence fallback, never a silent guess |
| `compliance-reviewed` | Contract has received its tracker issue — idempotency gate |
| `source:seed` | Applied by the seeding script to every issue created from `issues/*.json` |
