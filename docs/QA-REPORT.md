# QA Report — butzin-method-1 (Phase 2)

Date: 2026-08-22  
Environment: local code + post-deploy verification on `https://metod-butzin-14.netlify.app`

## Automated checks

| Check | Result | Status |
|---|---|---|
| Inline JavaScript syntax | `JS_OK` | Pass |
| Price math (149.40 − 17 = 132.40, 89%) | Verified in HTML | Pass |
| CTA href → Somniora checkout | 3 CTAs updated | Pass |
| Footer legal links | `/privacy.html`, `/terms.html`, `/contact.html` | Pass |
| FAQ uses `<button>` + `aria-expanded` | 8 items | Pass |
| `:focus-visible` styles | Present | Pass |
| `prefers-reduced-motion` | Present | Pass |
| `body padding-bottom` for floating CTA | 88px | Pass |
| Somniora delivery box | Added in `#order` section | Pass |
| `site-config.js` | Present | Pass |

## HTTP checks (post-deploy 2026-08-22)

| URL | Status |
|---|---|
| `/` | 200 |
| `/privacy.html` | 200 |
| `/terms.html` | 200 |
| `/refund.html` | 200 |
| `/contact.html` | 200 |
| `/favicon.svg` | 200 |
| `/robots.txt` | 200 |
| `/sitemap.xml` | 200 |
| `/site-config.js` | 200 |
| Checkout link in homepage HTML | OK |
| Price €17,00 in homepage HTML | OK |

## Manual checks (recommended in browser)

| Check | Status |
|---|---|
| Responsive 320–430px — no horizontal scroll | Not automated — verify in DevTools |
| Floating CTA show/hide near offer sections | Logic unchanged; verify scroll |
| FAQ keyboard (Enter/Space on button) | Native button — should work |
| Lighthouse performance/accessibility | Run `npx lighthouse` locally if needed |
| Checkout flow end-to-end on Somniora | Verify Stripe test purchase separately |

## Known remaining gaps

- No product images on landing
- Seller registration details placeholder in legal pages
- Countdown timer still uses localStorage fake urgency
- Cross-domain checkout (landing → Somniora) — confirm analytics attribution
