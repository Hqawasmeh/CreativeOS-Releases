import fs from 'node:fs';
const required = process.env.QANTEAK_REQUIRE_SIGNING === '1';
const link = process.env.CSC_LINK || process.env.WIN_CSC_LINK || '';
const password = process.env.CSC_KEY_PASSWORD || process.env.WIN_CSC_KEY_PASSWORD || '';
const subject = process.env.WIN_CSC_SUBJECT || process.env.CSC_NAME || '';
const hasFile = link && !/^https?:|^data:|^[A-Za-z0-9+/=]{100,}$/i.test(link) ? fs.existsSync(link) : true;
if (required && !subject && (!link || !password)) {
  console.error('Qanteak signing preflight FAILED. Production signing requires WIN_CSC_SUBJECT/CSC_NAME or CSC_LINK + CSC_KEY_PASSWORD.');
  process.exit(1);
}
if (link && !hasFile) {
  console.error(`Qanteak signing preflight FAILED. Certificate file was not found: ${link}`);
  process.exit(1);
}
if (!fs.existsSync('build/icon.ico')) {
  console.error('Qanteak signing preflight FAILED. Missing build/icon.ico.');
  process.exit(1);
}
console.log(`Qanteak signing preflight OK · mode=${required ? 'required' : 'optional'} · certificate=${subject || link ? 'configured' : 'not configured'}`);
if (!required && !subject && !link) console.warn('WARN: Installer will be unsigned. Windows SmartScreen may warn on clean PCs.');
