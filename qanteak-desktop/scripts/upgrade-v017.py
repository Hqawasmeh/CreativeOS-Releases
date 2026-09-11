from pathlib import Path
import json, re

root = Path(__file__).resolve().parents[1]

# Version metadata
pkg = root / 'package.json'
p = json.loads(pkg.read_text())
p['version'] = '1.0.0-rc.9.17'
p['description'] = 'Qanteak OS RC9 V0.17 workspace recovery and safe cloud hydration hotfix'
pkg.write_text(json.dumps(p, indent=2) + '\n')

lock = root / 'package-lock.json'
s = lock.read_text()
s = s.replace('"version": "1.0.0-rc.9.16"', '"version": "1.0.0-rc.9.17"', 2)
lock.write_text(s)

pre = root / 'scripts' / 'preflight.mjs'
s = pre.read_text()
s = s.replace('CHANGELOG-RC9-V0.16.md', 'CHANGELOG-RC9-V0.17.md')
s = s.replace("pkg.version !== '1.0.0-rc.9.16'", "pkg.version !== '1.0.0-rc.9.17'")
s = s.replace('Qanteak preflight OK · 1.0.0-rc.9.16', 'Qanteak preflight OK · 1.0.0-rc.9.17')
pre.write_text(s)

html = root / 'src' / 'index.html'
s = html.read_text()
s = s.replace('<title>Qanteak OS RC9 V0.16</title>', '<title>Qanteak OS RC9 V0.17</title>')
s = s.replace('Qanteak OS · RC9 V0.16', 'Qanteak OS · RC9 V0.17')
s = s.replace('>RC9 V0.16</button>', '>RC9 V0.17</button>')
html.write_text(s)

app = root / 'src' / 'app.js'
s = app.read_text()

# Add durable local workspace cache helpers immediately after renderer state creation.
needle = "const state=load();\nfunction clearWorkspaceCollections(){for(const k of WORKSPACE_COLLECTIONS)state[k]=[]}"
insert = """const state=load();
const WORKSPACE_CACHE_PREFIX='qanteak.rc9.workspace.cache.';
function workspaceCacheKey(){const id=backendState?.workspaceId||state.preferences?.cloudWorkspaceId||'';return id?`${WORKSPACE_CACHE_PREFIX}${id}`:''}
function workspaceSnapshotForCache(){const out={};for(const k of WORKSPACE_COLLECTIONS)out[k]=structuredClone(state[k]||[]);return out}
function persistWorkspaceCache(){try{const key=workspaceCacheKey();if(!key||(!backendState?.workspaceLoaded&&!backendState?.cacheHydrated))return;localStorage.setItem(key,JSON.stringify({revision:Number(backendState?.revision||0),savedAt:new Date().toISOString(),snapshot:workspaceSnapshotForCache()}));}catch(e){console.warn('Workspace cache write skipped',e?.message||e)}}
function restoreWorkspaceCache(){try{const key=workspaceCacheKey();if(!key)return false;const raw=localStorage.getItem(key);if(!raw)return false;const cached=JSON.parse(raw);const snap=cached?.snapshot;if(!snap||typeof snap!=='object')return false;for(const k of WORKSPACE_COLLECTIONS)state[k]=Array.isArray(snap[k])?structuredClone(snap[k]):[];backendState.cacheHydrated=true;backendState.revision=Math.max(Number(backendState.revision||0),Number(cached.revision||0));return true}catch(e){console.warn('Workspace cache restore skipped',e?.message||e);return false}}
function clearWorkspaceCollections(){for(const k of WORKSPACE_COLLECTIONS)state[k]=[]}"""
if needle not in s:
    raise SystemExit('state/cache insertion point changed; refusing unsafe patch')
s = s.replace(needle, insert, 1)

# Extend backend state with explicit cloud hydration/cache safety flags.
s = s.replace("offlineDirty:false};", "offlineDirty:false,workspaceLoaded:false,cacheHydrated:false};", 1)

# Persist the last known-good workspace whenever remote/local state is applied.
old_apply = "function applyWorkspacePayload(payload){suppressCloudSync=true;const source=(payload&&typeof payload==='object')?payload:{};for(const k of sharedWorkspaceKeys)state[k]=Array.isArray(source[k])?structuredClone(source[k]):[];saveLocalOnly();suppressCloudSync=false}"
new_apply = "function applyWorkspacePayload(payload){suppressCloudSync=true;const source=(payload&&typeof payload==='object')?payload:{};for(const k of sharedWorkspaceKeys)state[k]=Array.isArray(source[k])?structuredClone(source[k]):[];saveLocalOnly();backendState.cacheHydrated=true;persistWorkspaceCache();suppressCloudSync=false}"
if old_apply not in s:
    raise SystemExit('applyWorkspacePayload changed; refusing unsafe patch')
s = s.replace(old_apply, new_apply, 1)

# Keep local cache fresh, but never allow a boot-time empty state to overwrite the cloud.
old_save = "save=function(){saveLocalOnly();if(!suppressCloudSync)scheduleCloudSync()};"
new_save = "save=function(){saveLocalOnly();persistWorkspaceCache();if(!suppressCloudSync){if(backendState?.cacheHydrated&&!backendState?.workspaceLoaded)backendState.offlineDirty=true;scheduleCloudSync()}};"
if old_save not in s:
    raise SystemExit('save override changed; refusing unsafe patch')
s = s.replace(old_save, new_save, 1)

old_sched = "function scheduleCloudSync(){if(!backendState.session||!backendState.workspaceId||!window.qanteakDesktop?.backendPush)return;if(!navigator.onLine||backendState.connectivity?.online===false){backendState.offlineDirty=true;return}clearTimeout(cloudSyncTimer);cloudSyncTimer=setTimeout(()=>pushWorkspaceSnapshot(false),1800)}"
new_sched = "function scheduleCloudSync(){if(!backendState.session||!backendState.workspaceId||!window.qanteakDesktop?.backendPush||backendState.workspaceLoaded!==true)return;if(!navigator.onLine||backendState.connectivity?.online===false){backendState.offlineDirty=true;return}clearTimeout(cloudSyncTimer);cloudSyncTimer=setTimeout(()=>pushWorkspaceSnapshot(false),1800)}"
if old_sched not in s:
    raise SystemExit('scheduleCloudSync changed; refusing unsafe patch')
s = s.replace(old_sched, new_sched, 1)

# A failed cloud pull must never clear a user's workspace. Preserve cache and retry later.
old_pull = "async function pullWorkspaceSnapshot(showToast=true){if(!backendState.workspaceId||!backendState.session)return;try{backendState.busy=true;const row=await window.qanteakDesktop.backendPull(backendState.workspaceId);applyWorkspacePayload(row?.snapshot||{});backendState.revision=Number(row?.revision||0);backendState.lastSync=row?.updated_at||null;backendState.error='';if(showToast)toast('Workspace loaded',row?`Cloud revision ${backendState.revision} loaded.`:'A clean authenticated workspace is ready.','good')}catch(e){clearWorkspaceCollections();backendState.error=e?.message||'Could not load cloud workspace.';if(showToast)toast('Cloud load failed',backendState.error)}finally{backendState.busy=false;if(state.view==='settings')render('settings')}}"
new_pull = "async function pullWorkspaceSnapshot(showToast=true){if(!backendState.workspaceId||!backendState.session)return false;const localBefore=workspaceSnapshotForCache();const hadLocalDirty=!!backendState.offlineDirty;try{backendState.busy=true;const row=await window.qanteakDesktop.backendPull(backendState.workspaceId);const remote=row?.snapshot||{};const next=hadLocalDirty?mergeWorkspacePayload(remote,localBefore):remote;applyWorkspacePayload(next);backendState.revision=Number(row?.revision||backendState.revision||0);backendState.lastSync=row?.updated_at||null;backendState.error='';backendState.workspaceLoaded=true;backendState.cacheHydrated=true;backendState.offlineDirty=hadLocalDirty;persistWorkspaceCache();if(hadLocalDirty)scheduleCloudSync();if(showToast)toast('Workspace loaded',row?`Cloud revision ${backendState.revision} loaded.`:'A clean authenticated workspace is ready.','good');return true}catch(e){backendState.workspaceLoaded=false;backendState.error=e?.message||'Could not load cloud workspace.';const restored=restoreWorkspaceCache();if(showToast)toast(restored?'Showing saved workspace':'Cloud load failed',restored?'Qanteak kept your last saved workspace on this PC and will retry the cloud connection.':backendState.error,restored?'good':'');return false}finally{backendState.busy=false;if(state.view==='settings')render('settings')}}"
if old_pull not in s:
    raise SystemExit('pullWorkspaceSnapshot changed; refusing unsafe patch')
s = s.replace(old_pull, new_pull, 1)

# Restore cached data before the network pull, so an update/network hiccup cannot present a blank workspace.
old_enter = "async function enterAuthenticatedWorkspace(){if(!backendState.session||!backendState.workspaceId){showAuthenticatedApp(false);return}await pullWorkspaceSnapshot(false);await refreshDriveStorage(false);await refreshWorkspaceInvites(false);await refreshBackups();await refreshConnectivity(false);await startWorkspaceRealtime();updateProfileFromSession();showAuthenticatedApp(true);updateNotificationCount();render(state.view==='settings'?'settings':'home');setTimeout(()=>maybeShowOnboarding(),250)}"
new_enter = "async function enterAuthenticatedWorkspace(){if(!backendState.session||!backendState.workspaceId){showAuthenticatedApp(false);return}const restored=restoreWorkspaceCache();const loaded=await pullWorkspaceSnapshot(false);await refreshDriveStorage(false);await refreshWorkspaceInvites(false);await refreshBackups();await refreshConnectivity(false);await startWorkspaceRealtime();updateProfileFromSession();showAuthenticatedApp(true);updateNotificationCount();render(state.view==='settings'?'settings':'home');if(!loaded)toast(restored?'Workspace recovery active':'Cloud data not loaded',restored?'Your last saved workspace is visible while Qanteak retries cloud sync.':'Qanteak blocked cloud writes to protect your existing data. Check the connection and retry.');setTimeout(()=>maybeShowOnboarding(),250)}"
if old_enter not in s:
    raise SystemExit('enterAuthenticatedWorkspace changed; refusing unsafe patch')
s = s.replace(old_enter, new_enter, 1)

# On reconnect, hydrate from the cloud first; only then can queued changes be pushed.
old_online = "window.addEventListener('online',async()=>{await refreshConnectivity(false);if(backendState.session&&backendState.workspaceId){await startWorkspaceRealtime();if(backendState.offlineDirty){backendState.offlineDirty=false;await pushWorkspaceSnapshot(false)}}toast('Back online','Qanteak reconnected and resumed cloud synchronization.','good');if(state.view==='settings')render('settings')});"
new_online = "window.addEventListener('online',async()=>{await refreshConnectivity(false);if(backendState.session&&backendState.workspaceId){if(!backendState.workspaceLoaded)await pullWorkspaceSnapshot(false);await startWorkspaceRealtime();if(backendState.workspaceLoaded&&backendState.offlineDirty){backendState.offlineDirty=false;await pushWorkspaceSnapshot(false)}}toast('Back online','Qanteak reconnected and resumed cloud synchronization.','good');if(state.view==='settings')render('settings')});"
if old_online not in s:
    raise SystemExit('online handler changed; refusing unsafe patch')
s = s.replace(old_online, new_online, 1)

# Keep telemetry version aligned with the hotfix.
s = s.replace("appVersion:'1.0.0-rc.9.14'", "appVersion:'1.0.0-rc.9.17'")

app.write_text(s)

# Add changelog.
(root / 'CHANGELOG-RC9-V0.17.md').write_text('''# Qanteak OS RC9 V0.17\n\nEmergency workspace recovery hotfix.\n\n- Prevents a failed startup cloud pull from clearing the visible workspace.\n- Prevents an empty boot state from being pushed over an existing cloud snapshot.\n- Adds a per-workspace last-known-good local cache.\n- Restores cached workspace data before attempting cloud hydration.\n- Blocks cloud writes until a valid workspace snapshot has loaded.\n- Merges queued local changes after reconnect before resuming sync.\n- Keeps existing V0.16 UI/design changes unchanged.\n''')

print('RC9 V0.17 recovery patch applied')
