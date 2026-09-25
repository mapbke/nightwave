import fs from 'node:fs'
import path from 'node:path'
import type { AppData, Track } from '../../shared/contracts'

const DEFAULT_DATA: AppData = {
  favorites: [],
  history: [],
  volume: 0.82
}

export class StoreService {
  private file: string
  private data: AppData

  constructor(userDataDir: string) {
    this.file = path.join(userDataDir, 'nightwave.json')
    this.data = this.read()
  }

  private read(): AppData {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Partial<AppData>
      return {
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
        history: Array.isArray(parsed.history) ? parsed.history : [],
        volume: typeof parsed.volume === 'number' ? parsed.volume : DEFAULT_DATA.volume
      }
    } catch {
      return structuredClone(DEFAULT_DATA)
    }
  }

  private write(): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true })
    const tmp = this.file + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8')
    fs.renameSync(tmp, this.file)
  }

  get(): AppData {
    return structuredClone(this.data)
  }

  setVolume(volume: number): AppData {
    this.data.volume = Math.max(0, Math.min(1, Number(volume) || 0))
    this.write()
    return this.get()
  }

  toggleFavorite(track: Track): AppData {
    const index = this.data.favorites.findIndex((item) => item.url === track.url)
    if (index >= 0) this.data.favorites.splice(index, 1)
    else this.data.favorites.unshift(track)
    this.data.favorites = this.data.favorites.slice(0, 250)
    this.write()
    return this.get()
  }

  addHistory(track: Track): AppData {
    this.data.history = [
      track,
      ...this.data.history.filter((item) => item.url !== track.url)
    ].slice(0, 100)
    this.write()
    return this.get()
  }
}
