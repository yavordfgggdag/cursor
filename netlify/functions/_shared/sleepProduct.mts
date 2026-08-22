/**
 * Server-only sleep product resolution (Phase 2B).
 * Pure helpers are exported for unit tests — no secrets in return values.
 */

export const SLEEP_PRODUCT_KEY = 'sleep-restart-14'
export const SLEEP_CONFIGURATION_VERSION = 1

/** Allowlisted product keys that this checkout path understands. */
export const ALLOWED_FUNNEL_PRODUCT_KEYS = [SLEEP_PRODUCT_KEY] as const

export type AllowedFunnelProductKey = (typeof ALLOWED_FUNNEL_PRODUCT_KEYS)[number]

export type LaunchPriceTier = 'launch' | 'standard'

export type SleepPriceEnv = {
  launchPriceId?: string
  standardPriceId?: string
  launchStartIso?: string
  launchEndIso?: string
}

export function isAllowedFunnelProductKey(key: string): key is AllowedFunnelProductKey {
  return (ALLOWED_FUNNEL_PRODUCT_KEYS as readonly string[]).includes(key)
}

export function normalizeProductKey(raw: unknown): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
}

/** Map aliases / productKey → academy course slug */
export function productKeyToCourseSlug(productKey: string): string | null {
  const key = normalizeProductKey(productKey)
  if (key === SLEEP_PRODUCT_KEY || key === 'sleep-restart' || key === 'sleep') {
    return SLEEP_PRODUCT_KEY
  }
  return null
}

/**
 * Resolve launch vs standard tier from server clock + optional ISO window.
 * Missing/invalid window → standard (safe default — never undercharge by accident).
 */
export function resolveSleepPriceTier(
  nowMs: number,
  env: Pick<SleepPriceEnv, 'launchStartIso' | 'launchEndIso'>,
): LaunchPriceTier {
  const start = env.launchStartIso ? Date.parse(env.launchStartIso) : NaN
  const end = env.launchEndIso ? Date.parse(env.launchEndIso) : NaN

  if (!Number.isFinite(end)) return 'standard'
  if (Number.isFinite(start) && nowMs < start) return 'standard'
  if (nowMs >= end) return 'standard'
  // In window (or start missing but end in future)
  if (!Number.isFinite(start) || nowMs >= start) {
    if (nowMs < end) return 'launch'
  }
  return 'standard'
}

export function resolveSleepStripePriceId(
  nowMs: number,
  env: SleepPriceEnv,
): { ok: true; priceId: string; tier: LaunchPriceTier } | { ok: false; error: string; tier: LaunchPriceTier } {
  const tier = resolveSleepPriceTier(nowMs, env)
  const priceId =
    tier === 'launch'
      ? (env.launchPriceId || '').trim()
      : (env.standardPriceId || '').trim()

  // Fallback: if launch tier but launch price missing, try standard
  const resolved =
    priceId ||
    (tier === 'launch' ? (env.standardPriceId || '').trim() : (env.launchPriceId || '').trim())

  if (!resolved || resolved.startsWith('STRIPE_PRICE_ID')) {
    return {
      ok: false,
      tier,
      error:
        'Липсва Stripe Price ID за sleep-restart-14. Задай STRIPE_PRICE_ID_SLEEP_RESTART_LAUNCH и/или STRIPE_PRICE_ID_SLEEP_RESTART_STANDARD.',
    }
  }

  return { ok: true, priceId: resolved, tier: priceId ? tier : 'standard' }
}

export function readSleepPriceEnvFromProcess(
  env: Record<string, string | undefined> = process.env,
): SleepPriceEnv {
  return {
    launchPriceId: env.STRIPE_PRICE_ID_SLEEP_RESTART_LAUNCH,
    standardPriceId: env.STRIPE_PRICE_ID_SLEEP_RESTART_STANDARD,
    launchStartIso: env.SLEEP_LAUNCH_START_ISO,
    launchEndIso: env.SLEEP_LAUNCH_END_ISO,
  }
}

/** Allowlisted relative success/cancel paths for funnel checkout (no open redirect). */
export const FUNNEL_SUCCESS_PATH = '/thank-you'
export const FUNNEL_CANCEL_PATH = '/?checkout=cancel'

export function buildFunnelCheckoutUrls(siteUrl: string): { successUrl: string; cancelUrl: string } {
  const base = siteUrl.replace(/\/$/, '')
  return {
    successUrl: `${base}${FUNNEL_SUCCESS_PATH}?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${base}${FUNNEL_CANCEL_PATH}`,
  }
}

/** Mask email for client status responses (no full PII). */
export function maskEmail(email: string): string {
  const normalized = String(email || '').trim().toLowerCase()
  const at = normalized.indexOf('@')
  if (at < 1) return '***'
  const local = normalized.slice(0, at)
  const domain = normalized.slice(at + 1)
  const visible = local.slice(0, 1)
  return `${visible}***@${domain}`
}

export function isValidStripeSessionId(sessionId: string): boolean {
  // Stripe Checkout Session IDs: cs_test_... or cs_live_...
  return /^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId.trim())
}
