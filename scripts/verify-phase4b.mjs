/**
 * Phase 4B: corrected dash rules + product name restore.
 * Only flags standalone em/en dashes, not grammatical hyphens or Легло–Сън.
 */
import fs from 'fs';
import path from 'path';

const root = path.join(process.cwd(), 'site');
const pages = [
  'index.html',
  'checkout.html',
  'thank-you.html',
  'privacy.html',
  'terms.html',
  'refund.html',
  'contact.html',
];

const jsMessages = [
  path.join(root, 'js', 'checkout.js'),
  path.join(root, 'js', 'thank-you.js'),
  path.join(root, 'site-config.js'),
];

function visibleText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '\n');
}

function metaAndA11y(html) {
  const parts = [];
  for (const m of html.matchAll(/<(title|meta)[^>]+>/gi)) parts.push(m[0]);
  for (const m of html.matchAll(/\b(alt|aria-label|placeholder)="([^"]*)"/gi)) parts.push(m[2]);
  return parts.join('\n');
}

function jsUserStrings(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const strings = [];
  for (const m of src.matchAll(/'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"/g)) {
    strings.push(m[1] ?? m[2]);
  }
  return strings.join('\n');
}

/** Standalone long dashes used as sentence separators or line-start attribution */
function countStandaloneLongDashes(text) {
  let em = 0;
  let en = 0;

  // Em dash: surrounded by spaces, or line-start before name
  em += (text.match(/\s—\s/g) || []).length;
  em += (text.match(/^—\s*/gm) || []).length;
  em += (text.match(/\s—$/gm) || []).length;

  // En dash: standalone separators (not Легло–Сън compound name)
  const enMatches = text.match(/\s–\s/g) || [];
  en += enMatches.length;
  en += (text.match(/^–\s*/gm) || []).length;

  return { em, en };
}

function collectVisibleBundle() {
  let bundle = '';
  for (const file of pages) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    bundle += visibleText(html) + '\n' + metaAndA11y(html) + '\n';
  }
  for (const fp of jsMessages) {
    if (fs.existsSync(fp)) bundle += jsUserStrings(fp) + '\n';
  }
  return bundle;
}

const bundle = collectVisibleBundle();
const dashes = countStandaloneLongDashes(bundle);

const allowedGrammatical = {
  '14-днев': (bundle.match(/14-днев/gi) || []).length,
  '7-днев': (bundle.match(/7-днев/gi) || []).length,
  '30-днев': (bundle.match(/30-днев/gi) || []).length,
  'по-': (bundle.match(/по-[а-я]/gi) || []).length,
  'д-р': (bundle.match(/д-р/gi) || []).length,
  'най-скоро': (bundle.match(/най-скоро/gi) || []).length,
  'Легло–Сън': (bundle.match(/Легло–Сън/g) || []).length,
};

const allHtml = pages.map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');

const checks = {
  price17: /17[,\.]00?\s*€|17\s*€/.test(allHtml),
  value149: allHtml.includes('149,40') || allHtml.includes('149.40'),
  save132: allHtml.includes('132,40') || allHtml.includes('132.40'),
  pct89: allHtml.includes('89%'),
  guarantee7: /гаранция за 7 дни/i.test(allHtml),
  checkoutLinks: (allHtml.match(/href="\/checkout"/g) || []).length >= 3,
  timerKey: allHtml.includes('butzin_deadline_v1'),
  claim1000: /над 1,000|над 1\.000|над 1000/i.test(allHtml),
  old432: allHtml.includes('432'),
  old415: allHtml.includes('415'),
  productName: allHtml.includes('14-дневен план'),
  bonuses5: (allHtml.match(/Бонус [1-5]/g) || []).length >= 5,
  reviews4: (allHtml.match(/class="testimonial"/g) || []).length >= 4,
};

const pass =
  dashes.em === 0 &&
  dashes.en === 0 &&
  checks.price17 &&
  checks.value149 &&
  checks.save132 &&
  checks.claim1000 &&
  !checks.old432 &&
  !checks.old415;

console.log(
  JSON.stringify(
    {
      dashTest: {
        standaloneEmDash: dashes.em,
        standaloneEnDash: dashes.en,
        allowedGrammatical,
        pass: dashes.em === 0 && dashes.en === 0,
      },
      contentChecks: checks,
      overallPass: pass,
    },
    null,
    2,
  ),
);

process.exit(pass ? 0 : 1);
