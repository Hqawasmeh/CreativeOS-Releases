import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
const out=path.resolve('../docs/app');fs.mkdirSync(out,{recursive:true});fs.cpSync('dist',out,{recursive:true});
await build({entryPoints:['browser/backend.js'],bundle:true,minify:true,format:'esm',target:'es2022',outfile:path.join(out,'browser-backend.js')});
let html=fs.readFileSync(path.join(out,'index.html'),'utf8');
html=html.replace("connect-src 'self'","connect-src 'self' https://xohzqpattqeoowadssep.supabase.co wss://xohzqpattqeoowadssep.supabase.co https://www.googleapis.com https://*.googleapis.com");
html=html.replace(/<script type="module" src="\.\/[^\"]+"><\/script>/g,'');
html=html.replace('</body>','<script type="module" src="./web-bootstrap.js"></script></body>');
html=html.replace('<title>','<meta name="robots" content="noindex"><title>');
fs.writeFileSync(path.join(out,'index.html'),html);
fs.writeFileSync(path.join(out,'web-bootstrap.js'),`await import('./browser-backend.js');\nawait import('./app.js');\nawait import('./v020-foundations.js');\nawait import('./v020-nav-fix.js');\nawait import('./v022-accessibility.js');\n`);
fs.copyFileSync(path.join(out,'qanteak-config.json'),'../docs/portal/qanteak-config.json');
console.log('Authenticated browser workspace built at docs/app.');
// Keep HTML, dynamic imports and styles on the same revision after deployments.
const {createHash}=await import('node:crypto');
const revision=createHash('sha256').update(fs.readFileSync(path.join(out,'browser-backend.js'))).update(fs.readFileSync('src/app.js')).update(fs.readFileSync('src/v024-workspace.css')).update(fs.readFileSync('src/v021-roadmap.js')).digest('hex').slice(0,12);
for(const name of fs.readdirSync(out)){
 if(!/\.(js|html)$/.test(name))continue;
 const file=path.join(out,name);let body=fs.readFileSync(file,'utf8');
 body=body.replace(/((?:\.\/)?(?:app|browser-backend|web-bootstrap|release-info|icons|styles|v0[0-9][0-9][a-z0-9-]*)\.(?:js|css))(?=['"])/g,'$1?v='+revision);
 fs.writeFileSync(file,body);
}
