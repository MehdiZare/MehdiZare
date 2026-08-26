# Website Audit Report

Date: 2026-02-23
Scope: `apps/web` implementation quality, accessibility, and SEO consistency.

## Summary

- Status: **Pass with follow-ups**
- Core issue fixed: repeated positioning/CTA messaging drifted across pages.
- Core change: introduced a canonical CMS-backed `Site Profile` and rewired key pages/components to consume it.

## Implementation Findings

1. **Content drift risk** across page-level fallbacks and global layout components.
   - Fix: canonicalized repeated copy via `apps/web/src/lib/site-profile.ts`.
   - Fix: added strict validation mode for CI (`CI=true` or `SITE_PROFILE_STRICT=true`).
2. **Global text hardcoded in nav/footer/layout metadata**.
   - Fix: `Navbar`, `Footer`, root metadata, and JSON-LD now consume Site Profile values.
3. **No pre-push gate** for the full web quality stack.
   - Fix: added `task pre-push` and `task prepush` in `Taskfile.yml`.

## Accessibility Findings

1. FAQ disclosure lacked explicit ARIA state/relationships.
   - Fix: added `aria-expanded`, `aria-controls`, region `role`, and `aria-labelledby`.
2. Contact form validation messages were visible-only.
   - Fix: added `aria-invalid`, `aria-describedby`, and status/alert semantics.
3. Motion did not explicitly honor reduced-motion preferences globally.
   - Fix: added `MotionProvider` with `MotionConfig reducedMotion="user"`, plus reduced-motion bypass in `AnimatedSection`.

## SEO Findings

1. Shared brand descriptors were repeated manually in metadata/schema.
   - Fix: metadata/schema defaults now derive from Site Profile defaults and runtime values.
2. OG/Twitter copy drift risk.
   - Fix: OG/Twitter image text/alt now consume canonical default profile copy.
3. Canonical metadata utilities lacked explicit override contract tests.
   - Fix: added regression tests for SEO builder contracts.

## Validation Executed

- `pnpm --filter=web lint` ✅
- `pnpm --filter=web typecheck` ✅
- `pnpm --filter=web test` ✅
- `pnpm --filter=web build` ✅
- `task pre-push` ✅

## Follow-ups

1. Optional: add a dedicated runtime a11y crawler (`axe-core` in browser automation) for per-route WCAG checks.
2. Optional: add Lighthouse CI budgets for performance and SEO scoring in CI.
