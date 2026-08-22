/** Shared review constants and pure helpers (safe for unit tests). */

export const REVIEWS_PRODUCT_ID = 'sleep-restart-14'
export const REVIEWS_BUCKET = 'reviews'
export const MAX_REVIEW_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_REVIEW_IMAGES = 5
export const MAX_REVIEW_TEXT_LENGTH = 2000
export const MAX_DISPLAY_NAME_LENGTH = 80
export const DEFAULT_PAGE_SIZE = 10
export const MAX_PAGE_SIZE = 24

export const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'] as const)

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'spam'
export type ReviewSort = 'newest' | 'helpful' | 'highest' | 'lowest'

export type PublicReview = {
  id: string
  product_id: string
  display_name: string
  rating: number
  review_text: string
  avatar_url: string | null
  is_verified_purchase: boolean
  helpful_count: number
  has_images: boolean
  created_at: string
  approved_at: string | null
  images: Array<{
    id: string
    image_url: string
    thumbnail_url: string | null
    sort_order: number
  }>
  voted_helpful?: boolean
}

export type ReviewSummary = {
  product_id: string
  total: number
  average: number
  histogram: Record<'1' | '2' | '3' | '4' | '5', number>
}

export function detectImageMime(buffer: Uint8Array): string | null {
  if (buffer.length < 3) return null
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png'
  }
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp'
  }
  return null
}

export function extensionForMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    default:
      return 'bin'
  }
}

export function sanitizePlainText(input: unknown, maxLen: number): string {
  const raw = String(input ?? '')
    .replace(/\0/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
  // Strip HTML-ish tags without allowing markup through
  const noTags = raw.replace(/<[^>]*>/g, '')
  return noTags.slice(0, maxLen)
}

const BLOCKED_DISPLAY_NAMES = new Set(
  ['owner', 'admin', 'administrator', 'user', 'потребител', 'test', 'тест'].map((s) =>
    s.toLowerCase(),
  ),
)

function isBlockedDisplayName(name: string): boolean {
  const n = name.trim().toLowerCase()
  if (!n) return true
  if (BLOCKED_DISPLAY_NAMES.has(n)) return true
  if (n.includes('@')) return true
  return false
}

/** "Георги Господинов" / first+last → "Георги Г." */
export function formatPublicReviewName(
  firstName?: string | null,
  lastName?: string | null,
  fullNameFallback?: string | null,
): string {
  const first = sanitizePlainText(firstName, 40)
  const last = sanitizePlainText(lastName, 40)

  if (first && last) {
    const initial = [...last][0]
    if (initial) return `${first} ${initial.toUpperCase()}.`.slice(0, MAX_DISPLAY_NAME_LENGTH)
  }

  const full = sanitizePlainText(fullNameFallback, MAX_DISPLAY_NAME_LENGTH)
  if (!full || isBlockedDisplayName(full)) {
    if (first && !isBlockedDisplayName(first)) return first
    return ''
  }

  const initialForm = full.match(/^(\S+)\s+([A-Za-zА-Яа-яЁё])\.?$/u)
  if (initialForm) {
    return `${initialForm[1]} ${initialForm[2].toUpperCase()}.`
  }

  const parts = full.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const initial = [...parts[parts.length - 1]][0]
    if (initial) return `${parts[0]} ${initial.toUpperCase()}.`
  }

  if (parts.length === 1 && !isBlockedDisplayName(parts[0])) return parts[0]
  return ''
}

export function normalizeEmail(email: unknown): string {
  return String(email ?? '')
    .trim()
    .toLowerCase()
}

export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function parseRating(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isInteger(n) || n < 1 || n > 5) return null
  return n
}

export function parseSort(raw: unknown): ReviewSort {
  const s = String(raw || 'newest')
  if (s === 'helpful' || s === 'highest' || s === 'lowest' || s === 'newest') return s
  return 'newest'
}

export function parsePageLimit(raw: unknown): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return DEFAULT_PAGE_SIZE
  return Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(n)))
}

export function computeAverage(total: number, sum: number): number {
  if (total <= 0) return 0
  return Math.round((sum / total) * 10) / 10
}

export function emptyHistogram(): Record<'1' | '2' | '3' | '4' | '5', number> {
  return { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
}

export function buildSummaryFromRows(
  productId: string,
  rows: Array<{ rating: number }>,
): ReviewSummary {
  const histogram = emptyHistogram()
  let sum = 0
  for (const row of rows) {
    const r = row.rating
    if (r >= 1 && r <= 5) {
      histogram[String(r) as '1' | '2' | '3' | '4' | '5'] += 1
      sum += r
    }
  }
  const total = rows.length
  return {
    product_id: productId,
    total,
    average: computeAverage(total, sum),
    histogram,
  }
}

export function validateCreateReviewInput(body: {
  display_name?: unknown
  email?: unknown
  rating?: unknown
  review_text?: unknown
  consent?: unknown
  honeypot?: unknown
  product_id?: unknown
}): { ok: true; data: {
  display_name: string
  email: string
  rating: number
  review_text: string
  product_id: string
} } | { ok: false; error: string } {
  if (String(body.honeypot ?? '').trim()) {
    return { ok: false, error: 'Rejected' }
  }
  if (body.consent !== true && body.consent !== 'true' && body.consent !== 'on') {
    return { ok: false, error: 'Необходимо е съгласие за публикуване.' }
  }
  const display_name = sanitizePlainText(body.display_name, MAX_DISPLAY_NAME_LENGTH)
  const formatted = formatPublicReviewName(null, null, display_name)
  if (formatted.length < 2 || !/^\S+\s+\S/.test(formatted)) {
    return { ok: false, error: 'Моля, въведете име и фамилия (напр. Георги Иванов).' }
  }
  const email = normalizeEmail(body.email)
  if (!isValidEmail(email)) {
    return { ok: false, error: 'Моля, въведете валиден имейл.' }
  }
  const rating = parseRating(body.rating)
  if (rating == null) {
    return { ok: false, error: 'Оценката трябва да е между 1 и 5.' }
  }
  const review_text = sanitizePlainText(body.review_text, MAX_REVIEW_TEXT_LENGTH)
  if (review_text.length < 2) {
    return { ok: false, error: 'Моля, напишете кратко ревю.' }
  }
  const product_id = sanitizePlainText(body.product_id || REVIEWS_PRODUCT_ID, 64) || REVIEWS_PRODUCT_ID
  return {
    ok: true,
    data: { display_name: formatted, email, rating, review_text, product_id },
  }
}

/** Simple sliding-window rate limiter (best-effort in serverless). */
export function createRateLimiter(options: {
  windowMs: number
  max: number
}) {
  const hits = new Map<string, number[]>()
  return {
    check(key: string): boolean {
      const now = Date.now()
      const windowStart = now - options.windowMs
      const prev = (hits.get(key) || []).filter((t) => t > windowStart)
      if (prev.length >= options.max) {
        hits.set(key, prev)
        return false
      }
      prev.push(now)
      hits.set(key, prev)
      return true
    },
  }
}

export function encodeCursor(createdAt: string, id: string): string {
  const json = JSON.stringify({ c: createdAt, i: id })
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function decodeCursor(raw: string | null | undefined): { c: string; i: string } | null {
  if (!raw) return null
  try {
    const padded = raw.replace(/-/g, '+').replace(/_/g, '/')
    const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
    const json = decodeURIComponent(escape(atob(padded + pad)))
    const parsed = JSON.parse(json) as { c?: string; i?: string }
    if (!parsed.c || !parsed.i) return null
    return { c: parsed.c, i: parsed.i }
  } catch {
    return null
  }
}

export function sortToOrder(sort: ReviewSort): { column: string; ascending: boolean } {
  switch (sort) {
    case 'helpful':
      return { column: 'helpful_count', ascending: false }
    case 'highest':
      return { column: 'rating', ascending: false }
    case 'lowest':
      return { column: 'rating', ascending: true }
    case 'newest':
    default:
      return { column: 'created_at', ascending: false }
  }
}

export function stripPublicReviewEmail<T extends Record<string, unknown>>(row: T): Omit<T, 'email'> {
  const { email: _email, ...rest } = row
  return rest
}
