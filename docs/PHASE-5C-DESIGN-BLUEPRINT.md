# Phase 5C — Premium Design System and Funnel Visual Blueprint

Date: 2026-08-22  
Branch target: `design/phase-5c-blueprint`  
Scope: analysis and specification only. No changes to `site/index.html`, CSS, or JavaScript in this phase.

Product: **Методът на Бутзин: 14-дневен план за по-спокойно заспиване**  
Art direction codename: **Night Clarity**

---

## 1. Executive summary

Phase 5C defines a premium, conversion-safe visual system for the Butzin sleep funnel, future authenticated reviews, and a future public Somniora showcase page. The current funnel is functionally solid after Phase 5B copy alignment, but visually it still reads as a single long inline HTML page with mixed light/dark sections, repeated offer blocks, emoji-heavy UI, and limited component differentiation.

The blueprint introduces:

- A coherent **Night Clarity** narrative: tense evening → clarity → concrete plan → calm.
- A tokenized design system (color, type, spacing, motion) compatible with existing functionality.
- Section wireframes for all 13 funnel areas plus future reviews and Somniora surfaces.
- A protected-functionality contract so Phase 5D cannot break timer, FAQ, floating CTA, checkout links, or reduced-motion behavior.
- A CSS/JS split plan (`site/css/funnel.css`, `site/js/funnel-ui.js`, `site/js/funnel-motion.js`) without implementing it yet.

Phase 5D should implement visuals only. No copy rewrites, no checkout changes, no fake urgency/reviews, no new dependencies.

---

## 2. Current design audit

### 2.1 Architecture today

| Area | Current state | Issue | Phase 5D direction |
|---|---|---|---|
| Styles | ~275 lines inline in `site/index.html` | Hard to maintain, no design tokens file | Extract to `site/css/funnel.css` |
| Scripts | Inline at bottom of `index.html` | Timer, FAQ, reveal, floating CTA coupled | Split UI vs motion |
| Layout width | `.wrap { max-width: 700px }` | Good for reading; hero/product cramped on desktop | Add hero grid at ≥1024px |
| Visual rhythm | Hero dark → offer light → copy light → timeline dark → benefits light → offer dark → FAQ light | Functional but abrupt | Progressive lightening scroll curve |
| Typography | Sora + Inter, basic clamp on h1/h2 | H1 can dominate mobile fold; no eyebrow scale | Tokenized type ramp + `text-wrap: balance` |
| Color | Indigo primary + gold accent + green trust | Checkout uses different Somniora palette (teal/violet) | Unify funnel toward Night Clarity; checkout stays read-only reference |
| Motion | pulse-glow on all CTAs, shimmer on top bar, drift blobs | Feels lively but slightly “promo template” | Reduce always-on motion; reserve emphasis for hero + price |
| Components | Offer box reused twice with full bonus list | Short offer becomes heavy | Short offer = compact card; full offer = stacked composition |
| Imagery | One hero mockup PNG (~127 KB) | Missing diagrammatic assets | Local CSS/SVG placeholders until final art |
| Reviews | HTML comment slot only | Correct for Phase 5B | Design empty/loading/authenticated states only |
| Accessibility | FAQ buttons, focus-visible, reduced-motion block present | Emoji in buttons; contrast on muted text borderline | Structured icons + AA palette enforcement |
| Performance | Hero image has width/height; fonts from Google | No `font-display`; multiple weights loaded | Self-host subset + `font-display: swap` in 5D |

### 2.2 Checkout visual reference (read-only)

`site/checkout.css` uses a distinct **Somniora sky** palette (`--night`, teal `--accent`, violet glow). Funnel redesign should feel brand-related but not identical: funnel = indigo + moon gold; checkout may retain Somniora teal accent for payment trust continuity. Do not modify checkout in Phase 5D unless explicitly scoped later.

### 2.3 Content structure preserved from Phase 5B

Locked copy elements that design must accommodate:

- Hero eyebrow, social proof with „пълнолетни“, H1, subtitle, 5 „Без нужда от“ items, CTA microcopy.
- Offer: 17 €, 149,40 €, 132,40 €, 89%, 5 bonuses, 7-day guarantee.
- Timer key: `butzin_deadline_v1`.
- Reviews slot comment only; no fake testimonials.
- FAQ: 8 items with `button` + `aria-expanded`.

---

## 3. Protected selectors and functionality

These hooks **must remain functionally equivalent** in Phase 5D. Visual styling may change; selectors/IDs/behavior may not break.

| Hook | Location | Function | Rename allowed? | Must stay? | Protection in redesign |
|---|---|---|---|---|---|
| `#scroll-progress` | `<div>` after `<body>` | Scroll progress width | No | Yes | Keep ID; style via CSS only |
| `.top-bar` | Urgency bar | Static message | Yes (with JS/CSS update) | Content yes | Prefer keep class for stable QA |
| `.hero` | Hero section | Layout container | Yes | Structure yes | Keep semantic `<section class="hero">` |
| `.callout-badge` | Hero eyebrow | Audience label | Yes | Content yes | Style only |
| `.hero-proof` | Hero social proof | Proof line | Yes | Text yes | Keep class for tests |
| `.hero-sub` | Hero subtitle | Supporting copy | Yes | Yes | — |
| `.bez-grid` / `.bez-item` | Hero negatives | Exactly 5 items | Yes | Count 5 | Verify script checks count |
| `.hero-product` + `img` | Book mockup | LCP candidate | Yes | Asset path yes | Keep dimensions attrs |
| `href="/checkout"` | Hero, offers, floating CTA | Purchase path | No | Yes | Never change target |
| `.offer-box` | Offer 1 & 2 | Offer container | Yes | First instance used by JS | **First** `.offer-box` observed by floating CTA |
| `.timer` | `#timer1`, `#timer2` | Countdown display | No class | Yes | JS uses `querySelectorAll('.timer')` |
| `#timer1`, `#timer2` | Timer IDs | Markup anchors | Optional | Helpful | Not required by JS but keep for debugging |
| `butzin_deadline_v1` | `localStorage` key in script | Persistent deadline | **No** | **Yes** | Do not rename key |
| `#order` | Full offer `<section>` | Anchor + IO target | No | Yes | Keep id on section |
| `.btn-cta` | All primary CTAs | Links to checkout | Yes | Href yes | Preserve class on checkout links |
| `.btn-sub` | CTA microcopy | Trust line | Yes | Yes | — |
| `.price-section`, `.price-current`, `.price-save` | Pricing | Offer clarity | Yes | Values yes | — |
| `.guarantee`, `.guarantee-title` | Guarantee card | Trust | Yes | 7-day copy yes | Green success styling only |
| `.reveal` | Many elements | Scroll reveal target | No | Yes | IO adds `.visible` |
| `.visible` | Added by JS | Revealed state | No | Yes | CSS must show content |
| `.faq-q` | FAQ buttons | Accordion control | No | Yes | Must stay `<button type="button">` |
| `aria-expanded` | FAQ buttons | A11y state | No | Yes | Toggled by JS |
| `.faq-body` | FAQ panel | Expand target | No | Yes | JS sets `maxHeight` inline |
| `.open` | FAQ button | Open state | No | Yes | Icon rotation tied to this |
| `#floatingCta` | Fixed bar | Sticky CTA | No | Yes | IO + scroll logic |
| `.floating-cta.show` | Class toggle | Visible state | No | Yes | `transform: translateY(0)` |
| `@media (prefers-reduced-motion: reduce)` | Inline CSS | Motion off | No | Yes | Must remain in funnel CSS |
| `IntersectionObserver` | reveal + floating CTA | Scroll UX | Logic yes | Behavior yes | Threshold 0.07 / 0.1 preserved |
| `AUTHENTICATED_REVIEWS_SLOT` | HTML comment | Future reviews mount | Comment text yes | Slot yes | Replace comment with container in Phase 7 only |

### 3.1 JavaScript dependency map

```
funnel-ui.js (Phase 5D)
├── FAQ accordion (.faq-q, .faq-body, .open, aria-expanded)
├── Floating CTA (#floatingCta, .offer-box:first-of-type, #order)
└── Timer tick (KEY=butzin_deadline_v1, .timer)

funnel-motion.js (Phase 5D)
├── Scroll progress (#scroll-progress)
├── IntersectionObserver (.reveal → .visible)
└── Optional ambient motion (respect prefers-reduced-motion)
```

### 3.2 Progressive enhancement without JS

| Feature | No-JS behavior |
|---|---|
| FAQ | All answers visible OR first answer visible with `<details>` fallback optional in 5D |
| Timer | Show static text „Ограничена оферта“ or last rendered time from SSR-less static fallback |
| Floating CTA | Hidden; inline CTAs remain |
| Reveal | All `.reveal` visible (`opacity: 1`) via CSS default when JS absent |
| Checkout | Links work |

Recommended 5D approach: CSS `@supports` + `html.no-js .reveal { opacity: 1 }` set by tiny inline flag removed after load.

---

## 4. Night Clarity art direction

### 4.1 Core concept

**Night Clarity** expresses the emotional arc of the product: the visitor arrives mentally noisy at night and leaves with a clear, finite plan. Visual language = deep night surfaces, soft indigo intelligence, moon-gold guidance, gradually lighter “dawn” surfaces toward conversion and footer calm.

### 4.2 Emotions

| Layer | Emotion | Visual expression |
|---|---|---|
| Primary | **Relief through clarity** | Open spacing, readable type, explicit steps |
| Secondary | **Quiet confidence** | Restrained glow, no casino urgency |
| Tension (problem sections) | **Recognizable fatigue** | Split imagery, cooler shadows |
| Resolution (offer) | **Calm decisiveness** | Warm gold highlights on price + guarantee |

### 4.3 Visual rhythm (scroll journey)

1. **Deep night** — urgency bar + hero (highest contrast, most atmosphere)
2. **Night with light surface** — short offer on elevated card
3. **Soft dawn gray** — problem recognition (lighter, empathetic)
4. **Clear daybreak panel** — „not your fault“ (widest whitespace)
5. **Structured contrast** — old vs new comparison lanes
6. **Diagram clarity** — mechanism schema (accessible static graphic)
7. **Night return (controlled)** — 14-day timeline on indigo night band
8. **Balanced light** — benefit cards grid
9. **Night climax** — full offer with product composition
10. **Reviews slot** — neutral quiet band (empty until Phase 7)
11. **FAQ** — clean light surface
12. **Footer dusk** — dark calm close

### 4.4 Light, shadow, moon, stars

- **Night background:** layered radial gradients (indigo + violet), not flat `#000`.
- **Shadows:** soft, large blur, low opacity; avoid harsh drop shadows on text.
- **Moon:** use as accent glyph sparingly (urgency bar, footer, CTA icon). Decorative moons `aria-hidden="true"`.
- **Stars:** CSS-only sparse starfield in hero + full offer section only; max 24 visible points; slow drift ≤ 40s; disabled under reduced motion.
- **Gold accent:** price, proof line, guarantee badge outline — never for error states.

### 4.5 Anti-patterns (explicitly forbidden)

Cheap template, clinical hospital UI, meditation-app pastels, childish illustrations, casino flashing, ebook landing cliché, auto-playing audio, fake live notifications, multiple competing countdown systems.

---

## 5. Color tokens

All new tokens should live in `:root` inside `site/css/funnel.css` in Phase 5D. Map legacy vars for transitional compatibility.

### 5.1 Token table

| Token | HEX | Purpose | Allowed pairings | Do not use for |
|---|---|---|---|---|
| `--color-night-950` | `#040711` | Deepest backdrop, footer base | `--color-text`, `--color-moon` accents | Body text on light cards |
| `--color-night-900` | `#060A18` | Hero/footer gradient start | Light text, primary-light, moon | Long form body on its own without muted text |
| `--color-night-800` | `#0A0F24` | Night sections, urgency box | `--color-text`, `--color-primary-light` | Success messages |
| `--color-surface` | `#F7F8FC` | Light section background | `--color-text`, `--color-text-muted` on light = `#5A5A78` | Primary CTA background |
| `--color-surface-elevated` | `#FFFFFF` | Cards, offer boxes | Borders `--color-border`, shadows level 2 | Full-bleed dark hero |
| `--color-primary` | `#6366F1` | Brand indigo, links, focus ring alternate | White text, night backgrounds | Large red-warning areas |
| `--color-primary-light` | `#818CF8` | Headings on dark, hover links | Night 900/800 | Muted paragraph text alone |
| `--color-primary-glow` | `rgba(99,102,241,0.28)` | CTA glow, blob accents | Dark backgrounds only | Text color |
| `--color-moon` | `#F0C420` | Gold highlight, proof, price accent detail | Night backgrounds, `--color-night-900` | Error text |
| `--color-text` | `#1A1A2E` | Body on light surfaces | `--color-surface`, `--color-surface-elevated` | Dark night without sufficient contrast* |
| `--color-text-muted` | `#5A5A78` | Secondary body on light | Light surfaces | Small text on `#818CF8` |
| `--color-text-on-night` | `#F4F6FF` | Body on dark sections | Night 900/800/950 | Light gray cards |
| `--color-text-muted-on-night` | `rgba(244,246,255,0.62)` | Secondary on dark | Night backgrounds | Guarantee text alone |
| `--color-success` | `#27AE60` | Guarantee, savings badge, trust | White or light mint wash `#EEFBF3` | Problem/agitation headlines |
| `--color-danger` | `#E74C3C` | „Без нужда от“ markers, old cycle lane | Night/light with white text icons only | Primary CTA, price |
| `--color-border` | `#E0E0EF` | Light card borders | Light surfaces | — |
| `--color-border-on-night` | `rgba(255,255,255,0.10)` | Dark card borders | Night surfaces | — |
| `--color-focus` | `#F0C420` | `:focus-visible` outline | All interactive elements | Background fills |

\*On night sections always use `--color-text-on-night`, not `--color-text`.

### 5.2 WCAG AA contrast checks (calculated)

| Foreground | Background | Ratio | AA normal (4.5) | AA large (3.0) | Usage |
|---|---|---:|---|---|---|
| `#F4F6FF` | `#060A18` | **16.8:1** | Pass | Pass | Hero body, H1 on night |
| `#F0C420` | `#060A18` | **10.9:1** | Pass | Pass | Proof line, moon accents |
| `#818CF8` | `#060A18` | **6.2:1** | Pass | Pass | Gradient headings on dark |
| `#FFFFFF` | `#6366F1` | **4.6:1** | Pass | Pass | Primary CTA label |
| `#1A1A2E` | `#FFFFFF` | **14.9:1** | Pass | Pass | Body on cards |
| `#5A5A78` | `#FFFFFF` | **5.9:1** | Pass | Pass | Muted copy (upgrade from current `#555577` / `#999`) |
| `#5A5A78` | `#F7F8FC` | **5.7:1** | Pass | Pass | Muted on surface |
| `#27AE60` | `#FFFFFF` | **3.4:1** | Fail normal | Pass large | Use `--color-success` only ≥18px bold or with icon + text |

**Rule:** Success green for guarantee titles uses **16px bold minimum** or pairs with icon; savings pill uses white text on green gradient (pass).

### 5.3 Legacy variable mapping (Phase 5D)

| Legacy | New token |
|---|---|
| `--dark`, `--dark-2`, `--dark-3` | `--color-night-800/900/950` |
| `--primary`, `--primary-2` | `--color-primary`, `--color-primary-light` |
| `--accent` | `--color-moon` |
| `--text`, `--text-light` | `--color-text`, `--color-text-muted` |
| `--green`, `--red` | `--color-success`, `--color-danger` |

---

## 6. Typography scale

Fonts: **Sora** (display), **Inter** (body). Load weights: Sora 600/700/800; Inter 400/500/600/700.

### 6.1 Token definitions

| Role | Font | Weight | Line height | Letter spacing | CSS clamp |
|---|---|---|---|---|---|
| Eyebrow | Sora | 700 | 1.4 | 0.08em | `clamp(11px, 2.4vw, 13px)` |
| H1 | Sora | 800 | 1.12 | -0.02em | `clamp(26px, 5.2vw, 44px)` |
| H2 | Sora | 700 | 1.22 | -0.01em | `clamp(22px, 3.8vw, 32px)` |
| H3 | Sora | 700 | 1.25 | 0 | `clamp(18px, 2.8vw, 22px)` |
| Body large | Inter | 400 | 1.75 | 0 | `clamp(17px, 2.2vw, 19px)` |
| Body | Inter | 400 | 1.78 | 0 | `17px` |
| Small | Inter | 500 | 1.5 | 0.01em | `clamp(12px, 2vw, 14px)` |
| CTA | Sora | 800 | 1.3 | 0.02em | `clamp(16px, 2.5vw, 18px)` |
| Price hero | Sora | 800 | 1.0 | -0.04em | `clamp(44px, 10vw, 62px)` |
| Timer | Sora | 800 | 1.0 | 0.08em | `clamp(28px, 6vw, 36px)` |
| Label | Sora | 700 | 1.4 | 0.12em | `clamp(11px, 2vw, 12px)` |

**H1 rules:**

- Apply `text-wrap: balance; max-width: 18ch` on night hero at mobile to avoid orphan words.
- Limit hero stack so H1 + proof + eyebrow ≤ **70vh** at 390px with mockup below fold optional.
- Minimum computed H1 size **26px** (320px viewport).

### 6.2 Size matrix (computed approximations)

| Viewport | Eyebrow | H1 | H2 | Body | CTA | Price | Timer |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 320 | 11 | 26 | 22 | 17 | 16 | 44 | 28 |
| 375 | 11.5 | 28 | 22.5 | 17 | 16.5 | 48 | 30 |
| 390 | 12 | 29 | 23 | 17 | 17 | 50 | 31 |
| 430 | 12 | 30 | 23.5 | 17 | 17 | 52 | 32 |
| 768 | 13 | 38 | 28 | 17 | 18 | 58 | 34 |
| 1024 | 13 | 42 | 30 | 18 | 18 | 62 | 36 |
| 1440 | 13 | 44 | 32 | 19 | 18 | 62 | 36 |

---

## 7. Spacing and layout tokens

### 7.1 Spacing scale

| Token | Value | Use |
|---|---:|---|
| `--space-1` | 4px | Icon gaps |
| `--space-2` | 8px | Tight inline |
| `--space-3` | 12px | Badge padding y |
| `--space-4` | 16px | Card inner sm |
| `--space-6` | 24px | Stack gap mobile |
| `--space-8` | 32px | Section sub-gap |
| `--space-12` | 48px | Section padding mobile |
| `--space-16` | 64px | Section padding desktop |
| `--space-24` | 96px | Hero vertical padding desktop |

### 7.2 Layout

| Token | Value | Notes |
|---|---|---|
| `--container-max` | `720px` | Main wrap (slight bump from 700 for rhythm) |
| `--container-narrow` | `580px` | Long copy, FAQ |
| `--container-wide` | `1120px` | Hero desktop grid, full offer composition |
| `--prose-max` | `65ch` | **Maximum** paragraph measure |
| `--radius-sm` | 10px | Bez items |
| `--radius-md` | 14px | Buttons, FAQ |
| `--radius-lg` | 20px | Offer cards |
| `--radius-xl` | 24px | Hero mockup |
| `--shadow-1` | `0 4px 20px rgba(10,15,36,0.06)` | Cards light |
| `--shadow-2` | `0 12px 40px rgba(99,102,241,0.18)` | Offer elevation |
| `--shadow-3` | `0 24px 64px rgba(0,0,0,0.45)` | Hero mockup |

### 7.3 Hero grid (desktop ≥1024px)

```
┌─────────────────────────────────────────────┐
│  [copy column 55%]  │  [mockup column 45%] │
│  eyebrow, proof, H1 │   floating mockup     │
│  subtitle, bez×5    │   with glow           │
│  CTA + microcopy    │                       │
└─────────────────────────────────────────────┘
```

Mobile order: eyebrow → proof → H1 → subtitle → CTA → microcopy → mockup (smaller) → bez grid (1 col).

---

## 8. Component system

Each component lists states. All interactive targets ≥ **44×44px**.

### 8.1 Primary CTA (`.btn-cta`)

| State | Visual |
|---|---|
| Default | Indigo gradient, white text, subtle glow shadow |
| Hover | `translateY(-2px)`, brightness +6% |
| Active | `translateY(0)`, shadow inset |
| Focus-visible | 3px `--color-focus` outline offset 2px |
| Disabled | N/A (links) | — |
| Mobile | Full width except floating bar auto width |
| Reduced motion | Remove pulse animation; static shadow |

### 8.2 Secondary CTA

Text button under FAQ or Somniora teaser: indigo text, underline on hover, no gradient fill.

### 8.3 Urgency bar (`.top-bar`)

Height **48px** mobile / **52px** desktop. Left moon icon (decorative). No blink; optional slow shimmer at 6s opacity cycle (disabled reduced motion).

### 8.4 Social proof badge / hero proof (`.hero-proof`)

Moon gold text, no ALL CAPS; sits between eyebrow and H1.

### 8.5 „Без нужда от“ cards (`.bez-item`)

Compact pills with ❌ icon (aria-hidden) + text; danger-tint background; 1 column mobile, 2 col tablet+; exactly **5** items.

### 8.6 Problem cards (`.scene`)

Split layout wrapper `.problem-split`: left „ tired body“ cool gray illustration placeholder; right thought bubbles (`.inner-voice`) on soft indigo wash.

### 8.7 Old vs new comparison (`.highlight-box` → `.compare-lanes`)

Two lanes: `.lane-old` (danger border muted), `.lane-new` (success border muted). Mobile stack old then new with arrow divider ↓.

### 8.8 Mechanism diagram (`.mechanism-diagram`)

Static SVG or CSS flex diagram; text labels readable without animation; provide `aria-label` summary.

### 8.9 14-day timeline (`.step-box`)

Desktop: horizontal stepped rail with 3 nodes. Mobile: vertical timeline with connecting line. Period chips `.step-period` unchanged semantically.

### 8.10 Benefit cards

Replace long checklist with `.benefit-card` grid (2 col tablet, 1 col mobile). Cross-list becomes 5 compact `.without-pill` items (not duplicate hero bez styling).

### 8.11 Product / bonus / price / timer / guarantee

Retain class names; visual refresh only. Short offer shows **collapsed bonus summary** (5 lines) not full duplicate boxes.

### 8.12 FAQ accordion

Open: `.faq-q.open`, icon rotate 45° → ×. Panel height transition max 450ms. Focus ring on button.

### 8.13 Floating CTA (`#floatingCta`)

Height ~72px; hides when either offer intersects; padding-bottom on body compensates. Mobile: stack text above button.

### 8.14 Future review card (Phase 7 spec)

```
.review-card
├── .review-stars (aria-label rating)
├── .review-text
├── .review-meta (Мария П. · date)
└── .verified-badge (only if authenticated)
```

Empty state: **no public message** (per Phase 5B). Loading: skeleton `.review-skeleton` × 3.

### 8.15 Somniora software / Academy / locked / demo badges

- `.somniora-card` — dashboard placeholder illustration
- `.academy-lesson-card` — module list item
- `.locked-content-card` — padlock icon, muted
- `.demo-data-badge` — „Примерен преглед“ for marketing screenshots only

---

## 9. Section-by-section wireframe

### Section 1 — Urgency bar

- Height 48–52px; centered text; moon icon left (hidden text alternative in bar copy).
- Mobile: wrap to 2 lines max; font 13px.
- Timer **not** in bar (avoid double urgency); bar references limited offer only.

### Section 2 — Hero

Elements: eyebrow, proof, H1, subtitle, bez×5, CTA, microcopy, mockup, blobs + optional stars.  
Desktop two-column per §7.3. Mockup max width 400px with glow ring. CTA sticky optional **only desktop** — not in 5D unless tested (risk: overlap).

### Section 3 — Short offer

Compact card: product title, 1-line desc, bonus **summary list** (5 bullets), price row, timer, CTA, guarantee one-liner. Target height < full offer 40%.

### Section 4 — Problem recognition

Headline + intro; two `.scene` cards; blockquote; visual `problem-split` placeholder asset slot #3.

### Section 5 — Not your fault

Light elevated surface `--color-surface`; extra vertical padding `--space-16`; no red accents.

### Section 6 — Old vs new

Comparison lanes per §8.7; assets #4 #5.

### Section 7 — Mechanism

Diagram + highlight box; assets integrated in diagram slot.

### Section 8 — 14-day plan

Dark band `.how-it-works`; timeline per §8.9; asset #6 optional background.

### Section 9 — Benefits

6 benefit cards + 5 without-pills; centered H2.

### Section 10 — Full offer (`#order`)

Night section; left mockup + right stack OR stacked mobile: title → bonuses accordion expandable → value table → price → timer → CTA → delivery → guarantee → Somniora teasers (text + placeholder cards, **no `/somniora` link**).

### Section 11 — Reviews slot

Replace comment in Phase 7 with `<section class="reviews-section" hidden aria-hidden="true">` until data. Design spec only here.

### Section 12 — FAQ

Narrow container; 8 items; plus/minus icon in circle.

### Section 13 — Final CTA + footer

Footer includes medical disclaimer; moon icon decorative; legal links row; optional repeated compact CTA above footer on mobile only.

---

## 10. Asset inventory (current)

Files in `site/brand/` (also in `publish/brand/` after build):

| File | Format | Bytes | Dimensions (usage) | Transparency | Used in | Quality | Replace? | Optimize? |
|---|---|---:|---|---|---|---|---|---|
| `book-mockup-bootzin-14.png` | PNG | ~127 KB | 800×1000 referenced | Opaque | `index.html` hero, `checkout.html` | Good hero asset; large for mobile | Phase 5D: add WebP/AVIF | Yes — target ≤80 KB AVIF |
| `somniora-logo-trim.png` | PNG | ~153 KB | 36×36 display | Yes | Checkout, thank-you | Heavy for small display | Yes — SVG or 64px WebP | Yes — ≤10 KB |
| `guarantee-7-day-banner.png` | PNG | ~107 KB | Unknown | Likely opaque | **Unused** in funnel | Orphan asset | Use in offer/guarantee or archive | Yes if used |
| `/favicon.svg` | SVG | small | Icon | Yes | Tab icon | OK | Optional refresh | Low priority |

---

## 11. Missing asset manifest

Local placeholder components (CSS/SVG only until art ready):

| # | Slot ID | Content | Format | Aspect | Desktop | Mobile | Delivery | Lazy | Alt | Decorative? | Max weight |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `hero-book-mockup` | 14-day book | AVIF/WebP + PNG fallback | 4:5 | 400px wide | 280px | `<picture>` | No (LCP) | Product name | No | 80 KB |
| 2 | `offer-stack-composition` | Book + 5 bonus icons fan | WebP | 16:9 | 560px | 100% width | CSS grid + icons | Yes | „Пакет: книга и 5 бонуса“ | No | 120 KB |
| 3 | `problem-split-tired-awake` | Body tired / mind awake | SVG | 3:2 | 480px | stack | Inline SVG | Yes | „Уморено тяло и буден ум“ | Partial | 15 KB |
| 4 | `cycle-old` | Clock + rumination loop | SVG | 1:1 | 240px | 200px | Inline | Yes | „Стар цикъл“ | No | 10 KB |
| 5 | `cycle-new` | Plan steps calm path | SVG | 1:1 | 240px | 200px | Inline | Yes | „Нов план“ | No | 10 KB |
| 6 | `timeline-14-day` | 3-phase rail illustration | SVG | 16:5 | full width | vertical | Inline | Yes | „План 14 дни в три фази“ | Yes* | 12 KB |
| 7 | `bonus-audio-quiet-evening` | Headphones + moon wave | WebP | 1:1 | 120px thumb | 96px | `<img>` | Yes | „Аудио пакет Тиха вечер“ | No | 25 KB |
| 8 | `somniora-dashboard` | Sleep diary UI mock | WebP | 16:10 | 520px | 100% | `<img>` | Yes | „Somniora Software преглед“ | No | 90 KB |
| 9 | `somniora-academy` | Lesson list mock | WebP | 16:10 | 520px | 100% | `<img>` | Yes | „Somniora Academy“ | No | 90 KB |
| 10 | `guarantee-7-day` | Shield + 7 | WebP/SVG | 3:1 | 360px | 100% | Reuse/refine existing PNG | Yes | „7-дневна гаранция“ | No | 40 KB |
| 11 | `final-offer-composition` | Hero mockup + price badge | WebP | 4:5 | 440px | 300px | `<picture>` | Yes | „Методът на Бутзин оферта“ | No | 100 KB |

\*Timeline SVG decorative if redundant with text steps — mark `aria-hidden="true"` when adjacent text repeats phases.

**Placeholder component pattern (Phase 5D):**

```html
<div class="asset-placeholder asset-placeholder--dashboard" role="img" aria-label="Somniora Software преглед">
  <span class="asset-placeholder__label">Somniora Software</span>
</div>
```

CSS gradient + simple icon; no external placeholder services.

---

## 12. Motion system

### 12.1 Motion tokens

| Token | Value |
|---|---|
| `--motion-fast` | `150ms` |
| `--motion-normal` | `300ms` |
| `--motion-slow` | `600ms` |
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--ease-emphasized` | `cubic-bezier(0.34, 1.56, 0.64, 1)` |

### 12.2 Animation catalog

| Animation | Purpose | Trigger | Duration | Properties | Mobile | Reduced motion | Risk |
|---|---|---|---|---|---|---|---|
| Section reveal | Depth | IO `.reveal` | 600ms | opacity, translateY | Same, shorter distance 16px | Instant visible | Low |
| Hero ambient drift | Night life | load | 16–24s loop | transform blobs | Disable extra blobs | Static background | Medium GPU |
| Stars drift | Atmosphere | load | 30–40s | opacity, translateY | ≤12 stars | Off | Low |
| Mockup float | Product focus | load | 6s | translateY 6px | Subtle 3px | Off | Low |
| CTA glow pulse | Draw attention | hover only (not infinite) | 2.8s | box-shadow | Hover tap | Off | Low |
| Card hover | Affordance | hover | 200ms | translateY, shadow | Active state on tap | No transform | Low |
| Old/new progression | Explain cycle | scroll into view | 800ms staged | opacity stagger | Vertical | Static diagram | Low |
| Timeline progress | Phase focus | scroll | 500ms | scale node | Vertical | Static | Low |
| Bonus reveal | Offer delight | IO stagger | 400ms + 120ms | opacity | Same | Instant | Low |
| Timer emphasis | Time awareness | 1Hz tick | 150ms | color opacity only | Same | No pulse | Low |
| FAQ transition | Expand | click | 450ms | max-height | Same | Instant open | Medium reflow |
| Floating CTA entrance | Conversion | scroll | 400ms | translateY | Same | Instant show | Low |
| Somniora dashboard | Teaser | hover | 300ms | translateX | None | Off | Low |

**Global rules:** transform + opacity only; no scroll-jacking; no animation library; max 2 looping ambient effects visible; emoji not animated.

---

## 13. CSS architecture (Phase 5D plan)

Proposed file: `site/css/funnel.css`

Structure:

```
1. tokens (colors, type, space, motion)
2. reset + base
3. utilities (container, prose, sr-only)
4. layout sections
5. components
6. responsive overrides
7. prefers-reduced-motion
8. print (optional)
```

Extract all inline `<style>` from `index.html`. Keep critical tiny inline optional:

- `html.no-js` reveal fallback (≤15 lines) OR zero inline if CSS `:target` fallback unused.

Link order in `index.html`:

```html
<link rel="stylesheet" href="/css/funnel.css">
```

FOUC prevention: single CSS file, preload optional:

```html
<link rel="preload" href="/css/funnel.css" as="style">
```

Do **not** rename protected classes in §3 without updating JS.

---

## 14. JavaScript architecture (Phase 5D plan)

| File | Responsibility |
|---|---|
| `site/js/funnel-ui.js` | FAQ, timer, floating CTA |
| `site/js/funnel-motion.js` | scroll progress, IntersectionObserver reveals, ambient motion init |

Load order:

```html
<script src="/site-config.js"></script>
<script defer src="/js/funnel-ui.js"></script>
<script defer src="/js/funnel-motion.js"></script>
```

Both defer; UI before motion. If motion fails, UI still works.

Timer logic unchanged including `localStorage` key **`butzin_deadline_v1`**.

FAQ must keep `aria-expanded` toggling and `.faq-body` maxHeight pattern (or migrate to CSS grid 0fr/1fr with same class hooks).

---

## 15. Responsive matrix

| Section | ≥1440 | 1024–1439 | 768–1023 | 430–767 | 320–429 |
|---|---|---|---|---|---|
| Urgency bar | single row | single row | single row | wrap 2 lines | wrap 2 lines |
| Hero | 2-col grid | 2-col | 1-col, mockup 320px | mockup below CTA | mockup 260px |
| Short offer | compact card 720px | same | same | full bleed padding | stack |
| Problem | split 50/50 | split | stack visual first | stack | stack |
| Old/new | 2 lanes side | 2 lanes | stack | stack | stack |
| Mechanism | diagram horizontal | same | vertical steps | vertical | vertical |
| Timeline | horizontal rail | horizontal | vertical | vertical | vertical |
| Benefits | 3×2 grid | 2×3 grid | 2 col | 1 col | 1 col |
| Full offer | 2-col composition | stack mockup top | stack | stack | stack |
| FAQ | narrow 580px | same | same | full width | full width |
| Floating CTA | inline button | inline | stacked | stacked | stacked |

**Tap targets:** all buttons/links min 44×44px. **Overflow:** no horizontal scroll; tables become stacked cards under 520px.

---

## 16. Accessibility requirements

- WCAG **AA** contrast per §5.2.
- One `<h1>` in hero only; section headings `<h2>`, sub `<h3>`.
- Keyboard: FAQ buttons tabbable; focus order follows visual order.
- Visible `:focus-visible` with `--color-focus`.
- Decorative emojis: `aria-hidden="true"`; meaningful text adjacent.
- Reviews: verified badge only with real auth data.
- No information by color alone (old/new lanes also labeled).
- Site usable without JS: links, readable FAQ content strategy documented in §3.2.
- Images: width/height always set; meaningful alt unless decorative.

---

## 17. Performance budgets

| Metric | Target (mobile 4G) | Notes |
|---|---|---|
| LCP | ≤ **2.5s** | Hero mockup AVIF + preload |
| CLS | ≤ **0.05** | Reserved mockup space |
| INP | ≤ **200ms** | Defer motion JS |
| Hero images total | ≤ **120 KB** transferred | AVIF primary |
| Funnel CSS | ≤ **35 KB** gzip | Single file |
| Funnel JS (ui+motion) | ≤ **8 KB** gzip | No libraries |
| Font transfer | ≤ **90 KB** woff2 subset | Self-host Phase 5D+ |
| blur/backdrop filters | ≤ **3** simultaneous | Disable extra on mobile |

**Font strategy:** `font-display: swap`; preload Sora 700 + Inter 400 only.

---

## 18. Conversion UX

### CTA map (unchanged targets)

| Location | Role | Label direction |
|---|---|---|
| Hero | Primary intent | „🌙 Искам ясен план за вечерта“ |
| Short offer | Fast buyer | Shorter checkout-oriented line OK |
| Full offer | Convinced reader | Keep current long CTA |
| Floating | Persistent | Compact „Искам плана“ |

Rules:

- Short offer appears once early; full offer repeats bonuses + table later — **not** duplicate full bonus blocks early.
- Floating CTA hidden when offer sections visible; body padding-bottom 88px preserved.
- Single timer mechanism (`butzin_deadline_v1`) in offer sections only.
- Somniora teasers increase value; no links to `/somniora` until page exists.
- Reviews render only when authenticated approved records exist (Phase 7).

Forbidden: fake counters, live notifications, fake verified badges, second countdown system.

---

## 19. Risks

| Risk | Mitigation |
|---|---|
| Breaking timer/FAQ/floating CTA during CSS split | Protected selector table + keep JS hooks |
| Checkout visual drift from funnel | Document shared tokens; don’t edit checkout in 5D |
| LCP regression from motion/blur | Budget + reduced effects on mobile |
| Accessibility contrast on green savings | White-on-green pills for small text |
| Short offer still too heavy | Enforce bonus summary pattern in 5D |
| Orphan `guarantee-7-day-banner.png` | Integrate or remove in asset pass |
| Social proof evidence gap | Design only; no new claims |

---

## 20. Exact files planned for Phase 5D

| File | Action |
|---|---|
| `site/css/funnel.css` | **Create** — full design system |
| `site/js/funnel-ui.js` | **Create** — extract UI logic |
| `site/js/funnel-motion.js` | **Create** — extract motion logic |
| `site/index.html` | **Modify** — link external assets; markup enhancements |
| `site/brand/*` | **Add/optimize** — WebP/AVIF variants |
| `scripts/verify-phase5d.mjs` | **Create** — protect hooks + budgets |
| `docs/PHASE-5D-IMPLEMENTATION-REPORT.md` | **Create** — post-implementation |

**Not in Phase 5D scope:** `checkout.html`, `checkout.css`, `site-config.js`, Netlify functions, reviews backend, `/somniora` page.

---

## 21. Phase 5D implementation order

1. Create `funnel.css` tokens + base; link from index without removing inline yet (parallel safe — optional).
2. Extract JS to `funnel-ui.js`; verify timer/FAQ/floating CTA.
3. Extract motion to `funnel-motion.js`; verify reveal + reduced motion.
4. Remove inline `<style>`/`<script>` once parity confirmed.
5. Implement hero grid + Night Clarity backgrounds.
6. Redesign short offer compact layout.
7. Problem split + comparison lanes + mechanism diagram (placeholders OK).
8. Timeline horizontal/vertical responsive.
9. Benefit cards grid.
10. Full offer composition + Somniora teasers.
11. FAQ visual refresh.
12. Footer + floating CTA polish.
13. Asset optimization pass (AVIF/WebP).
14. Add `verify-phase5d.mjs`; run QA + Lighthouse mobile.

---

## 22. Definition of Done (future visual implementation)

Phase 5D is complete when:

- [ ] All §3 protected hooks work identically (timer key, FAQ ARIA, floating CTA, checkout links, `#order`).
- [ ] `node scripts/verify-phase5b.mjs` still passes (content locks).
- [ ] New `verify-phase5d.mjs` passes (design hooks + performance guards).
- [ ] Night Clarity tokens applied across all funnel sections.
- [ ] WCAG AA spot-check documented for hero, CTA, body, FAQ.
- [ ] Mobile 320px manual pass: no horizontal scroll, tap targets ≥44px.
- [ ] `prefers-reduced-motion`: no infinite animations.
- [ ] LCP element optimized with `<picture>` + dimensions.
- [ ] No fake reviews/urgency added.
- [ ] Checkout untouched.
- [ ] Implementation report committed.

---

## Appendix A — Future surfaces (design-only notes)

### Authenticated reviews (Phase 7)

- Section mounts at `AUTHENTICATED_REVIEWS_SLOT`.
- Card layout per §8.14; empty = render nothing (no „coming soon“).
- Public identity: first name + surname initial only.

### Public Somniora page (future phase)

- Route `/somniora` not linked until live.
- Reuse `--color-night-*`, Somniora dashboard asset #8, Academy asset #9.
- Showcase Software features with Bulgarian labels from OFFER-DECISION.

### Checkout compatibility

Align funnel CTA colors with checkout trust palette only at token documentation level; implementation optional later.

---

*End of Phase 5C blueprint.*
