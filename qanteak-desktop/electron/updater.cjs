const { autoUpdater } = require('electron-updater');
const { app, ipcMain } = require('electron');
const platform = require('./platform.cjs');

let win;
let installRequested = false;
let platformRegistered = false;

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function initPlatformBridge() {
  if (platformRegistered) return;
  platformRegistered = true;
  platform.configure(app.getPath('userData'));
  ipcMain.handle('platform:load', () => platform.readState());
  ipcMain.handle('platform:save', (_e, state) => platform.writeState(state || {}));
  ipcMain.handle('platform:api-status', () => platform.apiStatus());
  ipcMain.handle('platform:api-start', (_e, port) => platform.startApi(port));
  ipcMain.handle('platform:api-stop', () => platform.stopApi());
  ipcMain.handle('platform:webhook-send', (_e, url, payload) => platform.sendWebhook(url, payload || {}));
  const saved = platform.readState();
  if (saved.platform?.apiEnabled) platform.startApi(saved.platform.port || 32145).catch(err => console.warn('Qanteak local API restore failed:', err.message));
}

function initUpdater(mainWindow) {
  win = mainWindow;
  initPlatformBridge();
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowPrerelease = true;
  autoUpdater.logger = console;

  autoUpdater.on('checking-for-update', () =>
    send('update:status', { state: 'checking', message: 'Checking for updates…' })
  );
  autoUpdater.on('update-available', info =>
    send('update:status', { state: 'available', message: `Update ${info.version} is available.` })
  );
  autoUpdater.on('update-not-available', info =>
    send('update:status', { state: 'current', message: `Qanteak is current (${info.version}).` })
  );
  autoUpdater.on('download-progress', p =>
    send('update:progress', {
      percent: Math.round(p.percent),
      transferred: p.transferred,
      total: p.total
    })
  );
  autoUpdater.on('update-downloaded', info =>
    send('update:downloaded', {
      version: info.version,
      message: 'Update downloaded. Restart Qanteak to install.'
    })
  );
  autoUpdater.on('error', err =>
    send('update:status', { state: 'error', message: err?.message || 'Update check failed.' })
  );
}

async function check() {
  return autoUpdater.checkForUpdates();
}

function install() {
  if (installRequested) return { ok: true, alreadyStarted: true };
  installRequested = true;
  setTimeout(() => autoUpdater.quitAndInstall(false, true), 900);
  return { ok: true };
}

module.exports = { initUpdater, check, install };
