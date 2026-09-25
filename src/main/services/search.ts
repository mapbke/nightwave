import { BrowserWindow } from 'electron'
import type { SearchResponse, Track } from '../../shared/contracts'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36'

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

export class SoundCloudSearchService {
  private window: BrowserWindow | null = null

  private ensureWindow(): BrowserWindow {
    if (this.window && !this.window.isDestroyed()) return this.window

    this.window = new BrowserWindow({
      show: false,
      width: 1100,
      height: 760,
      skipTaskbar: true,
      webPreferences: {
        partition: 'persist:nightwave-soundcloud',
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        backgroundThrottling: false
      }
    })
    this.window.webContents.setUserAgent(UA)
    this.window.on('closed', () => { this.window = null })
    return this.window
  }

  async search(query: string): Promise<SearchResponse> {
    const q = query.trim()
    if (!q) return { items: [] }

    const win = this.ensureWindow()
    const url = `https://soundcloud.com/search/sounds?q=${encodeURIComponent(q)}`

    try {
      await win.loadURL(url, { userAgent: UA })
    } catch (error) {
      return { items: [], error: String(error) }
    }

    for (let attempt = 0; attempt < 24; attempt++) {
      await sleep(attempt === 0 ? 700 : 250)
      const items = await this.extract(win)
      if (items.length) return { items }
    }

    return { items: [], error: 'SoundCloud did not expose search results in time.' }
  }

  private async extract(win: BrowserWindow): Promise<Track[]> {
    try {
      const raw = await win.webContents.executeJavaScript(`
        (() => {
          const blocked = new Set(['search','discover','stream','you','charts','upload','settings','notifications','messages','terms-of-use','pages','stations'])
          const seen = new Set()
          const out = []
          const clean = (value) => String(value || '').replace(/\\s+/g, ' ').trim()
          const anchors = [...document.querySelectorAll('a[href]')]

          for (const a of anchors) {
            let u
            try { u = new URL(a.href, location.href) } catch { continue }
            if (u.hostname !== 'soundcloud.com' && !u.hostname.endsWith('.soundcloud.com')) continue

            const parts = u.pathname.split('/').filter(Boolean)
            if (parts.length !== 2 || blocked.has(parts[0])) continue

            const trackUrl = 'https://soundcloud.com/' + parts.join('/')
            if (seen.has(trackUrl)) continue

            const row = a.closest('li, article, [role="listitem"]') || a.parentElement?.parentElement || a.parentElement
            let title = clean(a.getAttribute('title') || a.getAttribute('aria-label') || a.textContent)
            if (!title || title.length > 180 || title.toLowerCase() === parts[0].toLowerCase()) {
              const titleEl = row?.querySelector('[class*="title" i], [data-testid*="title" i], h2, h3')
              title = clean(titleEl?.getAttribute?.('title') || titleEl?.textContent || title)
            }
            if (!title || title.length > 180) continue

            const artistEl = row?.querySelector('[class*="username" i], [class*="artist" i], [data-testid*="artist" i]')
            const artist = clean(artistEl?.getAttribute?.('title') || artistEl?.textContent || parts[0])

            const img = row?.querySelector('img[src]')
            const artwork = img?.currentSrc || img?.src || ''

            seen.add(trackUrl)
            out.push({ title, artist, url: trackUrl, artwork })
            if (out.length >= 40) break
          }

          return out
        })()
      `, true)

      return Array.isArray(raw) ? raw : []
    } catch {
      return []
    }
  }

  destroy(): void {
    if (this.window && !this.window.isDestroyed()) this.window.destroy()
    this.window = null
  }
}
