# Synthetic Enterprise Repo

This is the working environment for the Always-On Ops Agent. Fork or clone this into a GitHub repo on your own account, then point your routine at it.

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

Point the Routines UI at this repo with a prompt that says to read and follow [ROUTINE_PROMPT.md](ROUTINE_PROMPT.md). That file contains the full operating procedure: guardrails, the incident-triage workflow (correlating `issues/` against `runbooks/` and `deploys/recent.json`), the compliance workflow (`contracts/` against `compliance-policy.md`), and the idempotency rules that keep repeated scheduled runs from duplicating work. Label names are defined in [LABELS.md](LABELS.md). [docs/ground-truth.md](docs/ground-truth.md) is the expected-output answer key used to verify the routine, not an input to it.
