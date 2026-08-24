# CI

Required jobs in `.github/workflows/ci.yml` run on GitHub-hosted `ubuntu-latest`.

## Why not Namespace.so

PR #11 switched those jobs to `runs-on: namespace-profile-default`. The Namespace GitHub App / billing / profile stopped picking up jobs (`GET /repos/MehdiZare/MehdiZare/actions/runners` was empty). Required checks sat `queued` for over an hour and blocked merges to `main` (#18).

The GitHub-hosted workaround landed on `main` via #16 (PR #19 was closed as superseded). That is the runner policy until Namespace is proven again. Do not fold a runner switch into product or dependency PRs.

Checked 2026-08-24: `gh api repos/MehdiZare/MehdiZare/actions/runners` still returns `total_count: 0`.

## Restore Namespace later

Isolated PR only, after all of the following are true:

1. Namespace.so GitHub App is installed, billed, and the `namespace-profile-default` profile exists.
2. Runners are registered (`gh api repos/MehdiZare/MehdiZare/actions/runners` is non-empty).
3. A `workflow_dispatch` of `.github/workflows/ci.yml` is picked up on Namespace (status is not stuck in `queued`).
4. `runs-on` in `ci.yml` switches back to `namespace-profile-default`, and this file is updated.

## Out of scope

- Residual Strapi-tree audit findings and pnpm overrides (#13)
- Weakening `pnpm audit --audit-level high`
