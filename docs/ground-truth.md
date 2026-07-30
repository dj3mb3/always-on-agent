# Ground truth (for verification only)

Do not reference this file from `ROUTINE_PROMPT.md` or give it to the routine — it's the answer key used to check the agent's output, not an input to it.

## Incident triage

| Issue | Expected runbook | Expected severity | Must cite | Must NOT recommend |
|---|---|---|---|---|
| PROD-4487 (Acme checkout stuck) | `runbook:payment-degraded` | `sev:P1` (single tenant — Acme) | deploy `v4.8.2` (guest checkout) + Acme's `tenant-config-service` flag flip + `PaymentService.java:142` | — |
| PROD-4498 (login 502 bursts) | `runbook:auth-502` | `sev:P1` or `sev:P2` (judgment call — either is acceptable, document reasoning) | connection pool exhaustion, `DB_POOL_SIZE` 30→60 | scaling auth-service pods; raising LB timeout (runbook explicitly warns against both) |
| PROD-4506 (parallel batch jobs) | none — `not-incident` | no severity label | explanation that it's a feature request, not an incident | any severity or runbook label |
| PROD-4519 (slow mobile uploads) | `runbook:cdn-latency` | `sev:P2` or `sev:P3` (judgment call — the runbook defines no severity guide of its own; both iOS/Android affected argues for P2 "systemic but degraded", narrower-than-outage impact argues for P3, either is acceptable if the reasoning is stated) | `signing-service` deploy (URL TTL reduction) + `URL_TTL_SECONDS=3600` fix | — |
| PROD-4521 (NPE at checkout) | `runbook:payment-degraded` | `sev:P0` (broad, 2 regions, ~2,400 checkouts) | deploy `v4.8.2` + `PaymentService.java:142` | — |

Idempotency check: running the routine twice in a row (sequentially) must produce zero new comments, zero new labels, zero new issues on the second run.

Concurrency check: two overlapping runs (e.g. a manual dispatch fired while a prior run is still in progress) previously produced duplicate triage comments on the same issue, since the check-then-act idempotency logic isn't atomic across processes — confirmed live on 2026-07-30 (issues #3 and #4 each briefly got a duplicate `triage:v1` comment). Fixed at the infrastructure level via a `concurrency` group in `.github/workflows/ops-agent.yml` that serializes runs. Re-verify after that fix: trigger two dispatches back-to-back and confirm the second one queues rather than executing in parallel.

## Compliance review

| Contract | Expected result |
|---|---|
| `acme-data-platform.md` | 2 violations: data residency (no EU guarantee), breach notification (96h > 72h limit). 1 borderline: governing law (California — not on the policy's named list of England & Wales / Ireland / US Delaware). Must not be silently passed or hard-failed. |
| `globex-messaging.md` | 0 violations — fully compliant. Tracker issue should still be created, confirming coverage rather than being skipped. |
| `sirius-storage.md` | 7/7 violations: data residency (silent/no EU mention), audit rights (180 days > 90 max), termination (not permitted during initial term), liability cap (3 months < 12 min), subprocessors (no notice), breach notification (vague, no window), governing law (Malaysia, not a recognized regime). |

One tracking issue per contract (not per rule), each carrying the marker `<!-- ops-agent:compliance-tracker:contracts/<file> -->`.
