import { contextBridge, ipcRenderer } from 'electron'
import type { NightwaveApi, Track } from '../shared/contracts'

const api: NightwaveApi = {
  search: (query) => ipcRenderer.invoke('nw:search', query),
  playerLoad: (track: Track) => ipcRenderer.invoke('nw:player-load', track),
  playerCommand: (command, value) => ipcRenderer.invoke('nw:player-command', command, value),
  playerState: () => ipcRenderer.invoke('nw:player-state'),
  dataGet: () => ipcRenderer.invoke('nw:data-get'),
  favoriteToggle: (track: Track) => ipcRenderer.invoke('nw:favorite-toggle', track),
  historyAdd: (track: Track) => ipcRenderer.invoke('nw:history-add', track),
  loginOpen: () => ipcRenderer.send('nw:login-open'),
  windowMinimize: () => ipcRenderer.send('nw:window-minimize'),
  windowMaximize: () => ipcRenderer.send('nw:window-maximize'),
  windowClose: () => ipcRenderer.send('nw:window-close')
}

contextBridge.exposeInMainWorld('nightwave', api)
