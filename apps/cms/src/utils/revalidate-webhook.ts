import type { Core } from '@strapi/strapi';

/**
 * cms-platform: the CMS registers its own web revalidation webhook at boot.
 *
 * MehdiZare/cms-platform mints REVALIDATION_SECRET, sets it on this app and
 * pushes the same value to the web's REVALIDATE_SECRET (Vercel), so nobody
 * hand-copies the secret into Strapi Admin. Strapi webhooks are not part of a
 * `strapi export` / `strapi import`, so the database moved to cms-platform has
 * none. On every boot the webhook pointing at WEB_REVALIDATE_URL (the web's
 * apps/web/src/app/api/revalidate route, e.g.
 * https://www.mehdi-zare.com/api/revalidate) is created, or updated when its
 * URL, header, events or enabled flag differ; the route reads the secret from
 * the x-revalidate-secret header and the paths from the default payload
 * (model, entry.slug). Other webhooks on that path are removed best-effort;
 * cleanup failure retries next boot. Missing env skips the sync and leaves
 * any existing webhook alone. The secret is never logged.
 *
 * Same contract as RewardopediaHQ/rewardopedia-mono-repo
 * apps/cms/src/utils/blog-revalidate-webhook.ts (#4377).
 */
export const REVALIDATE_WEBHOOK_NAME = 'Web revalidation (managed by cms-platform)';
export const REVALIDATE_SECRET_ENV = 'REVALIDATION_SECRET';
export const REVALIDATE_URL_ENV = 'WEB_REVALIDATE_URL';
export const REVALIDATE_PATH = '/api/revalidate';
export const REVALIDATE_HEADER = 'x-revalidate-secret';
export const REVALIDATE_EVENTS = [
  'entry.create',
  'entry.update',
  'entry.delete',
  'entry.publish',
  'entry.unpublish',
] as const;

export interface StoredWebhook {
  id: string;
  name: string;
  url: string;
  headers: Record<string, string> | null;
  events: string[];
  isEnabled: boolean;
}

export interface WebhookInput {
  name: string;
  url: string;
  headers: Record<string, string>;
  events: string[];
  isEnabled: boolean;
}

export interface RevalidateWebhookDeps {
  env: { secret?: string; url?: string };
  findWebhooks(): Promise<StoredWebhook[]>;
  createWebhook(data: WebhookInput): Promise<StoredWebhook>;
  updateWebhook(id: string, data: WebhookInput): Promise<StoredWebhook | null>;
  deleteWebhook(id: string): Promise<StoredWebhook | null>;
  /** Keep the in-memory runner in step with the store, as the admin controller does. */
  runner: {
    add(webhook: StoredWebhook): void;
    update(webhook: StoredWebhook): void;
    remove(webhook: StoredWebhook): void;
  };
  log: { info(message: string): unknown; warn(message: string): unknown; error(message: string): unknown };
}

export type RevalidateWebhookOutcome = 'skipped' | 'created' | 'updated' | 'unchanged';

/** The target URL when it is an http(s) URL whose path is the revalidate route. */
export function webhookUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (!/^https?:$/.test(url.protocol)) return null;
    if (url.pathname.replace(/\/+$/, '') !== REVALIDATE_PATH || url.search || url.hash || url.username || url.password) {
      return null;
    }
    return new URL(REVALIDATE_PATH, `${url.origin}/`).toString();
  } catch {
    return null;
  }
}

function pointsAtRevalidateRoute(webhook: StoredWebhook): boolean {
  try {
    return new URL(webhook.url).pathname.replace(/\/+$/, '') === REVALIDATE_PATH;
  } catch {
    return false;
  }
}

function sameWebhook(current: StoredWebhook, wanted: WebhookInput): boolean {
  const headers = current.headers ?? {};
  return (
    current.name === wanted.name &&
    current.url === wanted.url &&
    current.isEnabled === wanted.isEnabled &&
    Object.keys(headers).length === Object.keys(wanted.headers).length &&
    Object.entries(wanted.headers).every(([key, value]) => headers[key] === value) &&
    current.events.length === wanted.events.length &&
    wanted.events.every((event) => current.events.includes(event))
  );
}

export async function syncRevalidateWebhook(deps: RevalidateWebhookDeps): Promise<RevalidateWebhookOutcome> {
  const secret = deps.env.secret?.trim();
  const rawUrl = deps.env.url?.trim();
  if (!secret || !rawUrl) {
    deps.log.warn(
      `Web revalidation webhook: ${REVALIDATE_SECRET_ENV} or ${REVALIDATE_URL_ENV} is missing; skipped (existing webhooks untouched).`,
    );
    return 'skipped';
  }
  const url = webhookUrl(rawUrl);
  if (!url) {
    deps.log.warn(
      `Web revalidation webhook: ${REVALIDATE_URL_ENV} must be an http(s) URL ending in ${REVALIDATE_PATH}; skipped.`,
    );
    return 'skipped';
  }

  const wanted: WebhookInput = {
    name: REVALIDATE_WEBHOOK_NAME,
    url,
    headers: { [REVALIDATE_HEADER]: secret },
    events: [...REVALIDATE_EVENTS],
    isEnabled: true,
  };

  const matches = (await deps.findWebhooks()).filter(
    (webhook) => webhook.name === REVALIDATE_WEBHOOK_NAME || pointsAtRevalidateRoute(webhook),
  );
  const [keep, ...extra] = [
    ...matches.filter((webhook) => webhook.name === REVALIDATE_WEBHOOK_NAME),
    ...matches.filter((webhook) => webhook.name !== REVALIDATE_WEBHOOK_NAME),
  ];

  let removedCount = 0;
  for (const webhook of extra) {
    try {
      const removed = await deps.deleteWebhook(webhook.id);
      if (removed) {
        deps.runner.remove(removed);
        removedCount += 1;
      }
    } catch {
      deps.log.warn('Web revalidation webhook: duplicate cleanup failed; continuing sync and retrying next boot.');
    }
  }
  if (removedCount > 0) {
    deps.log.info(`Web revalidation webhook: removed ${removedCount} duplicate webhook(s) on ${REVALIDATE_PATH}.`);
  }

  if (!keep) {
    const created = await deps.createWebhook(wanted);
    deps.runner.add(created);
    deps.log.info(`Web revalidation webhook: created for ${url} (${wanted.events.join(', ')}).`);
    return 'created';
  }
  if (sameWebhook(keep, wanted)) {
    return 'unchanged';
  }
  const updated = await deps.updateWebhook(keep.id, wanted);
  if (!updated) throw new Error('Web revalidation webhook disappeared during update.');
  deps.runner.update(updated);
  deps.log.info(`Web revalidation webhook: updated ${url} (${wanted.events.join(', ')}).`);
  return 'updated';
}

/** Database errors can include SQL bindings containing the webhook header. */
export async function bootstrapRevalidateWebhook(deps: RevalidateWebhookDeps): Promise<void> {
  try {
    const outcome = await syncRevalidateWebhook(deps);
    deps.log.info(`Web revalidation webhook: ${outcome}.`);
  } catch {
    deps.log.error('Web revalidation webhook sync failed; retrying next boot (error details withheld to protect credentials).');
  }
}

export function strapiRevalidateWebhookDeps(strapi: Core.Strapi): RevalidateWebhookDeps {
  const store = strapi.get('webhookStore');
  const runner = strapi.get('webhookRunner');
  return {
    env: {
      secret: process.env[REVALIDATE_SECRET_ENV],
      url: process.env[REVALIDATE_URL_ENV],
    },
    findWebhooks: () => store.findWebhooks(),
    createWebhook: (data: WebhookInput) => store.createWebhook(data),
    updateWebhook: (id: string, data: WebhookInput) => store.updateWebhook(id, data),
    deleteWebhook: (id: string) => store.deleteWebhook(id),
    runner: {
      add: (webhook) => runner.add(webhook),
      update: (webhook) => runner.update(webhook),
      remove: (webhook) => runner.remove(webhook),
    },
    log: strapi.log,
  };
}
