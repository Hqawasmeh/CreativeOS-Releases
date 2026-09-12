from pathlib import Path
import json
import re

root = Path(__file__).resolve().parents[1]

def require(condition, message):
    if not condition:
        raise SystemExit(message)

def replace_once(text, old, new, label):
    require(old in text, f'{label}: expected source marker not found')
    return text.replace(old, new, 1)

# ---------------- Electron backend: authenticated AI Edge Function call ----------------
backend = root / 'electron/backend.cjs'
s = backend.read_text(encoding='utf-8')
if 'async function aiAsk(payload={})' not in s:
    marker = '\nmodule.exports={'
    require(marker in s, 'backend exports marker missing')
    addition = r'''

async function aiAsk(payload={}){
  const c=loadConfig(),s=await validSession();
  if(!configured())throw new Error('Qanteak cloud backend is not configured.');
  if(!s?.access_token)throw new Error('Sign in to Qanteak before using AI.');
  const message=String(payload?.message||'').trim();
  if(!message)throw new Error('Ask Qanteak something first.');
  const mode=['ask','do','watch'].includes(String(payload?.mode))?String(payload.mode):'ask';
  const history=Array.isArray(payload?.history)?payload.history.slice(-12):[];
  const context=payload?.context&&typeof payload.context==='object'?payload.context:{};
  return jsonFetch(`${c.url}/functions/v1/qanteak-ai`,{
    method:'POST',
    headers:{apikey:c.key,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json'},
    body:JSON.stringify({message:message.slice(0,8000),mode,history,context})
  },45000);
}
'''
    s = s.replace(marker, addition + marker, 1)
    m = re.search(r'module\.exports=\{([^}]*)\};', s)
    require(m, 'backend module.exports declaration missing')
    exports = m.group(1)
    if 'aiAsk' not in exports.split(','):
        new_exports = exports.rstrip() + ',aiAsk'
        s = s[:m.start(1)] + new_exports + s[m.end(1):]
backend.write_text(s, encoding='utf-8')

# ---------------- Main process IPC ----------------
main = root / 'electron/main.cjs'
s = main.read_text(encoding='utf-8')
if "ipcMain.handle('ai:ask'" not in s:
    needle = "ipcMain.handle('backend:status', () => backend.authStatus());"
    s = replace_once(s, needle, needle + "\nipcMain.handle('ai:ask', (_e,payload) => backend.aiAsk(payload || {}));", 'main AI IPC')
s = s.replace("title: 'Qanteak OS RC9 V0.13'", "title: 'Qanteak OS RC9 V0.20'", 1)
main.write_text(s, encoding='utf-8')

# ---------------- Preload bridge ----------------
preload = root / 'electron/preload.cjs'
s = preload.read_text(encoding='utf-8')
if 'aiAsk:(payload)' not in s:
    needle = "  backendStatus:()=>ipcRenderer.invoke('backend:status'),"
    s = replace_once(s, needle, needle + "\n  aiAsk:(payload)=>ipcRenderer.invoke('ai:ask',payload),", 'preload AI bridge')
preload.write_text(s, encoding='utf-8')

# ---------------- AI panel UI ----------------
index = root / 'src/index.html'
s = index.read_text(encoding='utf-8')
s = s.replace('Qanteak OS RC9 V0.19', 'Qanteak OS RC9 V0.20')
s = s.replace('Qanteak OS · RC9 V0.19', 'Qanteak OS · RC9 V0.20')
s = s.replace('>RC9 V0.19<', '>RC9 V0.20<')
old_panel = re.search(r'<section class="aiPanel" id="aiPanel">.*?</section>', s, flags=re.S)
require(old_panel, 'AI panel markup missing')
new_panel = '''<section class="aiPanel" id="aiPanel">
  <div class="aiHead"><div><strong><i class="fi fi-rr-sparkles"></i> Qanteak AI</strong><span id="aiContext">Context: Home</span></div><button data-close="ai">×</button></div>
  <div class="aiModeTabs" role="tablist" aria-label="Qanteak AI mode">
    <button type="button" class="active" data-ai-mode="ask"><b>Ask</b><span>Understand & analyze</span></button>
    <button type="button" data-ai-mode="do"><b>Do</b><span>Prepare actions</span></button>
    <button type="button" data-ai-mode="watch"><b>Watch</b><span>Create monitoring rules</span></button>
  </div>
  <div class="aiModeHint" id="aiModeHint">Ask across projects, tasks, clients, files, reviews, documents and business data.</div>
  <div class="aiMessages" id="aiMessages"><div class="bubble ai">I understand the connected workspace around your current screen. Ask me to analyze the work, prepare an action, or create a watch rule.</div></div>
  <form class="aiComposer" id="aiForm"><input id="aiInput" autocomplete="off" placeholder="Ask Qanteak about your work"><button aria-label="Send"><i class="fi fi-rr-arrow-right"></i></button></form>
</section>'''
s = s[:old_panel.start()] + new_panel + s[old_panel.end():]
index.write_text(s, encoding='utf-8')

# ---------------- Renderer agent foundation ----------------
app = root / 'src/app.js'
s = app.read_text(encoding='utf-8')
if 'QANTEAK_AI_V020_AGENT_START' not in s:
    agent = r'''

/* ================= QANTEAK_AI_V020_AGENT_START ================= */
let qanteakAiMode='ask';
let qanteakAiHistory=[];
const qanteakAiPendingActions=new Map();

function qanteakAiEntityContext(){
  const title=$('#detailTitle')?.textContent?.trim()||'';
  const project=state.projects.find(p=>p.name===title)||null;
  const client=state.clients.find(c=>c.name===title)||null;
  const docTitle=$('#docTitle')?.value?.trim()||'';
  const document=state.documents.find(d=>d.title===docTitle)||null;
  if(project)return{type:'project',id:project.id,name:project.name};
  if(client)return{type:'client',id:client.id,name:client.name};
  if(document)return{type:'document',id:document.id,name:document.title};
  return null;
}

function qanteakAiWorkspaceContext(){
  const unpaid=state.invoices.filter(i=>i.status!=='Paid').map(i=>({id:i.id,number:i.number,client:i.client,project:i.project,status:i.status,due:i.due,total:calcInvoice(i).total}));
  const paid=state.invoices.filter(i=>i.status==='Paid').map(i=>({id:i.id,number:i.number,client:i.client,project:i.project,status:i.status,due:i.due,total:calcInvoice(i).total}));
  const outstandingTotal=unpaid.reduce((sum,i)=>sum+Number(i.total||0),0);
  const overdueTotal=unpaid.filter(i=>i.status==='Overdue').reduce((sum,i)=>sum+Number(i.total||0),0);
  const paidRevenue=paid.reduce((sum,i)=>sum+Number(i.total||0),0);
  return {
    screen:{view:state.view,label:meta[state.view]?.[0]||state.view,entity:qanteakAiEntityContext()},
    workspace:{name:state.preferences?.workspaceName||'Qanteak Workspace',today:isoToday()},
    projects:state.projects.slice(0,80).map(p=>({id:p.id,name:p.name,client:p.client,status:p.status,progress:p.progress,due:p.due,owner:p.owner,description:p.description})),
    tasks:state.tasks.slice(0,160).map(t=>({id:t.id,title:t.title,project:t.project,client:t.client||'',due:t.due,date:t.date||'',done:!!t.done,priority:t.priority||''})),
    clients:state.clients.slice(0,80).map(c=>({id:c.id,name:c.name,company:c.company,email:c.email,relationship:c.relationship,projects:state.projects.filter(p=>p.client===c.name).length})),
    reviews:state.reviews.slice(0,100).map(r=>({id:r.id,name:r.name,client:r.client,project:r.project,status:r.status,due:r.due,age:r.age})),
    documents:state.documents.slice(0,80).map(d=>({id:d.id,title:d.title,project:d.project,client:d.client,type:d.type,updated:d.updated})),
    files:state.files.slice(0,120).map(f=>({id:f.id,name:f.name,project:f.project,version:f.version,review:f.review,updated:f.updated,group:f.group})),
    finance:{paidRevenue,outstandingTotal,overdueTotal,paidInvoices:paid,unpaidInvoices:unpaid,expensesTotal:state.expenses.reduce((sum,x)=>sum+Number(x.amount||0),0)},
    leads:state.leads.slice(0,50).map(l=>({id:l.id,name:l.name,value:l.value,stage:l.stage,next:l.next})),
    automations:state.automations.slice(0,80).map(a=>({id:a.id,name:a.name,rule:a.rule,on:!!a.on}))
  };
}

function qanteakAiUpdateContextLabel(){
  const node=$('#aiContext');if(!node)return;
  const ctx=qanteakAiEntityContext();
  node.textContent=`Context: ${ctx?.name||meta[state.view]?.[0]||'Workspace'}`;
}

function qanteakAiAppendBubble(kind,html,extraClass=''){
  const host=$('#aiMessages');if(!host)return null;
  const node=document.createElement('div');node.className=`bubble ${kind} ${extraClass}`.trim();node.innerHTML=html;host.append(node);host.scrollTop=host.scrollHeight;return node;
}

function qanteakAiPlanHtml(plan=[]){
  if(!Array.isArray(plan)||!plan.length)return'';
  return `<div class="aiPlan"><b>Plan</b><ol>${plan.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div>`;
}

function qanteakAiActionHtml(action){
  const id=esc(action.id),label=esc(action.label||action.tool),tool=esc(action.tool);
  return `<div class="aiActionCard" data-ai-action-card="${id}"><div><span class="aiActionType">Proposed action</span><b>${label}</b><small>${tool.replaceAll('_',' ')} · requires confirmation</small></div><div class="aiActionButtons"><button type="button" class="secondary" data-ai-dismiss="${id}">Dismiss</button><button type="button" class="primary" data-ai-confirm="${id}">Confirm</button></div></div>`;
}

function qanteakAiRenderResponse(result){
  const actions=Array.isArray(result?.actions)?result.actions:[];
  actions.forEach(a=>{if(a?.id)qanteakAiPendingActions.set(String(a.id),a)});
  const actionHtml=actions.map(qanteakAiActionHtml).join('');
  qanteakAiAppendBubble('ai',`<div>${esc(result?.message||'I need more context to help with that.')}</div>${qanteakAiPlanHtml(result?.plan)}${actionHtml}`);
}

function qanteakAiFallback(message,error){
  const local=aiReply(message);
  qanteakAiAppendBubble('ai',`<div>${esc(local)}</div><small class="aiFallback">AI service unavailable; this answer used Qanteak's local deterministic workspace fallback${error?.message?`: ${esc(error.message)}`:''}.</small>`);
}

async function qanteakAiAsk(message){
  const text=String(message||'').trim();if(!text)return;
  qanteakAiAppendBubble('user',esc(text));
  qanteakAiHistory.push({role:'user',content:text});qanteakAiHistory=qanteakAiHistory.slice(-12);
  const thinking=qanteakAiAppendBubble('ai','<span class="aiThinking"><i></i><i></i><i></i> Thinking across your workspace…</span>','thinking');
  try{
    if(!window.qanteakDesktop?.aiAsk)throw new Error('This build does not include the AI bridge.');
    const result=await window.qanteakDesktop.aiAsk({message:text,mode:qanteakAiMode,history:qanteakAiHistory.slice(0,-1),context:qanteakAiWorkspaceContext()});
    thinking?.remove();
    qanteakAiRenderResponse(result);
    qanteakAiHistory.push({role:'assistant',content:String(result?.message||'')});qanteakAiHistory=qanteakAiHistory.slice(-12);
  }catch(error){
    thinking?.remove();qanteakAiFallback(text,error);
  }
}

function qanteakAiFindTask(args={}){return state.tasks.find(t=>String(t.id)===String(args.id||args.task_id||''))||state.tasks.find(t=>String(t.title).toLowerCase()===String(args.title||args.task_title||'').toLowerCase())}
function qanteakAiArg(args,...keys){for(const k of keys)if(args?.[k]!==undefined&&args?.[k]!==null&&String(args[k]).trim()!=='')return args[k];return''}

async function qanteakAiExecute(action){
  const args=action?.arguments||{};const tool=action?.tool;
  if(tool==='create_task'){
    if(!requireAccess('tasks','create','tasks'))return false;
    state.tasks.unshift({id:uid(),title:String(qanteakAiArg(args,'title','name')||'New task'),project:String(qanteakAiArg(args,'project','project_name')||'Unassigned'),client:String(qanteakAiArg(args,'client','client_name')||''),due:String(qanteakAiArg(args,'due','due_label')||'No due date'),date:String(qanteakAiArg(args,'date','due_date')||''),priority:String(args.priority||''),done:false});
  }else if(tool==='update_task'){
    if(!requireAccess('tasks','edit','tasks'))return false;
    const task=qanteakAiFindTask(args);if(!task)throw new Error('The task could not be found.');
    if(qanteakAiArg(args,'new_title','title'))task.title=String(qanteakAiArg(args,'new_title','title'));
    if(qanteakAiArg(args,'project','project_name'))task.project=String(qanteakAiArg(args,'project','project_name'));
    if(qanteakAiArg(args,'due'))task.due=String(args.due);
    if(qanteakAiArg(args,'date','due_date'))task.date=String(qanteakAiArg(args,'date','due_date'));
    if(args.done!==undefined)task.done=!!args.done;
  }else if(tool==='create_project'){
    if(!requireAccess('projects','create','projects'))return false;
    state.projects.unshift({id:uid(),name:String(qanteakAiArg(args,'name','title')||'New project'),client:String(qanteakAiArg(args,'client','client_name')||'Internal'),status:String(args.status||'Planning'),progress:Number(args.progress)||0,due:String(qanteakAiArg(args,'due','due_date')||'No due date'),owner:currentUserName(),description:String(args.description||'Created with Qanteak AI.')});
  }else if(tool==='create_document'){
    if(!requireAccess('documents','create','documents'))return false;
    state.documents.unshift({id:uid(),title:String(qanteakAiArg(args,'title','name')||'New document'),project:String(qanteakAiArg(args,'project','project_name')||'Unassigned'),client:String(qanteakAiArg(args,'client','client_name')||'Internal'),owner:currentUserName(),updated:'Just now',type:String(args.type||'doc'),body:`<h2>${esc(String(args.heading||'Notes'))}</h2><p>${esc(String(args.body||args.content||'Created with Qanteak AI.'))}</p>`});
  }else if(tool==='draft_invoice'){
    if(!requireAccess('business','create','invoices'))return false;
    const amount=Number(qanteakAiArg(args,'amount','total'))||0;
    state.invoices.unshift({id:uid(),number:'#QTK-'+String(Math.floor(2000+Math.random()*8000)),client:String(qanteakAiArg(args,'client','client_name')||'Client'),project:String(qanteakAiArg(args,'project','project_name')||'Project'),amount,status:'Draft',due:String(qanteakAiArg(args,'due','due_date')||'Not sent'),items:[{description:String(args.description||'Creative services'),qty:1,rate:amount}],discount:0,tax:0});
  }else if(tool==='create_reminder'){
    if(!requireAccess('tasks','create','reminders'))return false;
    state.tasks.unshift({id:uid(),title:String(qanteakAiArg(args,'title','message')||'Reminder'),project:String(qanteakAiArg(args,'project','project_name')||'Unassigned'),client:String(qanteakAiArg(args,'client','client_name')||''),due:String(qanteakAiArg(args,'due','when')||'Reminder'),date:String(qanteakAiArg(args,'date','due_date')||''),priority:'Reminder',done:false});
  }else if(tool==='create_automation'){
    if(!requireAccess('business','create','automations'))return false;
    const trigger=String(qanteakAiArg(args,'trigger','when')||'condition is met');const actionText=String(qanteakAiArg(args,'action','then')||'notify me');
    state.automations.unshift({id:uid(),icon:'↯',name:String(qanteakAiArg(args,'name','title')||'Qanteak AI watch'),rule:`WHEN ${trigger} → ${actionText}`,on:true});
  }else throw new Error('This action is not enabled in Qanteak AI yet.');
  save();render(state.view);return true;
}

async function qanteakAiConfirm(id,button){
  const action=qanteakAiPendingActions.get(String(id));if(!action)return;
  if(button){button.disabled=true;button.textContent='Working…'}
  try{const ok=await qanteakAiExecute(action);if(!ok)return;qanteakAiPendingActions.delete(String(id));const card=document.querySelector(`[data-ai-action-card="${CSS.escape(String(id))}"]`);if(card){card.classList.add('completed');card.querySelector('.aiActionButtons').innerHTML='<span class="chip good">Completed</span>'}qanteakAiAppendBubble('ai',`Done: ${esc(action.label||action.tool)}.`)}catch(error){toast('AI action failed',error?.message||'Could not complete the action.');if(button){button.disabled=false;button.textContent='Confirm'}}
}

function qanteakAiSetMode(mode){
  if(!['ask','do','watch'].includes(mode))return;qanteakAiMode=mode;
  $$('[data-ai-mode]').forEach(b=>b.classList.toggle('active',b.dataset.aiMode===mode));
  const hint=$('#aiModeHint'),input=$('#aiInput');
  if(mode==='ask'){if(hint)hint.textContent='Ask across projects, tasks, clients, files, reviews, documents and business data.';if(input)input.placeholder='Ask Qanteak about your work'}
  if(mode==='do'){if(hint)hint.textContent='Describe what you want done. Qanteak will prepare safe actions for your approval.';if(input)input.placeholder='What should Qanteak prepare or change?'}
  if(mode==='watch'){if(hint)hint.textContent='Describe what Qanteak should watch. It will prepare an automation rule for approval.';if(input)input.placeholder='What should Qanteak watch for?'}
}

// Capture AI submits before the old keyword-response handler so the agent owns this surface.
document.addEventListener('submit',e=>{
  if(e.target?.id!=='aiForm')return;e.preventDefault();e.stopImmediatePropagation();
  const input=$('#aiInput');const value=input?.value||'';if(input)input.value='';qanteakAiAsk(value);
},true);

document.addEventListener('click',e=>{
  const mode=e.target.closest?.('[data-ai-mode]');if(mode){e.preventDefault();e.stopImmediatePropagation();qanteakAiSetMode(mode.dataset.aiMode);return}
  const confirmButton=e.target.closest?.('[data-ai-confirm]');if(confirmButton){e.preventDefault();e.stopImmediatePropagation();qanteakAiConfirm(confirmButton.dataset.aiConfirm,confirmButton);return}
  const dismiss=e.target.closest?.('[data-ai-dismiss]');if(dismiss){e.preventDefault();e.stopImmediatePropagation();qanteakAiPendingActions.delete(String(dismiss.dataset.aiDismiss));dismiss.closest('[data-ai-action-card]')?.remove();return}
  if(e.target.closest?.('#openAi,#askQanteak,#openBriefAi,#openBriefAi2,#askFromDoc,#aiEdgeTab'))setTimeout(qanteakAiUpdateContextLabel,0);
},true);

qanteakAiSetMode('ask');
/* ================= QANTEAK_AI_V020_AGENT_END ================= */
'''
    s += agent
s = s.replace('Qanteak OS RC9 V0.19 · 1.0.0-rc.9.19', 'Qanteak OS RC9 V0.20 · 1.0.0-rc.9.20')
app.write_text(s, encoding='utf-8')

# ---------------- Styles ----------------
styles = root / 'src/styles.css'
s = styles.read_text(encoding='utf-8')
if 'QANTEAK_AI_V020_STYLES_START' not in s:
    s += r'''

/* QANTEAK_AI_V020_STYLES_START */
.aiModeTabs{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;padding:12px 14px 8px;border-bottom:1px solid var(--line,#e6e9ef)}
.aiModeTabs button{border:1px solid var(--line,#e1e5ec);background:var(--card,#fff);border-radius:12px;padding:9px 8px;text-align:left;cursor:pointer;color:inherit}
.aiModeTabs button b,.aiModeTabs button span{display:block}.aiModeTabs button b{font-size:12px}.aiModeTabs button span{font-size:9px;color:var(--muted,#747d89);margin-top:2px}
.aiModeTabs button.active{border-color:#78b9ff;background:linear-gradient(135deg,#edf7ff,#effdff);box-shadow:0 7px 20px rgba(13,127,242,.08)}
.aiModeHint{padding:6px 16px 10px;font-size:10px;line-height:1.45;color:var(--muted,#747d89);border-bottom:1px solid var(--line,#e6e9ef)}
.bubble.user{align-self:flex-end;background:#0a2d82;color:#fff}.bubble.thinking{opacity:.72}.aiThinking{display:flex;align-items:center;gap:4px}.aiThinking i{display:block;width:5px;height:5px;border-radius:50%;background:currentColor;animation:qanteakAiDot 1s infinite ease-in-out}.aiThinking i:nth-child(2){animation-delay:.14s}.aiThinking i:nth-child(3){animation-delay:.28s}@keyframes qanteakAiDot{0%,100%{opacity:.25;transform:translateY(0)}50%{opacity:1;transform:translateY(-2px)}}
.aiPlan{margin-top:10px;padding:10px 11px;border-radius:11px;background:rgba(13,127,242,.06);font-size:10px}.aiPlan b{display:block;margin-bottom:5px}.aiPlan ol{margin:0;padding-left:17px}.aiPlan li+li{margin-top:4px}
.aiActionCard{margin-top:10px;padding:11px;border:1px solid #cddff4;border-radius:12px;background:var(--card,#fff);display:grid;gap:10px}.aiActionCard>div:first-child{display:grid;gap:3px}.aiActionType{text-transform:uppercase;letter-spacing:.08em;font-size:8px;font-weight:800;color:#0d7ff2}.aiActionCard b{font-size:11px}.aiActionCard small{font-size:9px;color:var(--muted,#747d89)}.aiActionButtons{display:flex;justify-content:flex-end;gap:7px}.aiActionButtons button{min-height:31px;padding:6px 10px;font-size:9px;border-radius:9px}.aiActionCard.completed{border-color:#8bd3aa;background:rgba(27,157,85,.05)}
.aiFallback{display:block;margin-top:8px;opacity:.68;font-size:9px;line-height:1.45}
@media(max-width:600px){.aiModeTabs{grid-template-columns:1fr}.aiModeTabs button span{display:none}}
/* QANTEAK_AI_V020_STYLES_END */
'''
styles.write_text(s, encoding='utf-8')

# ---------------- Version/changelog/docs ----------------
pkg_path = root / 'package.json'
pkg = json.loads(pkg_path.read_text(encoding='utf-8'))
pkg['version'] = '1.0.0-rc.9.20'
pkg['description'] = 'Qanteak OS RC9 V0.20 AI agent foundation'
pkg_path.write_text(json.dumps(pkg, indent=2) + '\n', encoding='utf-8')

lock_path = root / 'package-lock.json'
if lock_path.exists():
    lock = json.loads(lock_path.read_text(encoding='utf-8'))
    lock['version'] = '1.0.0-rc.9.20'
    if isinstance(lock.get('packages'), dict) and isinstance(lock['packages'].get(''), dict):
        lock['packages']['']['version'] = '1.0.0-rc.9.20'
    lock_path.write_text(json.dumps(lock, indent=2) + '\n', encoding='utf-8')

(root / 'CHANGELOG-RC9-V0.20.md').write_text('''# Qanteak OS RC9 V0.20\n\nAI agent foundation development release.\n\n## Added\n- Ask / Do / Watch modes in Qanteak AI.\n- Authenticated server-side AI endpoint; model credentials are never bundled in the desktop app.\n- Workspace-aware conversation context across projects, tasks, clients, files, reviews, documents and deterministic business totals.\n- Multi-turn conversation context.\n- AI plans and confirmation cards for safe workspace actions.\n- Initial tools: create/update task, create project, create document, draft invoice, reminder and automation.\n- Permission checks and mandatory confirmation for all AI writes in this release.\n- Deterministic financial totals remain calculated by Qanteak code, not the language model.\n\n## Not enabled yet\n- Sending emails or invoices.\n- Destructive file/project actions.\n- Payments or refunds.\n- Fully autonomous background agents.\n- Server-side retrieval over normalized records; V0.20 sends a compact authenticated workspace context packet.\n''', encoding='utf-8')

(root / 'AI_ARCHITECTURE.md').write_text('''# Qanteak AI architecture\n\nQanteak AI is an agent over the Qanteak workspace, not a keyword search layer.\n\n## Modes\n- **Ask**: reason over connected workspace context.\n- **Do**: prepare safe workspace actions for explicit approval.\n- **Watch**: prepare monitoring/automation rules.\n\n## Trust boundary\nThe desktop sends the minimum useful structured workspace context through the authenticated Electron backend to the `qanteak-ai` Supabase Edge Function. The model provider key exists only as the Edge Function secret `OPENAI_API_KEY`. The language model never receives direct database write credentials and never mutates workspace data directly.\n\nEvery write returned by the model is a proposal. Qanteak validates the tool name, applies normal workspace permission checks, shows the proposed action, and executes it only after the user confirms.\n\n## Finance\nQanteak code calculates invoice totals, outstanding balances, overdue balances, expenses and paid revenue. The AI may explain those deterministic values but must not invent financial totals.\n\n## Initial tools\n`create_task`, `update_task`, `create_project`, `create_document`, `draft_invoice`, `create_reminder`, `create_automation`.\n\nExternal, destructive and money-moving actions remain disabled in V0.20.\n''', encoding='utf-8')

# Remove temporary planning markers if they exist on the development branch.
for name in ['AI_AGENT_V020_PLAN.md','AI_AGENT_V020_STATUS.md','AI_AGENT_V020_STATUS5.md','AI_AGENT_V020_STATUS6.md','AI_AGENT_IMPLEMENTATION_READY.md','NOOP.md']:
    p=root/name
    if p.exists(): p.unlink()

print('Applied Qanteak AI RC9 V0.20 agent foundation')
