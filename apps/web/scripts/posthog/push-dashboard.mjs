#!/usr/bin/env node

const DEFAULT_APP_HOST = "https://us.posthog.com";
const DEFAULT_ENVIRONMENT_ID = "@current";
const DEFAULT_DASHBOARD_NAME = "MZ | Website Funnel";
const DEFAULT_DASHBOARD_DESCRIPTION =
  "Managed via API. Tracks key website funnel and Bina intent events.";
const MANAGED_TAGS = ["managed-by-api", "mehdi-zare-site"];

const INSIGHT_DEFINITIONS = [
  {
    name: "MZ | Funnel Events Over Time (30d)",
    description:
      "Daily event volume for the main site funnel events over the last 30 days.",
    tags: ["funnel"],
    query: buildInsightVizNode({
      kind: "TrendsQuery",
      interval: "day",
      dateRange: { date_from: "-30d" },
      series: [
        buildEventsNode("funnel_cta_click", "Funnel CTA click"),
        buildEventsNode("funnel_scheduler_open", "Scheduler open"),
        buildEventsNode("funnel_contact_intent", "Contact intent"),
        buildEventsNode(
          "funnel_blog_nav_to_consulting",
          "Blog -> consulting nav"
        ),
      ],
    }),
  },
  {
    name: "MZ | Funnel Conversion (CTA -> Scheduler -> Contact) (30d)",
    description:
      "Funnel conversion from CTA click to scheduler open to contact intent over the last 30 days.",
    tags: ["funnel"],
    query: buildInsightVizNode({
      kind: "FunnelsQuery",
      dateRange: { date_from: "-30d" },
      series: [
        buildEventsNode("funnel_cta_click", "Funnel CTA click"),
        buildEventsNode("funnel_scheduler_open", "Scheduler open"),
        buildEventsNode("funnel_contact_intent", "Contact intent"),
      ],
    }),
  },
  {
    name: "MZ | Bina Lookup Requests (30d)",
    description: "Daily Bina lookup request volume over the last 30 days.",
    tags: ["bina-print"],
    query: buildInsightVizNode({
      kind: "TrendsQuery",
      interval: "day",
      dateRange: { date_from: "-30d" },
      series: [buildEventsNode("bina_lookup_requested", "Bina lookup requested")],
    }),
  },
];

function buildEventsNode(event, name) {
  return {
    kind: "EventsNode",
    event,
    name,
  };
}

function buildInsightVizNode(source) {
  return {
    kind: "InsightVizNode",
    source,
  };
}

function readRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readOptionalEnv(name, fallback) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
}

function parseBoolean(value, fallback = false) {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function normalizeHost(rawHost) {
  return rawHost.replace(/\/+$/, "");
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function mergeDashboardIds(existingDashboardIds, dashboardId) {
  const ids = Array.isArray(existingDashboardIds)
    ? existingDashboardIds.filter((value) => Number.isInteger(value))
    : [];

  if (Number.isInteger(dashboardId) && dashboardId > 0) {
    ids.push(dashboardId);
  }

  return uniq(ids);
}

class PostHogClient {
  constructor({ appHost, apiKey, environmentId }) {
    this.appHost = appHost;
    this.apiKey = apiKey;
    this.environmentId = environmentId;
  }

  async request(method, path, body = undefined) {
    const response = await fetch(`${this.appHost}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const rawBody = await response.text();
    const parsed = rawBody.length > 0 ? safeParseJson(rawBody) : null;

    if (!response.ok) {
      const details =
        parsed && typeof parsed === "object"
          ? JSON.stringify(parsed)
          : rawBody || "No response body";
      throw new Error(
        `PostHog API ${method} ${path} failed with ${response.status}: ${details}`
      );
    }

    return parsed;
  }

  async listAll(path) {
    const results = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const separator = path.includes("?") ? "&" : "?";
      const page = await this.request(
        "GET",
        `${path}${separator}limit=${limit}&offset=${offset}`
      );

      const pageResults = Array.isArray(page?.results) ? page.results : [];
      results.push(...pageResults);

      const totalCount =
        typeof page?.count === "number" ? page.count : results.length;
      if (results.length >= totalCount || pageResults.length === 0) {
        break;
      }

      offset += pageResults.length;
    }

    return results;
  }

  async listDashboards() {
    return this.listAll(`/api/environments/${this.environmentId}/dashboards/`);
  }

  async createDashboard(payload) {
    return this.request(
      "POST",
      `/api/environments/${this.environmentId}/dashboards/`,
      payload
    );
  }

  async patchDashboard(dashboardId, payload) {
    return this.request(
      "PATCH",
      `/api/environments/${this.environmentId}/dashboards/${dashboardId}/`,
      payload
    );
  }

  async listInsights() {
    return this.listAll(`/api/environments/${this.environmentId}/insights/`);
  }

  async createInsight(payload) {
    return this.request(
      "POST",
      `/api/environments/${this.environmentId}/insights/`,
      payload
    );
  }

  async patchInsight(insightId, payload) {
    return this.request(
      "PATCH",
      `/api/environments/${this.environmentId}/insights/${insightId}/`,
      payload
    );
  }
}

function safeParseJson(rawValue) {
  try {
    return JSON.parse(rawValue);
  } catch {
    return rawValue;
  }
}

async function ensureDashboard({ client, dashboardName, dashboardDescription, dashboardTags, dryRun }) {
  const dashboards = await client.listDashboards();
  const existing = dashboards.find(
    (dashboard) => dashboard?.name === dashboardName && dashboard?.deleted !== true
  );

  const payload = {
    name: dashboardName,
    description: dashboardDescription,
    tags: uniq([...dashboardTags, ...MANAGED_TAGS]),
  };

  if (!existing) {
    if (dryRun) {
      console.log(`[dry-run] POST /dashboards name=\"${dashboardName}\"`);
      return { id: -1, created: true };
    }

    const created = await client.createDashboard(payload);
    console.log(`Created dashboard ${created.id}: ${created.name}`);
    return { id: created.id, created: true };
  }

  if (dryRun) {
    console.log(`[dry-run] PATCH /dashboards/${existing.id} name=\"${dashboardName}\"`);
    return { id: existing.id, created: false };
  }

  const updated = await client.patchDashboard(existing.id, payload);
  console.log(`Updated dashboard ${updated.id}: ${updated.name}`);
  return { id: updated.id ?? existing.id, created: false };
}

async function upsertInsights({ client, dashboardId, dryRun }) {
  const insights = await client.listInsights();

  for (const definition of INSIGHT_DEFINITIONS) {
    const existing = insights.find(
      (insight) => insight?.name === definition.name && insight?.deleted !== true
    );

    const payload = {
      name: definition.name,
      description: definition.description,
      query: definition.query,
      tags: uniq([...(definition.tags || []), ...MANAGED_TAGS]),
      dashboards: mergeDashboardIds(existing?.dashboards, dashboardId),
    };

    if (!existing) {
      if (dryRun) {
        console.log(`[dry-run] POST /insights name=\"${definition.name}\"`);
        continue;
      }

      const created = await client.createInsight(payload);
      console.log(`Created insight ${created.id}: ${created.name}`);
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] PATCH /insights/${existing.id} name=\"${definition.name}\"`);
      continue;
    }

    const updated = await client.patchInsight(existing.id, payload);
    console.log(`Updated insight ${updated.id ?? existing.id}: ${definition.name}`);
  }
}

async function main() {
  const apiKey = readRequiredEnv("POSTHOG_PERSONAL_API_KEY");
  const appHost = normalizeHost(
    readOptionalEnv("POSTHOG_APP_HOST", DEFAULT_APP_HOST)
  );
  const environmentId = readOptionalEnv(
    "POSTHOG_ENVIRONMENT_ID",
    DEFAULT_ENVIRONMENT_ID
  );

  const dashboardName = readOptionalEnv(
    "POSTHOG_DASHBOARD_NAME",
    DEFAULT_DASHBOARD_NAME
  );
  const dashboardDescription = readOptionalEnv(
    "POSTHOG_DASHBOARD_DESCRIPTION",
    DEFAULT_DASHBOARD_DESCRIPTION
  );
  const dashboardTags = readOptionalEnv("POSTHOG_DASHBOARD_TAGS", "funnel,seo,geo")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const dryRun = parseBoolean(process.env.POSTHOG_DRY_RUN, false);

  const client = new PostHogClient({ appHost, apiKey, environmentId });

  console.log(`Using PostHog host: ${appHost}`);
  console.log(`Environment ID: ${environmentId}`);
  console.log(`Dashboard name: ${dashboardName}`);
  console.log(`Dry run: ${dryRun ? "true" : "false"}`);

  const dashboard = await ensureDashboard({
    client,
    dashboardName,
    dashboardDescription,
    dashboardTags,
    dryRun,
  });

  await upsertInsights({
    client,
    dashboardId: dashboard.id,
    dryRun,
  });

  console.log("PostHog dashboard sync complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
