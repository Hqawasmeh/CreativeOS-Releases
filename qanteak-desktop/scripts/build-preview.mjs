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
