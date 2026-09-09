const fs = require('node:fs');
const path = require('node:path');
const { app, safeStorage } = require('electron');
const { Readable } = require('node:stream');
const { createClient } = require('@supabase/supabase-js');

let sessionCache = null;
let configCache = null;
let realtimeClient = null;
let realtimeChannel = null;

function parseEnv(text='') {
  const out = {};
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

function loadConfig() {
  if (configCache) return configCache;
  let cfg = {};
  try {
    const p = app.isPackaged ? path.join(__dirname, '../dist/qanteak-config.json') : path.join(process.cwd(), '.env');
    if (fs.existsSync(p)) cfg = p.endsWith('.json') ? JSON.parse(fs.readFileSync(p, 'utf8')) : parseEnv(fs.readFileSync(p, 'utf8'));
  } catch {}
  configCache = {
    url: String(cfg.QANTEAK_SUPABASE_URL || cfg.SUPABASE_URL || '').replace(/\/$/, ''),
    key: String(cfg.QANTEAK_SUPABASE_PUBLISHABLE_KEY || cfg.SUPABASE_PUBLISHABLE_KEY || ''),
    mode: String(cfg.QANTEAK_BACKEND_MODE || 'local'),
    authRedirect: String(cfg.QANTEAK_AUTH_REDIRECT || 'qanteak://auth/confirmed'),
    recoveryRedirect: String(cfg.QANTEAK_RECOVERY_REDIRECT || 'qanteak://auth/recovery')
  };
  return configCache;
}
function configured(){const c=loadConfig();return Boolean(c.url&&c.key&&c.mode!=='local')}
function sessionPath(){return path.join(app.getPath('userData'),'qanteak-session.bin')}
function writeSession(session){sessionCache=session||null;const p=sessionPath();if(!session){try{fs.rmSync(p,{force:true})}catch{};return}try{if(safeStorage.isEncryptionAvailable())fs.writeFileSync(p,safeStorage.encryptString(JSON.stringify(session)))}catch{}}
function readSession(){if(sessionCache)return sessionCache;try{const p=sessionPath();if(!fs.existsSync(p)||!safeStorage.isEncryptionAvailable())return null;sessionCache=JSON.parse(safeStorage.decryptString(fs.readFileSync(p)));return sessionCache}catch{return null}}

async function fetchWithTimeout(url,options={},timeoutMs=12000){const c=new AbortController();const t=setTimeout(()=>c.abort(),timeoutMs);try{return await fetch(url,{...options,signal:options.signal||c.signal})}catch(e){if(e?.name==='AbortError')throw new Error('Qanteak cloud request timed out. Check your internet connection and try again.');throw e}finally{clearTimeout(t)}}
async function jsonFetch(url,options={},timeoutMs=12000){const res=await fetchWithTimeout(url,options,timeoutMs);const text=await res.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}if(!res.ok){const msg=data?.msg||data?.message||data?.error_description||data?.error||`Request failed (${res.status})`;const err=new Error(msg);err.status=res.status;err.data=data;throw err}return data}
function normalizeSession(data){if(!data?.access_token)return null;return{access_token:data.access_token,refresh_token:data.refresh_token,token_type:data.token_type||'bearer',expires_at:data.expires_at||Math.floor(Date.now()/1000)+Number(data.expires_in||3600),user:data.user||null}}
async function refreshSession(refreshToken){const c=loadConfig();if(!configured()||!refreshToken)return null;const data=await jsonFetch(`${c.url}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:c.key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refreshToken})},8000);const next=normalizeSession(data);writeSession(next);return next}
async function validSession(){let s=readSession();if(!s)return null;if(Number(s.expires_at||0)<=Math.floor(Date.now()/1000)+60){try{s=await refreshSession(s.refresh_token)}catch{writeSession(null);return null}}return s}
function publicSession(s){if(!s)return null;return{user:s.user,expires_at:s.expires_at,secureStorage:safeStorage.isEncryptionAvailable()}}

async function authSignIn(email,password){const c=loadConfig();if(!configured())throw new Error('Qanteak cloud backend is not configured.');const data=await jsonFetch(`${c.url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:c.key,'Content-Type':'application/json'},body:JSON.stringify({email,password})});const s=normalizeSession(data);writeSession(s);return publicSession(s)}
async function authSignUp({email,password,name,workspaceName}){const c=loadConfig();if(!configured())throw new Error('Qanteak cloud backend is not configured.');const target=encodeURIComponent(c.authRedirect);const data=await jsonFetch(`${c.url}/auth/v1/signup?redirect_to=${target}`,{method:'POST',headers:{apikey:c.key,'Content-Type':'application/json'},body:JSON.stringify({email,password,data:{name,workspace_name:workspaceName||`${name||email.split('@')[0]}'s Workspace`}})});const s=normalizeSession(data);if(s)writeSession(s);return{session:publicSession(s),user:data?.user||null,confirmationRequired:!s}}
async function authRequestPasswordReset(email){const c=loadConfig();if(!configured())throw new Error('Qanteak cloud backend is not configured.');await jsonFetch(`${c.url}/auth/v1/recover?redirect_to=${encodeURIComponent(c.recoveryRedirect)}`,{method:'POST',headers:{apikey:c.key,'Content-Type':'application/json'},body:JSON.stringify({email})});return{ok:true}}
async function authImportUrl(rawUrl){const c=loadConfig();if(!configured())throw new Error('Qanteak cloud backend is not configured.');const normalized=String(rawUrl||'').replace('#','?');const u=new URL(normalized);const access=u.searchParams.get('access_token');const refresh=u.searchParams.get('refresh_token');const expiresIn=Number(u.searchParams.get('expires_in')||3600);if(!access)return{ok:true,type:u.pathname.includes('recovery')?'recovery':'confirmation',session:null};const user=await jsonFetch(`${c.url}/auth/v1/user`,{headers:{apikey:c.key,Authorization:`Bearer ${access}`}});const s=normalizeSession({access_token:access,refresh_token:refresh,expires_in:expiresIn,user});writeSession(s);return{ok:true,type:u.pathname.includes('recovery')?'recovery':'confirmation',session:publicSession(s)}}
async function authUpdatePassword(password){const c=loadConfig(),s=await validSession();if(!s?.access_token)throw new Error('Open the password reset link again, then set a new password.');const user=await jsonFetch(`${c.url}/auth/v1/user`,{method:'PUT',headers:{apikey:c.key,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({password})});s.user=user;writeSession(s);return{ok:true}}
async function authSignOut(){const c=loadConfig(),s=await validSession();stopRealtime();if(configured()&&s?.access_token){try{await fetch(`${c.url}/auth/v1/logout`,{method:'POST',headers:{apikey:c.key,Authorization:`Bearer ${s.access_token}`}})}catch{}}writeSession(null);return{ok:true}}
async function authStatus(){const s=await validSession();return{configured:configured(),backend:configured()?'Supabase':'Local only',session:publicSession(s),secureStorage:safeStorage.isEncryptionAvailable()}}

async function rest(pathname,{method='GET',body,prefer}={}){const c=loadConfig();if(!configured())throw new Error('Qanteak cloud backend is not configured.');const s=await validSession();if(!s?.access_token)throw new Error('Sign in to Qanteak first.');const headers={apikey:c.key,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json'};if(prefer)headers.Prefer=prefer;return jsonFetch(`${c.url}/rest/v1/${pathname}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)})}
async function rpc(name,body){return rest(`rpc/${name}`,{method:'POST',body,prefer:'return=representation'})}
async function getEntitlement(){const rows=await rest('subscriptions?select=provider,plan,status,current_period_end,trial_ends_at,ends_at,test_mode,updated_at&order=updated_at.desc&limit=1');const subscription=rows?.[0]||null;if(!subscription)return{allowed:false,provider:null,plan:'none',status:'inactive'};const provider=String(subscription.provider||'').toLowerCase(),status=String(subscription.status||'').toLowerCase();return{allowed:(provider==='internal_qa'&&status==='active')||['active','trialing','on_trial'].includes(status),...subscription}}
async function listWorkspaces(){return rest('q_workspaces?select=id,name,slug,owner_user_id,created_at&order=created_at.asc')}
async function listMembers(workspaceId){return rest(`q_workspace_members?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=workspace_id,user_id,role,access,status,joined_at&order=joined_at.asc`)}
async function listInvites(workspaceId){return rest(`q_workspace_invites?workspace_id=eq.${encodeURIComponent(workspaceId)}&accepted_at=is.null&select=id,workspace_id,email,role,access,token,expires_at,created_at&order=created_at.desc`)}
async function createInvite(workspaceId,email,role='Editor',access=['Everything']){const rows=await rpc('q_create_workspace_invite',{p_workspace_id:workspaceId,p_email:email,p_role:role,p_access:access});return Array.isArray(rows)?rows[0]:rows}
async function revokeInvite(id){await rest(`q_workspace_invites?id=eq.${encodeURIComponent(id)}`,{method:'DELETE'});return{ok:true}}
async function acceptInvite(token){const rows=await rpc('q_accept_workspace_invite',{p_token:token});return Array.isArray(rows)?rows[0]:rows}
async function pullSnapshot(workspaceId){const rows=await rest(`q_workspace_snapshots?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=snapshot,revision,updated_at&limit=1`);return rows?.[0]||null}

async function mirrorNormalizedSnapshot(workspaceId,snapshot){
  const s=await validSession(); if(!s?.user?.id)return;
  const collections=[['q_clients','clients','name'],['q_projects','projects','name'],['q_tasks','tasks','title'],['q_documents','documents','title']];
  for(const [table,key,titleKey] of collections){
    const src=Array.isArray(snapshot?.[key])?snapshot[key]:[];
    if(!src.length)continue;
    const body=src.slice(0,1000).map(x=>({workspace_id:workspaceId,legacy_id:String(x.id||''),[titleKey]:String(x[titleKey]||x.name||'Untitled'),status:x.status||null,data:x,created_by:s.user.id,updated_at:new Date().toISOString()}));
    try{await rest(`${table}?on_conflict=workspace_id,legacy_id`,{method:'POST',body,prefer:'resolution=merge-duplicates,return=minimal'})}catch{}
  }
}
async function pushSnapshot(workspaceId,snapshot,expectedRevision){const expected=Number.isFinite(Number(expectedRevision))?Number(expectedRevision):0;const rows=await rpc('q_push_workspace_snapshot',{p_workspace_id:workspaceId,p_expected_revision:expected,p_snapshot:snapshot});const row=Array.isArray(rows)?rows[0]:rows;mirrorNormalizedSnapshot(workspaceId,snapshot).catch(()=>{});return row}
async function loadUserSettings(){const s=await validSession();if(!s?.user?.id)throw new Error('Sign in first.');const rows=await rest(`q_user_settings?user_id=eq.${s.user.id}&select=preferences,security,privacy,updated_at&limit=1`);return rows?.[0]||null}
async function saveUserSettings(payload){const s=await validSession();if(!s?.user?.id)throw new Error('Sign in first.');const rows=await rest('q_user_settings?on_conflict=user_id',{method:'POST',body:{user_id:s.user.id,preferences:payload.preferences||{},security:payload.security||{},privacy:payload.privacy||{}},prefer:'resolution=merge-duplicates,return=representation'});return rows?.[0]||null}

async function startRealtime(workspaceId,onChange){stopRealtime();const c=loadConfig(),s=await validSession();if(!configured()||!s?.access_token||!workspaceId)return{ok:false};realtimeClient=createClient(c.url,c.key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${s.access_token}`}}});await realtimeClient.realtime.setAuth(s.access_token);realtimeChannel=realtimeClient.channel(`workspace:${workspaceId}`)
 .on('postgres_changes',{event:'*',schema:'public',table:'q_workspace_snapshots',filter:`workspace_id=eq.${workspaceId}`},payload=>onChange?.({type:'snapshot',eventType:payload.eventType,new:payload.new,old:payload.old}))
 .on('postgres_changes',{event:'INSERT',schema:'public',table:'q_workspace_events',filter:`workspace_id=eq.${workspaceId}`},payload=>onChange?.({type:'event',eventType:'INSERT',new:payload.new}))
 .subscribe();return{ok:true}}
function stopRealtime(){try{if(realtimeClient&&realtimeChannel)realtimeClient.removeChannel(realtimeChannel)}catch{}realtimeChannel=null;realtimeClient=null;return{ok:true}}

async function edgeRequest(action,{workspaceId='',method='GET',body}={}){const c=loadConfig(),s=await validSession();if(!configured()||!s?.access_token)throw new Error('Sign in to Qanteak first.');const qs=new URLSearchParams({action});if(workspaceId)qs.set('workspaceId',workspaceId);return jsonFetch(`${c.url}/functions/v1/qanteak-drive?${qs}`,{method,headers:{apikey:c.key,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)},30000)}
async function driveStatus(workspaceId){return edgeRequest('status',{workspaceId})}
async function driveList(workspaceId){return edgeRequest('list',{workspaceId})}
async function uploadOneDriveFile(workspaceId,sourcePath,clientRef=null,projectRef=null,logicalFileId=null){const stat=fs.statSync(sourcePath);if(!stat.isFile())throw new Error(`Not a file: ${sourcePath}`);const filename=path.basename(sourcePath);const begin=await edgeRequest('begin-upload',{workspaceId,method:'POST',body:{workspaceId,filename,size:stat.size,mimeType:'application/octet-stream',clientRef,projectRef}});if(!begin?.sessionUrl)throw new Error('Google Drive did not return an upload session.');const stream=Readable.toWeb(fs.createReadStream(sourcePath));const upload=await fetch(begin.sessionUrl,{method:'PUT',headers:{'Content-Length':String(stat.size),'Content-Type':'application/octet-stream'},body:stream,duplex:'half'});const text=await upload.text();let meta=null;try{meta=text?JSON.parse(text):null}catch{}if(!upload.ok||!meta?.id)throw new Error(meta?.error?.message||`Google Drive upload failed (${upload.status}).`);return edgeRequest('finalize-upload',{workspaceId,method:'POST',body:{workspaceId,driveFileId:meta.id,filename,size:stat.size,mimeType:meta.mimeType||'application/octet-stream',clientRef,projectRef,logicalFileId}})}
async function driveUpload({workspaceId,paths,clientRef=null,projectRef=null}={},onProgress){if(!workspaceId)throw new Error('Missing workspace id.');const rows=[],list=Array.isArray(paths)?paths:[];for(let i=0;i<list.length;i++){onProgress?.({index:i,total:list.length,name:path.basename(list[i]),state:'uploading'});const result=await uploadOneDriveFile(workspaceId,list[i],clientRef,projectRef);if(result?.file)rows.push(result.file);onProgress?.({index:i+1,total:list.length,name:path.basename(list[i]),state:'complete'})}return{files:rows}}
async function driveDownload(fileId,destinationPath){const c=loadConfig(),s=await validSession();if(!configured()||!s?.access_token)throw new Error('Sign in to Qanteak first.');const qs=new URLSearchParams({action:'download',fileId});const res=await fetch(`${c.url}/functions/v1/qanteak-drive?${qs}`,{headers:{apikey:c.key,Authorization:`Bearer ${s.access_token}`}});if(!res.ok||!res.body){let msg='Cloud download failed.';try{const d=await res.json();msg=d?.error||msg}catch{}throw new Error(msg)}const nodeStream=Readable.fromWeb(res.body);await new Promise((resolve,reject)=>{const out=fs.createWriteStream(destinationPath);nodeStream.on('error',reject);out.on('error',reject);out.on('finish',resolve);nodeStream.pipe(out)});return{ok:true,path:destinationPath}}
async function driveDelete(fileId,workspaceId){return edgeRequest('delete',{workspaceId,method:'POST',body:{fileId,workspaceId}})}

module.exports={authStatus,authSignIn,authSignUp,authSignOut,authRequestPasswordReset,authImportUrl,authUpdatePassword,getEntitlement,listWorkspaces,listMembers,listInvites,createInvite,revokeInvite,acceptInvite,pullSnapshot,pushSnapshot,loadUserSettings,saveUserSettings,startRealtime,stopRealtime,driveStatus,driveList,driveUpload,driveDownload,driveDelete};
