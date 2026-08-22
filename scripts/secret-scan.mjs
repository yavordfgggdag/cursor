/**
 * Scan staged/untracked project files for hardcoded secrets (names only in report).
 */
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const IGNORE = new Set(['node_modules', '.git', 'publish', '.netlify']);

const PATTERNS = [
  { name: 'Stripe secret key', re: /sk_live_[a-zA-Z0-9]{10,}/ },
  { name: 'Stripe test secret key', re: /sk_test_[a-zA-Z0-9]{10,}/ },
  { name: 'Stripe webhook secret', re: /whsec_[a-zA-Z0-9]{10,}/ },
  { name: 'Supabase service role JWT', re: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/ },
  { name: 'Generic API key assignment', re: /(?:api[_-]?key|secret|token|password)\s*=\s*['"][^'"\s]{12,}['"]/i },
];

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(ent.name)) continue;
    const fp = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(fp, out);
    else if (/\.(html|js|mts|ts|json|toml|md|css|env|mjs)$/i.test(ent.name)) out.push(fp);
  }
  return out;
}

const hits = [];
for (const fp of walk(root)) {
  const rel = path.relative(root, fp);
  if (rel.includes('package-lock.json')) continue;
  let text;
  try {
    text = fs.readFileSync(fp, 'utf8');
  } catch {
    continue;
  }
  for (const { name, re } of PATTERNS) {
    if (re.test(text)) {
      // Ignore env var name references without values
      if (/process\.env\.|Netlify\.env\.get/.test(text) && !/sk_live_|sk_test_|whsec_/.test(text)) continue;
      hits.push({ file: rel, kind: name });
    }
  }
}

const unique = [...new Map(hits.map((h) => [`${h.file}:${h.kind}`, h])).values()];
console.log(JSON.stringify({ pass: unique.length === 0, findings: unique }, null, 2));
process.exit(unique.length === 0 ? 0 : 1);
