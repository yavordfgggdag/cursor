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

function visibleText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '\n');
}

function metaText(html) {
  const parts = [];
  for (const m of html.matchAll(/<(title|meta)[^>]+>/gi)) {
    parts.push(m[0]);
  }
  return parts.join('\n');
}

const results = { em: 0, en: 0, badHyphen: 0, issues: [] };

for (const file of pages) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const vis = visibleText(html) + '\n' + metaText(html);

  const em = (vis.match(/—/g) || []).length;
  const en = (vis.match(/–/g) || []).length;

  // Phase 4A bad patterns (not по- prefix or д-р)
  const badPatterns = [
    /\d+-\d+/g,
    /\d+-днев/gi,
    /14-днев/gi,
    /7-днев/gi,
    /30-днев/gi,
    /Легло-/gi,
    /—/g,
    /–/g,
  ];

  let bad = 0;
  for (const p of badPatterns) {
    const m = vis.match(p);
    if (m) bad += m.length;
  }

  results.em += em;
  results.en += en;
  results.badHyphen += bad;
  if (em || en || bad) results.issues.push({ file, em, en, bad });
}

console.log('DASH TEST', JSON.stringify(results, null, 2));

// Price checks
const all = pages.map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
const funnelUiPath = path.join(root, 'js', 'funnel-ui.js');
const funnelUi = fs.existsSync(funnelUiPath) ? fs.readFileSync(funnelUiPath, 'utf8') : '';
const checks = {
  price17: (all.match(/17[,\.]00?\s*€|17\s*€/g) || []).length,
  value149: all.includes('149,40') || all.includes('149.40'),
  save132: all.includes('132,40') || all.includes('132.40'),
  pct89: all.includes('89%'),
  guarantee7: /гаранция за 7 дни/i.test(all),
  checkoutLinks: (all.match(/href="\/checkout"/g) || []).length,
  timerKey: all.includes('butzin_deadline_v1') || funnelUi.includes('butzin_deadline_v1'),
  claim1000: /1[\s,.]?000|над 1,000|над 1000/i.test(all),
  old432: all.includes('432'),
  old415: all.includes('415'),
  englishCheckout: /(?<!\/)(?<![\w-])checkout(?![\w-])/i.test(visibleText(all)),
};

console.log('CHECKS', JSON.stringify(checks, null, 2));
