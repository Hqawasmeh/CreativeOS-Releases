import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pkgPath = path.join(root, 'package.json');
const fail = [];
const warn = [];
const required = [
  'package.json',
  'package-lock.json',
  'vite.config.js',
  '.env.example',
  'electron/main.cjs',
  'electron/preload.cjs',
  'electron/updater.cjs',
  'electron/backend.cjs',
  'src/index.html',
  'src/styles.css',
  'src/app.js',
  'src/assets/qanteak-logo-black.png',
  'src/assets/qanteak-logo-white.png',
  'src/assets/qanteak-symbol.svg',
  'build/icon.ico',
  'build/installer.nsh',
  'backend/README.md',
  'backend/migrations/README.md',
  'SECURITY_AND_SIGNING.md',
  'CHANGELOG-RC9-V0.13.md',
  'WINDOWS_QA_CHECKLIST.md',
  'scripts/windows-qa-preflight.ps1'
];

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) fail.push(`Missing required file: ${file}`);
}

let pkg;
try { pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')); }
catch { fail.push('package.json is missing or invalid JSON.'); }

if (pkg) {
  if (pkg.version !== '1.0.0-rc.9.13') fail.push(`Unexpected package version: ${pkg.version}`);
  if (pkg.main !== 'electron/main.cjs') fail.push(`Unexpected Electron entry: ${pkg.main}`);
  if (pkg?.build?.appId !== 'com.creativeos.desktop') fail.push('Windows appId must remain com.creativeos.desktop for RC9 in-place upgrades.');
  if (pkg?.build?.artifactName !== 'QanteakOS-Setup-${version}.${ext}') fail.push('Unexpected installer artifactName.');
  if (pkg?.build?.nsis?.include !== 'build/installer.nsh') fail.push('NSIS update-safety include is missing.');
  const scripts = JSON.stringify(pkg.scripts || {});
  if (/electron-builder[^\n]*--publish\s+always/i.test(scripts)) fail.push('Unsafe --publish always command is enabled.');
}

if (fs.existsSync(path.join(root, '.env.example'))) {
  const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  if (/(sk-[A-Za-z0-9_-]{10,}|service_role\s*=\s*\S+|GH_TOKEN\s*=\s*\S+)/i.test(envExample)) {
    fail.push('.env.example appears to contain a real secret.');
  }
}


const rendererPath = path.join(root, 'src/app.js');
if (fs.existsSync(rendererPath)) {
  const renderer = fs.readFileSync(rendererPath, 'utf8');
  const stateInit = renderer.indexOf('let backendState=null');
  const defaultsInit = renderer.indexOf('const defaults=');
  if (stateInit < 0 || defaultsInit < 0 || stateInit > defaultsInit) fail.push('Renderer backendState must be initialized before default-state construction.');
  if (/const\s+backendState\s*=/.test(renderer)) fail.push('Renderer must not redeclare backendState with const after startup helpers can access it.');
  if (!/backendEntitlement/.test(renderer)) fail.push('Subscription entitlement gate is missing from renderer.');
  // ES modules are always strict mode. A bare assignment to an undeclared identifier
  // crashes the renderer before auth listeners bind. Keep this guard focused on the
  // regression that affected V0.10/V0.11 and run the module smoke test for full coverage.
  if (/^\s*invoiceTable\s*=\s*function\b/m.test(renderer)) fail.push('Renderer contains undeclared invoiceTable assignment; use a declaration in ES-module code.');
}
const preloadPath = path.join(root, 'electron/preload.cjs');
if (fs.existsSync(preloadPath) && !/backendEntitlement/.test(fs.readFileSync(preloadPath,'utf8'))) fail.push('Entitlement IPC is missing from preload.');
const backendPath = path.join(root, 'electron/backend.cjs');
if (fs.existsSync(backendPath)) {
  const backendSrc = fs.readFileSync(backendPath,'utf8');
  if (!/fetchWithTimeout/.test(backendSrc)) fail.push('Backend request timeout protection is missing.');
  if (!/async function getEntitlement/.test(backendSrc)) fail.push('Backend entitlement check is missing.');
}

if (!fs.existsSync(path.join(root, '.env'))) {
  warn.push('Private .env is not present. Copy your working local .env beside package.json before publishing if your app needs it.');
}

if (fail.length) {
  console.error('\nQanteak preflight FAILED');
  fail.forEach(x => console.error(' - ' + x));
  process.exit(1);
}
console.log('Qanteak preflight OK · 1.0.0-rc.9.13');
warn.forEach(x => console.warn('WARN: ' + x));
