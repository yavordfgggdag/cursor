/**
 * Phase 5D: design hooks, protected functionality, asset/performance guards.
 * Source: docs/PHASE-5C-DESIGN-BLUEPRINT.md §§3, 17, 21.13–21.14, 22.
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { execSync } from 'child_process';

const root = process.cwd();
const siteDir = path.join(root, 'site');
const publishDir = path.join(root, 'publish');
const indexPath = path.join(siteDir, 'index.html');
const cssPath = path.join(siteDir, 'css', 'funnel.css');
const uiPath = path.join(siteDir, 'js', 'funnel-ui.js');
const motionPath = path.join(siteDir, 'js', 'funnel-motion.js');

const html = fs.readFileSync(indexPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const ui = fs.readFileSync(uiPath, 'utf8');
const motion = fs.readFileSync(motionPath, 'utf8');

const failures = [];
const notes = [];

function fail(msg) {
  failures.push(msg);
}

function note(msg) {
  notes.push(msg);
}

function gzipSize(filePath) {
  return zlib.gzipSync(fs.readFileSync(filePath), { level: 9 }).length;
}

function extractFigure(source, className) {
  const re = new RegExp(
    `<figure[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>[\\s\\S]*?<\\/figure>`,
    'i',
  );
  const m = source.match(re);
  return m ? m[0] : '';
}

function walkHtml(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, ent.name);
    if (ent.isDirectory()) walkHtml(fp, out);
    else if (ent.name.endsWith('.html')) out.push(fp);
  }
  return out;
}

function gitChanged(range, extraArgs = '') {
  const cmd = `git diff --name-only ${range} ${extraArgs}`.trim();
  const out = execSync(cmd, { encoding: 'utf8', cwd: root }).trim();
  return out ? out.split(/\r?\n/).filter(Boolean) : [];
}

const protectedPaths = [
  'site/checkout.html',
  'site/checkout.css',
  'site/js/checkout.js',
  'site/thank-you.html',
  'site/js/thank-you.js',
  'site/site-config.js',
  'netlify.toml',
];

// --- 1. Split files + load order ------------------------------------------------
if (!html.includes('href="/css/funnel.css"')) fail('index.html must link /css/funnel.css');
if (!html.includes('src="/js/funnel-ui.js"')) fail('index.html must load /js/funnel-ui.js');
if (!html.includes('src="/js/funnel-motion.js"')) fail('index.html must load /js/funnel-motion.js');
if (!html.includes('src="/site-config.js"')) fail('index.html must load /site-config.js');

const uiPos = html.indexOf('src="/js/funnel-ui.js"');
const motionPos = html.indexOf('src="/js/funnel-motion.js"');
if (uiPos < 0 || motionPos < 0 || uiPos > motionPos) {
  fail('funnel-ui.js must load before funnel-motion.js');
}

if (/<style[\s>]/i.test(html)) fail('index.html still has an inline <style> block');
if (/<script(?![^>]*\bsrc=)/i.test(html)) fail('index.html still has an inline <script> block');

// --- 2. Protected hooks ---------------------------------------------------------
for (const hook of [
  'id="scroll-progress"',
  'class="hero"',
  'class="top-bar"',
  'id="order"',
  'id="timer1"',
  'id="timer2"',
  'id="floatingCta"',
  'AUTHENTICATED_REVIEWS_SLOT',
]) {
  if (!html.includes(hook)) fail(`Missing hook ${hook}`);
}

const checkoutLinks = html.match(/href="\/checkout"/g) || [];
if (checkoutLinks.length < 3) {
  fail(`Expected at least 3 href="/checkout" in index.html, found ${checkoutLinks.length}`);
}

const firstOffer = html.match(/class="[^"]*\boffer-box\b[^"]*"/);
if (!firstOffer || !firstOffer[0].includes('offer-box--compact')) {
  fail('First .offer-box must stay offer-box--compact (floating CTA target)');
}
if ((html.match(/class="[^"]*\boffer-box\b[^"]*"/g) || []).length < 2) {
  fail('Expected two .offer-box instances (short + full)');
}

if (!html.includes('id="order"') || !/<section[^>]*id="order"/.test(html)) {
  fail('#order must remain on the full-offer <section>');
}

if ((html.match(/class="[^"]*\btimer\b[^"]*"/g) || []).length < 2) {
  fail('Expected .timer on both offer countdowns');
}

if (!ui.includes('butzin_deadline_v1')) fail('Timer key butzin_deadline_v1 missing from funnel-ui.js');
if (!ui.includes("getElementById('floatingCta')")) fail('funnel-ui.js must observe #floatingCta');
if (!ui.includes("querySelector('.offer-box')")) fail('funnel-ui.js must observe the first .offer-box');
if (!ui.includes("getElementById('order')")) fail('funnel-ui.js must observe #order');
if (!ui.includes('threshold: 0.1')) fail('Floating CTA IntersectionObserver threshold 0.1 missing');
if (!motion.includes("getElementById('scroll-progress')")) fail('funnel-motion.js must drive #scroll-progress');
if (!motion.includes('threshold: 0.07')) fail('Reveal IntersectionObserver threshold 0.07 missing');
if (!motion.includes(".reveal") || !motion.includes('visible')) {
  fail('funnel-motion.js must map .reveal → .visible');
}

if (!css.includes('.floating-cta.show') || !css.includes('translateY(0)')) {
  fail('.floating-cta.show must use transform: translateY(0)');
}
if (!css.includes('padding-bottom: 88px')) fail('body padding-bottom 88px missing');
if (!css.includes('prefers-reduced-motion')) fail('funnel.css missing prefers-reduced-motion');

if (html.includes('/somniora')) fail('Found forbidden /somniora path in index.html');

// --- 3. FAQ accessibility (buttons, not details) --------------------------------
const faqSectionMatch = html.match(/<!-- ЧЗВ -->[\s\S]*?<!-- FOOTER -->/);
const faq = faqSectionMatch ? faqSectionMatch[0] : '';
if (!faq) fail('FAQ section markers missing');
if (faq.includes('<details')) fail('FAQ must keep button accordion; do not convert to <details>');

const faqButtons = faq.match(/<button[^>]*class="[^"]*\bfaq-q\b[^"]*"[^>]*>/g) || [];
const faqAria = faqButtons.filter((b) => /aria-expanded=/.test(b) && /type="button"/.test(b));
if (faqButtons.length !== 8) fail(`Expected 8 FAQ buttons, found ${faqButtons.length}`);
if (faqAria.length !== faqButtons.length) fail('Every .faq-q must be type="button" with aria-expanded');
if ((faq.match(/class="faq-body"/g) || []).length !== 8) fail('Expected 8 .faq-body panels');
if (!ui.includes("setAttribute('aria-expanded'") || !ui.includes('maxHeight')) {
  fail('FAQ JS must toggle aria-expanded and .faq-body maxHeight');
}
if (!css.includes('--container-narrow') || !css.includes('.faq-section')) {
  fail('FAQ visual refresh hooks (.faq-section / --container-narrow) missing');
}

// --- 4. Design-system presence --------------------------------------------------
for (const token of [
  '--color-night-950',
  '--color-night-900',
  '--color-night-800',
  '--color-focus',
  '--color-moon',
  '--container-wide',
  '--container-narrow',
]) {
  if (!css.includes(`${token}:`) && !css.includes(`${token}: `)) {
    if (!css.includes(token)) fail(`Night Clarity token ${token} missing`);
  }
}

for (const hook of [
  'hero-product',
  'offer-box--compact',
  'offer-composition',
  'offer-bonuses',
  'problem-split',
  'compare-lanes',
  'mechanism-diagram',
  'benefit-grid',
  'without-pill',
  'somniora-card',
  'academy-lesson-card',
  'faq-section',
  'site-footer',
  'class="timeline"',
]) {
  if (!html.includes(hook) && !css.includes(hook)) {
    fail(`Design hook ${hook} missing`);
  }
}
if ((html.match(/class="bez-item"/g) || []).length !== 5) {
  fail('Hero must keep exactly 5 .bez-item entries');
}

// --- 5. §21.13 assets + LCP -----------------------------------------------------
const brand = {
  png: path.join(siteDir, 'brand', 'book-mockup-bootzin-14.png'),
  webp: path.join(siteDir, 'brand', 'book-mockup-bootzin-14.webp'),
  avif: path.join(siteDir, 'brand', 'book-mockup-bootzin-14.avif'),
};
for (const [label, fp] of Object.entries(brand)) {
  if (!fs.existsSync(fp)) fail(`Missing book mockup ${label}: ${path.relative(root, fp)}`);
}

const avifBytes = fs.existsSync(brand.avif) ? fs.statSync(brand.avif).size : Infinity;
if (avifBytes > 80 * 1024) fail(`Hero AVIF exceeds 80 KB budget (${avifBytes} bytes)`);
if (avifBytes > 120 * 1024) fail(`Hero AVIF exceeds 120 KB transfer budget (${avifBytes} bytes)`);

const heroFig = extractFigure(html, 'hero-product');
const offerFig = extractFigure(html, 'offer-product');
if (!heroFig) fail('Missing <figure class="hero-product">');
if (!offerFig) fail('Missing <figure class="offer-product">');

function assertPicture(label, block, { lazy, fetchPriority }) {
  if (!block.includes('<picture>')) fail(`${label} must use <picture>`);
  if (!block.includes('type="image/avif"') || !block.includes('book-mockup-bootzin-14.avif')) {
    fail(`${label} missing AVIF source`);
  }
  if (!block.includes('type="image/webp"') || !block.includes('book-mockup-bootzin-14.webp')) {
    fail(`${label} missing WebP source`);
  }
  if (!block.includes('src="/brand/book-mockup-bootzin-14.png"')) {
    fail(`${label} must keep PNG fallback on <img>`);
  }
  if (!/width="800"/.test(block) || !/height="1000"/.test(block)) {
    fail(`${label} must keep width="800" height="1000"`);
  }
  if (!block.includes('Методът на Бутзин: 14-дневен план за по-спокойно заспиване')) {
    fail(`${label} missing product alt`);
  }
  if (lazy && !block.includes('loading="lazy"')) fail(`${label} must be loading="lazy"`);
  if (!lazy && block.includes('loading="lazy"')) fail(`${label} must not use loading="lazy"`);
  if (fetchPriority && !block.includes('fetchpriority="high"')) {
    fail(`${label} must use fetchpriority="high"`);
  }
}

assertPicture('Hero mockup', heroFig, { lazy: false, fetchPriority: true });
assertPicture('Offer mockup', offerFig, { lazy: true, fetchPriority: false });

if (!/rel="preload"[^>]+book-mockup-bootzin-14\.avif/.test(html)) {
  fail('Missing AVIF preload for LCP mockup');
}

const placeholderNeeded = [
  'asset-placeholder--dashboard',
  'asset-placeholder--academy',
  'aria-label="Somniora Software преглед"',
  'aria-label="Somniora Academy"',
];
for (const token of placeholderNeeded) {
  if (!html.includes(token)) fail(`Missing placeholder/asset hook ${token}`);
}

const checkoutHtml = fs.readFileSync(path.join(siteDir, 'checkout.html'), 'utf8');
if (checkoutHtml.includes('<picture>')) {
  fail('checkout.html should stay on PNG (Phase 5D does not restyle checkout)');
}
if (!checkoutHtml.includes('/brand/book-mockup-bootzin-14.png')) {
  fail('checkout.html lost its PNG book mockup reference');
}

// --- 6. Image references (no broken paths) --------------------------------------
const refRe = /(?:src|srcset|href)="([^"]+\.(?:png|jpe?g|webp|avif|svg))"/gi;
let refCount = 0;
for (const file of walkHtml(siteDir)) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(refRe)) {
    const url = m[1];
    if (/^https?:\/\//i.test(url)) continue;
    refCount += 1;
    const rel = url.replace(/^\//, '');
    if (!fs.existsSync(path.join(siteDir, rel))) {
      fail(`Broken image reference in ${path.relative(root, file)}: ${url}`);
    }
  }
}
if (refCount === 0) fail('No image references found under site/');

// --- 7. Performance budgets (static) --------------------------------------------
const cssGz = gzipSize(cssPath);
const jsGz = gzipSize(uiPath) + gzipSize(motionPath);
if (cssGz > 35 * 1024) fail(`funnel.css gzip ${cssGz} exceeds 35 KB`);
if (jsGz > 8 * 1024) fail(`funnel-ui + funnel-motion gzip ${jsGz} exceeds 8 KB`);

const backdrop = (css.match(/(?<!-)backdrop-filter\s*:/g) || []).length;
if (backdrop > 3) fail(`More than 3 backdrop-filter declarations (${backdrop})`);

if (!html.includes('display=swap') && !css.includes('font-display: swap')) {
  note('Fonts are still Google-hosted; self-host is Phase 5D+ and is not a 5D gate.');
}

// --- 8. Locked offer numbers + no fake reviews ---------------------------------
if (!html.includes('149,40') || !html.includes('132,40') || !html.includes('89%')) {
  fail('Locked offer numbers 149,40 / 132,40 / 89% missing');
}
if (!/17[,\.]?\s*0*\s*€|17\s*€/.test(html)) fail('Locked price 17 € missing');

const visible = html
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<[^>]+>/g, '\n');
for (const name of ['Мария', 'Георги', 'Силвия', 'Красимир']) {
  if (visible.includes(name)) fail(`Placeholder review name visible: ${name}`);
}

// --- 9. Checkout / protected files vs base --------------------------------------
try {
  const dirtyProtected = gitChanged('HEAD', '-- ' + protectedPaths.join(' '));
  for (const file of dirtyProtected) fail(`Protected file dirty vs HEAD: ${file}`);

  let baseDiff = [];
  try {
    execSync('git rev-parse --verify origin/design/phase-5c-blueprint', {
      encoding: 'utf8',
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    baseDiff = gitChanged('origin/design/phase-5c-blueprint...HEAD', '-- ' + protectedPaths.join(' '));
  } catch {
    note('origin/design/phase-5c-blueprint not available; skipped base-branch checkout drift check.');
  }
  for (const file of baseDiff) fail(`Protected file changed vs Phase 5C base: ${file}`);
} catch (err) {
  fail(`Could not verify protected git paths: ${err.message}`);
}

// --- 10. Source / publish parity ------------------------------------------------
if (!fs.existsSync(publishDir)) {
  fail('publish/ missing — run SKIP_SOMNIORA=1 node scripts/build-with-somniora.mjs');
} else {
  const parity = [
    'index.html',
    path.join('css', 'funnel.css'),
    path.join('js', 'funnel-ui.js'),
    path.join('js', 'funnel-motion.js'),
    path.join('brand', 'book-mockup-bootzin-14.png'),
    path.join('brand', 'book-mockup-bootzin-14.webp'),
    path.join('brand', 'book-mockup-bootzin-14.avif'),
  ];
  for (const rel of parity) {
    const src = path.join(siteDir, rel);
    const dest = path.join(publishDir, rel);
    if (!fs.existsSync(dest)) {
      fail(`publish is missing ${rel}`);
      continue;
    }
    const a = fs.readFileSync(src);
    const b = fs.readFileSync(dest);
    if (!a.equals(b)) fail(`publish/${rel} does not match site/${rel}`);
  }

  for (const file of walkHtml(publishDir)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(refRe)) {
      const url = m[1];
      if (/^https?:\/\//i.test(url)) continue;
      const rel = url.replace(/^\//, '');
      if (!fs.existsSync(path.join(publishDir, rel))) {
        fail(`Broken publish image reference in ${path.relative(root, file)}: ${url}`);
      }
    }
  }
}

if (failures.length) {
  console.error('Phase 5D verification FAILED:\n');
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}

console.log('Phase 5D verification passed.');
console.log(
  JSON.stringify(
    {
      checkoutLinks: checkoutLinks.length,
      faqButtons: faqButtons.length,
      imageRefs: refCount,
      gzip: {
        cssBytes: cssGz,
        jsBytes: jsGz,
        avifBytes,
      },
      notes,
    },
    null,
    2,
  ),
);
