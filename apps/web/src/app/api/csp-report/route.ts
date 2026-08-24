import { NextResponse } from "next/server";
import { publicEnv } from "@/lib/public-env";

/**
 * Collects Content-Security-Policy violation reports and forwards them to
 * PostHog.
 *
 * Without this the policy fails silently: a directive that is too tight simply
 * stops analytics, or an embed, from loading and nothing anywhere records it.
 */

export const dynamic = "force-dynamic";

interface Violation {
  documentUri: string;
  violatedDirective: string;
  effectiveDirective: string;
  blockedUri: string;
  disposition: string;
  statusCode: number | null;
  sourceFile: string;
  lineNumber: number | null;
  userAgent: string;
}

/**
 * Violations we cannot act on. Browser extensions inject scripts and stylesheets
 * into every page and generate a constant stream of reports that say nothing
 * about this site's policy.
 */
const IGNORED_BLOCKED_URI_PREFIXES = [
  "chrome-extension:",
  "moz-extension:",
  "safari-extension:",
  "safari-web-extension:",
  "webkit-masked-url:",
  "about:",
];

const WINDOW_MS = 60_000;
const MAX_REPORTS_PER_WINDOW = 60;

// Per-instance budget. Fluid Compute reuses instances across requests, so this
// meaningfully caps a report storm without any shared state.
let windowStartedAt = 0;
let reportsInWindow = 0;
let seenInWindow = new Set<string>();

function claimBudget(key: string): boolean {
  const now = Date.now();

  if (now - windowStartedAt > WINDOW_MS) {
    windowStartedAt = now;
    reportsInWindow = 0;
    seenInWindow = new Set();
  }

  // One report per distinct violation per window: a blocked resource on a busy
  // page produces the same report from every visitor.
  if (seenInWindow.has(key)) return false;
  if (reportsInWindow >= MAX_REPORTS_PER_WINDOW) return false;

  seenInWindow.add(key);
  reportsInWindow += 1;
  return true;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toViolation(body: Record<string, unknown>, userAgent: string): Violation {
  const violated = asString(body["violated-directive"]) || asString(body.violatedDirective);
  const effective = asString(body["effective-directive"]) || asString(body.effectiveDirective);

  return {
    documentUri: asString(body["document-uri"]) || asString(body.documentURL),
    violatedDirective: violated || effective,
    effectiveDirective: effective || violated.split(" ")[0] || "",
    blockedUri: asString(body["blocked-uri"]) || asString(body.blockedURL),
    disposition: asString(body.disposition) || "enforce",
    statusCode: asNumber(body["status-code"]) ?? asNumber(body.statusCode),
    sourceFile: asString(body["source-file"]) || asString(body.sourceFile),
    lineNumber: asNumber(body["line-number"]) ?? asNumber(body.lineNumber),
    userAgent,
  };
}

/**
 * Normalises both report shapes: the legacy `application/csp-report` body and
 * the Reporting API's `application/reports+json` array.
 */
function parseReports(payload: unknown, userAgent: string): Violation[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((report) => {
      if (!isRecord(report) || report.type !== "csp-violation") return [];
      return isRecord(report.body) ? [toViolation(report.body, userAgent)] : [];
    });
  }

  if (isRecord(payload) && isRecord(payload["csp-report"])) {
    return [toViolation(payload["csp-report"], userAgent)];
  }

  return [];
}

function isActionable(violation: Violation): boolean {
  if (!violation.effectiveDirective) return false;
  const blocked = violation.blockedUri.toLowerCase();
  return !IGNORED_BLOCKED_URI_PREFIXES.some((prefix) => blocked.startsWith(prefix));
}

async function capture(violation: Violation): Promise<void> {
  if (!publicEnv.posthogKey) return;

  await fetch(`${publicEnv.posthogHost}/i/v0/e/`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      api_key: publicEnv.posthogKey,
      event: "csp_violation",
      // Violations are not attributable to a person, and should not create one.
      distinct_id: `csp-${violation.effectiveDirective}`,
      properties: {
        $process_person_profile: false,
        directive: violation.effectiveDirective,
        violated_directive: violation.violatedDirective,
        blocked_uri: violation.blockedUri,
        document_uri: violation.documentUri,
        source_file: violation.sourceFile,
        line_number: violation.lineNumber,
        disposition: violation.disposition,
        status_code: violation.statusCode,
        $raw_user_agent: violation.userAgent,
      },
    }),
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  const violations = parseReports(payload, userAgent).filter(isActionable);

  for (const violation of violations) {
    if (!claimBudget(`${violation.effectiveDirective}|${violation.blockedUri}`)) {
      continue;
    }

    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `CSP violation: ${violation.effectiveDirective} blocked ${violation.blockedUri}`
      );
      continue;
    }

    // A failed report must never surface as a 500 to the browser.
    await capture(violation).catch(() => {});
  }

  return new NextResponse(null, { status: 204 });
}
