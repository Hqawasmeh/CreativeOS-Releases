const { autoUpdater } = require('electron-updater');

let win;
let installRequested = false;

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function initUpdater(mainWindow) {
  win = mainWindow;
  autoUpdater.autoDownload = true;
  // We install explicitly after the UI has been closed. This avoids starting
  // NSIS while Electron windows/processes are still unwinding.
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
  // Silent=false keeps the normal installer UI if Windows needs user attention.
  // isForceRunAfter=true starts the new Qanteak build when installation completes.
  setTimeout(() => autoUpdater.quitAndInstall(false, true), 900);
  return { ok: true };
}

module.exports = { initUpdater, check, install };
