const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nightwave', {
  getConfig: () => ipcRenderer.invoke('nw:config-get'),
  patchConfig: (patch) => ipcRenderer.invoke('nw:config-patch', patch),
  authStatus: () => ipcRenderer.invoke('nw:auth-status'),
  openLogin: () => ipcRenderer.send('nw:auth-open'),
  logout: () => ipcRenderer.invoke('nw:logout'),
  engineStatus: () => ipcRenderer.invoke('nw:engine-status'),
  search: (q) => ipcRenderer.invoke('nw:search', q),
  control: (action, payload) => ipcRenderer.invoke('nw:control', action, payload),
  setEq: (enabled, gains) => ipcRenderer.invoke('nw:eq', enabled, gains),
  minimize: () => ipcRenderer.send('nw:window-minimize'),
  maximize: () => ipcRenderer.send('nw:window-maximize'),
  close: () => ipcRenderer.send('nw:window-close'),
  onNowPlaying: (cb) => ipcRenderer.on('nw:now-playing', (_e, d) => cb(d)),
  onEngine: (cb) => ipcRenderer.on('nw:engine', (_e, d) => cb(d)),
  onAuth: (cb) => ipcRenderer.on('nw:auth-changed', (_e, d) => cb(d))
});
