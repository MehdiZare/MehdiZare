import { createHmac } from 'node:crypto';

import type { Core } from '@strapi/strapi';

/**
 * cms-platform: Strapi API tokens managed by Terraform.
 *
 * MehdiZare/cms-platform mints each token's value (random_password), passes
 * the set to this app as the encrypted env var MANAGED_API_TOKENS and pushes
 * each value to its consumer, so nobody creates a token in Strapi Admin and
 * copies it by hand. Same contract as RewardopediaHQ/rewardopedia-mono-repo
 * apps/cms/src/utils/managed-api-tokens.ts (#4828). On every boot each listed token
 * (content-API kind) is created when missing, its type, description and
 * permissions are updated only when they differ, and its stored key is set to
 * the Terraform value (Strapi stores hmac-sha512(value, admin.apiToken.salt),
 * exactly like the admin token service's `hash`). Tokens not in the list are
 * never changed or deleted; their names are logged.
 *
 * Unset or empty env: nothing happens (one info line). A malformed value fails
 * the boot. No value, hash or encrypted key is ever logged or put in an error.
 */
export const MANAGED_API_TOKENS_ENV = 'MANAGED_API_TOKENS';
export const MANAGED_API_TOKEN_TYPES = ['read-only', 'full-access', 'custom'] as const;
export const DEFAULT_MANAGED_DESCRIPTION = 'Managed by cms-platform (Terraform). Do not edit or regenerate in Admin.';
const MIN_VALUE_LENGTH = 32;

export type ManagedTokenType = (typeof MANAGED_API_TOKEN_TYPES)[number];

export interface ManagedTokenSpec {
  name: string;
  type: ManagedTokenType;
  description: string;
  permissions: string[];
  value: string;
}

export interface StoredToken {
  id: number | string;
  name: string;
  type: string;
  description: string | null;
  permissions: string[];
  /** The stored hash, never a plaintext key. */
  accessKey: string | null;
  lifespan: number | null;
}

export interface TokenAttributes {
  name: string;
  type: ManagedTokenType;
  description: string;
  permissions?: string[];
}

export interface ManagedTokenDeps {
  env: { raw?: string };
  hash(value: string): string;
  /** The admin encryption service, so Admin can show the key; absent or null-returning is fine. */
  encrypt?(value: string): string | null;
  findByName(name: string): Promise<StoredToken | null>;
  listContentApiNames(): Promise<string[]>;
  create(attributes: TokenAttributes): Promise<{ id: number | string }>;
  update(id: number | string, attributes: TokenAttributes): Promise<void>;
  setKey(id: number | string, data: { accessKey: string; encryptedKey: string | null; lifespan: null; expiresAt: null }): Promise<void>;
  log: { info(message: string): unknown; warn(message: string): unknown };
}

export interface ManagedTokenSummary {
  created: string[];
  updated: string[];
  rekeyed: string[];
  unchanged: string[];
  unmanaged: string[];
}

/** Parse and validate MANAGED_API_TOKENS. null: unset or empty. Errors never include a value. */
export function parseManagedApiTokens(raw: string | undefined): ManagedTokenSpec[] | null {
  if (raw === undefined || raw.trim() === '') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${MANAGED_API_TOKENS_ENV} is not valid JSON.`);
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${MANAGED_API_TOKENS_ENV} must be a JSON object of token name to token spec.`);
  }
  const specs: ManagedTokenSpec[] = [];
  for (const [name, entry] of Object.entries(parsed as Record<string, unknown>)) {
    if (name.trim() === '' || name !== name.trim()) {
      throw new Error(`${MANAGED_API_TOKENS_ENV}: a token name is empty or has surrounding whitespace.`);
    }
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`${MANAGED_API_TOKENS_ENV}: token '${name}' must be an object.`);
    }
    const { type, permissions, description, value } = entry as Record<string, unknown>;
    if (!MANAGED_API_TOKEN_TYPES.includes(type as ManagedTokenType)) {
      throw new Error(`${MANAGED_API_TOKENS_ENV}: token '${name}' has an unknown type (expected ${MANAGED_API_TOKEN_TYPES.join(', ')}).`);
    }
    if (typeof value !== 'string' || value.length < MIN_VALUE_LENGTH || /\s/.test(value)) {
      throw new Error(`${MANAGED_API_TOKENS_ENV}: token '${name}' needs a value of at least ${MIN_VALUE_LENGTH} characters with no whitespace.`);
    }
    if (description !== undefined && typeof description !== 'string') {
      throw new Error(`${MANAGED_API_TOKENS_ENV}: token '${name}' has a non-string description.`);
    }
    let actions: string[] = [];
    if (type === 'custom') {
      if (!Array.isArray(permissions) || permissions.length === 0 || !permissions.every((p) => typeof p === 'string' && p.trim() !== '')) {
        throw new Error(`${MANAGED_API_TOKENS_ENV}: custom token '${name}' needs a non-empty permissions list of action strings.`);
      }
      actions = [...new Set(permissions as string[])].sort();
    } else if (permissions !== undefined && !(Array.isArray(permissions) && permissions.length === 0)) {
      throw new Error(`${MANAGED_API_TOKENS_ENV}: token '${name}' is ${type as string}; only custom tokens take permissions.`);
    }
    specs.push({
      name,
      type: type as ManagedTokenType,
      description: (description as string | undefined) ?? DEFAULT_MANAGED_DESCRIPTION,
      permissions: actions,
      value,
    });
  }
  return specs.sort((a, b) => a.name.localeCompare(b.name));
}

function sameSettings(current: StoredToken, spec: ManagedTokenSpec): boolean {
  if (current.type !== spec.type || (current.description ?? '') !== spec.description) return false;
  if (spec.type !== 'custom') return true;
  const have = [...new Set(current.permissions)].sort();
  return have.length === spec.permissions.length && have.every((action, i) => action === spec.permissions[i]);
}

function attributesFor(spec: ManagedTokenSpec): TokenAttributes {
  return {
    name: spec.name,
    type: spec.type,
    description: spec.description,
    ...(spec.type === 'custom' ? { permissions: spec.permissions } : {}),
  };
}

/** Reconcile the listed tokens. Returns null when the env is unset or empty. */
export async function syncManagedApiTokens(deps: ManagedTokenDeps): Promise<ManagedTokenSummary | null> {
  const specs = parseManagedApiTokens(deps.env.raw);
  if (specs === null) return null;
  const summary: ManagedTokenSummary = { created: [], updated: [], rekeyed: [], unchanged: [], unmanaged: [] };
  for (const spec of specs) {
    const wantedKey = deps.hash(spec.value);
    const current = await deps.findByName(spec.name);
    if (!current) {
      const created = await deps.create(attributesFor(spec));
      await deps.setKey(created.id, { accessKey: wantedKey, encryptedKey: deps.encrypt?.(spec.value) ?? null, lifespan: null, expiresAt: null });
      summary.created.push(spec.name);
      continue;
    }
    let changed = false;
    if (!sameSettings(current, spec)) {
      await deps.update(current.id, attributesFor(spec));
      summary.updated.push(spec.name);
      changed = true;
    }
    if (current.accessKey !== wantedKey || current.lifespan !== null) {
      await deps.setKey(current.id, { accessKey: wantedKey, encryptedKey: deps.encrypt?.(spec.value) ?? null, lifespan: null, expiresAt: null });
      summary.rekeyed.push(spec.name);
      changed = true;
    }
    if (!changed) summary.unchanged.push(spec.name);
  }
  const managed = new Set(specs.map((spec) => spec.name));
  summary.unmanaged = (await deps.listContentApiNames()).filter((name) => !managed.has(name)).sort();
  return summary;
}

export async function bootstrapManagedApiTokens(deps: ManagedTokenDeps): Promise<ManagedTokenSummary | null> {
  const summary = await syncManagedApiTokens(deps);
  if (summary === null) {
    deps.log.info(`Managed API tokens: ${MANAGED_API_TOKENS_ENV} unset; no token changed.`);
    return null;
  }
  const list = (names: string[]) => (names.length ? names.join(', ') : 'none');
  deps.log.info(
    `Managed API tokens: created ${list(summary.created)}; updated ${list(summary.updated)}; ` +
      `key set ${list(summary.rekeyed)}; unchanged ${list(summary.unchanged)}.`,
  );
  if (summary.unmanaged.length) {
    deps.log.info(`Managed API tokens: not managed, left untouched: ${list(summary.unmanaged)}.`);
  }
  return summary;
}

type TokenRow = {
  id: number | string;
  name: string;
  type: string;
  description: string | null;
  accessKey: string | null;
  lifespan: number | null;
  kind: string | null;
  permissions?: { action: string }[];
};

/** Production wiring against Strapi 5.58's admin content-API token service. */
export function strapiManagedTokenDeps(strapi: Core.Strapi): ManagedTokenDeps {
  const tokens = strapi.service('admin::api-token-content-api') as unknown as {
    create(attributes: TokenAttributes & { lifespan: null }): Promise<{ id: number | string }>;
    update(id: number | string, attributes: TokenAttributes): Promise<unknown>;
  };
  const encryption = strapi.service('admin::encryption') as unknown as { encrypt?(value: string): string | null } | undefined;
  const query = strapi.db.query('admin::api-token');
  const contentApi = { $or: [{ kind: 'content-api' }, { kind: { $null: true } }] };
  return {
    env: { raw: process.env[MANAGED_API_TOKENS_ENV] },
    hash: (value) => createHmac('sha512', strapi.config.get('admin.apiToken.salt') as string).update(value).digest('hex'),
    encrypt: encryption?.encrypt ? (value) => encryption.encrypt!(value) : undefined,
    findByName: async (name) => {
      const row = (await query.findOne({
        select: ['id', 'name', 'type', 'description', 'accessKey', 'lifespan', 'kind'],
        populate: ['permissions'],
        where: { $and: [{ name }, contentApi] },
      })) as TokenRow | null;
      if (!row) return null;
      return {
        id: row.id,
        name: row.name,
        type: row.type,
        description: row.description,
        permissions: (row.permissions ?? []).map((permission) => permission.action),
        accessKey: row.accessKey,
        lifespan: row.lifespan,
      };
    },
    listContentApiNames: async () =>
      ((await query.findMany({ select: ['name'], where: contentApi })) as { name: string }[]).map((row) => row.name),
    create: (attributes) => tokens.create({ ...attributes, lifespan: null }),
    update: async (id, attributes) => {
      await tokens.update(id, attributes);
    },
    setKey: async (id, data) => {
      await query.update({ where: { id }, data });
    },
    log: strapi.log,
  };
}
