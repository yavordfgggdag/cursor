# Offer Decision Gate — butzin-method-1

Date: 2026-08-22 (updated Phase 5B)
Sources: Google Doc tabs „СКЕЛЕ“, „Работен Документ“, „Продукти“; locked owner decisions

## Locked offer (Phase 5B)

| Dimension | Decision |
|---|---|
| Product name | Методът на Бутзин: 14-дневен план за по-спокойно заспиване |
| Mechanism | Системата Легло–Сън |
| Sale price | **17 €** |
| Value stack total | **149,40 €** |
| Savings | **132,40 €** |
| Discount | **89%** |
| Bonuses | **5** |
| Guarantee | **7 дни** |
| Countdown timer key | `butzin_deadline_v1` |
| Social proof (locked copy) | „над 1,000 пълнолетни души“ (evidence source still required) |
| Checkout | **Local `/checkout`** on this site |

## Bonus map

| # | Name | Notes |
|---|---|---|
| 1 | Мини програма „7-дневно Затваряне на деня“ | work, tasks, conversations, money, tomorrow thoughts |
| 2 | Мини инструмент „Стоп на часовниковите сметки“ | clock watching, sleep math, rising tension |
| 3 | Аудио пакет „Тиха вечер“ | helper part of plan, not primary sleep guarantee |
| 4 | Somniora Software | Дневник на съня, Личен план, План според напредъка ти, Преглед на напредъка |
| 5 | Somniora Academy: 30-дневна Somniora поддръжка | weekly reviews + extra materials after the 14-day plan |

## CTA map

| Element | Target |
|---|---|
| Hero CTA | `/checkout` |
| Offer 1 CTA | `/checkout` |
| Offer 2 CTA | `/checkout` |
| Floating CTA | `/checkout` |
| Privacy | `/privacy.html` |
| Terms | `/terms.html` |
| Contact | `/contact.html` |

## Operational notes

- Timer `butzin_deadline_v1` remains in `site/index.html`.
- Authenticated reviews are **not** shown in Phase 5B; slot reserved for Phase 7.
- Public Somniora showcase page (`/somniora`) is deferred to a later phase to avoid temporary 404 links.
- Stripe, Supabase, webhook, and checkout payment logic are unchanged in this phase.

## Evidence gaps (documentation only)

- „Над 1,000 пълнолетни души“ is locked marketing copy but still needs a documented evidence source before external compliance review.
