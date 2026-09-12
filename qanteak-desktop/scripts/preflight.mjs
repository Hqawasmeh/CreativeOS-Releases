import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

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
  'electron/platform.cjs',
  'electron/backend.cjs',
  'src/index.html',
  'src/styles.css',
  'src/app.js',
  'src/v020-foundations.js',
  'src/v020-foundations.css',
  'src/v020-nav-fix.js',
  'src/v021-roadmap.js',
  'src/v021-roadmap.css',
  'src/assets/qanteak-logo-black.png',
  'src/assets/qanteak-logo-white.png',
  'src/assets/qanteak-symbol.svg',
  'build/icon.ico',
  'build/installer.nsh',
  'backend/README.md',
  'backend/migrations/README.md',
  'SECURITY_AND_SIGNING.md',
  'CHANGELOG-RC9-V0.21.md',
  'ROADMAP-NOTION-COPILOT-PARITY.md',
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
  if (pkg.version !== '1.0.0-rc.9.21') fail.push(`Unexpected package version: ${pkg.version}`);
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
  if (/^\s*invoiceTable\s*=\s*function\b/m.test(renderer)) fail.push('Renderer contains undeclared invoiceTable assignment; use a declaration in ES-module code.');
}

const foundationsPath = path.join(root, 'src/v020-foundations.js');
if (fs.existsSync(foundationsPath)) {
  const foundations = fs.readFileSync(foundationsPath, 'utf8');
  if (!foundations.includes('qanteak.rc9.v0.20.foundations')) fail.push('V0.20 migration source namespace is missing.');
}

const roadmapPath = path.join(root, 'src/v021-roadmap.js');
if (fs.existsSync(roadmapPath)) {
  const src = fs.readFileSync(roadmapPath, 'utf8');
  const markers = [
    ['PROPERTY_TYPES', 'typed property engine'],
    ['function formulaTokens', 'safe formula parser'],
    ['function rollupValue', 'rollup engine'],
    ['function filteredRecords', 'saved query/view engine'],
    ['function submitForm', 'forms runtime'],
    ['function dashboardWidget', 'dashboard composer'],
    ['function runAutomation', 'automation runtime'],
    ['function queueApproval', 'approval queue'],
    ['function createContext', 'Context Spaces'],
    ['function createSkill', 'agent Skills'],
    ['function runAgent', 'agent plan runtime'],
    ['function runResearch', 'Researcher workflow'],
    ['function analystRun', 'Analyst workflow'],
    ['function meetingRun', 'Meeting Intelligence'],
    ['function peopleRun', 'People Intelligence'],
    ['function searchNow', 'workspace search'],
    ['function connectorManifest', 'connector SDK manifest'],
    ['function governanceSave', 'AI governance'],
    ['migratedFromV020', 'V0.20 migration marker']
  ];
  for (const [marker,label] of markers) if (!src.includes(marker)) fail.push(`V0.21 ${label} is missing.`);
  if (/\beval\s*\(|new\s+Function\s*\(/.test(src)) fail.push('V0.21 formula/runtime code must not use eval or Function constructors.');
}

const platformPath = path.join(root, 'electron/platform.cjs');
if (fs.existsSync(platformPath)) {
  const src = fs.readFileSync(platformPath,'utf8');
  if (!src.includes("server.listen(serverPort, '127.0.0.1'")) fail.push('V0.21 local API must bind only to 127.0.0.1.');
  if (!src.includes("replace(/^Bearer\\s+/i")) fail.push('V0.21 local API bearer-token authentication is missing.');
  if (!src.includes("url.pathname === '/mcp'")) fail.push('V0.21 MCP endpoint is missing.');
  if (!src.includes("parsed.protocol !== 'https:'")) fail.push('V0.21 outbound webhook HTTPS gate is missing.');
}

const navFixPath = path.join(root, 'src/v020-nav-fix.js');
if (fs.existsSync(navFixPath)) {
  const src = fs.readFileSync(navFixPath,'utf8');
  if (!src.includes("import('./v021-roadmap.js')")) fail.push('V0.21 roadmap module is not loaded from the RC9 renderer entry path.');
}

const preloadPath = path.join(root, 'electron/preload.cjs');
if (fs.existsSync(preloadPath)) {
  const src = fs.readFileSync(preloadPath,'utf8');
  if (!/backendEntitlement/.test(src)) fail.push('Entitlement IPC is missing from preload.');
  if (!/platformLoad/.test(src) || !/platformStartApi/.test(src) || !/platformSendWebhook/.test(src)) fail.push('V0.21 platform IPC is missing from preload.');
}

const updaterPath = path.join(root, 'electron/updater.cjs');
if (fs.existsSync(updaterPath)) {
  const src = fs.readFileSync(updaterPath,'utf8');
  if (!src.includes("require('./platform.cjs')")) fail.push('V0.21 platform service is not wired into Electron startup.');
  if (!src.includes("ipcMain.handle('platform:load'")) fail.push('V0.21 platform load IPC is not registered.');
}

const backendPath = path.join(root, 'electron/backend.cjs');
if (fs.existsSync(backendPath)) {
  const backendSrc = fs.readFileSync(backendPath,'utf8');
  if (!/fetchWithTimeout/.test(backendSrc)) fail.push('Backend request timeout protection is missing.');
  if (!/async function getEntitlement/.test(backendSrc)) fail.push('Backend entitlement check is missing.');
}

for (const rel of ['src/v021-roadmap.js','electron/platform.cjs','electron/updater.cjs','electron/preload.cjs']) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) continue;
  const result = spawnSync(process.execPath, ['--check', abs], { encoding:'utf8' });
  if (result.status !== 0) fail.push(`${rel} failed syntax check: ${(result.stderr || result.stdout || '').trim()}`);
}

if (!fs.existsSync(path.join(root, '.env'))) {
  warn.push('Private .env is not present. Copy your working local .env beside package.json before publishing if your app needs it.');
}

if (fail.length) {
  console.error('\nQanteak preflight FAILED');
  fail.forEach(x => console.error(' - ' + x));
  process.exit(1);
}
console.log('Qanteak preflight OK · 1.0.0-rc.9.21');
warn.forEach(x => console.warn('WARN: ' + x));
