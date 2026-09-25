import type { NightwaveApi } from '../../shared/contracts'

declare global {
  interface Window {
    nightwave: NightwaveApi
  }
}

export {}
