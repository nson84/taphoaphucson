const { contextBridge, ipcRenderer } = require('electron')

window.addEventListener('DOMContentLoaded', () => {
  document.title = 'Tạp hóa Phúc Sơn — Công nợ'
})

contextBridge.exposeInMainWorld('taphoaDesktop', {
  canSilentPrint: true,
  printSilent: () => ipcRenderer.invoke('print-silent'),

  pickBackupFolder: () => ipcRenderer.invoke('pick-backup-folder'),
  getBackupFolder: () => ipcRenderer.invoke('get-backup-folder'),
  setBackupFolder: (directory) => ipcRenderer.invoke('set-backup-folder', directory),
  writeBackupFile: (payload) => ipcRenderer.invoke('write-backup-file', payload),

  onCloseRequest: (callback) => {
    const handler = () => {
      try {
        callback()
      } catch {
        // ignore
      }
    }
    ipcRenderer.on('app-close-request', handler)
    return () => ipcRenderer.removeListener('app-close-request', handler)
  },
  allowCloseAndQuit: () => ipcRenderer.invoke('allow-close-and-quit'),
})
