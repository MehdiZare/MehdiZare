# CI

Required jobs in `.github/workflows/ci.yml` run on GitHub-hosted `ubuntu-latest`.
The required check names are the job `name:` fields (`Lint, Typecheck, Test, Build`, `Dependency Audit`, `Secret Scan`); a runner-only switch does not need a branch-protection change.

## Why not Namespace.so

PR #11 switched those jobs to `runs-on: namespace-profile-default`. The Namespace GitHub App / billing / profile stopped picking up jobs. Required checks sat `queued` for over an hour and blocked merges to `main` (#18).

The GitHub-hosted workaround landed on `main` via #16 (PR #19 was closed as superseded). That is the runner policy until Namespace is proven again. Do not fold a runner switch into product or dependency PRs.

During #18, `GET /repos/MehdiZare/MehdiZare/actions/runners` was empty while jobs requested `namespace-profile-default`. An empty list while jobs use `ubuntu-latest` is expected: Namespace registers ephemeral runners only when a job requests `namespace-profile-*`.

## Restore Namespace later

Isolated PR only, after all of the following are true (#24):

1. Namespace.so GitHub App is installed for this repo, billed, and the `namespace-profile-default` profile exists.
2. An isolated branch (do not merge yet) sets `runs-on: namespace-profile-default` in `.github/workflows/ci.yml`.
3. A `workflow_dispatch` of **that branch** leaves `queued` and completes on Namespace. Idle `GET .../actions/runners == 0` is not a health gate; at most inspect runners while those jobs are queued or running.
4. Merge that PR and update this file in the same change.

## Out of scope

- Residual Strapi-tree audit findings and pnpm overrides (#13)
- Weakening `pnpm audit --audit-level high`
