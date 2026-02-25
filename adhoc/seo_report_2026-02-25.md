# SEO + GEO Audit Report

Date: 2026-02-25  
Target site: `https://mehdi-zare.com` and `https://www.mehdi-zare.com`  
Requested canonical host: `https://www.mehdi-zare.com`

## Executive Summary

Overall status: **Needs targeted fixes**.

What is already good:
- Root canonical is set correctly to `www`.
- `robots.txt` is present and points to sitemap.
- Core metadata and JSON-LD are present on key pages.
- Blog pagination (`/blog?page=2`) is correctly `noindex, follow`.

Highest-impact issues:
1. Canonical host split on taxonomy pages (`www` vs apex).
2. Production sitemap is incomplete (only 5 URLs live).
3. GEO/AI-search support file (`llms.txt`) is missing.

## Scope and Method

This report combines:
- Live runtime checks on production using Playwright MCP.
- Source review in `apps/web`.
- Existing test coverage review in `apps/web/tests`.

Live checks were captured at `2026-02-25T18:17:00.614Z`.

## Severity Summary

| Severity | Count |
|---|---:|
| High | 3 |
| Medium | 4 |
| Low | 1 |

## Live Snapshot (Production)

### Page-level SEO signals

| Path | Status | Canonical | Robots |
|---|---:|---|---|
| `/` | 200 | `https://www.mehdi-zare.com` | `index, follow` |
| `/blog` | 200 | `https://www.mehdi-zare.com/blog` | `index, follow` |
| `/blog?page=2` | 200 | `https://www.mehdi-zare.com/blog` | `noindex, follow` |
| `/blog/category/ai-engineering` | 200 | `https://mehdi-zare.com/blog/category/ai-engineering` | `index, follow` |
| `/blog/tag/llms` | 200 | `https://mehdi-zare.com/blog/tag/llms` | `index, follow` |
| `/author/mehdi-zare` | 200 | `https://www.mehdi-zare.com/author/mehdi-zare` | `index, follow` |

### Crawl/control files

- `/robots.txt`: present, includes `Host: https://www.mehdi-zare.com` and sitemap URL.
- `/sitemap.xml`: present, but contains only **5** `<url>` entries.
- `/llms.txt`: `404`.
- `/.well-known/llms.txt`: `404`.

## Findings

### F-001 (High): Canonical host inconsistency on category/tag pages

**Symptom**
- Taxonomy pages use apex canonical/OG URL while root/author pages use `www`.

**Evidence**
- Live: `/blog/category/ai-engineering` canonical is `https://mehdi-zare.com/...`.
- Live: `/blog/tag/llms` canonical is `https://mehdi-zare.com/...`.
- Source: taxonomy SEO canonicals use apex in `data/taxonomy.json:60`, `data/taxonomy.json:74`, `data/taxonomy.json:373`.
- Source: metadata builder trusts CMS canonical override directly in `apps/web/src/lib/seo.ts:175`, `apps/web/src/lib/seo.ts:277`.

**Why it matters**
- Splits signals between apex and `www` URL clusters.
- Increases duplicate URL risk for search and answer engines.

**Required changes**
1. Normalize taxonomy canonical URLs to `https://www.mehdi-zare.com/...`.
2. Add host-normalization guard in `resolveCanonicalUrl` so CMS cannot override canonical host away from configured site host.
3. Keep path/query from CMS, but force host/protocol to canonical host.

**Owner**: web + content  
**Effort**: M

---

### F-002 (High): Production sitemap is incomplete (5 URLs only)

**Symptom**
- Live sitemap lists only static URLs.
- Dynamic pages (authors/categories/tags/articles) are not discoverable via sitemap.

**Evidence**
- Live: `/sitemap.xml` has 5 `<url>` nodes.
- Source expects dynamic inclusion in `apps/web/src/app/sitemap.ts:198`, `apps/web/src/app/sitemap.ts:223`, `apps/web/src/app/sitemap.ts:243`, `apps/web/src/app/sitemap.ts:257`.
- Source swallows failures and silently returns static-only sitemap in catch blocks at `apps/web/src/app/sitemap.ts:218`, `apps/web/src/app/sitemap.ts:236`, `apps/web/src/app/sitemap.ts:252`, `apps/web/src/app/sitemap.ts:265`.
- Source fetch layer can fail and fallback when CMS is unavailable in `apps/web/src/lib/strapi.ts:114`, `apps/web/src/lib/strapi.ts:120`.

**Why it matters**
- Crawl discovery for deep content is weak.
- New/updated content may be indexed slowly or not at all.

**Required changes**
1. Add resilient fallback for taxonomy/author URLs when CMS fetch fails (for example, from local `data/taxonomy.json` and stable author slugs).
2. Emit observability signal (log/metric) when sitemap is serving degraded/static-only mode.
3. Add test coverage for sitemap in both healthy and CMS-failure modes.

**Owner**: web  
**Effort**: M

---

### F-003 (High): Missing GEO support file (`llms.txt`)

**Symptom**
- AI-search/answer-engine oriented file is not served.

**Evidence**
- Live: `/llms.txt` returns 404.
- Live: `/.well-known/llms.txt` returns 404.
- Source: no matching route files under `apps/web/src/app` for `llms.txt`.

**Why it matters**
- Reduces machine-readable guidance for answer engines.
- Missed opportunity to provide canonical entity/site map for LLM retrieval.

**Required changes**
1. Add `apps/web/src/app/llms.txt/route.ts` returning `text/plain`.
2. Optionally mirror at `apps/web/src/app/.well-known/llms.txt/route.ts`.
3. Include canonical host, preferred identity URLs, top page map, and content policy notes.

**Owner**: web  
**Effort**: S

---

### F-004 (Medium): Duplicate identity URLs in social links and `sameAs`

**Symptom**
- Both apex and `www` versions of website URL appear in social links.
- Duplicate "Website" links appear in footer on live pages.

**Evidence**
- Live footer shows both `https://mehdi-zare.com` and `https://www.mehdi-zare.com`.
- Live author JSON-LD includes both variants in `sameAs`.
- Source dedupes by exact string only in `apps/web/src/lib/site-profile.ts:234`.
- Source defaults use `www` in `apps/web/src/lib/site-profile-defaults.ts:37`, but author/cms values can inject apex.

**Why it matters**
- Weakens entity consolidation in knowledge graphs and answer engines.

**Required changes**
1. Normalize URL host before dedupe in social-link canonicalization.
2. Enforce one canonical website URL in `sameAs`.
3. Add test ensuring apex and `www` collapse to one canonical entry.

**Owner**: web + content  
**Effort**: S

---

### F-005 (Medium): Duplicate `Person` JSON-LD nodes on author page

**Symptom**
- Author page emits two `Person` nodes with the same `@id`.

**Evidence**
- Live author page parse shows two `Person` nodes sharing `@id`.
- Root layout always emits global person node in `apps/web/src/app/layout.tsx:98`.
- Author page emits another person node in `apps/web/src/app/author/[slug]/page.tsx:184`.

**Why it matters**
- Increases graph noise and potential parser ambiguity.

**Required changes**
1. Keep a single canonical `Person` entity per page.
2. On author page, prefer `ProfilePage` + reference existing `Person` `@id`, or suppress global person script for author routes.

**Owner**: web  
**Effort**: M

---

### F-006 (Medium): Empty taxonomy pages are indexable

**Symptom**
- Category/tag pages with "No posts yet" are still `index, follow`.

**Evidence**
- Live `/blog/category/ai-engineering` and `/blog/tag/llms` are indexable and show empty-state body.
- Category metadata path in `apps/web/src/app/blog/category/[slug]/page.tsx:58`.
- Tag metadata path in `apps/web/src/app/blog/tag/[slug]/page.tsx:38`.

**Why it matters**
- Can create low-value indexed pages and dilute crawl budget.

**Required changes**
1. Decide policy:
   - Option A: `noindex,follow` when post count is zero.
   - Option B: keep indexable but enforce stronger content minimum and internal links.
2. Implement chosen rule consistently across category/tag templates.

**Owner**: web + content  
**Effort**: S

---

### F-007 (Medium): Geographic SEO signals are present but shallow

**Symptom**
- Geo signals rely on generic service coverage (`US`) without full address/place structure.

**Evidence**
- Contact page JSON-LD is `ContactPoint` with `areaServed: "US"` in `apps/web/src/app/contact/page.tsx:74`.
- Consulting page JSON-LD uses `ProfessionalService` with `areaServed` country in `apps/web/src/app/consulting/page.tsx:96`.
- Person postal address is optional in builder (`undefined` if missing) in `apps/web/src/lib/seo.ts:373`.

**Why it matters**
- Limits local/geo confidence for geographic SEO systems.

**Required changes**
1. Add structured location detail where accurate (city/region/country already available in profile).
2. Add `serviceArea`/`areaServed` granularity and stable organization entity linkage.
3. Ensure NAP-style consistency across metadata/footer/schema.

**Owner**: web + content  
**Effort**: M

---

### F-008 (Low): Missing automated tests for runtime crawl artifacts

**Symptom**
- No tests currently validate sitemap/robots/llms behavior.

**Evidence**
- No matches for `sitemap|robots|llms` in `apps/web/tests`.
- Existing SEO tests focus mainly on metadata/json-ld helpers (`seo-contract`, `seo-jsonld`) only.

**Why it matters**
- Regressions in crawl/indexing controls can ship unnoticed.

**Required changes**
1. Add tests for:
   - sitemap URL count/contracts.
   - robots host/sitemap lines.
   - llms route availability/content.
2. Add canonical host assertion on representative runtime routes.

**Owner**: web  
**Effort**: S

## Prioritized Remediation Roadmap

### Next 24 Hours

1. Canonical host normalization:
   - Update taxonomy canonical URLs from apex to `www`.
   - Add host guard in canonical resolver.
2. Add `llms.txt` route.
3. Deduplicate website URL variants in social links / `sameAs`.

### Next 7 Days

1. Fix sitemap resilience and dynamic coverage in production.
2. Add runtime tests for sitemap/robots/llms/canonical consistency.
3. Decide and implement empty taxonomy indexing policy.

### Next 30 Days

1. Refine geo schema depth (location/service area completeness).
2. Consolidate `Person` JSON-LD strategy per page template.
3. Add monitoring for sitemap degradation mode.

## Public Interfaces / Route Additions

Planned additions:
1. `apps/web/src/app/llms.txt/route.ts`
2. Optional `apps/web/src/app/.well-known/llms.txt/route.ts`

Planned behavior changes:
1. Canonical resolution contract in `apps/web/src/lib/seo.ts` to enforce canonical host.
2. Social URL normalization contract in `apps/web/src/lib/site-profile.ts`.

## Acceptance Criteria

1. All canonical and `og:url` values use `https://www.mehdi-zare.com` on sampled templates.
2. `/sitemap.xml` includes dynamic routes when content exists (not static-only unless intentionally degraded with visible signal).
3. `/llms.txt` returns `200` with stable text/plain content.
4. Author page emits a single canonical `Person` entity (or multiple entities with no duplicated `@id` and clear role separation).
5. Taxonomy empty-state indexing behavior matches chosen policy.
6. Automated tests cover sitemap/robots/llms and canonical host consistency.

## Notes and Assumptions

1. This audit treats GEO as both:
   - AI-search GEO (answer-engine discoverability).
   - geographic SEO signal quality.
2. Canonical host policy is `www`.
3. Some dynamic content absence (for example, empty article lists) may be expected during content build-out, but indexing and sitemap behavior should still be intentionally controlled.
