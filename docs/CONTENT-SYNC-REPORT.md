# Content Sync Report — Phase 4A + 4B

Date: 2026-08-22  
Branch: `content/google-doc-conversational-copy`  
Google Doc: [Работен документ](https://docs.google.com/document/d/1YiJh9MyV5SiDzG7kfKSTYidNye7b5kN3vEmKdUwdugo/edit)

## 1. Използвани табове от Google документа

| Таб / секция | Как е използван |
|---|---|
| **СКЕЛЕ** | Оферта (книга + 5 бонуса), callout аудитория, hero послание, „БЕЗ" списък |
| **Проблем** | Сцени „втора смяна", уморено тяло / буден ум, вина не е в посетителя |
| **Идеален клиент** | Тон „ти", натоварен живот, без перфектна среда |
| **Преди / След** | Future pacing, ползи, какво не е нужно |
| **Продукти** | Име на продукта, Somniora Software, поддръжка |
| **Неустоима оферта** | Стойност 149,40 €, 5 бонуса, спестяване |
| **Послание** | „Не се нуждаеш от още един трик. Нуждаеш се от ясен план." |
| **Старият начин срещу новия** | Чайове, медитация, насилствено заспиване vs ясен план |
| **Обори останалите възражения** | FAQ: вече пробвал, стрес, наследствено, гаранция |
| **Работен документ** | Общ тон и посока на copy |

## 2. Определени като остарели (не използвани)

| Източник | Причина |
|---|---|
| **ТРАФИК** | 10 бонуса, 30-дневна гаранция, стари имена |
| **Funnel Master GPT** | Примери, не продуктови факти |
| Google Doc €432 stack | Owner + OFFER-DECISION → 149,40 € |
| Checkout €432 / €415 | Заменени с 149,40 / 132,40 / 89% |

## 3. Открити противоречия

| # | Противоречие | Решение |
|---|---|---|
| 1 | Google Doc €432 vs locked offer | **149,40 €** |
| 2 | 30-дневна гаранция в doc vs operational | **7 дни** |
| 3 | Phase 4A „нула hyphen" vs owner correction | **Само standalone `—`/`–`; граматическите `-`/`–` са позволени** |
| 4 | „Легло и Сън" vs doc | **Легло–Сън** (en dash в compound name) |
| 5 | Product name variants | **Методът на Бутзин: 14-дневен план за по-спокойно заспиване** |

## 4. Правило за тирета (финално, Phase 4B correction)

**Премахват се само:**
- `—` и `–` като разделители на изречения (с интервали около тях)
- `—` в началото на ред преди име в ревю

**Позволени и запазени:**
- `14-дневен`, `7-дневна`, `30-дневна`
- `по-лесно`, `по-спокойно`, `по-буден`, `по-концентриран`, `по-просто`, `по-рано`, `по-тежки`, `по-дълбоко`, `по-силно`, `по-присъстващ`
- `д-р`
- `Легло–Сън` (compound name с en dash без интервали)
- `най-скоро` (не се изисква в refund; използвано „Ще ти отговорим скоро.")

**Не се броят като проблем:** тирета в CSS коментари, URL, HTML атрибути, JS идентификатори.

## 5. Брой тирета преди Phase 4A

| Тип | Брой |
|---|---|
| Standalone em dash (—) | 106 |
| Standalone en dash (–) | 12 |

## 6. Брой тирета след Phase 4B

| Тип | Брой | Бележка |
|---|---|---|
| Standalone em dash (—) | **0** | |
| Standalone en dash (–) | **0** | |
| Граматически hyphen/en dash | ~55+ | **Позволени** (`по-*`, `14-днев*`, `д-р`, `Легло–Сън`) |

Phase 4A грешно броеше ~49 граматически форми като проблем. Phase 4B ги **възстанови**, не ги премахна.

## 7. Поправени текстове в Phase 4B

- Име на продукта → `14-дневен план за по-спокойно заспиване`
- `Легло и Сън` → `Легло–Сън` (7 места в index)
- Ревюта: поправени артефакти „Не е магия. е" и „три дни. след"
- `refund.html`: „Ще ти отговорим скоро."
- `terms.html`: „14-дневен план" в описанието на продукта

## 8. Променени цени (заключени)

| Поле | Стойност |
|---|---|
| Крайна цена | 17 € |
| Обща стойност | 149,40 € |
| Спестяване | 132,40 € (89%) |
| Гаранция | 7 дни |
| Бонуси | 5 |

## 9. Secret scan

| Резултат | Детайл |
|---|---|
| ✅ PASS | Няма hardcoded Stripe keys, webhook secrets или service role JWT в commit файловете |

## 10. QA резултати

| Проверка | Резултат |
|---|---|
| Mobile layout (320–430 px) | ✅ `viewport` meta, `overflow-x: hidden`, responsive CSS media queries |
| Desktop layout | ✅ `.wrap` max-width, grid/flex layouts |
| FAQ keyboard | ✅ `<button class="faq-q">` — native Enter/Space |
| Floating CTA | ✅ IntersectionObserver + scroll > 400px |
| Timer | ✅ `butzin_deadline_v1`, dual `.timer` elements |
| Checkout validation | ✅ Client-side email + checkbox checks before fetch |
| Thank-you redirect | ✅ `/app/login`, `/app/signup` preserved |
| Legal pages | ✅ Без вътрешни бележки; липсващи фирмени данни в коментари |
| `node --check` | ✅ checkout.js, thank-you.js |
| `verify-phase4b.mjs` | ✅ standalone em/en = 0 |
| Build (`SKIP_SOMNIORA=1`) | ✅ publish/ bundle |

## 11. Git категоризация на файловете

| Файл | Категория |
|---|---|
| `site/checkout.html`, `checkout.css`, `js/checkout.js` | Локален checkout |
| `site/thank-you.html`, `js/thank-you.js` | Thank-you flow |
| `site/index.html`, legal pages, `contact.html` | Copy sync |
| `site/site-config.js` | Checkout + copy config |
| `site/brand/` | Checkout assets |
| `netlify/functions/payments-api.mts`, `_shared/` | Checkout backend (env-only secrets) |
| `netlify.toml`, `package.json`, `.gitignore` | Deploy/build config |
| `scripts/` | Build + verification |
| `docs/CONTENT-SYNC-REPORT.md` | Отчет |

## 12. Блокери

- Пълно юридическо наименование, ЕИК, седалище (HTML коментари в legal)
- Somniora `/app` bundle липсва при build без Desktop path (SKIP_SOMNIORA=1)

## 13. Премахнати сложни изрази (примери)

- „структуриран процес" → „ясен план"
- „адресира погрешната условна връзка" → „намира грешната връзка в главата"
- „Адаптивен план" → „план по твоя напредък"
