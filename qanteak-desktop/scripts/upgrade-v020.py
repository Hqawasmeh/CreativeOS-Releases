from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]

pkg = root / 'package.json'
p = json.loads(pkg.read_text())
p['version'] = '1.0.0-rc.9.20'
p['description'] = 'Qanteak OS RC9 V0.20 free workspace foundations: databases, goals, templates, activity and local insights'
pkg.write_text(json.dumps(p, indent=2) + '\n')

lock = root / 'package-lock.json'
s = lock.read_text()
s = s.replace('"version": "1.0.0-rc.9.19"', '"version": "1.0.0-rc.9.20"', 2)
lock.write_text(s)

pre = root / 'scripts' / 'preflight.mjs'
s = pre.read_text()
s = s.replace('CHANGELOG-RC9-V0.19.md', 'CHANGELOG-RC9-V0.20.md')
s = s.replace("pkg.version !== '1.0.0-rc.9.19'", "pkg.version !== '1.0.0-rc.9.20'")
s = s.replace('Qanteak preflight OK · 1.0.0-rc.9.19', 'Qanteak preflight OK · 1.0.0-rc.9.20')
pre.write_text(s)

html = root / 'src' / 'index.html'
s = html.read_text()
s = s.replace('Qanteak OS RC9 V0.19', 'Qanteak OS RC9 V0.20')
s = s.replace('RC9 V0.19', 'RC9 V0.20')
workspace_button = '      <button class="navItem" data-view="workspace"><i class="fi fi-rr-apps"></i><span>Workspace</span></button>\n'
needle = '      <button class="navItem" data-view="documents"><i class="fi fi-rr-document"></i><span>Documents</span></button>\n'
if 'data-view="workspace"' not in s:
    if needle not in s: raise SystemExit('workspace nav insertion point missing')
    s = s.replace(needle, needle + workspace_button, 1)
html.write_text(s)

app = root / 'src' / 'app.js'
s = app.read_text()
s = s.replace("appVersion:'1.0.0-rc.9.19'", "appVersion:'1.0.0-rc.9.20'")
s = s.replace('Qanteak OS RC9 V0.19 · 1.0.0-rc.9.19', 'Qanteak OS RC9 V0.20 · 1.0.0-rc.9.20')
old_collections = "const WORKSPACE_COLLECTIONS=['projects','tasks','clients','leads','reviews','documents','files','invoices','estimates','expenses','automations','notifications','members'];"
new_collections = "const WORKSPACE_COLLECTIONS=['projects','tasks','clients','leads','reviews','documents','files','invoices','estimates','expenses','automations','notifications','members','databases','goals','templates','activity'];"
if old_collections in s:
    s = s.replace(old_collections, new_collections, 1)
elif new_collections not in s:
    raise SystemExit('workspace collection signature changed; refusing unsafe patch')

marker = '/* ================= RC9 V0.20 FREE WORKSPACE FOUNDATIONS ================= */'
if marker not in s:
    s += r'''

/* ================= RC9 V0.20 FREE WORKSPACE FOUNDATIONS ================= */
meta.workspace=['Workspace','Databases, goals, templates, activity and local insights.'];
state.tabs.workspace=state.tabs.workspace||'overview';
state.databases=Array.isArray(state.databases)?state.databases:[];
state.goals=Array.isArray(state.goals)?state.goals:[];
state.templates=Array.isArray(state.templates)?state.templates:[];
state.activity=Array.isArray(state.activity)?state.activity:[];

const V020_STARTER_TEMPLATES=[
  {id:'starter-project',name:'Project launch',description:'Project, kickoff document and launch tasks.'},
  {id:'starter-client',name:'Client onboarding',description:'Onboarding project, SOP and follow-up tasks.'},
  {id:'starter-content',name:'Content calendar',description:'Structured content database with status and owner fields.'},
  {id:'starter-crm',name:'Simple CRM',description:'Structured lead database with stage, value and next action.'}
];
function v020Log(action,detail=''){state.activity.unshift({id:uid(),action,detail,at:new Date().toISOString(),user:currentUserName()});state.activity=state.activity.slice(0,200)}
function v020Fmt(iso){try{return new Date(iso).toLocaleString()}catch{return iso||''}}
function v020DatabaseCard(db){const rows=Array.isArray(db.rows)?db.rows:[];return `<article class="card v020DbCard"><div class="v020CardHead"><div><h3>${esc(db.name)}</h3><p>${esc(db.description||'Structured workspace database')}</p></div><span class="chip good">${rows.length} rows</span></div><div class="v020DbPreview">${rows.slice(0,4).map(r=>`<div><b>${esc(r.name||r.title||'Untitled')}</b><span>${esc(r.status||r.stage||r.owner||'Record')}</span></div>`).join('')||'<div class="empty">No rows yet.</div>'}</div><div class="v020Actions"><button class="miniButton" data-v020-db-add="${db.id}">Add row</button><button class="miniButton" data-v020-db-view="${db.id}">Open table</button></div></article>`}
function v020Overview(){const open=state.tasks.filter(t=>!t.done).length;const overdue=state.invoices.filter(i=>i.status==='Overdue').reduce((n,i)=>n+Number(i.amount||0),0);const avg=state.projects.length?Math.round(state.projects.reduce((n,p)=>n+Number(p.progress||0),0)/state.projects.length):0;return `<div class="grid metrics">${[['Open tasks',open,'Work'],['Project progress',avg+'%','Average'],['Databases',state.databases.length,'Structured'],['Overdue',money(overdue),'Business']].map(x=>`<article class="card metric"><div class="metricLabel"><span>${x[0]}</span></div><div class="metricValue"><strong>${x[1]}</strong><span class="chip good">${x[2]}</span></div></article>`).join('')}</div><article class="card sectionCard">${sectionTitle('Local workspace brief','Generated from Qanteak data without an external AI provider.','<button class="secondary" data-v020-brief>Refresh brief</button>')}<div class="v020Brief"><b>${open} open tasks across ${state.projects.length} projects.</b><p>${state.reviews.filter(r=>r.status!=='Approved').length} reviews still need approval, ${state.invoices.filter(i=>i.status==='Overdue').length} invoices are overdue, and average project progress is ${avg}%.</p></div></article>`}
function v020Databases(){return `<div class="v020Toolbar"><div><b>Structured databases</b><span>Build lightweight CRM, content, hiring or operations tables inside Qanteak.</span></div><button class="primary" data-v020-new-db><i class="fi fi-rr-plus"></i> Database</button></div><div class="v020Grid">${state.databases.map(v020DatabaseCard).join('')||'<div class="empty">No custom databases yet. Create one or start from a template.</div>'}</div>`}
function v020Goals(){return `<div class="v020Toolbar"><div><b>Goals & OKRs</b><span>Track outcomes next to the work that drives them.</span></div><button class="primary" data-v020-new-goal><i class="fi fi-rr-plus"></i> Goal</button></div><div class="listCard">${state.goals.map(g=>`<div class="listRow"><div><span class="title">${esc(g.title)}</span><span class="sub">${esc(g.owner||'Workspace')} · ${esc(g.due||'No due date')}</span></div><div class="progress"><i style="width:${Math.max(0,Math.min(100,Number(g.progress||0)))}%"></i></div><b>${Number(g.progress||0)}%</b></div>`).join('')||'<div class="empty">No goals yet.</div>'}</div>`}
function v020Templates(){const custom=state.templates.map(t=>({ ...t,custom:true }));const all=[...V020_STARTER_TEMPLATES,...custom];return `<div class="v020Toolbar"><div><b>Workspace templates</b><span>Create repeatable systems without an external template marketplace.</span></div></div><div class="v020Grid">${all.map(t=>`<article class="card v020Template"><h3>${esc(t.name)}</h3><p>${esc(t.description||'Reusable workspace setup')}</p><button class="secondary" data-v020-template="${t.id}">${t.custom?'Use template':'Create'}</button></article>`).join('')}</div>`}
function v020Activity(){return `<article class="card sectionCard">${sectionTitle('Workspace activity','Recent local actions recorded by the free foundation layer.')}<div class="listCard">${state.activity.slice(0,80).map(a=>`<div class="listRow"><div><span class="title">${esc(a.action)}</span><span class="sub">${esc(a.detail||'Qanteak workspace')} · ${esc(a.user||'User')}</span></div><time>${esc(v020Fmt(a.at))}</time></div>`).join('')||'<div class="empty">Activity will appear as you use databases, goals and templates.</div>'}</div></article>`}
function workspaceHub(){const tab=state.tabs.workspace||'overview';const body=tab==='databases'?v020Databases():tab==='goals'?v020Goals():tab==='templates'?v020Templates():tab==='activity'?v020Activity():v020Overview();return `${tabs('workspace',[['overview','Overview'],['databases','Databases'],['goals','Goals'],['templates','Templates'],['activity','Activity']])}<div class="v020Workspace">${body}</div>`}
renderers.workspace=workspaceHub;

function v020OpenDb(id){const db=state.databases.find(x=>x.id===id);if(!db)return;const rows=db.rows||[];$('#detailTitle').textContent=db.name;$('#detailSubtitle').textContent='Structured database';$('#detailBody').innerHTML=`<div class="v020Table"><div class="v020Tr v020Th"><span>Name</span><span>Status / Stage</span><span>Owner</span></div>${rows.map(r=>`<div class="v020Tr"><span>${esc(r.name||r.title||'Untitled')}</span><span>${esc(r.status||r.stage||'—')}</span><span>${esc(r.owner||'—')}</span></div>`).join('')||'<div class="empty">No rows yet.</div>'}</div>`;$('#detailModal').classList.add('open');setScrim(true)}
function v020AddRow(id){const db=state.databases.find(x=>x.id===id);if(!db)return;const name=prompt(`Add row to ${db.name}`,'');if(!name)return;db.rows=db.rows||[];db.rows.push({id:uid(),name,status:'New',owner:currentUserName()});v020Log('Database row created',`${name} · ${db.name}`);save();render('workspace')}
function v020NewDb(){const name=prompt('Database name','Team database');if(!name)return;state.databases.push({id:uid(),name,description:'Custom Qanteak database',rows:[],createdAt:new Date().toISOString()});v020Log('Database created',name);save();render('workspace')}
function v020NewGoal(){const title=prompt('Goal title','');if(!title)return;const due=prompt('Due date','');state.goals.push({id:uid(),title,owner:currentUserName(),due,progress:0});v020Log('Goal created',title);save();render('workspace')}
function v020UseTemplate(id){if(id==='starter-content'){state.databases.push({id:uid(),name:'Content calendar',description:'Plan and track content production.',rows:[{id:uid(),name:'Launch announcement',status:'Idea',owner:currentUserName()}]})}else if(id==='starter-crm'){state.databases.push({id:uid(),name:'Sales CRM',description:'Lead pipeline and next actions.',rows:[{id:uid(),name:'New opportunity',stage:'Discovery',owner:currentUserName()}]})}else if(id==='starter-project'){const name='New launch';state.projects.push({id:uid(),name,client:'Internal',status:'Planning',progress:0,due:'',owner:currentUserName(),description:'Created from Qanteak Project launch template.'});state.tasks.push({id:uid(),title:'Kickoff',project:name,due:'',done:false},{id:uid(),title:'Define milestones',project:name,due:'',done:false});state.documents.push({id:uid(),title:`${name} — Brief`,project:name,client:'Internal',owner:currentUserName(),updated:'Now',body:'<h2>Objective</h2><p>Define the launch objective.</p><h2>Success criteria</h2><p>Add measurable outcomes.</p>'})}else if(id==='starter-client'){const name='Client onboarding';state.projects.push({id:uid(),name,client:'New client',status:'Planning',progress:0,due:'',owner:currentUserName(),description:'Reusable client onboarding workflow.'});state.tasks.push({id:uid(),title:'Collect client details',project:name,due:'',done:false},{id:uid(),title:'Confirm scope and billing',project:name,due:'',done:false})}else{const t=state.templates.find(x=>x.id===id);if(!t)return;state.documents.push({id:uid(),title:t.name,project:'Operations',client:'Internal',owner:currentUserName(),updated:'Now',body:t.body||'<h2>Template</h2><p>Start writing here.</p>'})}v020Log('Template applied',id);save();render('workspace');toast('Template created','The new workspace items are ready.','good')}

document.addEventListener('click',e=>{const el=e.target.closest?.('[data-v020-new-db],[data-v020-new-goal],[data-v020-db-add],[data-v020-db-view],[data-v020-template],[data-v020-brief]');if(!el)return;if(el.hasAttribute('data-v020-new-db'))v020NewDb();else if(el.hasAttribute('data-v020-new-goal'))v020NewGoal();else if(el.dataset.v020DbAdd)v020AddRow(el.dataset.v020DbAdd);else if(el.dataset.v020DbView)v020OpenDb(el.dataset.v020DbView);else if(el.dataset.v020Template)v020UseTemplate(el.dataset.v020Template);else if(el.hasAttribute('data-v020-brief'))render('workspace')});
/* ================= END RC9 V0.20 FREE WORKSPACE FOUNDATIONS ================= */
'''
app.write_text(s)

css = root / 'src' / 'styles.css'
s = css.read_text()
if '/* RC9 V0.20 workspace foundations */' not in s:
    s += r'''

/* RC9 V0.20 workspace foundations */
.v020Workspace{display:grid;gap:14px}.v020Toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:4px 0 14px}.v020Toolbar>div{display:grid;gap:3px}.v020Toolbar span{color:var(--muted);font-size:12px}.v020Grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.v020DbCard,.v020Template{display:grid;gap:12px}.v020CardHead{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.v020CardHead h3,.v020Template h3{margin:0}.v020CardHead p,.v020Template p{margin:4px 0 0;color:var(--muted);font-size:12px}.v020DbPreview{display:grid;gap:7px}.v020DbPreview>div{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--line);font-size:12px}.v020DbPreview span{color:var(--muted)}.v020Actions{display:flex;gap:8px}.v020Brief p{color:var(--muted);margin:6px 0 0}.v020Table{display:grid;border:1px solid var(--line);border-radius:10px;overflow:hidden}.v020Tr{display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px;padding:10px 12px;border-bottom:1px solid var(--line);font-size:12px}.v020Tr:last-child{border-bottom:0}.v020Th{background:var(--soft);font-weight:700}.v020Template button{justify-self:start}@media(max-width:980px){.v020Grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:640px){.v020Grid{grid-template-columns:1fr}.v020Toolbar{align-items:flex-start;flex-direction:column}.v020Tr{grid-template-columns:1.5fr 1fr}.v020Tr span:last-child{display:none}}
'''
css.write_text(s)

(root / 'CHANGELOG-RC9-V0.20.md').write_text('''# Qanteak OS RC9 V0.20\n\nFree workspace foundations release.\n\n- Adds a Workspace area for structured databases, goals/OKRs, reusable templates, activity history and local insights.\n- Adds custom database creation, row creation and table inspection without an external database product.\n- Adds goal tracking with progress and ownership.\n- Adds built-in project launch, client onboarding, content calendar and simple CRM templates.\n- Adds a local workspace brief generated from existing Qanteak data without a paid model provider.\n- Adds the new collections to the existing workspace snapshot/sync model.\n- Keeps all RC9 V0.19 cloud-recovery safeguards, permissions, documents, sheets, creation menu and lifecycle actions.\n- No paid external service is required for these features.\n''')

print('RC9 V0.20 free workspace foundations applied')
