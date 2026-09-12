const path = require('node:path');
const fs = require('node:fs');
const { app, BrowserWindow, ipcMain, shell, session, dialog, safeStorage } = require('electron');
const { initUpdater, check, install } = require('./updater.cjs');
const backend = require('./backend.cjs');
const { execFile } = require('node:child_process');

let mainWindow;
let installingUpdate = false;
let pendingDeepLink = null;
let realtimeWorkspaceId = null;

function logPath(){ return path.join(app.getPath('userData'),'QanteakOS.log'); }
function logLine(kind, message, extra=''){ try{ fs.appendFileSync(logPath(), `[${new Date().toISOString()}] ${kind}: ${String(message||'')} ${extra?String(extra):''}\n`); }catch{} }
process.on('uncaughtException',err=>logLine('uncaughtException',err?.message,err?.stack));
process.on('unhandledRejection',err=>logLine('unhandledRejection',err?.message||err,err?.stack));

function findDeepLink(argv=[]){ return (argv||[]).find(x=>/^qanteak:\/\//i.test(String(x))) || null; }
function deliverDeepLink(url){ if(!url)return; pendingDeepLink=url; if(mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isLoading()){ mainWindow.webContents.send('auth:deep-link',url); pendingDeepLink=null; } }


// Keep exactly one Qanteak process alive so duplicate instances cannot hold
// installation files while an update is trying to replace them.
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

app.on('second-instance', (_event, argv) => {
  const url=findDeepLink(argv); if(url) deliverDeepLink(url);
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});



function getWindowsSecurityInfo() {
  return new Promise((resolve) => {
    const base = {
      platform: process.platform,
      packaged: app.isPackaged,
      secureStorage: safeStorage.isEncryptionAvailable(),
      signatureStatus: app.isPackaged ? 'Unknown' : 'Development build',
      publisher: '',
      thumbprint: ''
    };
    if (process.platform !== 'win32' || !app.isPackaged) return resolve(base);
    const exe = process.execPath;
    const script = `$s=Get-AuthenticodeSignature -LiteralPath $args[0]; [pscustomobject]@{status=$s.Status.ToString();publisher=if($s.SignerCertificate){$s.SignerCertificate.Subject}else{''};thumbprint=if($s.SignerCertificate){$s.SignerCertificate.Thumbprint}else{''}} | ConvertTo-Json -Compress`;
    execFile('powershell.exe', ['-NoProfile','-ExecutionPolicy','Bypass','-Command',script, exe], { windowsHide:true }, (err, stdout) => {
      if (err) return resolve({...base, signatureStatus:'Check failed'});
      try {
        const parsed = JSON.parse(String(stdout).trim());
        resolve({...base, signatureStatus:parsed.status || 'Unknown', publisher:parsed.publisher || '', thumbprint:parsed.thumbprint || ''});
      } catch { resolve(base); }
    });
  });
}

function rendererPath() {
  const rel = app.isPackaged ? '../dist/index.html' : '../src/index.html';
  const target = path.join(__dirname, rel);
  if (!fs.existsSync(target)) throw new Error(`Renderer entry not found: ${target}`);
  return target;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#f4f6f8',
    title: 'Qanteak OS RC9 V0.20',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  mainWindow.removeMenu();
  mainWindow.loadFile(rendererPath());
  mainWindow.webContents.on('did-finish-load',()=>{ if(pendingDeepLink){ mainWindow.webContents.send('auth:deep-link',pendingDeepLink); pendingDeepLink=null; } });
  mainWindow.webContents.on('render-process-gone',(_e,details)=>logLine('render-process-gone',details.reason,JSON.stringify(details)));
  mainWindow.webContents.on('console-message',(_e,level,message,line,sourceId)=>{ if(level>=2) logLine('renderer-console',message,`${sourceId}:${line}`); });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) event.preventDefault();
  });

  initUpdater(mainWindow);
  if (app.isPackaged) setTimeout(() => check().catch(() => {}), 12000);
}

app.on('open-url',(event,url)=>{event.preventDefault();deliverDeepLink(url)});

app.whenReady().then(() => {
  try{ app.setAsDefaultProtocolClient('qanteak'); }catch(e){ logLine('protocol',e?.message||e); }
  const startupLink=findDeepLink(process.argv); if(startupLink) pendingDeepLink=startupLink;
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  if (!installingUpdate) return;
  for (const window of BrowserWindow.getAllWindows()) {
    try { window.destroy(); } catch {}
  }
  mainWindow = null;
});

app.on('window-all-closed', () => {
  if (!installingUpdate && process.platform !== 'darwin') app.quit();
});

ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('update:check', () => check());
ipcMain.handle('update:install', async () => {
  if (installingUpdate) return {ok:true,alreadyStarted:true};
  installingUpdate = true;

  // Make the renderer disappear immediately, then destroy all BrowserWindows so
  // Chromium/Electron file handles are released before NSIS starts replacing files.
  for (const window of BrowserWindow.getAllWindows()) {
    try { window.hide(); } catch {}
  }
  await new Promise(resolve => setTimeout(resolve, 250));
  for (const window of BrowserWindow.getAllWindows()) {
    try { window.destroy(); } catch {}
  }
  mainWindow = null;

  // Give Windows a short moment to flush handles before launching the installer.
  await new Promise(resolve => setTimeout(resolve, 500));
  return install();
});
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize-toggle', () => {
  if (!mainWindow) return;
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('window:close', () => mainWindow?.close());




ipcMain.handle('security:status', () => getWindowsSecurityInfo());
ipcMain.handle('backend:status', () => backend.authStatus());
ipcMain.handle('ai:ask', (_e,payload) => backend.aiAsk(payload || {}));
ipcMain.handle('backend:signin', (_e, email, password) => backend.authSignIn(email, password));
ipcMain.handle('backend:signup', (_e, payload) => backend.authSignUp(payload || {}));
ipcMain.handle('backend:password-reset-request', (_e,email) => backend.authRequestPasswordReset(email));
ipcMain.handle('backend:auth-import-url', (_e,url) => backend.authImportUrl(url));
ipcMain.handle('backend:password-update', (_e,password) => backend.authUpdatePassword(password));
ipcMain.handle('backend:signout', () => backend.authSignOut());
ipcMain.handle('backend:entitlement', () => backend.getEntitlement());
ipcMain.handle('backend:workspaces', () => backend.listWorkspaces());
ipcMain.handle('backend:members', (_e, workspaceId) => backend.listMembers(workspaceId));
ipcMain.handle('backend:invites', (_e, workspaceId) => backend.listInvites(workspaceId));
ipcMain.handle('backend:invite-create', (_e,payload) => backend.createInvite(payload.workspaceId,payload.email,payload.role,payload.access));
ipcMain.handle('backend:invite-create-email', (_e,payload) => backend.createInviteAndEmail(payload.workspaceId,payload.email,payload.role,payload.access));
ipcMain.handle('backend:invite-revoke', (_e,id) => backend.revokeInvite(id));
ipcMain.handle('backend:invite-accept', (_e,token) => backend.acceptInvite(token));
ipcMain.handle('backend:member-access-set', (_e,payload) => backend.setMemberAccess(payload.workspaceId,payload.userId,payload.role,payload.access));
ipcMain.handle('backend:backups', (_e,workspaceId) => backend.listBackups(workspaceId));
ipcMain.handle('backend:backup-create', (_e,workspaceId,reason) => backend.createBackup(workspaceId,reason));
ipcMain.handle('backend:backup-restore', (_e,backupId) => backend.restoreBackup(backupId));
ipcMain.handle('backend:backup-archive', (_e,id,archived) => backend.archiveBackup(id,archived));
ipcMain.handle('backend:connectivity', () => backend.connectivity());
ipcMain.handle('backend:telemetry', (_e,payload) => backend.reportTelemetry(payload||{}));
ipcMain.handle('backend:pull', (_e, workspaceId) => backend.pullSnapshot(workspaceId));
ipcMain.handle('backend:push', (_e, workspaceId, snapshot, expectedRevision) => backend.pushSnapshot(workspaceId, snapshot, expectedRevision));
ipcMain.handle('backend:realtime:start', async (_e,workspaceId)=>{ realtimeWorkspaceId=workspaceId; return backend.startRealtime(workspaceId,payload=>{ if(mainWindow&&!mainWindow.isDestroyed()) mainWindow.webContents.send('workspace:realtime',payload); }); });
ipcMain.handle('backend:realtime:stop', ()=>{realtimeWorkspaceId=null;return backend.stopRealtime();});
ipcMain.handle('backend:user-settings:get', () => backend.loadUserSettings());
ipcMain.handle('backend:user-settings:set', (_e, payload) => backend.saveUserSettings(payload || {}));
ipcMain.handle('backend:drive-status', (_e, workspaceId) => backend.driveStatus(workspaceId));
ipcMain.handle('backend:drive-list', (_e, workspaceId) => backend.driveList(workspaceId));
ipcMain.handle('backend:drive-upload', (_e, payload) => backend.driveUpload(payload || {}, progress=>{ if(mainWindow&&!mainWindow.isDestroyed()) mainWindow.webContents.send('drive:progress',progress); }));
ipcMain.handle('backend:drive-delete', (_e,payload) => backend.driveDelete(payload.fileId,payload.workspaceId));
ipcMain.handle('backend:drive-download', async (_e, fileId) => {
  const rows = await backend.driveList((await backend.listWorkspaces())?.[0]?.id || '');
  const file = rows?.files?.find?.(x => x.id === fileId);
  if (!file) throw new Error('Cloud file not found.');
  const result = await dialog.showSaveDialog(mainWindow, { defaultPath: file.file_name || 'download' });
  if (result.canceled || !result.filePath) return { ok:false, message:'Download cancelled.' };
  return backend.driveDownload(fileId, result.filePath);
});


ipcMain.handle('diagnostics:export', async () => {
  const result=await dialog.showSaveDialog(mainWindow,{defaultPath:'QanteakOS-Diagnostics.log',filters:[{name:'Log file',extensions:['log','txt']}]});
  if(result.canceled||!result.filePath)return{ok:false,message:'Export cancelled.'};
  try{ if(fs.existsSync(logPath()))fs.copyFileSync(logPath(),result.filePath); else fs.writeFileSync(result.filePath,'Qanteak OS diagnostics log is empty.\n'); return{ok:true,path:result.filePath}; }catch(e){throw new Error(`Could not export diagnostics: ${e.message}`)}
});
ipcMain.on('diagnostics:renderer-error',(_e,payload)=>logLine('renderer-error',payload?.message||'Unknown renderer error',payload?.stack||payload?.source||''));

ipcMain.handle('files:pick', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {properties:['openFile','multiSelections']});
  if (result.canceled) return [];
  return result.filePaths.map(filePath => ({name:path.basename(filePath), path:filePath}));
});

ipcMain.handle('files:save-copy', async (_event, sourcePath, suggestedName) => {
  if (!sourcePath || !fs.existsSync(sourcePath)) return {ok:false,message:'Source file is no longer available.'};
  const result = await dialog.showSaveDialog(mainWindow, {defaultPath:suggestedName || path.basename(sourcePath)});
  if (result.canceled || !result.filePath) return {ok:false,message:'Save cancelled.'};
  fs.copyFileSync(sourcePath, result.filePath);
  return {ok:true,path:result.filePath};
});

ipcMain.handle('invoice:pdf', async (_event, invoice) => {
  const PDFDocument = require('pdfkit');
  const safeNumber = String(invoice?.number || 'invoice').replace(/[^a-zA-Z0-9-_]/g,'');
  const result = await dialog.showSaveDialog(mainWindow, {defaultPath:`${safeNumber || 'invoice'}.pdf`,filters:[{name:'PDF',extensions:['pdf']}]});
  if (result.canceled || !result.filePath) return {ok:false,message:'Save cancelled.'};
  await new Promise((resolve,reject)=>{
    const doc = new PDFDocument({margin:48,size:'A4'});
    const out = fs.createWriteStream(result.filePath);
    doc.pipe(out);
    doc.fontSize(24).text(`Invoice ${invoice.number || ''}`);
    doc.moveDown(.4).fontSize(11).fillColor('#555').text(`${invoice.client || ''}${invoice.project ? ' · '+invoice.project : ''}`);
    doc.moveDown(1.4).fillColor('#111');
    doc.fontSize(10).text('Description',48,150,{width:250});
    doc.text('Qty',310,150,{width:50,align:'right'});
    doc.text('Rate',370,150,{width:80,align:'right'});
    doc.text('Total',460,150,{width:85,align:'right'});
    let y=174;
    for (const item of invoice.items || []) {
      const qty=Number(item.qty)||0, rate=Number(item.rate)||0;
      doc.text(String(item.description||''),48,y,{width:250});
      doc.text(String(qty),310,y,{width:50,align:'right'});
      doc.text(`$${rate.toFixed(2)}`,370,y,{width:80,align:'right'});
      doc.text(`$${(qty*rate).toFixed(2)}`,460,y,{width:85,align:'right'});
      y += 24;
    }
    const totals=invoice.totals||{};
    y += 16;
    const summary=(label,value,bold=false)=>{doc.font(bold?'Helvetica-Bold':'Helvetica').text(label,360,y,{width:90,align:'right'}).text(value,460,y,{width:85,align:'right'});y+=20};
    summary('Subtotal',`$${Number(totals.subtotal||0).toFixed(2)}`);
    summary('Discount',`${Number(totals.discount||0)}%`);
    summary('Tax',`${Number(totals.tax||0)}%`);
    summary('Total',`$${Number(totals.total||0).toFixed(2)}`,true);
    doc.end();
    out.on('finish',resolve);out.on('error',reject);
  });
  return {ok:true,path:result.filePath};
});
