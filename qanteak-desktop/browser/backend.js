import {createClient} from '@supabase/supabase-js';
import {entitlementFor} from '../electron/entitlement.cjs';
const config=await fetch('./qanteak-config.json').then(r=>r.json());
const client=createClient(config.QANTEAK_SUPABASE_URL,config.QANTEAK_SUPABASE_PUBLISHABLE_KEY);
const callbacks=new Map();let channel;
const emit=(c,p)=>(callbacks.get(c)||[]).forEach(f=>f(p));
const unwrap=async promise=>{const{data,error}=await promise;if(error)throw error;return data};
const rpc=async(name,args)=>{for(let attempt=0;attempt<4;attempt++){const result=await client.rpc(name,args);if(!result.error)return result.data;if(!['PGRST000','PGRST001','PGRST002'].includes(result.error.code)||attempt===3)throw result.error;await new Promise(resolve=>setTimeout(resolve,[500,1500,3000][attempt]))}};
const row=async p=>{const r=await p;return Array.isArray(r)?r[0]:r};
const pickedFiles=new Map();
const drive=async(action,w,body)=>{const sess=await session();const res=await fetch(config.QANTEAK_SUPABASE_URL+'/functions/v1/qanteak-drive?'+new URLSearchParams({action,workspaceId:w||''}),{method:body?'POST':'GET',headers:{apikey:config.QANTEAK_SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+sess.access_token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(!res.ok)throw Error((await res.json()).error||'File request failed');return res.json()};
const session=async()=>{const data=await unwrap(client.auth.getSession());return data.session};
const redirect=new URL('./',location.href).href;
const modules=(w,a,d={})=>a==='blocks.save'?rpc('q24_document',{p_workspace_id:w,p_data:d}):a==='runs'?rpc('q24_runs',{p_workspace_id:w,p_record_id:d.id}):rpc('q24_workspace',{p_workspace_id:w,p_action:a,p_data:d});
window.qanteakDesktop={
 on:(c,f)=>callbacks.set(c,[...(callbacks.get(c)||[]),f]),
 getVersion:async()=>window.QANTEAK_RELEASE?.version||'1.0.0-rc.9.24',
 backendStatus:async()=>({configured:true,backend:'Supabase',session:await session(),secureStorage:false}),
 backendSignIn:async(email,password)=>{const d=await unwrap(client.auth.signInWithPassword({email,password}));return d.session},
 backendSignUp:async({email,password,name,workspaceName})=>{const d=await unwrap(client.auth.signUp({email,password,options:{emailRedirectTo:redirect,data:{name,workspace_name:workspaceName}}}));return{session:d.session,user:d.user,confirmationRequired:!d.session}},
 backendSignOut:async()=>{await client.removeAllChannels();return unwrap(client.auth.signOut())},
 backendRequestPasswordReset:email=>unwrap(client.auth.resetPasswordForEmail(email,{redirectTo:redirect})),
 backendUpdatePassword:password=>unwrap(client.auth.updateUser({password})),
 backendEntitlement:async()=>entitlementFor((await unwrap(client.from('subscriptions').select('provider,plan,status,current_period_end,trial_ends_at,ends_at,test_mode,updated_at').order('updated_at',{ascending:false}).limit(1)))[0]),
 backendWorkspaces:()=>unwrap(client.from('q_workspaces').select('id,name,slug,owner_user_id,created_at').order('created_at')),
 backendMembers:w=>unwrap(client.from('q_workspace_members').select('*').eq('workspace_id',w)),
 backendInvites:w=>unwrap(client.from('q_workspace_invites').select('*').eq('workspace_id',w).is('accepted_at',null)),
 backendInviteCreate:({workspaceId,email,role,access})=>rpc('q_create_workspace_invite',{p_workspace_id:workspaceId,p_email:email,p_role:role,p_access:access}),
 backendInviteCreateAndEmail:payload=>unwrap(client.functions.invoke('qanteak-invite-email',{body:payload})),
 backendInviteAccept:token=>rpc('q_accept_workspace_invite',{p_token:token}),
 backendInviteRevoke:id=>unwrap(client.from('q_workspace_invites').delete().eq('id',id)),
 backendMemberAccessSet:({workspaceId,userId,role,access})=>rpc('q_set_member_access',{p_workspace_id:workspaceId,p_user_id:userId,p_role:role,p_access:access}),
 backendPull:async w=>(await unwrap(client.from('q_workspace_snapshots').select('snapshot,revision,updated_at').eq('workspace_id',w).limit(1)))[0]||null,
 backendPush:(w,snapshot,revision)=>row(rpc('q_push_workspace_snapshot',{p_workspace_id:w,p_expected_revision:revision,p_snapshot:snapshot})),
 backendGetUserSettings:async()=>{const s=await session();return(await unwrap(client.from('q_user_settings').select('*').eq('user_id',s.user.id).limit(1)))[0]},
 backendSaveUserSettings:async payload=>{const s=await session();return unwrap(client.from('q_user_settings').upsert({user_id:s.user.id,...payload}))},
 backendConnectivity:async()=>{const start=Date.now();try{await unwrap(client.from('q_workspaces').select('id').limit(1));return{online:true,configured:true,latencyMs:Date.now()-start}}catch(e){return{online:false,error:e.message}}},
 backendStartRealtime:async w=>{if(channel)await client.removeChannel(channel);channel=client.channel('web-workspace:'+w);for(const[table,type]of[['q_workspace_snapshots','snapshot'],['q24_records','modules'],['q24_inbox','inbox']])channel.on('postgres_changes',{event:'*',schema:'public',table,filter:'workspace_id=eq.'+w},p=>emit('workspace:realtime',{...p,type}));channel.on('postgres_changes',{event:'*',schema:'public',table:'q23_messages'},p=>emit('workspace:realtime',{...p,type:'chat'}));channel.subscribe();return{ok:true}},
 backendStopRealtime:async()=>{if(channel)await client.removeChannel(channel)},
 collaboration:(w,a,d={})=>rpc('q23_collaboration',{p_workspace_id:w,p_action:a,p_data:d}),
 workspaceModules:modules,
 moduleUpload:async(id,name,base64)=>{const path=id+'/'+crypto.randomUUID()+'/'+name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,120);await unwrap(client.storage.from('qanteak-modules').upload(path,Uint8Array.from(atob(base64),c=>c.charCodeAt(0)),{contentType:'application/octet-stream'}));return{path,name}},
 moduleDownload:async path=>(await unwrap(client.storage.from('qanteak-modules').createSignedUrl(path,60))).signedUrl,
 workspaceFeedback:(w,id)=>rpc('q24_feedback',{p_workspace_id:w,p_record_id:id}),
 chatRequest:(w,a,d={})=>rpc('q24_chat',{p_workspace_id:w,p_action:a,p_data:d}),
 chatUpload:async(room,name,base64)=>{const path=room+'/'+crypto.randomUUID()+'/'+name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,120);await unwrap(client.storage.from('qanteak-chat').upload(path,Uint8Array.from(atob(base64),c=>c.charCodeAt(0)),{contentType:'application/octet-stream'}));return{path,name}},
 chatDownload:async path=>(await unwrap(client.storage.from('qanteak-chat').createSignedUrl(path,60))).signedUrl,
 workspaceAsk:async(w,message)=>{const context=await rpc('q24_ai_context',{p_workspace_id:w,p_query:message});context.sources=context.sources.map((s,i)=>({...s,source:'S'+(i+1)}));const response=await unwrap(client.functions.invoke('qanteak-ai',{body:{message,mode:'ask',context}}));return{...response,sources:context.sources.map(({content,...s})=>s)}},
 backendBackups:w=>unwrap(client.from('q_workspace_backups').select('id,revision,reason,created_at').eq('workspace_id',w).order('created_at',{ascending:false}).limit(50)),
 backendBackupCreate:(w,reason)=>rpc('q_create_workspace_backup',{p_workspace_id:w,p_reason:reason}),
 backendBackupRestore:id=>rpc('q_restore_workspace_backup',{p_backup_id:id}),
 backendDriveStatus:w=>drive('status',w),
 backendDriveList:w=>drive('list',w),
 backendDriveDelete:payload=>drive('delete',payload.workspaceId,payload),
 pickFiles:()=>new Promise(resolve=>{const input=document.createElement('input');input.type='file';input.multiple=true;input.oncancel=()=>resolve([]);input.onchange=()=>resolve([...input.files].map(file=>{const id=crypto.randomUUID();pickedFiles.set(id,file);return{name:file.name,path:id}}));input.click()}),
 backendDriveUpload:async({workspaceId,paths,clientRef=null,projectRef=null})=>{const files=[];for(const id of paths){const file=pickedFiles.get(id);if(!file)throw Error('Choose this file again');const data={workspaceId,filename:file.name,size:file.size,mimeType:file.type||'application/octet-stream',clientRef,projectRef};const begin=await drive('begin-upload',workspaceId,data);const res=await fetch(begin.sessionUrl,{method:'PUT',headers:{'Content-Type':data.mimeType},body:file});if(!res.ok)throw Error('Upload failed');const meta=await res.json();const saved=await drive('finalize-upload',workspaceId,{...data,driveFileId:meta.id});files.push(saved.file);pickedFiles.delete(id)}return{files}},
 backendDriveDownload:async fileId=>{const sess=await session();const res=await fetch(config.QANTEAK_SUPABASE_URL+'/functions/v1/qanteak-drive?'+new URLSearchParams({action:'download',fileId}),{headers:{apikey:config.QANTEAK_SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+sess.access_token}});if(!res.ok)throw Error('Download failed');const url=URL.createObjectURL(await res.blob());const a=document.createElement('a');a.href=url;a.download='qanteak-file';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);return{ok:true}},
 notifyReminder:async({title})=>{if('Notification'in window&&Notification.permission==='granted')new Notification(title)},
 getSecurityStatus:async()=>({signatureStatus:'Browser',platform:'Web'}),
 checkForUpdates:async()=>{location.reload();return{ok:true}},
 platformLoad:async()=>JSON.parse(localStorage.getItem('qanteak.web.studio')||'null'),
 platformSave:async state=>{localStorage.setItem('qanteak.web.studio',JSON.stringify(state));return state},
};
client.auth.onAuthStateChange((event,s)=>{if(event==='PASSWORD_RECOVERY')emit('auth:deep-link',{type:'recovery',session:s})});
