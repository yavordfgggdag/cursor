/**
 * Platform owner ensure + explicit password bootstrap (fail-closed).
 * Password mutation is opt-in via env and must never use a hardcoded fallback.
 */

export type OwnerBootstrapDecision =
  | { action: "sync_only"; reason: string }
  | { action: "apply_password"; password: string }
  | { action: "fail_closed"; reason: string; status: number };

const BOOTSTRAP_TRUE = new Set(["true", "1"]);

/** Reject empty / placeholder / obvious non-secrets. */
export function isUsableOwnerPassword(value: string | undefined | null): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length < 12) return false;
  const lower = trimmed.toLowerCase();
  if (
    lower === "changeme" ||
    lower === "password" ||
    lower === "secret" ||
    lower.startsWith("stripe_") ||
    lower.startsWith("platform_owner_password") ||
    trimmed.includes("${") ||
    trimmed === "REPLACE_ME" ||
    trimmed === "TODO"
  ) {
    return false;
  }
  return true;
}

export function parseOwnerBootstrapEnabledFlag(
  raw: string | undefined | null,
): { enabled: boolean; malformed: boolean } {
  if (raw == null || String(raw).trim() === "") {
    return { enabled: false, malformed: false };
  }
  const normalized = String(raw).trim().toLowerCase();
  if (BOOTSTRAP_TRUE.has(normalized)) {
    return { enabled: true, malformed: false };
  }
  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") {
    return { enabled: false, malformed: false };
  }
  return { enabled: false, malformed: true };
}

export function readPlatformOwnerPasswordFromEnv(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const raw = env.PLATFORM_OWNER_PASSWORD;
  if (!isUsableOwnerPassword(raw)) return null;
  return raw.trim();
}

/**
 * Decide password bootstrap for an explicit bootstrap request.
 * Normal ensure-owner must never call this with intent to mutate password
 * unless the caller is the dedicated bootstrap route.
 */
export function resolveOwnerPasswordBootstrap(input: {
  bootstrapEnabledRaw: string | undefined | null;
  passwordRaw: string | undefined | null;
  /** Only the dedicated bootstrap endpoint sets this true. */
  explicitBootstrapRequest: boolean;
}): OwnerBootstrapDecision {
  if (!input.explicitBootstrapRequest) {
    return { action: "sync_only", reason: "password_bootstrap_not_requested" };
  }

  const flag = parseOwnerBootstrapEnabledFlag(input.bootstrapEnabledRaw);
  if (flag.malformed) {
    return {
      action: "fail_closed",
      reason: "bootstrap_flag_malformed",
      status: 503,
    };
  }
  if (!flag.enabled) {
    return {
      action: "fail_closed",
      reason: "bootstrap_disabled",
      status: 403,
    };
  }

  if (!isUsableOwnerPassword(input.passwordRaw)) {
    return {
      action: "fail_closed",
      reason: "bootstrap_password_missing_or_invalid",
      status: 503,
    };
  }

  return { action: "apply_password", password: input.passwordRaw.trim() };
}

/** Safe public response shape — never includes password. */
export function ownerEnsurePublicPayload(input: {
  owner: boolean;
  email?: string;
  passwordMutated?: boolean;
  bootstrap?: string;
}): Record<string, unknown> {
  const out: Record<string, unknown> = { ok: true, owner: input.owner };
  if (input.email) out.email = input.email;
  if (input.passwordMutated === true) out.passwordMutated = true;
  if (input.bootstrap) out.bootstrap = input.bootstrap;
  return out;
}

export function assertNoPasswordLeak(payload: unknown, secrets: string[]): void {
  const serialized = JSON.stringify(payload ?? {});
  for (const secret of secrets) {
    if (secret && serialized.includes(secret)) {
      throw new Error("password_leak_in_payload");
    }
  }
}
