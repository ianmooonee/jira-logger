const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  checkEnv: () => ipcRenderer.invoke('check-env'),
});
