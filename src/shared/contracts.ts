export type Track = {
  title: string
  artist: string
  url: string
  artwork?: string
  duration?: number
}

export type PlayerState = {
  track: Track | null
  playing: boolean
  position: number
  duration: number
  volume: number
  loading: boolean
  error?: string
}

export type AppData = {
  favorites: Track[]
  history: Track[]
  volume: number
}

export type SearchResponse = {
  items: Track[]
  error?: string
}

export type NightwaveApi = {
  search(query: string): Promise<SearchResponse>
  playerLoad(track: Track): Promise<boolean>
  playerCommand(command: 'play' | 'pause' | 'toggle' | 'next' | 'seek' | 'volume', value?: number): Promise<boolean>
  playerState(): Promise<PlayerState>
  dataGet(): Promise<AppData>
  favoriteToggle(track: Track): Promise<AppData>
  historyAdd(track: Track): Promise<AppData>
  loginOpen(): void
  windowMinimize(): void
  windowMaximize(): void
  windowClose(): void
}
