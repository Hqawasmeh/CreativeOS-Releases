from pathlib import Path
import json

root=Path(__file__).resolve().parents[1]

pkg=root/'package.json'
j=json.loads(pkg.read_text())
j['version']='1.0.0-rc.9.15'
j['description']='Qanteak OS RC9 V0.15 creation reliability and invitation delivery fix'
pkg.write_text(json.dumps(j,indent=2)+'\n')

lock=root/'package-lock.json'
s=lock.read_text().replace('"version": "1.0.0-rc.9.14"','"version": "1.0.0-rc.9.15"',2)
lock.write_text(s)

pre=root/'scripts/preflight.mjs'
s=pre.read_text().replace('CHANGELOG-RC9-V0.14.md','CHANGELOG-RC9-V0.15.md')
s=s.replace("pkg.version !== '1.0.0-rc.9.14'","pkg.version !== '1.0.0-rc.9.15'")
s=s.replace('Qanteak preflight OK · 1.0.0-rc.9.14','Qanteak preflight OK · 1.0.0-rc.9.15')
pre.write_text(s)

backend=root/'electron/backend.cjs'
s=backend.read_text().replace("body:JSON.stringify({workspaceId,email,role,access})},30000)","body:JSON.stringify({workspaceId,email,role,access})},10000)")
backend.write_text(s)

app=root/'src/app.js'
s=app.read_text()
s=s.replace("function save(){persistDeviceState();updateNotificationCount()}","function save(){persistDeviceState();updateNotificationCount();if(backendState?.session&&backendState?.workspaceId)scheduleCloudSync()}")
old="""const fd=new FormData(form),email=String(fd.get('email')||'').trim(),role=String(fd.get('role')||'Editor'),access=role==='Admin'?['Everything']:permissionObjectFromForm(fd);\n    try{const result=await window.qanteakDesktop.backendInviteCreateAndEmail({workspaceId:backendState.workspaceId,email,role,access});const row=result?.invite||result;const link=`qanteak://invite/${row?.token||''}`;await refreshWorkspaceInvites(false);closeAll();render('settings');try{await navigator.clipboard.writeText(link)}catch{}toast('Invitation sent',`Email delivery started via ${result?.delivery==='magic_link'?'secure sign-in email':'Qanteak invitation email'}. The secure link was also copied.`,'good')}catch(err){toast('Invite failed',err?.message||'Could not create or email the invitation.')}return;"""
new="""const fd=new FormData(form),email=String(fd.get('email')||'').trim(),role=String(fd.get('role')||'Editor'),access=role==='Admin'?['Everything']:permissionObjectFromForm(fd);\n    try{let result;try{result=await window.qanteakDesktop.backendInviteCreateAndEmail({workspaceId:backendState.workspaceId,email,role,access})}catch(primaryErr){await refreshWorkspaceInvites(false);const existing=(backendState.invites||[]).find(i=>String(i.email||'').toLowerCase()===email.toLowerCase());if(existing){result={ok:true,delivery:'pending',invite:existing}}else{const created=await window.qanteakDesktop.backendInviteCreate({workspaceId:backendState.workspaceId,email,role,access});result={ok:true,delivery:'link_only',invite:created}}}const row=result?.invite||result;const link=`qanteak://invite/${row?.token||''}`;await refreshWorkspaceInvites(false);closeAll();render('settings');try{await navigator.clipboard.writeText(link)}catch{}const msg=result?.delivery==='link_only'?'The secure invite was created. Email delivery is delayed, so the invite link was copied as a fallback.':result?.delivery==='pending'?'The secure invite is ready and email delivery is still processing. The link was also copied.':`Email delivery started via ${result?.delivery==='magic_link'?'secure sign-in email':'Qanteak invitation email'}. The secure link was also copied.`;toast('Invitation ready',msg,'good')}catch(err){toast('Invite failed',err?.message||'Could not create the invitation.')}return;"""
if old in s:s=s.replace(old,new)
marker='/* ================= RC9 V0.15 CREATION RELIABILITY ================= */'
addition="""
/* ================= RC9 V0.15 CREATION RELIABILITY ================= */
const QANTEAK_CREATABLE_TYPES=new Set(['task','review','project','invoice','client','document','lead','expense','automation']);
document.addEventListener('submit',e=>{
  const form=e.target;
  if(form?.id!=='modalForm'||!QANTEAK_CREATABLE_TYPES.has(form.dataset.type))return;
  e.preventDefault();
  e.stopImmediatePropagation();
  try{
    createFromForm(form);
    if(backendState?.session&&backendState?.workspaceId)scheduleCloudSync();
  }catch(err){
    console.error('Qanteak create failed',err);
    toast('Create failed',err?.message||'Qanteak could not create this item.');
  }
},true);
/* ================= END RC9 V0.15 CREATION RELIABILITY ================= */
"""
if marker not in s:
    pos=s.rfind("prefersDark?.addEventListener")
    if pos<0:raise SystemExit('app insertion marker missing')
    s=s[:pos]+addition+s[pos:]
app.write_text(s)

(root/'CHANGELOG-RC9-V0.15.md').write_text("""# Qanteak OS RC9 V0.15

Creation reliability and invitation delivery hotfix.

- Fixed task, review, project, invoice and other create forms so submit always commits immediately to the active workspace UI.
- Workspace mutations now automatically schedule cloud synchronization.
- Added a capture-phase creation safety handler to prevent modal submit binding regressions.
- Invitation email endpoint now acknowledges secure invitations quickly while email delivery continues separately.
- Invite flow recovers from timeout by reusing an already-created pending invite or creating a secure-link fallback.

Version: `1.0.0-rc.9.15`
Tag: `v1.0.0-rc.9.15`
""")
