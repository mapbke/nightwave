import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron'
import path from 'node:path'
import { SoundCloudPlayerService } from './services/player'
import { SoundCloudSearchService } from './services/search'
import { StoreService } from './services/store'
import type { Track } from '../shared/contracts'

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
app.commandLine.appendSwitch('disable-renderer-backgrounding')

let mainWindow: BrowserWindow | null = null
let loginWindow: BrowserWindow | null = null
let store: StoreService
let search: SoundCloudSearchService
let player: SoundCloudPlayerService

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1040,
    minHeight: 680,
    frame: false,
    show: false,
    backgroundColor: '#050505',
    icon: path.join(__dirname, '../../build/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => { mainWindow = null })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

function openLogin(): void {
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.show()
    loginWindow.focus()
    return
  }

  loginWindow = new BrowserWindow({
    width: 620,
    height: 780,
    title: 'SoundCloud sign in',
    autoHideMenuBar: true,
    webPreferences: {
      partition: 'persist:nightwave-soundcloud',
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  })

  loginWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\/(accounts\.google\.com|.*\.google\.com)\//i.test(url)) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  loginWindow.loadURL('https://soundcloud.com/signin')
  loginWindow.on('closed', () => { loginWindow = null })
}

function registerIpc(): void {
  ipcMain.handle('nw:search', (_event, query: string) => search.search(query))

  ipcMain.handle('nw:player-load', async (_event, track: Track) => {
    const ok = await player.load(track)
    if (ok) store.addHistory(track)
    return ok
  })

  ipcMain.handle('nw:player-command', async (_event, command: string, value?: number) => {
    if (command === 'volume' && typeof value === 'number') store.setVolume(value)
    return player.command(command, value)
  })

  ipcMain.handle('nw:player-state', () => player.state())
  ipcMain.handle('nw:data-get', () => store.get())
  ipcMain.handle('nw:favorite-toggle', (_event, track: Track) => store.toggleFavorite(track))
  ipcMain.handle('nw:history-add', (_event, track: Track) => store.addHistory(track))

  ipcMain.on('nw:login-open', openLogin)
  ipcMain.on('nw:window-minimize', () => mainWindow?.minimize())
  ipcMain.on('nw:window-maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize())
  ipcMain.on('nw:window-close', () => mainWindow?.close())
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  })

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)
    store = new StoreService(app.getPath('userData'))
    search = new SoundCloudSearchService()
    player = new SoundCloudPlayerService()
    player.setVolume(store.get().volume)
    registerIpc()
    createMainWindow()
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  search?.destroy()
  player?.destroy()
})
