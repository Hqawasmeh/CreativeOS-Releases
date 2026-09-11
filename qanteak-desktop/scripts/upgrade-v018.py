from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]

pkg = root / 'package.json'
p = json.loads(pkg.read_text())
p['version'] = '1.0.0-rc.9.18'
p['description'] = 'Qanteak OS RC9 V0.18 workspace recovery and New creation menu hotfix'
pkg.write_text(json.dumps(p, indent=2) + '\n')

lock = root / 'package-lock.json'
s = lock.read_text()
s = s.replace('"version": "1.0.0-rc.9.17"', '"version": "1.0.0-rc.9.18"', 2)
lock.write_text(s)

pre = root / 'scripts' / 'preflight.mjs'
s = pre.read_text()
s = s.replace('CHANGELOG-RC9-V0.17.md', 'CHANGELOG-RC9-V0.18.md')
s = s.replace("pkg.version !== '1.0.0-rc.9.17'", "pkg.version !== '1.0.0-rc.9.18'")
s = s.replace('Qanteak preflight OK · 1.0.0-rc.9.17', 'Qanteak preflight OK · 1.0.0-rc.9.18')
pre.write_text(s)

html = root / 'src' / 'index.html'
s = html.read_text()
s = s.replace('<title>Qanteak OS RC9 V0.17</title>', '<title>Qanteak OS RC9 V0.18</title>')
s = s.replace('Qanteak OS · RC9 V0.17', 'Qanteak OS · RC9 V0.18')
s = s.replace('>RC9 V0.17</button>', '>RC9 V0.18</button>')
html.write_text(s)

app = root / 'src' / 'app.js'
s = app.read_text()
s = s.replace("appVersion:'1.0.0-rc.9.17'", "appVersion:'1.0.0-rc.9.18'")
s = s.replace('Qanteak OS RC9 V0.16 · 1.0.0-rc.9.16', 'Qanteak OS RC9 V0.18 · 1.0.0-rc.9.18')

marker = '/* ================= RC9 V0.18 NEW CREATION MENU ================= */'
if marker not in s:
    s += r'''

/* ================= RC9 V0.18 NEW CREATION MENU ================= */
const V018_CREATE_ITEMS=[
  {kind:'project',label:'Project',sub:'Plan connected client work',module:'projects',icon:'fi-rr-briefcase'},
  {kind:'task',label:'Task',sub:'Add work with a due date',module:'tasks',icon:'fi-rr-checkbox'},
  {kind:'review',label:'Review',sub:'Request or track approval',module:'reviews',icon:'fi-rr-comment-check'},
  {kind:'client',label:'Client',sub:'Add a client and contact details',module:'clients',icon:'fi-rr-user-add'},
  {kind:'lead',label:'Lead',sub:'Add a sales opportunity',module:'clients',icon:'fi-rr-user-time'},
  {kind:'document',label:'Document',sub:'Write a brief, SOP or note',module:'documents',icon:'fi-rr-document'},
  {kind:'note',label:'Note',sub:'Start a quick contextual note',module:'documents',icon:'fi-rr-note-sticky'},
  {kind:'sheet',label:'Sheet',sub:'Create a spreadsheet',module:'documents',icon:'fi-rr-table-columns'},
  {kind:'invoice',label:'Invoice',sub:'Create a client invoice',module:'business',icon:'fi-rr-receipt'},
  {kind:'expense',label:'Expense',sub:'Record a business cost',module:'business',icon:'fi-rr-wallet'},
  {kind:'automation',label:'Automation',sub:'Create a workflow rule',module:'business',icon:'fi-rr-bolt'},
  {kind:'file',label:'Upload file',sub:'Add a file to the workspace',module:'files',icon:'fi-rr-cloud-upload-alt'}
];
function v018CanCreate(item){return accessAllows(item.module,'create')}
function v018OpenQuickCreate(){
  closeAll();
  const form=$('#modalForm'),card=$('#modal .modalCard');
  card?.classList.remove('permissionModalCard');
  card?.classList.add('quickCreateModalCard');
  $('#modalTitle').textContent='Create new';
  $('#modalSubtitle').textContent='Choose what you want to create in this workspace.';
  form.dataset.type='quickCreate';
  const allowed=V018_CREATE_ITEMS.filter(v018CanCreate);
  form.innerHTML=allowed.length?`<div class="quickCreateGrid">${allowed.map(item=>`<button type="button" class="quickCreateItem" data-quick-create="${item.kind}"><span class="quickCreateIcon"><i class="fi ${item.icon}"></i></span><span><b>${item.label}</b><small>${item.sub}</small></span></button>`).join('')}</div><div class="formActions"><button type="button" class="secondary" data-close="modal">Cancel</button></div>`:`<div class="empty">You do not currently have permission to create items in this workspace.</div><div class="formActions"><button type="button" class="secondary" data-close="modal">Close</button></div>`;
  $('#modal').classList.add('open');
  $$('[data-close="modal"]').forEach(b=>b.onclick=closeAll);
  setScrim(true);
}
const v018NewAction=$('#newAction');
if(v018NewAction)v018NewAction.onclick=e=>{e.preventDefault();e.stopPropagation();v018OpenQuickCreate()};
document.addEventListener('click',e=>{
  const choice=e.target.closest?.('[data-quick-create]');if(!choice)return;
  e.preventDefault();e.stopImmediatePropagation();
  const kind=choice.dataset.quickCreate;
  closeAll();
  if(kind==='file'){setTimeout(()=>$('#filePicker')?.click(),0);return}
  setTimeout(()=>openCreate(kind),0);
},true);
/* ================= END RC9 V0.18 NEW CREATION MENU ================= */
'''
app.write_text(s)

css = root / 'src' / 'styles.css'
s = css.read_text()
if '/* RC9 V0.18 quick create */' not in s:
    s += r'''

/* RC9 V0.18 quick create */
.quickCreateModalCard{max-width:760px}
.quickCreateGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.quickCreateItem{display:grid;grid-template-columns:38px minmax(0,1fr);align-items:center;gap:11px;text-align:left;border:1px solid var(--line);background:var(--card);border-radius:11px;padding:13px;min-height:76px}
.quickCreateItem:hover{border-color:#b9c7d8;background:var(--soft)}
.quickCreateIcon{width:38px;height:38px;border-radius:9px;background:var(--soft2);display:grid;place-items:center;color:var(--navy);font-size:15px}
.quickCreateItem b{display:block;font-size:13px}
.quickCreateItem small{display:block;color:var(--muted);font-size:10px;line-height:1.35;margin-top:3px}
@media(max-width:760px){.quickCreateGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:520px){.quickCreateGrid{grid-template-columns:1fr}}
'''
css.write_text(s)

(root / 'CHANGELOG-RC9-V0.18.md').write_text('''# Qanteak OS RC9 V0.18\n\nWorkspace recovery + New button hotfix.\n\n- Keeps the V0.17 cloud-hydration safeguards that protect existing workspace data during startup/network failures.\n- Changes the top-right New button from Search to a dedicated Create New popup.\n- The popup includes Project, Task, Review, Client, Lead, Document, Note, Sheet, Invoice, Expense, Automation and Upload File.\n- Creation choices are filtered by the current member’s create permissions.\n- Slides remain removed.\n''')
print('RC9 V0.18 patch applied')
