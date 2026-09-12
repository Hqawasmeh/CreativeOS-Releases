const STORAGE_KEY='qanteak.rc9.v0.20.foundations';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const uid=()=>Math.random().toString(36).slice(2,10);

const starterTemplates=[
  {id:'crm',name:'Simple CRM',description:'Leads, stages, values, owners and next actions.',kind:'database'},
  {id:'content',name:'Content calendar',description:'Ideas, production status, owner and publish date.',kind:'database'},
  {id:'hiring',name:'Hiring pipeline',description:'Candidates, role, stage, owner and interview date.',kind:'database'},
  {id:'okr',name:'Quarterly goals',description:'Company goals with owners, targets and progress.',kind:'goals'}
];

function freshState(){return {activeTab:'overview',databases:[],goals:[],templates:[],activity:[],createdAt:new Date().toISOString()}}
function load(){try{return {...freshState(),...(JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')||{})}}catch{return freshState()}}
let state=load();
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function log(action,detail=''){state.activity.unshift({id:uid(),action,detail,at:new Date().toISOString()});state.activity=state.activity.slice(0,250);save()}
function fmtDate(v){if(!v)return '—';try{return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric'}).format(new Date(v+'T12:00:00'))}catch{return v}}
function fmtTime(v){try{return new Date(v).toLocaleString()}catch{return v||''}}

function ensureNav(){
  if($('#workspaceV020'))return;
  const docs=$('.navItem[data-view="documents"]');
  if(!docs)return;
  const btn=document.createElement('button');
  btn.className='navItem';btn.id='workspaceV020';btn.type='button';
  btn.innerHTML='<i class="fi fi-rr-apps"></i><span>Workspace</span>';
  docs.insertAdjacentElement('afterend',btn);
}

function setActiveNav(){
  $$('.navItem').forEach(n=>n.classList.remove('active'));
  $('#workspaceV020')?.classList.add('active');
}
function setHeader(){
  const t=$('#pageTitle'),s=$('#pageSubtitle'),ctx=$('#aiContext');
  if(t)t.textContent='Workspace';
  if(s)s.textContent='Databases, goals, templates, activity and local insights.';
  if(ctx)ctx.textContent='Context: Workspace';
}
function tabs(){return `<div class="tabs v20Tabs">${[['overview','Overview'],['databases','Databases'],['goals','Goals'],['templates','Templates'],['activity','Activity']].map(([id,label])=>`<button class="tab ${state.activeTab===id?'active':''}" data-v20-tab="${id}">${label}</button>`).join('')}</div>`}

function metrics(){
  const rows=state.databases.reduce((n,d)=>n+(d.rows?.length||0),0);
  const avg=state.goals.length?Math.round(state.goals.reduce((n,g)=>n+Number(g.progress||0),0)/state.goals.length):0;
  return `<div class="grid metrics v20Metrics">
    <article class="card metric"><div class="metricLabel"><span>Databases</span></div><div class="metricValue"><strong>${state.databases.length}</strong><span class="chip good">Structured</span></div><p>${rows} total records</p></article>
    <article class="card metric"><div class="metricLabel"><span>Goals</span></div><div class="metricValue"><strong>${state.goals.length}</strong><span class="chip good">OKRs</span></div><p>${avg}% average progress</p></article>
    <article class="card metric"><div class="metricLabel"><span>Templates</span></div><div class="metricValue"><strong>${starterTemplates.length+state.templates.length}</strong><span class="chip good">Reusable</span></div><p>Built-in and custom systems</p></article>
    <article class="card metric"><div class="metricLabel"><span>Activity</span></div><div class="metricValue"><strong>${state.activity.length}</strong><span class="chip good">Local</span></div><p>Recent workspace actions</p></article>
  </div>`
}
function overview(){
  const rows=state.databases.reduce((n,d)=>n+(d.rows?.length||0),0),openGoals=state.goals.filter(g=>Number(g.progress||0)<100).length;
  return `${metrics()}<div class="grid twoCol v20OverviewGrid"><article class="card sectionCard"><div class="sectionHead"><div><h3>Local workspace brief</h3><p>Calculated from Qanteak data on this device. No paid AI service required.</p></div><button class="secondary" data-v20-refresh>Refresh</button></div><div class="v20Brief"><b>${rows} structured records across ${state.databases.length} databases.</b><p>${openGoals} goals remain in progress. ${state.activity.length} foundation actions have been recorded locally.</p></div></article><article class="card sectionCard"><div class="sectionHead"><div><h3>Quick start</h3><p>Build a repeatable workspace system.</p></div></div><div class="v20Quick"><button class="secondary" data-v20-new-db>+ Database</button><button class="secondary" data-v20-new-goal>+ Goal</button><button class="secondary" data-v20-tab="templates">Use template</button><button class="secondary" data-v20-export>Export JSON</button></div></article></div>`
}
function databaseCard(db){
  const rows=db.rows||[];
  return `<article class="card v20DbCard"><div class="v20CardHead"><div><h3>${esc(db.name)}</h3><p>${esc(db.description||'Structured workspace database')}</p></div><span class="chip good">${rows.length} rows</span></div><div class="v20DbPreview">${rows.slice(0,4).map(r=>`<div><b>${esc(r.name||'Untitled')}</b><span>${esc(r.status||r.stage||r.owner||'Record')}</span></div>`).join('')||'<div class="empty">No rows yet.</div>'}</div><div class="v20Actions"><button class="miniButton" data-v20-db-open="${db.id}">Open</button><button class="miniButton" data-v20-db-row="${db.id}">Add row</button><button class="miniButton" data-v20-db-delete="${db.id}">Delete</button></div></article>`
}
function databases(){return `<div class="v20Toolbar"><div><b>Structured databases</b><span>Use the same records as a table, board or calendar.</span></div><button class="primary" data-v20-new-db><i class="fi fi-rr-plus"></i> Database</button></div><div class="v20Grid">${state.databases.map(databaseCard).join('')||'<div class="empty">No databases yet. Create one or start from a template.</div>'}</div>`}
function goals(){return `<div class="v20Toolbar"><div><b>Goals & OKRs</b><span>Track outcomes next to the work that drives them.</span></div><button class="primary" data-v20-new-goal><i class="fi fi-rr-plus"></i> Goal</button></div><div class="v20GoalList">${state.goals.map(g=>`<article class="card v20Goal"><div><h3>${esc(g.title)}</h3><p>${esc(g.owner||'Workspace')} · ${esc(g.due?fmtDate(g.due):'No due date')}</p></div><div class="v20GoalProgress"><div class="progress"><i style="width:${Math.max(0,Math.min(100,Number(g.progress||0)))}%"></i></div><b>${Number(g.progress||0)}%</b></div><input type="range" min="0" max="100" step="5" value="${Number(g.progress||0)}" data-v20-goal-progress="${g.id}" aria-label="Goal progress"><button class="miniButton" data-v20-goal-delete="${g.id}">Delete</button></article>`).join('')||'<div class="empty">No goals yet.</div>'}</div>`}
function templates(){const custom=state.templates.map(t=>({...t,custom:true}));const all=[...starterTemplates,...custom];return `<div class="v20Toolbar"><div><b>Workspace templates</b><span>Reusable systems without an external marketplace.</span></div><button class="secondary" data-v20-new-template>+ Custom template</button></div><div class="v20Grid">${all.map(t=>`<article class="card v20Template"><div><span class="v20TemplateKind">${esc(t.kind||'custom')}</span><h3>${esc(t.name)}</h3><p>${esc(t.description||'Reusable workspace setup')}</p></div><button class="secondary" data-v20-template="${t.id}">${t.custom?'Create copy':'Use template'}</button></article>`).join('')}</div>`}
function activity(){return `<article class="card sectionCard"><div class="sectionHead"><div><h3>Workspace activity</h3><p>Local audit trail for the free foundation layer.</p></div><button class="secondary" data-v20-clear-activity>Clear</button></div><div class="listCard">${state.activity.map(a=>`<div class="listRow"><div><span class="title">${esc(a.action)}</span><span class="sub">${esc(a.detail||'Qanteak workspace')}</span></div><time>${esc(fmtTime(a.at))}</time></div>`).join('')||'<div class="empty">Activity will appear as you create and update workspace items.</div>'}</div></article>`}
function body(){return state.activeTab==='databases'?databases():state.activeTab==='goals'?goals():state.activeTab==='templates'?templates():state.activeTab==='activity'?activity():overview()}
function renderWorkspace(){ensureNav();setActiveNav();setHeader();const content=$('#content');if(!content)return;content.innerHTML=`${tabs()}<div class="v20Workspace">${body()}</div>`}

function modal(title,body,actions=''){
  let host=$('#v20Modal');
  if(!host){host=document.createElement('section');host.id='v20Modal';host.className='v20Modal';document.body.append(host)}
  host.innerHTML=`<div class="v20ModalCard"><div class="panelHead"><div><h3>${esc(title)}</h3><p>RC9 V0.20 local workspace foundation</p></div><button type="button" data-v20-close>×</button></div><div class="v20ModalBody">${body}</div>${actions}</div>`;
  host.classList.add('open')
}
function closeModal(){$('#v20Modal')?.classList.remove('open')}
function newDatabase(){modal('New database',`<div class="formGrid"><div class="field span2"><label>Name</label><input id="v20DbName" value="Team database" required></div><div class="field span2"><label>Description</label><input id="v20DbDesc" value="Structured Qanteak database"></div></div>`,`<div class="formActions"><button class="secondary" data-v20-close>Cancel</button><button class="primary" data-v20-db-create>Create database</button></div>`)}
function createDatabase(){const name=$('#v20DbName')?.value.trim();if(!name)return;state.databases.push({id:uid(),name,description:$('#v20DbDesc')?.value.trim()||'',view:'table',fields:[{key:'name',label:'Name',type:'text'},{key:'status',label:'Status',type:'select'},{key:'owner',label:'Owner',type:'text'},{key:'date',label:'Date',type:'date'}],rows:[]});log('Database created',name);closeModal();state.activeTab='databases';save();renderWorkspace()}
function newGoal(){modal('New goal',`<div class="formGrid"><div class="field span2"><label>Goal</label><input id="v20GoalTitle" required></div><div class="field"><label>Owner</label><input id="v20GoalOwner" value="Workspace"></div><div class="field"><label>Due date</label><input id="v20GoalDue" type="date"></div></div>`,`<div class="formActions"><button class="secondary" data-v20-close>Cancel</button><button class="primary" data-v20-goal-create>Create goal</button></div>`)}
function createGoal(){const title=$('#v20GoalTitle')?.value.trim();if(!title)return;state.goals.push({id:uid(),title,owner:$('#v20GoalOwner')?.value.trim()||'Workspace',due:$('#v20GoalDue')?.value||'',progress:0});log('Goal created',title);closeModal();state.activeTab='goals';save();renderWorkspace()}
function addRow(dbId){const db=state.databases.find(d=>d.id===dbId);if(!db)return;modal(`Add row · ${db.name}`,`<div class="formGrid"><div class="field span2"><label>Name</label><input id="v20RowName" required></div><div class="field"><label>Status / stage</label><input id="v20RowStatus" value="New"></div><div class="field"><label>Owner</label><input id="v20RowOwner" value="Workspace"></div><div class="field span2"><label>Date</label><input id="v20RowDate" type="date"></div></div>`,`<div class="formActions"><button class="secondary" data-v20-close>Cancel</button><button class="primary" data-v20-row-create="${db.id}">Add row</button></div>`)}
function createRow(dbId){const db=state.databases.find(d=>d.id===dbId),name=$('#v20RowName')?.value.trim();if(!db||!name)return;db.rows=db.rows||[];db.rows.push({id:uid(),name,status:$('#v20RowStatus')?.value.trim()||'New',owner:$('#v20RowOwner')?.value.trim()||'Workspace',date:$('#v20RowDate')?.value||''});log('Database row created',`${name} · ${db.name}`);closeModal();save();openDatabase(db.id)}
function tableView(db){return `<div class="v20Table"><div class="v20Tr v20Th"><span>Name</span><span>Status</span><span>Owner</span><span>Date</span></div>${(db.rows||[]).map(r=>`<div class="v20Tr"><span>${esc(r.name)}</span><span>${esc(r.status||'—')}</span><span>${esc(r.owner||'—')}</span><span>${esc(r.date?fmtDate(r.date):'—')}</span></div>`).join('')||'<div class="empty">No rows yet.</div>'}</div>`}
function boardView(db){const groups=[...new Set((db.rows||[]).map(r=>r.status||'Unsorted'))];return `<div class="v20Board">${groups.map(g=>`<div class="v20BoardCol"><div class="v20BoardHead">${esc(g)} <span>${(db.rows||[]).filter(r=>(r.status||'Unsorted')===g).length}</span></div>${(db.rows||[]).filter(r=>(r.status||'Unsorted')===g).map(r=>`<article class="v20BoardCard"><b>${esc(r.name)}</b><span>${esc(r.owner||'Workspace')}</span>${r.date?`<small>${esc(fmtDate(r.date))}</small>`:''}</article>`).join('')||'<div class="empty">Empty</div>'}</div>`).join('')||'<div class="empty">Add rows with statuses to use Board view.</div>'}</div>`}
function calendarView(db){const dated=(db.rows||[]).filter(r=>r.date).sort((a,b)=>String(a.date).localeCompare(String(b.date)));return `<div class="v20CalendarList">${dated.map(r=>`<div class="v20CalendarRow"><time>${esc(fmtDate(r.date))}</time><div><b>${esc(r.name)}</b><span>${esc(r.status||'')}</span></div></div>`).join('')||'<div class="empty">Add dates to database rows to use Calendar view.</div>'}</div>`}
function openDatabase(id){const db=state.databases.find(d=>d.id===id);if(!db)return;const view=db.view||'table';modal(db.name,`<div class="v20DbToolbar"><div class="tabs"><button class="tab ${view==='table'?'active':''}" data-v20-db-view="table" data-v20-db-id="${db.id}">Table</button><button class="tab ${view==='board'?'active':''}" data-v20-db-view="board" data-v20-db-id="${db.id}">Board</button><button class="tab ${view==='calendar'?'active':''}" data-v20-db-view="calendar" data-v20-db-id="${db.id}">Calendar</button></div><button class="primary" data-v20-db-row="${db.id}">+ Row</button></div><div id="v20DbView">${view==='board'?boardView(db):view==='calendar'?calendarView(db):tableView(db)}</div>`)}
function changeDbView(id,view){const db=state.databases.find(d=>d.id===id);if(!db)return;db.view=view;save();openDatabase(id)}
function applyTemplate(id){
  if(id==='crm')state.databases.push({id:uid(),name:'Sales CRM',description:'Lead pipeline and next actions.',view:'board',rows:[{id:uid(),name:'New opportunity',status:'Discovery',owner:'Workspace',date:''},{id:uid(),name:'Qualified lead',status:'Qualified',owner:'Workspace',date:''}]});
  else if(id==='content')state.databases.push({id:uid(),name:'Content calendar',description:'Plan and track content production.',view:'calendar',rows:[{id:uid(),name:'Launch announcement',status:'Idea',owner:'Workspace',date:''}]});
  else if(id==='hiring')state.databases.push({id:uid(),name:'Hiring pipeline',description:'Candidate tracking by hiring stage.',view:'board',rows:[{id:uid(),name:'Candidate example',status:'Screening',owner:'Hiring team',date:''}]});
  else if(id==='okr')state.goals.push({id:uid(),title:'Quarterly company objective',owner:'Workspace',due:'',progress:0});
  else {const t=state.templates.find(t=>t.id===id);if(t)state.databases.push({id:uid(),name:t.name,description:t.description||'Custom template copy',view:'table',rows:[]});}
  log('Template applied',id);save();state.activeTab=id==='okr'?'goals':'databases';renderWorkspace()
}
function newTemplate(){modal('Custom template',`<div class="formGrid"><div class="field span2"><label>Name</label><input id="v20TemplateName" required></div><div class="field span2"><label>Description</label><input id="v20TemplateDesc"></div></div>`,`<div class="formActions"><button class="secondary" data-v20-close>Cancel</button><button class="primary" data-v20-template-create>Create template</button></div>`)}
function createTemplate(){const name=$('#v20TemplateName')?.value.trim();if(!name)return;state.templates.push({id:uid(),name,description:$('#v20TemplateDesc')?.value.trim()||'',kind:'database'});log('Template created',name);closeModal();save();renderWorkspace()}
function exportJson(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='qanteak-workspace-foundations.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);log('Workspace exported','JSON backup created')}

ensureNav();
document.addEventListener('click',e=>{
  const el=e.target.closest?.('#workspaceV020,[data-v20-tab],[data-v20-new-db],[data-v20-db-create],[data-v20-db-open],[data-v20-db-row],[data-v20-row-create],[data-v20-db-view],[data-v20-db-delete],[data-v20-new-goal],[data-v20-goal-create],[data-v20-goal-delete],[data-v20-template],[data-v20-new-template],[data-v20-template-create],[data-v20-clear-activity],[data-v20-export],[data-v20-refresh],[data-v20-close]');
  if(!el)return;
  if(el.id==='workspaceV020'){e.preventDefault();renderWorkspace();return}
  if(el.dataset.v20Tab){state.activeTab=el.dataset.v20Tab;save();renderWorkspace();return}
  if(el.hasAttribute('data-v20-new-db')){newDatabase();return}
  if(el.hasAttribute('data-v20-db-create')){createDatabase();return}
  if(el.dataset.v20DbOpen){openDatabase(el.dataset.v20DbOpen);return}
  if(el.dataset.v20DbRow){addRow(el.dataset.v20DbRow);return}
  if(el.dataset.v20RowCreate){createRow(el.dataset.v20RowCreate);return}
  if(el.dataset.v20DbView){changeDbView(el.dataset.v20DbId,el.dataset.v20DbView);return}
  if(el.dataset.v20DbDelete){const db=state.databases.find(d=>d.id===el.dataset.v20DbDelete);if(db&&confirm(`Delete ${db.name}?`)){state.databases=state.databases.filter(d=>d.id!==db.id);log('Database deleted',db.name);renderWorkspace()}return}
  if(el.hasAttribute('data-v20-new-goal')){newGoal();return}
  if(el.hasAttribute('data-v20-goal-create')){createGoal();return}
  if(el.dataset.v20GoalDelete){const g=state.goals.find(x=>x.id===el.dataset.v20GoalDelete);state.goals=state.goals.filter(x=>x.id!==el.dataset.v20GoalDelete);if(g)log('Goal deleted',g.title);renderWorkspace();return}
  if(el.dataset.v20Template){applyTemplate(el.dataset.v20Template);return}
  if(el.hasAttribute('data-v20-new-template')){newTemplate();return}
  if(el.hasAttribute('data-v20-template-create')){createTemplate();return}
  if(el.hasAttribute('data-v20-clear-activity')){state.activity=[];save();renderWorkspace();return}
  if(el.hasAttribute('data-v20-export')){exportJson();return}
  if(el.hasAttribute('data-v20-refresh')){renderWorkspace();return}
  if(el.hasAttribute('data-v20-close')){closeModal();return}
});
document.addEventListener('input',e=>{const el=e.target.closest?.('[data-v20-goal-progress]');if(!el)return;const g=state.goals.find(x=>x.id===el.dataset.v20GoalProgress);if(!g)return;g.progress=Number(el.value);save();const card=el.closest('.v20Goal');card?.querySelector('.v20GoalProgress b')?.replaceChildren(document.createTextNode(`${g.progress}%`));const bar=card?.querySelector('.progress i');if(bar)bar.style.width=`${g.progress}%`});

window.addEventListener('storage',e=>{if(e.key===STORAGE_KEY){state=load();if($('#workspaceV020')?.classList.contains('active'))renderWorkspace()}});
