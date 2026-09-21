// Build an explicitly marked, synthetic browser fixture. Never packaged in dist/.
import fs from 'node:fs';
import path from 'node:path';
const output=path.resolve('../docs/desktop-preview');
fs.mkdirSync(output,{recursive:true});
for(const entry of fs.readdirSync('src',{withFileTypes:true}))if(entry.isFile())fs.copyFileSync(path.join('src',entry.name),path.join(output,entry.name));
let html=fs.readFileSync(path.join(output,'index.html'),'utf8');
html=html.replace('<script type="module" src="./app.js">','<script src="./fixture.js"></script>\n<script type="module" src="./app.js">');
html=html.replace('<title>','<meta name="robots" content="noindex,nofollow"><title>Design preview · ');
fs.writeFileSync(path.join(output,'index.html'),html);
fs.copyFileSync('scripts/fixtures/desktop-preview.js',path.join(output,'fixture.js'));
fs.cpSync('src/assets',path.join(output,'assets'),{recursive:true});
console.log('Synthetic desktop preview built.');
for(const name of ['responsive.html','responsive.js'])fs.copyFileSync('scripts/fixtures/'+name,path.join(output,name));

// Give the browser fixture immutable module URLs, so a previous preview cannot
// combine new HTML with stale scripts or styles from GitHub Pages caches.
const {createHash}=await import('node:crypto');
const revision=createHash('sha256').update(fs.readFileSync('src/app.js')).update(fs.readFileSync('src/v023-workspace.js')).update(fs.readFileSync('src/v023-design.css')).update(fs.readFileSync('src/v024-workspace.js')).update(fs.readFileSync('src/v024-workspace.css')).digest('hex').slice(0,12);
for(const entry of fs.readdirSync(output)){
 if(!/\.(html|js)$/.test(entry))continue;
 const file=path.join(output,entry);
 let text=fs.readFileSync(file,'utf8');
 text=text.replace(/((?:\.\/)?(?:app|fixture|release-info|v0[0-9][0-9][a-z0-9-]*)\.(?:js|css))(?=['"])/g,'$1?v='+revision);
 fs.writeFileSync(file,text);
}
