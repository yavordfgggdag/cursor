/**
 * Phase 5B: funnel copy alignment checks for site/index.html
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const indexPath = path.join(root, 'site', 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');

const protectedPaths = [
  'site/checkout.html',
  'site/checkout.css',
  'site/js/checkout.js',
  'site/thank-you.html',
  'site/js/thank-you.js',
  'site/site-config.js',
  'netlify.toml',
  'package.json',
];

function visibleText(source) {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '\n');
}

function heroSection(source) {
  const m = source.match(/<section class="hero">[\s\S]*?<\/section>/i);
  return m ? m[0] : '';
}

function countStandaloneLongDashes(text) {
  let em = (text.match(/\s—\s/g) || []).length;
  em += (text.match(/^—\s*/gm) || []).length;
  em += (text.match(/\s—$/gm) || []).length;
  let en = (text.match(/\s–\s/g) || []).length;
  en += (text.match(/^–\s*/gm) || []).length;
  return em + en;
}

const visible = visibleText(html);
const hero = heroSection(html);
const heroVisible = visibleText(hero);
const failures = [];

function fail(msg) {
  failures.push(msg);
}

// 1–3 Hero essentials
if (!heroVisible.includes('пълнолетни')) fail('Hero missing "пълнолетни"');
if (!heroVisible.includes('над 1,000')) fail('Hero missing "над 1,000"');
if (!heroVisible.includes('Системата Легло–Сън')) fail('Hero missing "Системата Легло–Сън"');

// 4 Exactly five hero bez items
const bezCount = (hero.match(/class="bez-item"/g) || []).length;
if (bezCount !== 5) fail(`Expected 5 hero bez-item entries, found ${bezCount}`);

// 5 Forbidden phrases in visible text
const forbidden = [
  '1–2 часа',
  '1-2 часа',
  'перфектна тъмна',
  'перфектна тиха',
  'перфектна хладна',
  'перфектна среда',
  'дихателни техники, спиращи',
  'спират след два дни',
  'сложен вечерен ритуал',
  'сложни ритуали',
];
for (const phrase of forbidden) {
  if (visible.toLowerCase().includes(phrase.toLowerCase())) {
    fail(`Forbidden visible phrase found: ${phrase}`);
  }
}

// 6 Latin artifacts
const artifacts = ['spali', 'izmoreni', 'Leglo', 'Sun', 'buden', 'um '];
for (const word of artifacts) {
  const re = new RegExp(`\\b${word}\\b`, 'i');
  if (re.test(visible)) fail(`Latin artifact found: ${word}`);
}

// 7 Standalone dashes (allowed compound forms remain in visible text)
if (countStandaloneLongDashes(visible) > 0) {
  fail('Standalone em/en dash found in visible text');
}

// 8 Allowed forms should remain possible (informational only)
const allowedForms = ['14-дневен', '7-дневна', '30-дневна', 'Легло–Сън'];
for (const form of allowedForms) {
  if (!html.includes(form)) fail(`Expected allowed form missing in HTML: ${form}`);
}

// 9 Placeholder review names (visible only)
for (const name of ['Мария', 'Георги', 'Силвия', 'Красимир']) {
  if (visible.includes(name)) fail(`Placeholder review name visible: ${name}`);
}

// 10 Reviews slot comment
if (!html.includes('AUTHENTICATED_REVIEWS_SLOT')) {
  fail('Missing AUTHENTICATED_REVIEWS_SLOT comment');
}

// 11–13 Unsupported claims
if (visible.includes('повечето хора усещат')) fail('Found "повечето хора усещат"');
if (visible.includes('резултатите са трайни')) fail('Found "резултатите са трайни"');
if (/финансов интерес|не продава чай|гурута за продуктивност/i.test(visible)) {
  fail('Wellness-industry accusation language still visible');
}

// 14 Five bonuses (two offer blocks)
const bonusTitles = [...html.matchAll(/Бонус ([1-5]):/g)].map((m) => m[1]);
if (bonusTitles.length < 5) fail(`Expected at least 5 bonus entries, found ${bonusTitles.length}`);

// 15 Offer numbers
if (!/17[,\.]?\s*0*\s*€|17\s*€/.test(visible)) fail('Missing price 17 €');
if (!visible.includes('149,40 €') && !visible.includes('149,40')) fail('Missing value 149,40 €');
if (!visible.includes('132,40')) fail('Missing savings 132,40 €');
if (!visible.includes('89%')) fail('Missing 89% discount');
if (!/7 дни|7-дневна/i.test(visible)) fail('Missing 7-day guarantee wording');

// 17 Timer key
if (!html.includes('butzin_deadline_v1')) fail('Timer key butzin_deadline_v1 missing');

// 18 FAQ accessibility
const faqButtons = html.match(/class="faq-q"/g) || [];
const ariaButtons = html.match(/class="faq-q"[^>]*aria-expanded="/g) || [];
if (faqButtons.length === 0 || faqButtons.length !== ariaButtons.length) {
  fail('FAQ buttons must use aria-expanded');
}

// 19 No /somniora links
if (html.includes('/somniora')) fail('Found forbidden /somniora link');

// 20 Protected files unchanged vs HEAD
try {
  const diff = execSync('git diff --name-only HEAD', { encoding: 'utf8' }).trim();
  const changed = diff ? diff.split(/\r?\n/).filter(Boolean) : [];
  const allowed = new Set([
    'site/index.html',
    'docs/OFFER-DECISION.md',
    'docs/PHASE-5B-CONTENT-REPORT.md',
    'scripts/verify-phase5b.mjs',
    '.gitignore',
  ]);
  for (const file of changed) {
    if (protectedPaths.includes(file.replace(/\\/g, '/'))) {
      fail(`Protected file modified: ${file}`);
    }
    if (!allowed.has(file.replace(/\\/g, '/'))) {
      fail(`Unexpected modified file: ${file}`);
    }
  }
} catch (err) {
  fail(`Could not verify git diff: ${err.message}`);
}

if (failures.length) {
  console.error('Phase 5B verification FAILED:\n');
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}

console.log('Phase 5B verification passed (20 checks).');
