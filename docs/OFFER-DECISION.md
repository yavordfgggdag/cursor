# Offer Decision Gate — butzin-method-1

Date: 2026-08-22  
Sources: Google Doc (tab „СКЕЛЕ“), live `site/index.html`, `sleepfunnel-1` checkout (`sleep-restart-14`)

## Comparison

| Dimension | FunnelAI export (Phase 1 live) | Google Doc „СКЕЛЕ“ | sleepfunnel-1 (Stripe) | **Decision** |
|---|---|---|---|---|
| Product | 14-дневен план / Метод Бутзин | Книга + 5 бонуса | Метод Бутзин 14-day program | Keep current naming |
| Bonus count | 5 | 5 | 6 in somnioraOffer stats | **5** (matches SKЕЛЕ + landing) |
| Sale price | €13,80 | €17 (working doc variants) | €17 | **€17** |
| Value stack total | €149,40 | varies (up to €432 in other tabs) | €432 | **Keep €149,40** on this landing (itemized); checkout charges €17 |
| Savings | €135,60 (91%) | n/a at €17 | n/a | **€132,40 (89%)** after price fix |
| Guarantee | 14-day refund | 30-day „Спокойна Проба“ (drafts) | 7-day | **7-day** (matches checkout/legal on Somniora) |
| Checkout | `#order` anchor only | n/a | `/checkout` on Somniora site | **External link to Somniora checkout** |
| Somniora software | Promised in copy | Bonus 4 + 5 | Academy + tools post-purchase | **Link to academy after purchase** |

## Rationale

1. **Price €17** — Stripe on `30-dni-po-dobar-sun.netlify.app` charges €17; leaving €13,80 on the landing would mislead buyers at checkout.
2. **5 bonuses** — SKЕЛЕ tab explicitly lists book + 5 bonuses; matches current page structure.
3. **7-day guarantee** — Operational refund policy on Somniora funnel; draft 30-day copy in Google Doc not yet implemented in payment stack.
4. **Checkout URL** — Static site has no backend; CTA targets `https://30-dni-po-dobar-sun.netlify.app/checkout`.
5. **Somniora delivery** — Software/support delivered via Somniora academy (`/academy`) after Stripe purchase; landing clarifies post-purchase access.

## CTA map (approved)

| Element | Target |
|---|---|
| Primary CTA buttons | `CHECKOUT_URL` from site-config.js |
| Floating CTA | same |
| Privacy | `/privacy.html` |
| Terms | `/terms.html` |
| Refund | `/refund.html` |
| Contact | `/contact.html` |
| Somniora access (post-purchase) | `https://30-dni-po-dobar-sun.netlify.app/academy` |

## Out of scope (future)

- Custom domain for this landing
- Stripe embedded on `metod-butzin-14.netlify.app` (would require functions)
- Aligning value stack to €432 (sleepfunnel main funnel) — separate copy pass
