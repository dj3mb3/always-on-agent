# Synthetic Enterprise Repo

This is the working environment for the Always-On Ops Agent. Fork or clone this into a GitHub repo on your own account, then point your routine at it.

New here or explaining this to someone non-technical? Open [explainer.html](explainer.html) — a simple, animated, kid-friendly walkthrough of what this whole project does.

## What's in here

- `issues/` — Open production incidents (JSON). Realistic but synthetic.
- `runbooks/` — Operational playbooks the agent can reference.
- `deploys/` — Recent deploy log (`recent.json`), used for correlating incidents with deploys.
- `contracts/` — Vendor contracts (for Card C — Compliance Drift).
- `compliance-policy.md` — The policy the compliance agent enforces.

All data is fictional. Companies, names, error messages, contract terms — none of it maps to real systems.

## How to use

```bash
# Clone (or fork) this into your own GitHub
gh repo create my-hackathon-repo --private --clone
cd my-hackathon-repo
cp -r ../partner-basecamp-hackathon/01-always-on-ops-agent/synthetic-repo/* .
git add . && git commit -m "Seed synthetic enterprise data" && git push

# Then point your routine at this repo via the Routines UI
```

### Seeding (one-time, manual)

`issues/*.json` are synthetic incident tickets, not real GitHub issues. Before the routine can triage them, convert them into real issues once:

```bash
gh auth login   # scope to this repo, issues read/write
./scripts/seed_github_issues.sh
```

The script is idempotent (safe to re-run) but is infrastructure setup, not agent behavior — never call it from the recurring routine, or every scheduled run would re-seed duplicates. After seeding, `issues/*.json` is frozen/historical; the routine reads live issue state via `gh issue list`, not these files.

### Routine (recurring)

The routine runs as a GitHub Actions workflow, [.github/workflows/ops-agent.yml](.github/workflows/ops-agent.yml), instead of depending on the hosted Routines UI. On a schedule (and on manual dispatch) it installs the Claude Code CLI and runs it headlessly against [ROUTINE_PROMPT.md](ROUTINE_PROMPT.md) — the full operating procedure: guardrails, the incident-triage workflow (correlating `issues/` against `runbooks/` and `deploys/recent.json`), the compliance workflow (`contracts/` against `compliance-policy.md`), and the idempotency rules that keep repeated runs from duplicating work. Label names are defined in [LABELS.md](LABELS.md). [docs/ground-truth.md](docs/ground-truth.md) is the expected-output answer key used to verify the routine, not an input to it.

Before the workflow can run, set the API key it needs as a repo secret (do this yourself — don't paste the key anywhere else):

```bash
gh secret set ANTHROPIC_API_KEY --repo dj3mb3/always-on-agent
```

### Local dashboard

`dashboard/` is a small, dependency-free local UI that mirrors the hosted Routines page for this workflow — status, schedule, an enable/disable toggle, a "Run now" button, recent run history, and recent agent activity (triaged issues, compliance reviews). It talks to GitHub entirely through your already-authenticated `gh` CLI session; no token is ever exposed to the browser.

```bash
node dashboard/server.js
# open http://localhost:4321
```
