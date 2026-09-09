import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');

function parseEnv(text='') {
  const out = {};
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    const key = line.slice(0,i).trim();
    let value = line.slice(i+1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value=value.slice(1,-1);
    out[key]=value;
  }
  return out;
}

fs.rmSync(dist, { recursive: true, force: true });
fs.cpSync(src, dist, { recursive: true });
if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('Build failed: dist/index.html was not created.');
  process.exit(1);
}

let env = {};
for (const name of ['.env','.env.example']) {
  const p = path.join(root,name);
  if (fs.existsSync(p)) {
    env = {...parseEnv(fs.readFileSync(p,'utf8')),...env};
  }
}
const publicConfig = {
  QANTEAK_BACKEND_MODE: env.QANTEAK_BACKEND_MODE || 'local',
  QANTEAK_SUPABASE_URL: env.QANTEAK_SUPABASE_URL || '',
  QANTEAK_SUPABASE_PUBLISHABLE_KEY: env.QANTEAK_SUPABASE_PUBLISHABLE_KEY || '',
  QANTEAK_AUTH_REDIRECT: env.QANTEAK_AUTH_REDIRECT || 'qanteak://auth/confirmed',
  QANTEAK_RECOVERY_REDIRECT: env.QANTEAK_RECOVERY_REDIRECT || 'qanteak://auth/recovery'
};
fs.writeFileSync(path.join(dist,'qanteak-config.json'), JSON.stringify(publicConfig,null,2));
console.log(`Qanteak renderer build OK · dist/ created from src/ · backend=${publicConfig.QANTEAK_BACKEND_MODE}.`);
