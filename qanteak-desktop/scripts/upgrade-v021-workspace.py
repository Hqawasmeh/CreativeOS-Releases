from pathlib import Path
import json,re

root=Path(__file__).resolve().parents[1]

def must(cond,msg):
    if not cond: raise SystemExit(msg)

def replace_once(s,old,new,label):
    must(old in s,f'{label}: marker missing')
    return s.replace(old,new,1)

# version metadata
for name in ['package.json','package-lock.json']:
    p=root/name
    data=json.loads(p.read_text())
    if name=='package.json':
        data['version']='1.0.0-rc.9.21'
        data['description']='Qanteak OS RC9 V0.21 workspace foundation'
    else:
        data['version']='1.0.0-rc.9.21'
        if '' in data.get('packages',{}): data['packages']['']['version']='1.0.0-rc.9.21'
    p.write_text(json.dumps(data,indent=2)+"\n")

# preflight
p=root/'scripts/preflight.mjs'; s=p.read_text()
s=s.replace("'CHANGELOG-RC9-V0.20.md'","'CHANGELOG-RC9-V0.21.md'")
s=s.replace("pkg.version !== '1.0.0-rc.9.20'","pkg.version !== '1.0.0-rc.9.21'")
s=s.replace("Qanteak preflight OK · 1.0.0-rc.9.20","Qanteak preflight OK · 1.0.0-rc.9.21")
if 'QANTEAK_WORKSPACE_V021_START' not in s:
    s=s.replace("if (!/QANTEAK_AI_V020_AGENT_START/.test(renderer)) fail.push('Qanteak AI V0.20 agent renderer is missing.');",
                "if (!/QANTEAK_AI_V020_AGENT_START/.test(renderer)) fail.push('Qanteak AI V0.20 agent renderer is missing.');\n  if (!/QANTEAK_WORKSPACE_V021_START/.test(renderer)) fail.push('Qanteak Workspace V0.21 renderer is missing.');")
p.write_text(s)

# index labels
p=root/'src/index.html'; s=p.read_text()
s=s.replace('RC9 V0.20','RC9 V0.21').replace('Qanteak OS RC9 V0.20','Qanteak OS RC9 V0.21')
p.write_text(s)

# renderer collections + foundation
p=root/'src/app.js'; s=p.read_text()
s=s.replace("'automations','notifications','members']","'automations','notifications','members','comments','activities','savedViews']")
if 'QANTEAK_WORKSPACE_V021_START' not in s:
    block=r'''

/* ================= QANTEAK_WORKSPACE_V021_START ================= */
state.comments=Array.isArray(state.comments)?state.comments:[];
state.activities=Array.isArray(state.activities)?state.activities:[];
state.savedViews=Array.isArray(state.savedViews)?state.savedViews:[];
state.projects=state.projects.map(p=>({...p,customFields:(p.customFields&&typeof p.customFields==='object')?p.customFields:{}}));
state.clients=state.clients.map(c=>({...c,customFields:(c.customFields&&typeof c.customFields==='object')?c.customFields:{}}));
if(!state.savedViews.length){
  state.savedViews=[
    {id:'sv-review',name:'Client review',kind:'project',field:'status',value:'Client review'},
    {id:'sv-delivery',name:'Delivery',kind:'project',field:'status',value:'Delivery'},
    {id:'sv-nike',name:'Nike work',kind:'project',field:'client',value:'Nike'}
  ];
}
state.preferences={...state.preferences,activeWorkView:state.preferences?.activeWorkView||''};

function v021Activity(entityType,entityId,title,body=''){
  state.activities.unshift({id:uid(),entityType,entityId,title,body,actor:currentUserName(),at:new Date().toISOString()});
  state.activities=state.activities.slice(0,300);
}
function v021Comments(entityType,entityId){return state.comments.filter(c=>c.entityType===entityType&&String(c.entityId)===String(entityId)).sort((a,b)=>String(a.at).localeCompare(String(b.at)))}
function v021ActivityRows(entityType,entityId){return state.activities.filter(a=>a.entityType===entityType&&String(a.entityId)===String(entityId)).slice(0,40)}
function v021MentionNames(text=''){return [...String(text).matchAll(/@([\w.-]+)/g)].map(m=>m[1].toLowerCase())}
function v021AddComment(entityType,entityId,text){
  const body=String(text||'').trim();if(!body)return;
  state.comments.push({id:uid(),entityType,entityId,body,author:currentUserName(),at:new Date().toISOString()});
  v021Activity(entityType,entityId,'Comment added',body.slice(0,160));
  const mentions=v021MentionNames(body);
  for(const m of mentions){
    const member=(state.members||[]).find(x=>String(x.name||x.email||'').toLowerCase().includes(m));
    if(member)state.notifications.unshift({id:uid(),title:`${currentUserName()} mentioned ${member.name||member.email}`,body:body.slice(0,180),read:false,category:'Mention'});
  }
  save();
}
function v021CommentsHtml(type,id){const rows=v021Comments(type,id);return `<div class="v021Comments">${rows.length?rows.map(c=>`<div class="v021Comment"><div><b>${esc(c.author)}</b><time>${new Date(c.at).toLocaleString()}</time></div><p>${esc(c.body)}</p></div>`).join(''):'<div class="empty">No comments yet.</div>'}<div class="v021CommentComposer"><textarea data-v021-comment-input="${type}:${id}" placeholder="Write a comment. Use @name to mention a teammate."></textarea><button class="primary" data-v021-comment-send="${type}:${id}">Comment</button></div></div>`}
function v021ActivityHtml(type,id){const rows=v021ActivityRows(type,id);return `<div class="v021Activity">${rows.length?rows.map(a=>`<div class="activityRow"><i class="fi fi-rr-time-past"></i><span><b>${esc(a.title)}</b><small>${esc(a.body||a.actor)}</small></span><time>${new Date(a.at).toLocaleDateString()}</time></div>`).join(''):'<div class="empty">Activity will appear here as the workspace changes.</div>'}</div>`}
function v021CustomFieldsHtml(type,row){const fields=row.customFields||{};const entries=Object.entries(fields);return `<div class="v021CustomFields">${entries.length?entries.map(([k,v])=>`<div class="contextBlock"><b>${esc(k)}</b><span>${esc(v)}</span><button class="miniButton" data-v021-field-remove="${type}:${row.id}:${encodeURIComponent(k)}">Remove</button></div>`).join(''):'<div class="empty">No custom fields yet.</div>'}<button class="secondary" data-v021-field-add="${type}:${row.id}">+ Custom field</button></div>`}

const v021ProjectDetailBase=projectDetailSection;
projectDetailSection=function(p,tab){
  const docs=state.documents.filter(d=>d.project===p.name),reviews=state.reviews.filter(r=>r.project===p.name||r.client===p.client);
  if(tab==='documents')return `<div class="detailSection"><h4>Documents</h4>${docs.length?docs.map(d=>`<button class="v021LinkedRow" data-open-doc="${d.id}"><b>${esc(d.title)}</b><span>${esc(d.type||'doc')} · ${esc(d.updated||'')}</span></button>`).join(''):'<p>No linked documents.</p>'}</div>`;
  if(tab==='reviews')return `<div class="detailSection"><h4>Reviews</h4>${reviews.length?reviews.map(r=>`<div class="v021LinkedRow"><b>${esc(r.name)}</b><span>${esc(r.status)} · ${esc(r.due||r.age||'')}</span></div>`).join(''):'<p>No linked reviews.</p>'}</div>`;
  if(tab==='comments')return `<div class="detailSection"><h4>Comments</h4>${v021CommentsHtml('project',p.id)}</div>`;
  if(tab==='fields')return `<div class="detailSection"><h4>Custom fields</h4>${v021CustomFieldsHtml('project',p)}</div>`;
  if(tab==='activity')return `<div class="detailSection"><h4>Activity</h4>${v021ActivityHtml('project',p.id)}</div>`;
  return v021ProjectDetailBase(p,tab);
}
openProject=function(id){const p=state.projects.find(x=>x.id===id);if(!p)return;$('#detailTitle').textContent=p.name;$('#detailSubtitle').textContent=`${p.client} · ${p.status}`;$('#detailBody').innerHTML=`<div class="detailGrid"><div class="detailMetric"><span>Progress</span><b>${p.progress}%</b></div><div class="detailMetric"><span>Due</span><b>${esc(p.due)}</b></div><div class="detailMetric"><span>Owner</span><b>${esc(p.owner)}</b></div></div><div class="tabs detailTabs v021DetailTabs">${['overview','tasks','files','documents','reviews','financials','comments','fields','activity'].map((t,i)=>`<button class="tab ${i===0?'active':''}" data-project-detail="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div><div id="detailSection">${projectDetailSection(p,'overview')}</div>`;$$('[data-project-detail]').forEach(b=>b.onclick=()=>{$$('[data-project-detail]').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#detailSection').innerHTML=projectDetailSection(p,b.dataset.projectDetail)});$('#detailModal').classList.add('open');setScrim(true)};

const v021ClientDetailBase=clientDetailSection;
clientDetailSection=function(c,tab){
  if(tab==='comments')return `<div class="detailSection"><h4>Comments</h4>${v021CommentsHtml('client',c.id)}</div>`;
  if(tab==='fields')return `<div class="detailSection"><h4>Custom fields</h4>${v021CustomFieldsHtml('client',c)}</div>`;
  if(tab==='activity')return `<div class="detailSection"><h4>Activity</h4>${v021ActivityHtml('client',c.id)}</div>`;
  return v021ClientDetailBase(c,tab);
}
openClient=function(id){const c=state.clients.find(x=>x.id===id);if(!c)return;$('#detailTitle').textContent=c.name;$('#detailSubtitle').textContent=c.relationship;const ps=state.projects.filter(p=>p.client===c.name);$('#detailBody').innerHTML=`<div class="detailGrid"><div class="detailMetric"><span>Lifetime value</span><b>${money(c.value)}</b></div><div class="detailMetric"><span>Outstanding</span><b>${money(c.outstanding)}</b></div><div class="detailMetric"><span>Active projects</span><b>${ps.length}</b></div></div><div class="tabs detailTabs v021DetailTabs">${['overview','projects','files','reviews','invoices','comments','fields','activity','portal'].map((t,i)=>`<button class="tab ${i===0?'active':''}" data-client-detail="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div><div id="detailSection">${clientDetailSection(c,'overview')}</div>`;$$('[data-client-detail]').forEach(b=>b.onclick=()=>{$$('[data-client-detail]').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#detailSection').innerHTML=clientDetailSection(c,b.dataset.clientDetail)});$('#detailModal').classList.add('open');setScrim(true)};

const v021DocumentEditorBase=documentEditor;
documentEditor=function(doc=state.documents[0]){const html=v021DocumentEditorBase(doc);return html.replace('<div class="editorBody" id="docBody" contenteditable="true">',`<div class="v021EditorToolbar"><button type="button" data-v021-format="bold"><b>B</b></button><button type="button" data-v021-format="italic"><i>I</i></button><button type="button" data-v021-format="insertUnorderedList">• List</button><button type="button" data-v021-block="h2">H2</button><button type="button" data-v021-block="blockquote">Quote</button><button type="button" data-v021-block="p">Text</button></div><div class="editorBody" id="docBody" contenteditable="true">`)};

const v021CommandDataBase=commandData;
commandData=function(){return [...v021CommandDataBase(),
  ...state.tasks.map(t=>({i:'T',title:t.title,sub:`Task · ${t.project} · ${t.done?'Done':t.due}`,action:'tab:work:tasks'})),
  ...state.reviews.map(r=>({i:'R',title:r.name,sub:`Review · ${r.client} · ${r.status}`,action:'tab:work:reviews'})),
  ...state.estimates.map(e=>({i:'E',title:`Estimate ${e.number}`,sub:`${e.client} · ${money(e.amount)} · ${e.status}`,action:'view:business'})),
  ...state.expenses.map(x=>({i:'X',title:x.name,sub:`Expense · ${x.category} · ${money(x.amount)}`,action:'view:business'})),
  ...state.comments.slice(-50).map(c=>({i:'@',title:c.body.slice(0,70),sub:`Comment · ${c.author}`,action:c.entityType==='project'?`project:${c.entityId}`:`client:${c.entityId}`}))
]};

const v021FilesBase=files;
files=function(){if(state.tabs.files!=='versions')return v021FilesBase();const groups=new Map();for(const f of state.files){const key=String(f.name||'').toLowerCase().replace(/([_-]?(v|ver|version)?\d+|[_-]?final|[_-]?copy)(?=\.[^.]+$)/gi,'');const arr=groups.get(key)||[];arr.push(f);groups.set(key,arr)}return `<div class="surfaceToolbar">${tabs('files',[['all','All files'],['versions','Versions'],['delivery','Delivery'],['connected','Connected']])}<button class="primary" id="uploadFiles">Upload files</button></div><article class="card sectionCard">${sectionTitle('Version groups','Files grouped into logical revision families.')}<div class="v021VersionGrid">${[...groups.values()].map(rows=>`<div class="v021VersionCard"><div><b>${esc(rows[0]?.name||'File group')}</b><span>${rows.length} version${rows.length===1?'':'s'}</span></div>${rows.sort((a,b)=>String(b.updated).localeCompare(String(a.updated))).map((f,i)=>`<div class="v021VersionRow"><span>${i===0?'<strong>Current</strong>':'Version'}</span><b>${esc(f.name)}</b><small>${esc(f.updated||'')}</small></div>`).join('')}</div>`).join('')}</div></article>`};

const v021WorkBase=work;
function v021ProjectFilter(rows){const id=state.preferences?.activeWorkView;if(!id)return rows;const v=state.savedViews.find(x=>x.id===id);if(!v)return rows;return rows.filter(r=>String(r[v.field]||'').toLowerCase()===String(v.value||'').toLowerCase())}
work=function(){const original=state.projects;if(state.tabs.work==='projects')state.projects=v021ProjectFilter(original);let html=v021WorkBase();state.projects=original;const chips=`<div class="v021SavedViews"><span>Saved views</span><button class="${!state.preferences.activeWorkView?'active':''}" data-v021-view="">All</button>${state.savedViews.filter(v=>v.kind==='project').map(v=>`<button class="${state.preferences.activeWorkView===v.id?'active':''}" data-v021-view="${v.id}">${esc(v.name)}</button>`).join('')}<button data-v021-save-view="1">+ Save current</button></div>`;return chips+html};

const v021BusinessBase=business;
business=function(){let html=v021BusinessBase();if(state.tabs.business!=='overview')return html;const paid=state.invoices.filter(i=>i.status==='Paid').reduce((a,i)=>a+calcInvoice(i).total,0);const expenses=state.expenses.reduce((a,x)=>a+Number(x.amount||0),0);const profit=paid-expenses;const margin=paid?Math.round((profit/paid)*1000)/10:0;const card=`<div class="grid overview v021Profit"><article class="card kpiCard"><h3>Paid revenue</h3><p>Recognized from paid invoices.</p><strong>${money(paid)}</strong></article><article class="card kpiCard"><h3>Tracked expenses</h3><p>Current workspace costs.</p><strong>${money(expenses)}</strong></article><article class="card kpiCard"><h3>Estimated profit</h3><p>${margin}% margin before untracked costs.</p><strong>${money(profit)}</strong></article></div>`;return card+html};

Object.assign(renderers,{work,clients,documents,files,business});

document.addEventListener('click',e=>{
  const send=e.target.closest?.('[data-v021-comment-send]');if(send){e.preventDefault();const [type,id]=send.dataset.v021CommentSend.split(':');const input=$(`[data-v021-comment-input="${type}:${id}"]`);v021AddComment(type,id,input?.value||'');if(type==='project')openProject(id);else openClient(id);return}
  const add=e.target.closest?.('[data-v021-field-add]');if(add){e.preventDefault();const [type,id]=add.dataset.v021FieldAdd.split(':');const row=(type==='project'?state.projects:state.clients).find(x=>String(x.id)===String(id));if(!row)return;const key=prompt('Custom field name');if(!key)return;const value=prompt(`Value for ${key}`,'')??'';row.customFields={...(row.customFields||{}),[key]:value};v021Activity(type,id,'Custom field updated',`${key}: ${value}`);save();type==='project'?openProject(id):openClient(id);return}
  const remove=e.target.closest?.('[data-v021-field-remove]');if(remove){e.preventDefault();const [type,id,raw]=remove.dataset.v021FieldRemove.split(':');const key=decodeURIComponent(raw);const row=(type==='project'?state.projects:state.clients).find(x=>String(x.id)===String(id));if(row?.customFields){delete row.customFields[key];v021Activity(type,id,'Custom field removed',key);save();type==='project'?openProject(id):openClient(id)}return}
  const fmt=e.target.closest?.('[data-v021-format]');if(fmt){e.preventDefault();document.execCommand(fmt.dataset.v021Format,false,null);$('#docBody')?.focus();return}
  const block=e.target.closest?.('[data-v021-block]');if(block){e.preventDefault();document.execCommand('formatBlock',false,block.dataset.v021Block);$('#docBody')?.focus();return}
  const view=e.target.closest?.('[data-v021-view]');if(view){e.preventDefault();state.preferences.activeWorkView=view.dataset.v021View;save();render('work');return}
  const sv=e.target.closest?.('[data-v021-save-view]');if(sv){e.preventDefault();const name=prompt('Saved view name');if(!name)return;const status=prompt('Project status to match (for example: Planning, In progress, Client review, Delivery)','In progress');if(!status)return;state.savedViews.push({id:uid(),name,kind:'project',field:'status',value:status});save();render('work');return}
},true);
/* ================= QANTEAK_WORKSPACE_V021_END ================= */
'''
    s += block
p.write_text(s)

# style additions
p=root/'src/styles.css'; s=p.read_text()
if 'QANTEAK_WORKSPACE_V021_STYLES' not in s:
    s += r'''

/* QANTEAK_WORKSPACE_V021_STYLES */
.v021DetailTabs{overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px}.v021Comments{display:grid;gap:12px}.v021Comment{border:1px solid var(--line);border-radius:12px;padding:12px;background:var(--surface)}.v021Comment>div{display:flex;justify-content:space-between;gap:12px}.v021Comment time,.v021Comment p{font-size:12px;color:var(--muted)}.v021Comment p{margin:8px 0 0;color:var(--text)}.v021CommentComposer{display:grid;gap:8px}.v021CommentComposer textarea{min-height:84px;resize:vertical;border:1px solid var(--line);border-radius:12px;padding:10px;background:var(--surface);color:var(--text)}.v021CustomFields{display:grid;gap:10px}.v021CustomFields .contextBlock{display:grid;grid-template-columns:minmax(120px,.8fr) 1fr auto;align-items:center;gap:12px}.v021EditorToolbar{display:flex;gap:6px;flex-wrap:wrap;border-bottom:1px solid var(--line);padding:10px 0;margin-bottom:14px}.v021EditorToolbar button{border:1px solid var(--line);background:var(--surface);color:var(--text);border-radius:8px;padding:6px 9px;cursor:pointer}.v021LinkedRow{width:100%;display:flex;align-items:center;justify-content:space-between;gap:16px;border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:var(--surface);color:var(--text);margin-bottom:8px;text-align:left}.v021LinkedRow span{color:var(--muted);font-size:12px}.v021SavedViews{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:0 0 12px}.v021SavedViews>span{font-size:12px;color:var(--muted);margin-right:4px}.v021SavedViews button{border:1px solid var(--line);border-radius:999px;background:var(--surface);color:var(--text);padding:6px 10px;font-size:12px}.v021SavedViews button.active{background:var(--brand);border-color:var(--brand);color:white}.v021VersionGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}.v021VersionCard{border:1px solid var(--line);border-radius:14px;padding:12px}.v021VersionCard>div:first-child{display:flex;justify-content:space-between;margin-bottom:10px}.v021VersionCard>div:first-child span{font-size:12px;color:var(--muted)}.v021VersionRow{display:grid;grid-template-columns:64px 1fr auto;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line)}.v021VersionRow span,.v021VersionRow small{font-size:11px;color:var(--muted)}.v021VersionRow strong{color:var(--good)}.v021Profit{margin-bottom:14px}@media(max-width:900px){.v021CustomFields .contextBlock{grid-template-columns:1fr}.v021VersionGrid{grid-template-columns:1fr}}
'''
p.write_text(s)

# changelog
(root/'CHANGELOG-RC9-V0.21.md').write_text('''# Qanteak OS RC9 V0.21\n\nWorkspace foundation development update.\n\n## Added\n- Project and client comments with @mention notifications.\n- Entity activity history foundation.\n- Project/client custom fields.\n- Rich document formatting toolbar.\n- Expanded universal search across tasks, reviews, estimates, expenses and comments.\n- Project saved views and reusable status filters.\n- File version grouping.\n- Project profitability summary using deterministic invoice and expense totals.\n- Expanded project/client detail navigation tying documents, reviews, finance and collaboration together.\n\n## Notes\n- This development update builds on the V0.20 AI branch and remains isolated from the public RC9 release until QA is complete.\n- Comments/activity/saved views are included in the shared workspace snapshot model.\n''')
print('Applied Qanteak RC9 V0.21 workspace foundation')
