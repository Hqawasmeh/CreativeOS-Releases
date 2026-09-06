// RC9 V0.1 auto-update module for the Electron main process.
// Requires: electron-updater
const { autoUpdater } = require('electron-updater');

function configureUpdater({ logger = console, onStatus = () => {} } = {}) {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = true;
  autoUpdater.logger = logger;

  autoUpdater.on('checking-for-update', () => onStatus({ state: 'checking' }));
  autoUpdater.on('update-available', info => onStatus({ state: 'available', info }));
  autoUpdater.on('update-not-available', info => onStatus({ state: 'current', info }));
  autoUpdater.on('download-progress', progress => onStatus({ state: 'downloading', progress }));
  autoUpdater.on('update-downloaded', info => onStatus({ state: 'downloaded', info }));
  autoUpdater.on('error', error => onStatus({ state: 'error', error: String(error?.message || error) }));

  return {
    check: () => autoUpdater.checkForUpdates(),
    download: () => autoUpdater.downloadUpdate(),
    install: () => autoUpdater.quitAndInstall(false, true),
  };
}

module.exports = { configureUpdater };
