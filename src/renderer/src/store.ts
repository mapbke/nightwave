import { create } from 'zustand'
import type { AppData, PlayerState, Track } from '../../shared/contracts'

type Page = 'home' | 'search' | 'library' | 'settings'

type UiState = {
  page: Page
  query: string
  results: Track[]
  searching: boolean
  player: PlayerState
  data: AppData
  setPage(page: Page): void
  setQuery(query: string): void
  setResults(results: Track[]): void
  setSearching(searching: boolean): void
  setPlayer(player: PlayerState): void
  setData(data: AppData): void
}

export const useNightwave = create<UiState>((set) => ({
  page: 'home',
  query: '',
  results: [],
  searching: false,
  player: {
    track: null,
    playing: false,
    position: 0,
    duration: 0,
    volume: 0.82,
    loading: false
  },
  data: { favorites: [], history: [], volume: 0.82 },
  setPage: (page) => set({ page }),
  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
  setSearching: (searching) => set({ searching }),
  setPlayer: (player) => set({ player }),
  setData: (data) => set({ data })
}))
