import type { Core } from "@strapi/strapi";

type EnvAccessor = Core.Config.Shared.ConfigParams["env"];

let hasValidated = false;

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function readAllowedCorsOrigins(env: EnvAccessor): string[] {
  const configured = env("CORS_ORIGINS", "http://localhost:3000");
  return splitCsv(configured);
}

export function validateCmsEnv(env: EnvAccessor): void {
  if (hasValidated) {
    return;
  }

  // Skip validation during build — secrets aren't needed to compile the admin panel
  const isBuild = process.argv.some((arg) => arg === "build");
  if (isBuild) return;

  hasValidated = true;

  const nodeEnv = env("NODE_ENV", "development");
  if (nodeEnv !== "production") {
    return;
  }

  const requiredVars = [
    "APP_KEYS",
    "API_TOKEN_SALT",
    "ADMIN_JWT_SECRET",
    "TRANSFER_TOKEN_SALT",
    "JWT_SECRET",
    "ENCRYPTION_KEY",
  ] as const;

  const missingVars = requiredVars.filter((variable) => !env(variable));
  if (missingVars.length > 0) {
    throw new Error(`Missing required CMS env variables: ${missingVars.join(", ")}`);
  }

  const appKeys = env.array("APP_KEYS");
  if (appKeys.length < 2) {
    throw new Error("APP_KEYS must contain at least two comma-separated keys in production.");
  }
}
