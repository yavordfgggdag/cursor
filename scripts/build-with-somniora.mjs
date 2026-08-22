/**
 * Assemble metod-butzin funnel (site/) + Somniora static export (app/).
 * Run from butzin-method-1 root: node scripts/build-with-somniora.mjs
 */
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const somnioraRoot =
  process.env.SOMNIORA_WEB_DIR ??
  'C:\\Users\\User\\Desktop\\Health Funnel\\Трудно първоначално заспиване\\web';
const publishDir = resolve(root, 'publish');
const funnelDir = resolve(root, 'site');
const somnioraDist = resolve(somnioraRoot, 'dist');
const skipSomniora = process.env.SKIP_SOMNIORA === '1';

function run(cmd, cwd) {
  const result = spawnSync(cmd, { cwd, shell: true, stdio: 'inherit', env: process.env });
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${cmd}`);
  }
}

function copyDir(src, dest) {
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  const quoted = `"${src}" "${dest}"`;
  const result = spawnSync(`robocopy ${quoted} /E /NFL /NDL /NJH /NJS /nc /njs /njh`, {
    shell: true,
    stdio: 'inherit',
  });
  if (result.status !== null && result.status > 7) {
    throw new Error(`robocopy failed (${result.status}): ${src} -> ${dest}`);
  }
}


rmSync(publishDir, { recursive: true, force: true });
mkdirSync(publishDir, { recursive: true });

console.log('Copying funnel site/ -> publish/');
copyDir(funnelDir, publishDir);

if (skipSomniora || !existsSync(somnioraRoot)) {
  console.warn('Skipping Somniora /app bundle (SOMNIORA_WEB_DIR missing or SKIP_SOMNIORA=1).');
} else {
  console.log('Building Somniora web export...');
  run('npx expo export --platform web', somnioraRoot);
  console.log('Copying Somniora dist/ -> publish/app/');
  copyDir(somnioraDist, resolve(publishDir, 'app'));
}

console.log(`Publish bundle ready: ${publishDir}`);
