import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const dir = process.argv[2] || 'release';
const yml = path.join(dir, 'latest.yml');
if (!fs.existsSync(yml)) {
  console.error(`Release QA FAILED: ${yml} is missing.`);
  process.exit(1);
}
const txt = fs.readFileSync(yml, 'utf8');
const pathMatch = txt.match(/^path:\s*(.+)$/m);
const shaMatch = txt.match(/^sha512:\s*(.+)$/m);
if (!pathMatch || !shaMatch) {
  console.error('Release QA FAILED: latest.yml is missing path or sha512.');
  process.exit(1);
}
const filename = pathMatch[1].trim().replace(/^['"]|['"]$/g, '');
if (!filename.includes(pkg.version)) {
  console.error(`Release QA FAILED: ${filename} does not contain package version ${pkg.version}.`);
  process.exit(1);
}
const exe = path.join(dir, filename);
if (!fs.existsSync(exe)) {
  console.error(`Release QA FAILED: installer named by latest.yml is missing: ${exe}`);
  process.exit(1);
}
const block = exe + '.blockmap';
if (!fs.existsSync(block)) {
  console.error(`Release QA FAILED: blockmap missing: ${block}`);
  process.exit(1);
}
const actual = crypto.createHash('sha512').update(fs.readFileSync(exe)).digest('base64');
const declared = shaMatch[1].trim().replace(/^['"]|['"]$/g, '');
if (actual !== declared) {
  console.error('Release QA FAILED: installer SHA512 does not match latest.yml. DO NOT PUBLISH.');
  process.exit(1);
}
const sizeMatch = txt.match(/^\s*size:\s*(\d+)\s*$/m);
if (sizeMatch && Number(sizeMatch[1]) !== fs.statSync(exe).size) {
  console.error('Release QA FAILED: installer size does not match latest.yml. DO NOT PUBLISH.');
  process.exit(1);
}
const exes = fs.readdirSync(dir).filter(f => /^QanteakOS-Setup-.*\.exe$/i.test(f) && !f.endsWith('.exe.blockmap'));
if (exes.length !== 1 || exes[0] !== filename) {
  console.error(`Release QA FAILED: expected exactly one installer for this build; found ${exes.join(', ') || 'none'}.`);
  process.exit(1);
}
console.log(`Qanteak release QA OK · ${pkg.version}`);
console.log(`Installer: ${filename}`);
console.log(`SHA512: ${actual}`);
console.log(`Blockmap: ${path.basename(block)}`);
