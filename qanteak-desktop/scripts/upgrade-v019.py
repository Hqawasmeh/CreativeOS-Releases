from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]

# Version metadata
pkg = root / 'package.json'
p = json.loads(pkg.read_text())
p['version'] = '1.0.0-rc.9.19'
p['description'] = 'Qanteak OS RC9 V0.19 resilient Supabase schema-cache recovery'
pkg.write_text(json.dumps(p, indent=2) + '\n')

lock = root / 'package-lock.json'
s = lock.read_text()
s = s.replace('"version": "1.0.0-rc.9.18"', '"version": "1.0.0-rc.9.19"', 2)
lock.write_text(s)

# Preflight metadata
pre = root / 'scripts' / 'preflight.mjs'
s = pre.read_text()
s = s.replace('CHANGELOG-RC9-V0.18.md', 'CHANGELOG-RC9-V0.19.md')
s = s.replace("pkg.version !== '1.0.0-rc.9.18'", "pkg.version !== '1.0.0-rc.9.19'")
s = s.replace('Qanteak preflight OK · 1.0.0-rc.9.18', 'Qanteak preflight OK · 1.0.0-rc.9.19')
pre.write_text(s)

# Renderer-visible release identity only; no design changes.
app = root / 'src' / 'app.js'
s = app.read_text()
s = s.replace('Qanteak OS RC9 V0.18 · 1.0.0-rc.9.18', 'Qanteak OS RC9 V0.19 · 1.0.0-rc.9.19')
s = s.replace("appVersion:'1.0.0-rc.9.18'", "appVersion:'1.0.0-rc.9.19'")
app.write_text(s)

html = root / 'src' / 'index.html'
s = html.read_text()
s = s.replace('Qanteak OS RC9 V0.18', 'Qanteak OS RC9 V0.19')
s = s.replace('RC9 V0.18', 'RC9 V0.19')
html.write_text(s)

# Harden PostgREST calls against transient schema-cache/database gateway failures.
backend = root / 'electron' / 'backend.cjs'
s = backend.read_text()
old = "async function rest(pathname,{method='GET',body,prefer}={}){const c=loadConfig();if(!configured())throw new Error('Qanteak cloud backend is not configured.');const s=await validSession();if(!s?.access_token)throw new Error('Sign in to Qanteak first.');const headers={apikey:c.key,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json'};if(prefer)headers.Prefer=prefer;return jsonFetch(`${c.url}/rest/v1/${pathname}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)})}"
new = "const cloudDelay=ms=>new Promise(resolve=>setTimeout(resolve,ms));\nfunction isRetriableRestError(err){const msg=String(err?.message||'');const status=Number(err?.status||0);return /schema cache|PGRST00[012]|database.*schema|connection.*database|connection reset|fetch failed|temporarily unavailable|gateway/i.test(msg)||[502,503,504].includes(status)}\nasync function rest(pathname,{method='GET',body,prefer}={}){const c=loadConfig();if(!configured())throw new Error('Qanteak cloud backend is not configured.');const s=await validSession();if(!s?.access_token)throw new Error('Sign in to Qanteak first.');const headers={apikey:c.key,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json'};if(prefer)headers.Prefer=prefer;let lastErr=null;for(let attempt=0;attempt<4;attempt++){try{return await jsonFetch(`${c.url}/rest/v1/${pathname}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)},12000)}catch(err){lastErr=err;if(!isRetriableRestError(err)||attempt===3)throw err;await cloudDelay([500,1200,2500][attempt]||2500)}}throw lastErr||new Error('Qanteak cloud request failed.')}"
if old not in s:
    raise SystemExit('backend rest() signature changed; refusing unsafe patch')
s = s.replace(old, new)
backend.write_text(s)

# Changelog
(root / 'CHANGELOG-RC9-V0.19.md').write_text('''# Qanteak OS RC9 V0.19\n\nCloud recovery hotfix.\n\n- Retries transient Supabase/PostgREST schema-cache failures with short backoff instead of failing immediately.\n- Keeps the V0.17/V0.18 local workspace recovery safeguards and blocks cloud writes until a valid cloud snapshot has loaded.\n- Preserves the V0.18 New creation popup and all V0.16 document/sheet/lifecycle changes.\n- No design changes.\n''')

print('RC9 V0.19 patch applied')
