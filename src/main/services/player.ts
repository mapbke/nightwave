import { BrowserWindow } from 'electron'
import type { PlayerState, Track } from '../../shared/contracts'

const PLAYER_HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' data: https:; script-src 'unsafe-inline' https://w.soundcloud.com; frame-src https://w.soundcloud.com; style-src 'unsafe-inline';">
  <style>html,body{margin:0;background:#000;overflow:hidden}iframe{width:100%;height:166px;border:0}</style>
</head>
<body>
  <iframe id="player" allow="autoplay"></iframe>
  <script src="https://w.soundcloud.com/player/api.js"></script>
  <script>
    const frame = document.getElementById('player')
    let widget = null
    let bound = false
    let state = { playing:false, position:0, duration:0, loading:false, error:'' }

    const bind = () => {
      if (!widget || bound) return
      bound = true
      widget.bind(SC.Widget.Events.READY, () => {
        state.loading = false
        widget.getDuration(v => state.duration = Number(v || 0))
        widget.setVolume(Math.round((window.__nwVolume || 0.82) * 100))
        widget.play()
      })
      widget.bind(SC.Widget.Events.PLAY, () => { state.playing = true; state.loading = false })
      widget.bind(SC.Widget.Events.PAUSE, () => { state.playing = false })
      widget.bind(SC.Widget.Events.FINISH, () => { state.playing = false })
      widget.bind(SC.Widget.Events.PLAY_PROGRESS, e => {
        state.position = Number(e.currentPosition || 0)
        state.duration = Number(e.relativePosition || 0) > 0
          ? state.position / Number(e.relativePosition)
          : state.duration
      })
      widget.bind(SC.Widget.Events.ERROR, () => {
        state.loading = false
        state.error = 'SoundCloud widget playback error'
      })
    }

    window.__nwVolume = 0.82
    window.__nwLoad = (url, volume) => {
      state = { playing:false, position:0, duration:0, loading:true, error:'' }
      window.__nwVolume = Number.isFinite(volume) ? volume : window.__nwVolume
      bound = false
      frame.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(url) +
        '&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false'
      widget = SC.Widget(frame)
      bind()
      return true
    }
    window.__nwCommand = (command, value) => {
      if (!widget) return false
      if (command === 'play') widget.play()
      else if (command === 'pause') widget.pause()
      else if (command === 'toggle') state.playing ? widget.pause() : widget.play()
      else if (command === 'seek') widget.seekTo(Math.max(0, Number(value || 0)))
      else if (command === 'volume') {
        window.__nwVolume = Math.max(0, Math.min(1, Number(value || 0)))
        widget.setVolume(Math.round(window.__nwVolume * 100))
      } else return false
      return true
    }
    window.__nwState = () => ({...state, volume: window.__nwVolume})
  </script>
</body>
</html>`

export class SoundCloudPlayerService {
  private window: BrowserWindow | null = null
  private track: Track | null = null
  private volume = 0.82

  private async ensureWindow(): Promise<BrowserWindow> {
    if (this.window && !this.window.isDestroyed()) return this.window

    this.window = new BrowserWindow({
      show: false,
      width: 520,
      height: 220,
      skipTaskbar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        backgroundThrottling: false
      }
    })

    this.window.webContents.setAudioMuted(false)
    this.window.on('closed', () => { this.window = null })
    await this.window.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(PLAYER_HTML))
    return this.window
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, Number(volume) || 0))
  }

  async load(track: Track): Promise<boolean> {
    try {
      const win = await this.ensureWindow()
      this.track = track
      const result = await win.webContents.executeJavaScript(
        `window.__nwLoad?.(${JSON.stringify(track.url)}, ${this.volume})`,
        true
      )
      return Boolean(result)
    } catch {
      return false
    }
  }

  async command(command: string, value?: number): Promise<boolean> {
    try {
      const win = await this.ensureWindow()
      if (command === 'volume' && typeof value === 'number') this.setVolume(value)
      const result = await win.webContents.executeJavaScript(
        `window.__nwCommand?.(${JSON.stringify(command)}, ${JSON.stringify(value ?? null)})`,
        true
      )
      return Boolean(result)
    } catch {
      return false
    }
  }

  async state(): Promise<PlayerState> {
    if (!this.track) {
      return {
        track: null,
        playing: false,
        position: 0,
        duration: 0,
        volume: this.volume,
        loading: false
      }
    }

    try {
      const win = await this.ensureWindow()
      const state = await win.webContents.executeJavaScript('window.__nwState?.()', true)
      return {
        track: this.track,
        playing: Boolean(state?.playing),
        position: Number(state?.position || 0) / 1000,
        duration: Number(state?.duration || 0) / 1000,
        volume: Number(state?.volume ?? this.volume),
        loading: Boolean(state?.loading),
        error: state?.error || undefined
      }
    } catch (error) {
      return {
        track: this.track,
        playing: false,
        position: 0,
        duration: 0,
        volume: this.volume,
        loading: false,
        error: String(error)
      }
    }
  }

  destroy(): void {
    if (this.window && !this.window.isDestroyed()) this.window.destroy()
    this.window = null
  }
}
