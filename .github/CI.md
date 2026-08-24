# CI

Required jobs in `.github/workflows/ci.yml` run on Ubicloud (`ubicloud-standard-2`).
The required check names are the job `name:` fields (`Lint, Typecheck, Test, Build`, `Dependency Audit`, `Secret Scan`); a runner-only switch does not need a branch-protection change.

## Why Ubicloud (not Namespace.so, not GitHub-hosted)

PR #11 switched those jobs to `runs-on: namespace-profile-default`. The Namespace GitHub App / billing / profile stopped picking up jobs. Required checks sat `queued` for over an hour and blocked merges to `main` (#18).

GitHub-hosted `ubuntu-latest` was a temporary unblock (#16 / #19, documented in #23). **Runner policy is Ubicloud only.** Do not restore Namespace. Do not fold a runner switch into product or dependency PRs.

Ubicloud registers **ephemeral** runners when a job requests `ubicloud` / `ubicloud-standard-*`. An idle `GET /repos/MehdiZare/MehdiZare/actions/runners` of `total_count: 0` while jobs still use `ubuntu-latest` is expected and is **not** a health check.

Label: `ubicloud-standard-2` is the documented 2 vCPU / 8GB Ubuntu 24.04 equivalent of GitHub-hosted `ubuntu-latest`. Do not use `ubuntu-latest` or `namespace-profile-*`.

## Pickup gate (isolated PR)

Do not merge a `runs-on` change until a `workflow_dispatch` of **that Ubicloud-using branch** leaves `queued` and completes on Ubicloud (#24). Idle `GET .../actions/runners == 0` is not a health gate; at most inspect runners while those jobs are queued or running.

## Out of scope

- Residual Strapi-tree audit findings and pnpm overrides (#13)
- Weakening `pnpm audit --audit-level high`
