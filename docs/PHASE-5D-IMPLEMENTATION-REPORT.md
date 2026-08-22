# Phase 5D Implementation Report

Date: 2026-08-22  
Branch: `cursor/somniora-funnel-fa9c`  
Base: `design/phase-5c-blueprint`  
Scope: visual implementation of `docs/PHASE-5C-DESIGN-BLUEPRINT.md` §21 only. No copy rewrite, no checkout edits, no new offer numbers, no `/somniora` page.

Product: **Методът на Бутзин: 14-дневен план за по-спокойно заспиване**  
Art direction: **Night Clarity**

---

## 1. What shipped (§21.1–§21.14)

| Step | Work | Files |
|---|---|---|
| 1 | Night Clarity tokens + base | `site/css/funnel.css` |
| 2 | Extract FAQ / timer / floating CTA | `site/js/funnel-ui.js` |
| 3 | Extract scroll-progress + reveal | `site/js/funnel-motion.js` |
| 4 | Remove inline `<style>` / `<script>` | `site/index.html`, `funnel.css` |
| 5 | Hero 55/45 grid ≥1024; night surfaces + CSS stars | `index.html`, `funnel.css` |
| 6 | Compact short offer (`offer-box--compact`, 5-line bonus summary) | `index.html`, `funnel.css` |
| 7 | Problem split, compare lanes, mechanism diagram (placeholders) | `index.html`, `funnel.css` |
| 8 | 14-day timeline rail (3 phases) | `index.html`, `funnel.css` |
| 9 | Benefit cards + without pills (hero `.bez-item` count stays 5) | `index.html`, `funnel.css` |
| 10 | Full offer composition + Somniora teasers, no `/somniora` links | `index.html`, `funnel.css` |
| 11 | FAQ visual refresh; 8× `button.faq-q` + `aria-expanded` kept | `index.html`, `funnel.css` |
| 12 | Footer dusk + floating CTA polish; `padding-bottom: 88px` kept | `index.html`, `funnel.css` |
| 13 | Book mockup AVIF/WebP + `<picture>` + PNG fallback | `site/brand/*`, `index.html` |
| 14 | `verify-phase5d.mjs` + this report | `scripts/`, `docs/` |

Checkout, `site-config.js`, Netlify functions, thank-you, reviews backend, and `/somniora` were not edited.

---

## 2. Definition of Done (§22)

| Criterion | Status | Evidence |
|---|---|---|
| §3 protected hooks (timer key, FAQ ARIA, floating CTA, `/checkout`, `#order`) | Met | `node scripts/verify-phase5d.mjs` + `verify-phase5b.mjs` |
| `verify-phase5b.mjs` still passes | Met | 20 checks |
| `verify-phase5d.mjs` passes (hooks + budgets) | Met | See §5 |
| Night Clarity tokens on funnel sections | Met | `--color-night-*` in `funnel.css`; hero / night / FAQ / footer surfaces |
| WCAG AA spot-check (hero, CTA, body, FAQ) | Met (token check) | See §3 |
| Mobile 320px: no horizontal scroll, tap ≥44px | Met (CSS/static) | `overflow-x: hidden`; FAQ / footer links / floating CTA `min-height: 44px`; wrap padding 22px |
| `prefers-reduced-motion`: no infinite animations | Met | Global reduce block + section overrides in `funnel.css` |
| LCP `<picture>` + dimensions | Met | Hero picture AVIF/WebP/PNG, `width="800" height="1000"`, `fetchpriority="high"`, AVIF preload |
| No fake reviews / extra urgency | Met | `AUTHENTICATED_REVIEWS_SLOT` comment only; single timer key `butzin_deadline_v1` |
| Checkout untouched | Met | No diff vs `origin/design/phase-5c-blueprint` on checkout / thank-you / `site-config.js` / `netlify.toml` |
| Implementation report committed | Met | This file |

Lighthouse mobile (local `publish/` on 4G emulation, 2026-08-22): performance **99**, accessibility **100**, LCP **1.7s** (hero `<picture> img`, AVIF), CLS **0.000**. First pass a11y was 96 from `.section-label` indigo on white at 12px; color is now `--color-text` (14.9:1). Not a `verify-phase5d.mjs` gate.

---

## 3. WCAG AA spot-check

Static check against blueprint §5.2 pairings as applied in `funnel.css`:

| Surface | Pairing | Ratio (blueprint) | Notes |
|---|---|---|---|
| Hero body / H1 | `#F4F6FF` on `#060A18` | 16.8:1 | Night hero |
| Proof / moon | `#F0C420` on `#060A18` | 10.9:1 | `.hero-proof`, floating price |
| Primary CTA | `#FFFFFF` on `#6366F1` | 4.6:1 | `.btn-cta` |
| Body on cards | `#1A1A2E` on `#FFFFFF` | 14.9:1 | Offer box, FAQ questions |
| FAQ answers / muted | `#5A5A78` on `#FFFFFF` / `#F7F8FC` | 5.9:1 / 5.7:1 | `.faq-body-inner`, `.faq-lead` |
| Focus | `#F0C420` outline | — | `:focus-visible` on CTA, FAQ, footer links |

FAQ stays keyboard buttons (`type="button"`, `aria-expanded`). Decorative moons / FAQ numbers use `aria-hidden="true"`. Images keep meaningful alt except decorative logo on thank-you (pre-existing).

This is not a browser axe crawl. Contrast values are the locked §5.2 calculations for the tokens in use.

---

## 4. Asset optimization (§21.13)

| File | Role | Size | Notes |
|---|---|---|---|
| `book-mockup-bootzin-14.avif` | Hero + full-offer primary | ~21 KB | Under 80 KB / 120 KB budgets |
| `book-mockup-bootzin-14.webp` | Fallback | ~40 KB | |
| `book-mockup-bootzin-14.png` | Universal fallback + checkout | ~127 KB | Checkout still points here |
| `somniora-logo-trim.png` | Checkout / thank-you | ~153 KB | Unchanged; checkout is out of scope |
| `guarantee-7-day-banner.png` | Orphan | ~107 KB | Not integrated (would change the offer) |
| CSS placeholders | Dashboard / academy / problem / cycles | — | Slots #3–#9 remain placeholders |

Hero is LCP (no `loading="lazy"`). Offer mockup is lazy. Missing final art for slots #2–#11 (except the book) is expected; placeholders satisfy §11.

---

## 5. Verification commands

Run from repo root after `SKIP_SOMNIORA=1 node scripts/build-with-somniora.mjs`:

```
node scripts/verify-phase5d.mjs
node scripts/verify-phase5b.mjs
node scripts/verify-phase4a.mjs
node scripts/verify-phase4b.mjs
node scripts/secret-scan.mjs
```

`verify-phase5d.mjs` covers: split JS/CSS load order, §3 hooks, FAQ button contract, Night Clarity tokens, §21.13 picture/AVIF/WebP/PNG + hero loading attributes, broken image refs, gzip budgets, locked prices, no fake reviews, checkout drift vs 5C base, and `site/` ↔ `publish/` parity.

One first-pass false fail counted `-webkit-backdrop-filter` toward the ≤3 blur budget; the check now ignores prefixed duplicates (2 real `backdrop-filter` uses).

---

## 6. Remaining (out of Phase 5D scope)

- Self-host font subset (still Google Fonts with `display=swap`)
- Orphan `guarantee-7-day-banner.png` (archive or later offer use)
- Logo WebP on checkout (blocked by checkout freeze)
- Final art for placeholder slots #2–#11
- Authenticated reviews (Phase 7)
- Public `/somniora` page (not linked)
- `verify-phase5b.mjs` still uses a Phase 5B-era allowed dirty-file set; run it on a clean tree

---

## 7. Risks carried forward

- Social proof „над 1,000 пълнолетни“ still lacks a published evidence link (Phase 5B lock)
- FAQ answers stay `max-height: 0` until JS (blueprint §3.2 allows this)
- Font transfer budget (90 KB woff2 subset) is not met until self-host
