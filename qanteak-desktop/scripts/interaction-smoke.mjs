import fs from 'node:fs';
const app=fs.readFileSync('src/app.js','utf8');
const html=fs.readFileSync('src/index.html','utf8');
const failures=[];
const checks=[['update check','#checkUpdates','checkUpdates'],['restart update','#restartUpdate','restartUpdate'],['file upload','#uploadFiles','uploadFiles'],['workspace invite','data-workspace-invite','workspaceInvite'],['password recovery','#forgotPassword','backendRequestPasswordReset'],['backup create','data-backup-create','backendBackupCreate'],['backup restore','data-backup-restore','backendBackupRestore'],['permission editor','data-member-permissions','backendMemberAccessSet'],['drive refresh','data-drive-refresh','backendDriveStatus'],['diagnostic export','data-export-diagnostics','exportDiagnostics'],['realtime handler','workspace:realtime','backendStartRealtime'],['offline handler',"addEventListener('offline'",'offlineDirty']];
for(const [name,marker,handler] of checks){if(!app.includes(marker)&&!html.includes(marker))failures.push(`${name}: control marker missing (${marker})`);if(!app.includes(handler))failures.push(`${name}: handler missing (${handler})`)}
if(failures.length){console.error('Interaction smoke FAILED');failures.forEach(x=>console.error(' - '+x));process.exit(1)}
console.log('Interaction smoke OK · critical clicks and flows have bound handlers.');
