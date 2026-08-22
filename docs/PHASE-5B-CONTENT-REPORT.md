# Phase 5B Content Report

Date: 2026-08-22  
Branch: `content/phase-5b-funnel-copy`  
Scope: main funnel copy in `site/index.html` only

## Sources used

| Source | Tab / ID | Use |
|---|---|---|
| [Google Doc](https://docs.google.com/document/d/1YiJh9MyV5SiDzG7kfKSTYidNye7b5kN3vEmKdUwdugo/edit) | СКЕЛЕ (`t.iuhc0h72uefs`) | Offer structure, bonus count, pricing frame |
| Same | Работен Документ (`t.rhfv9lvayg36`) | Problem scenes, desires, objections, conversational tone |
| Same | Продукти (`t.2ir6xjk67v30`) | Bonus names and Somniora deliverables |
| `docs/OFFER-DECISION.md` | locked operational decisions | Price, checkout, guarantee, timer |

Funnel Master GPT was not used for product facts. Tab „ТРАФИК“ was not used.

## Unsupported text removed

- Hero: 8-item „Без нужда от“ list reduced to 5 canonical items
- Removed: дихателни техники / 1–2 часа ritual / перфектна стая / перфектна среда / сложни ритуали
- Removed: Arizona research, „водещ специалист“, „Изследванията показват…“
- Removed: wellness-industry financial-interest accusations, „не продава чай“, productivity-guru blame
- Removed: „Три минути“, guaranteed day-14 outcomes, „Somniora виждаш го“ certainty
- Removed: FAQ claims „повечето хора усещат…“, „резултатите са трайни“, ritual FAQ, perfect-environment FAQ answer
- Removed: four static placeholder testimonials (Мария, Георги, Силвия, Красимир)

## Final hero copy

| Element | Text |
|---|---|
| Eyebrow | 🌙 Специално за хора, които вечер са изморени, но умът им започва втора смяна |
| Social proof | Нов 14-дневен план, помогнал на над 1,000 пълнолетни души |
| H1 | Когато тялото е уморено, а умът не спира, Системата Легло–Сън ти показва какво да правиш, когато сънят не идва |
| Subtitle | Методът на Бутзин ти дава ясен план за 14 дни… |
| CTA | 🌙 Искам ясен план за вечерта |
| Microcopy | 17 € еднократно • 5 бонуса • 7-дневна гаранция |

Evidence note: „над 1,000 пълнолетни души“ remains locked owner copy; documented evidence source still required.

## Canonical „Без нужда от“ (hero, exactly 5)

1. чайове, мелатонин и магнезий  
2. медитация, която „трябва да изчисти ума“  
3. хапчета за сън и страх от зависимост  
4. коренни промени в живота и работата  
5. да премахнеш стреса от живота си  

Benefits cross-list mirrors the same five items.

## Section changes

- **Problem:** added forced-sleep attempt and fear of next day; blockquote uses „нещо не е наред с мен“
- **Not your fault:** replaced industry accusations with „Не си се провалил… ясен план“
- **Old vs new:** new highlight box inserted
- **Mechanism:** softened to stimulus-control framing without scientific discovery claims
- **14-day timeline:** goals/guidance language only
- **Benefits:** „можеш постепенно“ framing, no guaranteed outcomes
- **Offer/bonuses:** canonical bonus names and Somniora conversational labels
- **Reviews:** HTML comment slot only
- **FAQ:** replaced ritual question with „Ами ако пропусна една вечер?“; safe timing and supplement answers

## Known remaining risks

- Social proof „1,000+ пълнолетни“ still lacks published evidence link
- No authenticated reviews until Phase 7
- `/somniora` showcase page not built yet (intentionally deferred)
- Copy still references Somniora Academy textually without new public page

## Verification

Automated: `node scripts/verify-phase5b.mjs`  
Manual: HTML structure, FAQ accordion, floating CTA, anchor to `#order`, timer markup preserved

## Recommended next phase

Phase 6 or Phase 7 per project plan: authenticated review system and/or Somniora public showcase page, without changing payment stack.
