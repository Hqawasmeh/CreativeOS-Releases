from pathlib import Path
import json, textwrap

root = Path(__file__).resolve().parents[1]

def replace_required(text, old, new, label):
    if old not in text:
        if new in text:
            return text
        raise SystemExit(f"Upgrade failed: {label} insertion point not found")
    return text.replace(old, new, 1)

# Version and build QA
pkg_path = root / 'package.json'
pkg = json.loads(pkg_path.read_text())
if pkg.get('version') not in ('1.0.0-rc.9.13', '1.0.0-rc.9.14'):
    raise SystemExit(f"Unexpected source version: {pkg.get('version')}")
pkg['version'] = '1.0.0-rc.9.14'
pkg['description'] = 'Qanteak OS RC9 V0.14 cloud, permissions, resilience, recovery and update hardening'
pkg.setdefault('scripts', {})['qa:interactions'] = 'node scripts/interaction-smoke.mjs'
pkg['scripts']['build'] = 'node scripts/preflight.mjs && node --experimental-vm-modules scripts/renderer-module-smoke.cjs && node scripts/interaction-smoke.mjs && node scripts/build-renderer.mjs'
pkg_path.write_text(json.dumps(pkg, indent=2) + '\n')

lock = root / 'package-lock.json'
lock.write_text(lock.read_text().replace('"version": "1.0.0-rc.9.13"', '"version": "1.0.0-rc.9.14"', 2))

preflight = root / 'scripts/preflight.mjs'
p = preflight.read_text()
p = p.replace("'CHANGELOG-RC9-V0.13.md'", "'CHANGELOG-RC9-V0.14.md'")
p = p.replace("pkg.version !== '1.0.0-rc.9.13'", "pkg.version !== '1.0.0-rc.9.14'")
p = p.replace('Qanteak preflight OK · 1.0.0-rc.9.13', 'Qanteak preflight OK · 1.0.0-rc.9.14')
preflight.write_text(p)

# Backend cloud/recovery/permissions/telemetry
backend = root / 'electron/backend.cjs'
s = backend.read_text()
needle = "async function acceptInvite(token){const rows=await rpc('q_accept_workspace_invite',{p_token:token});return Array.isArray(rows)?rows[0]:rows}\n"
additions = textwrap.dedent("""\
async function createInviteAndEmail(workspaceId,email,role='Editor',access=['Everything']){const c=loadConfig(),sess=await validSession();if(!sess?.access_token)throw new Error('Sign in first.');return jsonFetch(`${c.url}/functions/v1/qanteak-invite-email`,{method:'POST',headers:{apikey:c.key,Authorization:`Bearer ${sess.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({workspaceId,email,role,access})},30000)}
async function setMemberAccess(workspaceId,userId,role,access){const rows=await rpc('q_set_member_access',{p_workspace_id:workspaceId,p_user_id:userId,p_role:role,p_access:access});return Array.isArray(rows)?rows[0]:rows}
async function listBackups(workspaceId){return rest(`q_workspace_backups?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=id,workspace_id,revision,reason,created_by,created_at,archived_at&order=created_at.desc&limit=50`)}
async function createBackup(workspaceId,reason='manual'){const rows=await rpc('q_create_workspace_backup',{p_workspace_id:workspaceId,p_reason:reason});return Array.isArray(rows)?rows[0]:rows}
async function restoreBackup(backupId){const rows=await rpc('q_restore_workspace_backup',{p_backup_id:backupId});return Array.isArray(rows)?rows[0]:rows}
async function archiveBackup(id,archived=true){const rows=await rest(`q_workspace_backups?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:{archived_at:archived?new Date().toISOString():null},prefer:'return=representation'});return rows?.[0]||null}
async function reportTelemetry({workspaceId=null,appVersion='',platform='',kind='renderer-error',message='',stack='',context={}}={}){const sess=await validSession();if(!sess?.user?.id||!message)return{ok:false};try{await rest('q_crash_telemetry',{method:'POST',body:{user_id:sess.user.id,workspace_id:workspaceId||null,app_version:appVersion||null,platform:platform||null,kind,message:String(message).slice(0,4000),stack:String(stack||'').slice(0,12000),context:context||{}},prefer:'return=minimal'});return{ok:true}}catch{return{ok:false}}}
async function connectivity(){const started=Date.now();try{await validSession();if(!configured())return{online:false,configured:false,latencyMs:null};await rest('q_workspaces?select=id&limit=1');return{online:true,configured:true,latencyMs:Date.now()-started}}catch(e){return{online:false,configured:configured(),latencyMs:null,error:e?.message||String(e)}}}
""")
if 'async function createInviteAndEmail' not in s:
    s = replace_required(s, needle, needle + additions, 'backend extensions')
old_exports = "module.exports={authStatus,authSignIn,authSignUp,authSignOut,authRequestPasswordReset,authImportUrl,authUpdatePassword,getEntitlement,listWorkspaces,listMembers,listInvites,createInvite,revokeInvite,acceptInvite,pullSnapshot,pushSnapshot,loadUserSettings,saveUserSettings,startRealtime,stopRealtime,driveStatus,driveList,driveUpload,driveDownload,driveDelete};"
new_exports = "module.exports={authStatus,authSignIn,authSignUp,authSignOut,authRequestPasswordReset,authImportUrl,authUpdatePassword,getEntitlement,listWorkspaces,listMembers,listInvites,createInvite,createInviteAndEmail,revokeInvite,acceptInvite,setMemberAccess,listBackups,createBackup,restoreBackup,archiveBackup,reportTelemetry,connectivity,pullSnapshot,pushSnapshot,loadUserSettings,saveUserSettings,startRealtime,stopRealtime,driveStatus,driveList,driveUpload,driveDownload,driveDelete};"
if old_exports in s: s = s.replace(old_exports, new_exports)
backend.write_text(s)

preload = root / 'electron/preload.cjs'
s = preload.read_text()
if 'backendInviteCreateAndEmail' not in s:
    s = replace_required(s, "backendInviteCreate:(payload)=>ipcRenderer.invoke('backend:invite-create',payload),", "backendInviteCreate:(payload)=>ipcRenderer.invoke('backend:invite-create',payload),\n  backendInviteCreateAndEmail:(payload)=>ipcRenderer.invoke('backend:invite-create-email',payload),", 'preload invite email')
    s = replace_required(s, "backendInviteAccept:(token)=>ipcRenderer.invoke('backend:invite-accept',token),", "backendInviteAccept:(token)=>ipcRenderer.invoke('backend:invite-accept',token),\n  backendMemberAccessSet:(payload)=>ipcRenderer.invoke('backend:member-access-set',payload),\n  backendBackups:(workspaceId)=>ipcRenderer.invoke('backend:backups',workspaceId),\n  backendBackupCreate:(workspaceId,reason)=>ipcRenderer.invoke('backend:backup-create',workspaceId,reason),\n  backendBackupRestore:(backupId)=>ipcRenderer.invoke('backend:backup-restore',backupId),\n  backendBackupArchive:(id,archived)=>ipcRenderer.invoke('backend:backup-archive',id,archived),\n  backendConnectivity:()=>ipcRenderer.invoke('backend:connectivity'),\n  backendTelemetry:(payload)=>ipcRenderer.invoke('backend:telemetry',payload),", 'preload recovery APIs')
preload.write_text(s)

main = root / 'electron/main.cjs'
s = main.read_text()
if "backend:invite-create-email" not in s:
    s = replace_required(s, "ipcMain.handle('backend:invite-create', (_e,payload) => backend.createInvite(payload.workspaceId,payload.email,payload.role,payload.access));", "ipcMain.handle('backend:invite-create', (_e,payload) => backend.createInvite(payload.workspaceId,payload.email,payload.role,payload.access));\nipcMain.handle('backend:invite-create-email', (_e,payload) => backend.createInviteAndEmail(payload.workspaceId,payload.email,payload.role,payload.access));", 'main invite email')
    s = replace_required(s, "ipcMain.handle('backend:invite-accept', (_e,token) => backend.acceptInvite(token));", "ipcMain.handle('backend:invite-accept', (_e,token) => backend.acceptInvite(token));\nipcMain.handle('backend:member-access-set', (_e,payload) => backend.setMemberAccess(payload.workspaceId,payload.userId,payload.role,payload.access));\nipcMain.handle('backend:backups', (_e,workspaceId) => backend.listBackups(workspaceId));\nipcMain.handle('backend:backup-create', (_e,workspaceId,reason) => backend.createBackup(workspaceId,reason));\nipcMain.handle('backend:backup-restore', (_e,backupId) => backend.restoreBackup(backupId));\nipcMain.handle('backend:backup-archive', (_e,id,archived) => backend.archiveBackup(id,archived));\nipcMain.handle('backend:connectivity', () => backend.connectivity());\nipcMain.handle('backend:telemetry', (_e,payload) => backend.reportTelemetry(payload||{}));", 'main recovery APIs')
main.write_text(s)

# Renderer
app = root / 'src/app.js'
s = app.read_text()
s = s.replace("backendState={configured:false,backend:'Local only',session:null,workspaces:[],workspaceId:state.preferences.cloudWorkspaceId||'',lastSync:null,error:'',security:null,busy:false,entitlement:null,revision:0,invites:[],realtime:false,remoteActivity:null};", "backendState={configured:false,backend:'Local only',session:null,workspaces:[],workspaceId:state.preferences.cloudWorkspaceId||'',lastSync:null,error:'',security:null,busy:false,entitlement:null,revision:0,invites:[],realtime:false,remoteActivity:null,members:[],backups:[],connectivity:{online:navigator.onLine,latencyMs:null},offlineDirty:false};")
s = s.replace("function scheduleCloudSync(){if(!backendState.session||!backendState.workspaceId||!window.qanteakDesktop?.backendPush)return;clearTimeout(cloudSyncTimer);cloudSyncTimer=setTimeout(()=>pushWorkspaceSnapshot(false),1800)}", "function scheduleCloudSync(){if(!backendState.session||!backendState.workspaceId||!window.qanteakDesktop?.backendPush)return;if(!navigator.onLine||backendState.connectivity?.online===false){backendState.offlineDirty=true;return}clearTimeout(cloudSyncTimer);cloudSyncTimer=setTimeout(()=>pushWorkspaceSnapshot(false),1800)}")
helpers = textwrap.dedent("""\
function ownMembership(){return (backendState.members||[]).find(m=>m.user_id===backendState.session?.user?.id)||null}
function accessAllows(module,action='view'){const m=ownMembership();if(!backendState.session)return false;if(!m)return true;const role=String(m.role||'').toLowerCase();if(role==='owner'||role==='admin')return true;const a=m.access;if(Array.isArray(a))return a.includes('Everything')||a.includes(module)||a.includes(`${module}.${action}`)||a.includes(`${module}:${action}`);if(a&&typeof a==='object')return !!(a[module]?.all||a[module]?.[action]||a[module]===true);return false}
function requireAccess(module,action,label=module){if(accessAllows(module,action))return true;toast('Access restricted',`You do not have permission to ${action} ${label}.`);return false}
function permissionObjectFromForm(fd){const modules=['projects','tasks','reviews','clients','files','documents','business'];const out={};for(const mod of modules){out[mod]={};for(const act of ['view','create','edit','delete'])out[mod][act]=fd.get(`perm_${mod}_${act}`)==='on'}return out}
function permissionSummary(access){if(Array.isArray(access))return access.join(', ');if(!access||typeof access!=='object')return 'No access';const parts=[];for(const [m,v] of Object.entries(access)){const acts=Object.entries(v||{}).filter(([,ok])=>ok).map(([a])=>a);if(acts.length)parts.push(`${m}: ${acts.join('/')}`)}return parts.join(' · ')||'No access'}
async function refreshBackups(){if(!backendState.session||!backendState.workspaceId||!window.qanteakDesktop?.backendBackups)return;try{backendState.backups=await window.qanteakDesktop.backendBackups(backendState.workspaceId)||[]}catch(e){backendState.error=e?.message||'Could not load backups.'}}
async function refreshConnectivity(showToast=false){if(!window.qanteakDesktop?.backendConnectivity)return;const r=await window.qanteakDesktop.backendConnectivity();backendState.connectivity=r||{online:navigator.onLine};if(showToast)toast(r?.online?'Cloud reachable':'Offline',r?.online?`Supabase responded in ${r.latencyMs||0} ms.`:(r?.error||'Changes will sync when the connection returns.'),r?.online?'good':'');return r}
""")
if 'function ownMembership()' not in s:
    s = replace_required(s, 'async function initBackend(){', helpers + 'async function initBackend(){', 'renderer permission helpers')
s = s.replace('await pullWorkspaceSnapshot(false);await refreshDriveStorage(false);await refreshWorkspaceInvites(false);await startWorkspaceRealtime();', 'await pullWorkspaceSnapshot(false);await refreshDriveStorage(false);await refreshWorkspaceInvites(false);await refreshBackups();await refreshConnectivity(false);await startWorkspaceRealtime();')
s = s.replace("$$('[data-create]').forEach(b=>b.onclick=()=>openCreate(b.dataset.create));", "$$('[data-create]').forEach(b=>b.onclick=()=>{const map={task:'tasks',project:'projects',review:'reviews',client:'clients',document:'documents',note:'documents',sheet:'documents',slide:'documents',invoice:'business',expense:'business',automation:'business'};const mod=map[b.dataset.create];if(mod&&!requireAccess(mod,'create',b.dataset.create))return;openCreate(b.dataset.create)});")
s = s.replace("$$('[data-review]').forEach(b=>b.onclick=()=>{const r=state.reviews.find(x=>x.id===b.dataset.review);if(r){", "$$('[data-review]').forEach(b=>b.onclick=()=>{if(!requireAccess('reviews','edit','reviews'))return;const r=state.reviews.find(x=>x.id===b.dataset.review);if(r){")

# Invite modal and email submission
old_invite = "$('#modalTitle').textContent='Invite teammate';$('#modalSubtitle').textContent='Create a secure 7-day workspace invitation.';$('#modalForm').dataset.type='workspaceInvite';$('#modalForm').innerHTML=`<div class=\"formGrid\"><div class=\"field span2\"><label>Email</label><input name=\"email\" type=\"email\" required placeholder=\"teammate@company.com\"></div><div class=\"field\"><label>Role</label><select name=\"role\"><option>Editor</option><option>Admin</option><option>Viewer</option></select></div><div class=\"field\"><label>Access</label><select name=\"access\"><option value=\"Everything\">Everything</option><option value=\"Work, Clients, Documents\">Work, Clients, Documents</option><option value=\"Work, Files\">Work, Files</option><option value=\"Business\">Business only</option></select></div></div><div class=\"formActions\"><button type=\"button\" class=\"secondary\" data-close=\"modal\">Cancel</button><button class=\"primary\">Create secure invite</button></div>`;$('#modal').classList.add('open');setScrim(true);return"
new_invite = "$('#modalTitle').textContent='Invite teammate';$('#modalSubtitle').textContent='Send a secure 7-day invitation and choose exactly what this person can access.';$('#modalForm').dataset.type='workspaceInvite';const mods=[['projects','Projects'],['tasks','Tasks'],['reviews','Reviews'],['clients','Clients'],['files','Files'],['documents','Documents'],['business','Business']];$('#modalForm').innerHTML=`<div class=\"formGrid\"><div class=\"field span2\"><label>Email</label><input name=\"email\" type=\"email\" required placeholder=\"teammate@company.com\"></div><div class=\"field\"><label>Role preset</label><select name=\"role\"><option>Editor</option><option>Admin</option><option>Viewer</option></select></div></div><div class=\"permissionMatrix\"><div class=\"permissionHead\"><b>Custom access</b><span>View · Create · Edit · Delete</span></div>${mods.map(([id,label])=>`<div class=\"permissionRow\"><b>${label}</b>${['view','create','edit','delete'].map(a=>`<label><input type=\"checkbox\" name=\"perm_${id}_${a}\" ${['projects','tasks','reviews'].includes(id)&&a==='view'?'checked':''}> ${a}</label>`).join('')}</div>`).join('')}</div><div class=\"formActions\"><button type=\"button\" class=\"secondary\" data-close=\"modal\">Cancel</button><button class=\"primary\">Send invitation email</button></div>`;$('#modal').classList.add('open');setScrim(true);return"
if old_invite in s: s = s.replace(old_invite, new_invite)
old_submit = "const fd=new FormData(form),email=String(fd.get('email')||'').trim(),role=String(fd.get('role')||'Editor'),access=String(fd.get('access')||'Everything').split(',').map(x=>x.trim()).filter(Boolean);\n    try{const row=await window.qanteakDesktop.backendInviteCreate({workspaceId:backendState.workspaceId,email,role,access});const link=`qanteak://invite/${row?.token||''}`;await refreshWorkspaceInvites(false);closeAll();render('settings');try{await navigator.clipboard.writeText(link)}catch{}toast('Secure invite created','The invite link was copied. Email delivery is not connected yet, so send the link to the invited address.','good')}catch(err){toast('Invite failed',err?.message||'Could not create the invitation.')}return;"
new_submit = "const fd=new FormData(form),email=String(fd.get('email')||'').trim(),role=String(fd.get('role')||'Editor'),access=role==='Admin'?['Everything']:permissionObjectFromForm(fd);\n    try{const result=await window.qanteakDesktop.backendInviteCreateAndEmail({workspaceId:backendState.workspaceId,email,role,access});const row=result?.invite||result;const link=`qanteak://invite/${row?.token||''}`;await refreshWorkspaceInvites(false);closeAll();render('settings');try{await navigator.clipboard.writeText(link)}catch{}toast('Invitation sent',`Email delivery started via ${result?.delivery==='magic_link'?'secure sign-in email':'Qanteak invitation email'}. The secure link was also copied.`,'good')}catch(err){toast('Invite failed',err?.message||'Could not create or email the invitation.')}return;"
if old_submit in s: s = s.replace(old_submit, new_submit)

# Import auth tokens before accepting an invite deep link when Supabase appends session tokens.
old_handle = "if(u.hostname==='invite'||u.pathname.startsWith('/invite/')){const token=(u.pathname.split('/').filter(Boolean).pop()||u.hostname==='invite'&&u.pathname.slice(1)||'').trim();if(token)await acceptInviteToken(token);return}"
new_handle = "if(u.hostname==='invite'||u.pathname.startsWith('/invite/')){const normalized=String(raw||'').replace('#','?'),nu=new URL(normalized);if(nu.searchParams.get('access_token')){try{await window.qanteakDesktop?.backendAuthImportUrl?.(raw)}catch{}}const token=(u.pathname.split('/').filter(Boolean).pop()||u.hostname==='invite'&&u.pathname.slice(1)||'').trim();if(token)await acceptInviteToken(token);return}"
if old_handle in s: s = s.replace(old_handle, new_handle)

# Remote telemetry
s = s.replace("window.qanteakDesktop?.reportRendererError?.({message:e.message,stack:e.error?.stack,source:`${e.filename||''}:${e.lineno||0}:${e.colno||0}`});", "window.qanteakDesktop?.reportRendererError?.({message:e.message,stack:e.error?.stack,source:`${e.filename||''}:${e.lineno||0}:${e.colno||0}`});window.qanteakDesktop?.backendTelemetry?.({workspaceId:backendState?.workspaceId||null,appVersion:'1.0.0-rc.9.14',platform:'renderer',kind:'renderer-error',message:e.message||'Renderer error',stack:e.error?.stack||'',context:{source:`${e.filename||''}:${e.lineno||0}:${e.colno||0}`}});")
s = s.replace("window.qanteakDesktop?.reportRendererError?.({message:r?.message||String(r),stack:r?.stack||''});", "window.qanteakDesktop?.reportRendererError?.({message:r?.message||String(r),stack:r?.stack||''});window.qanteakDesktop?.backendTelemetry?.({workspaceId:backendState?.workspaceId||null,appVersion:'1.0.0-rc.9.14',platform:'renderer',kind:'unhandled-rejection',message:r?.message||String(r),stack:r?.stack||''});")

hardening = textwrap.dedent(r'''
/* ================= RC9 V0.14 PERMISSIONS + OFFLINE + BACKUPS ================= */
settingsMembers=function(){const members=backendState.members||[],invites=backendState.invites||[];return `<div class="grid twoCol"><article class="card sectionCard">${sectionTitle('Members & custom access','Roles are presets; each member can also have module-level View/Create/Edit/Delete permissions.','<button class="primary" data-workspace-invite>+ Invite teammate</button>')}<div>${members.length?members.map(m=>`<div class="memberRow"><div><b>${m.user_id===backendState.session?.user?.id?'You':'Workspace member'}</b><span class="sub">${esc(String(m.user_id||'').slice(0,8))}…</span></div><span class="chip">${esc(m.role||'Member')}</span><span class="sub">${esc(permissionSummary(m.access))}</span>${m.user_id!==backendState.session?.user?.id?`<button class="miniButton" data-member-permissions="${m.user_id}">Permissions</button>`:''}</div>`).join(''):'<div class="empty">No workspace members loaded.</div>'}</div></article><article class="card sectionCard">${sectionTitle('Pending invitations','Invitation email + secure 7-day token.','<button class="secondary" data-team-refresh>Refresh</button>')}<div>${invites.length?invites.map(i=>{const link=`qanteak://invite/${i.token}`;return `<div class="inviteRow"><div><b>${esc(i.email)}</b><span>${esc(i.role)} · expires ${new Date(i.expires_at).toLocaleDateString()}</span><small>${esc(permissionSummary(i.access))}</small></div><div class="fileActions"><button class="miniButton" data-invite-copy="${esc(link)}">Copy link</button><button class="miniButton dangerText" data-invite-revoke="${i.id}">Revoke</button></div></div>`}).join(''):'<div class="empty">No pending invitations.</div>'}</div></article></div>`}
const settingsAccountV014Base=settingsAccount;
settingsAccount=function(){const online=backendState.connectivity?.online!==false;return settingsAccountV014Base()+`<article class="card sectionCard">${sectionTitle('Connection & recovery','Offline-safe synchronization and workspace restore points.')}<div class="securityGrid">${statusBadge(online,online?`Cloud online${backendState.connectivity?.latencyMs?` · ${backendState.connectivity.latencyMs}ms`:''}`:'Offline · changes queued locally')}${statusBadge(!!backendState.realtime,backendState.realtime?'Realtime connected':'Realtime reconnecting')}</div><div class="formActions"><button class="secondary" data-connectivity-check>Test connection</button><button class="secondary" data-backup-create>Create backup</button><button class="secondary" data-backups-refresh>Refresh backups</button></div><div>${(backendState.backups||[]).slice(0,8).map(b=>`<div class="inviteRow"><div><b>Revision ${b.revision}</b><span>${esc(b.reason)} · ${new Date(b.created_at).toLocaleString()}</span></div><div class="fileActions"><button class="miniButton" data-backup-restore="${b.id}">Restore</button><button class="miniButton" data-backup-archive="${b.id}">${b.archived_at?'Unarchive':'Archive'}</button></div></div>`).join('')||'<div class="empty">No recovery backups yet.</div>'}</div></article>`}
Object.assign(renderers,{settings});
document.addEventListener('click',async e=>{const mp=e.target.closest('[data-member-permissions]');if(mp){e.preventDefault();e.stopImmediatePropagation();const m=(backendState.members||[]).find(x=>x.user_id===mp.dataset.memberPermissions);if(!m)return;const mods=[['projects','Projects'],['tasks','Tasks'],['reviews','Reviews'],['clients','Clients'],['files','Files'],['documents','Documents'],['business','Business']];$('#modalTitle').textContent='Edit member permissions';$('#modalSubtitle').textContent='Changes are enforced by Qanteak and Supabase policies.';$('#modalForm').dataset.type='memberPermissions';$('#modalForm').dataset.userId=m.user_id;$('#modalForm').innerHTML=`<div class="field"><label>Role</label><select name="role"><option ${m.role==='Editor'?'selected':''}>Editor</option><option ${m.role==='Admin'?'selected':''}>Admin</option><option ${m.role==='Viewer'?'selected':''}>Viewer</option></select></div><div class="permissionMatrix">${mods.map(([id,label])=>`<div class="permissionRow"><b>${label}</b>${['view','create','edit','delete'].map(a=>`<label><input type="checkbox" name="perm_${id}_${a}" ${m.access?.[id]?.[a]||m.access?.[id]?.all||m.access?.includes?.('Everything')?'checked':''}> ${a}</label>`).join('')}</div>`).join('')}</div><div class="formActions"><button type="button" class="secondary" data-close="modal">Cancel</button><button class="primary">Save permissions</button></div>`;$('#modal').classList.add('open');setScrim(true);return}const cc=e.target.closest('[data-connectivity-check]');if(cc){e.preventDefault();await refreshConnectivity(true);render('settings');return}const bc=e.target.closest('[data-backup-create]');if(bc){e.preventDefault();try{await window.qanteakDesktop.backendBackupCreate(backendState.workspaceId,'manual');await refreshBackups();render('settings');toast('Backup created','A server-side workspace restore point is ready.','good')}catch(err){toast('Backup failed',err?.message||'Could not create backup.')}return}const br=e.target.closest('[data-backups-refresh]');if(br){e.preventDefault();await refreshBackups();render('settings');return}const rs=e.target.closest('[data-backup-restore]');if(rs){e.preventDefault();if(!confirm('Restore this workspace backup? Qanteak will create a safety backup first.'))return;try{await window.qanteakDesktop.backendBackupRestore(rs.dataset.backupRestore);await pullWorkspaceSnapshot(false);await refreshBackups();render(state.view);toast('Workspace restored','The selected recovery point is now active.','good')}catch(err){toast('Restore failed',err?.message||'Could not restore backup.')}return}const ar=e.target.closest('[data-backup-archive]');if(ar){e.preventDefault();const b=(backendState.backups||[]).find(x=>x.id===ar.dataset.backupArchive);await window.qanteakDesktop.backendBackupArchive(ar.dataset.backupArchive,!b?.archived_at);await refreshBackups();render('settings');return}},true);
document.addEventListener('submit',async e=>{const f=e.target;if(f?.id!=='modalForm'||f.dataset.type!=='memberPermissions')return;e.preventDefault();e.stopImmediatePropagation();const fd=new FormData(f),role=String(fd.get('role')||'Editor'),access=role==='Admin'?['Everything']:permissionObjectFromForm(fd);try{await window.qanteakDesktop.backendMemberAccessSet({workspaceId:backendState.workspaceId,userId:f.dataset.userId,role,access});await refreshWorkspaceInvites(false);closeAll();render('settings');toast('Permissions updated','The member’s custom access is now enforced.','good')}catch(err){toast('Permission update failed',err?.message||'Could not update member access.')}},true);
window.addEventListener('offline',()=>{backendState.connectivity={online:false,latencyMs:null};backendState.realtime=false;toast('Working offline','Changes stay on this PC and will sync after reconnection.');if(state.view==='settings')render('settings')});
window.addEventListener('online',async()=>{await refreshConnectivity(false);if(backendState.session&&backendState.workspaceId){await startWorkspaceRealtime();if(backendState.offlineDirty){backendState.offlineDirty=false;await pushWorkspaceSnapshot(false)}}toast('Back online','Qanteak reconnected and resumed cloud synchronization.','good');if(state.view==='settings')render('settings')});
document.addEventListener('visibilitychange',async()=>{if(!document.hidden&&backendState.session&&backendState.workspaceId){await refreshConnectivity(false);if(!backendState.realtime&&backendState.connectivity?.online)await startWorkspaceRealtime()}});
/* ================= END RC9 V0.14 PERMISSIONS + OFFLINE + BACKUPS ================= */
''')
if 'RC9 V0.14 PERMISSIONS + OFFLINE + BACKUPS' not in s:
    pos = s.rfind('prefersDark?.addEventListener')
    if pos < 0: raise SystemExit('renderer final insertion point missing')
    s = s[:pos] + hardening + s[pos:]
app.write_text(s)

(root / 'scripts/interaction-smoke.mjs').write_text("""import fs from 'node:fs';
const app=fs.readFileSync('src/app.js','utf8');
const html=fs.readFileSync('src/index.html','utf8');
const failures=[];
const checks=[['update check','#checkUpdates','checkUpdates'],['restart update','#restartUpdate','restartUpdate'],['file upload','#uploadFiles','uploadFiles'],['workspace invite','data-workspace-invite','workspaceInvite'],['password recovery','#forgotPassword','backendRequestPasswordReset'],['backup create','data-backup-create','backendBackupCreate'],['backup restore','data-backup-restore','backendBackupRestore'],['permission editor','data-member-permissions','backendMemberAccessSet'],['drive refresh','data-drive-refresh','backendDriveStatus'],['diagnostic export','data-export-diagnostics','exportDiagnostics'],['realtime handler','workspace:realtime','backendStartRealtime'],['offline handler',"addEventListener('offline'",'offlineDirty']];
for(const [name,marker,handler] of checks){if(!app.includes(marker)&&!html.includes(marker))failures.push(`${name}: control marker missing (${marker})`);if(!app.includes(handler))failures.push(`${name}: handler missing (${handler})`)}
if(failures.length){console.error('Interaction smoke FAILED');failures.forEach(x=>console.error(' - '+x));process.exit(1)}
console.log('Interaction smoke OK · critical clicks and flows have bound handlers.');
""")

(root / 'CHANGELOG-RC9-V0.14.md').write_text("""# Qanteak OS RC9 V0.14

Cloud, permissions, resilience, recovery and update hardening.

- Invitation email Edge Function with secure workspace tokens.
- Fine-grained View/Create/Edit/Delete member permissions.
- Server-side backups, restore safety points and archive controls.
- Offline/reconnect handling and realtime reconnection.
- Remote crash telemetry with RLS plus local diagnostics.
- Google Drive authenticated file integration retained.
- Critical interaction smoke coverage added to the build.

Version: `1.0.0-rc.9.14`
Tag: `v1.0.0-rc.9.14`
""")

readme = root / 'README.md'
if readme.exists(): readme.write_text(readme.read_text().replace('RC9 V0.13 (`1.0.0-rc.9.13`)', 'RC9 V0.14 (`1.0.0-rc.9.14`)'))
print('Qanteak V0.14 source upgrade applied.')
