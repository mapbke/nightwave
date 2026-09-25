import { useEffect, useMemo } from 'react'
import type { Track } from '../../shared/contracts'
import { useNightwave } from './store'
import './styles.css'

const api = window.nightwave

function formatTime(value: number): string {
  const seconds = Math.max(0, Math.floor(value || 0))
  const min = Math.floor(seconds / 60)
  const sec = String(seconds % 60).padStart(2, '0')
  return `${min}:${sec}`
}

function TrackRow({ track, index, favorite }: { track: Track; index: number; favorite: boolean }) {
  const setData = useNightwave((s) => s.setData)

  return (
    <div className="track-row">
      <span className="index">{String(index + 1).padStart(2, '0')}</span>
      <div className="track-meta">
        <img src={track.artwork || './memes/pug.png'} />
        <div>
          <strong>{track.title}</strong>
          <small>{track.url.replace('https://soundcloud.com/', '')}</small>
        </div>
      </div>
      <span className="artist">{track.artist || 'SoundCloud'}</span>
      <div className="track-actions">
        <button onClick={async () => setData(await api.favoriteToggle(track))}>{favorite ? '♥' : '♡'}</button>
        <button onClick={() => api.playerLoad(track)}>▶</button>
      </div>
    </div>
  )
}

export default function App() {
  const state = useNightwave()
  const favorites = useMemo(() => new Set(state.data.favorites.map((x) => x.url)), [state.data.favorites])

  useEffect(() => {
    api.dataGet().then((data) => {
      state.setData(data)
      api.playerCommand('volume', data.volume)
    })

    const timer = window.setInterval(async () => {
      state.setPlayer(await api.playerState())
    }, 500)

    return () => window.clearInterval(timer)
  }, [])

  async function doSearch(event: React.FormEvent) {
    event.preventDefault()
    if (!state.query.trim()) return
    state.setSearching(true)
    const response = await api.search(state.query)
    state.setResults(response.items)
    state.setSearching(false)
  }

  const pages = ['home', 'search', 'library', 'settings'] as const

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">NIGHTWAVE</div>
        <nav>
          {pages.map((page) => (
            <button key={page} className={state.page === page ? 'active' : ''} onClick={() => state.setPage(page)}>
              {page}
            </button>
          ))}
        </nav>
        <div className="window-actions">
          <button onClick={api.windowMinimize}>—</button>
          <button onClick={api.windowMaximize}>□</button>
          <button onClick={api.windowClose}>×</button>
        </div>
      </header>

      <main>
        {state.page === 'home' && (
          <section className="hero">
            <div className="hero-copy">
              <span className="eyebrow">SOUNDCLOUD DESKTOP CLIENT / V0.5</span>
              <h1>Музыка.<br />Без лишнего.</h1>
              <p>React-фронт. TypeScript-бэкенд. Официальный SoundCloud Widget отвечает за playback вместо хрупких кликов по сайту.</p>
              <div className="info-card">
                <img src="./memes/pug.png" />
                <div>
                  <strong>Плеер больше не кликает Play 20 раз.</strong>
                  <small>Одна команда пользователя = одна команда SoundCloud Widget.</small>
                </div>
              </div>
              <button className="secondary" onClick={api.loginOpen}>SoundCloud login</button>
              <small className="login-note">Google может блокировать embedded Electron login. Для входа внутри приложения используй SoundCloud email.</small>
            </div>
            <div className="hero-art">
              <img className="main-art" src={state.player.track?.artwork || './memes/peter.png'} />
              <img className="sticker troll" src="./memes/troll.png" />
              <img className="sticker squirrel" src="./memes/squirrel.png" />
            </div>
          </section>
        )}

        {state.page === 'search' && (
          <section className="page">
            <div className="page-title">
              <h2>ПОИСК.</h2>
              <p>Поиск и playback теперь разделены. Если SoundCloud поменяет выдачу, плеер не ломается вместе с ней.</p>
            </div>
            <form className="search-form" onSubmit={doSearch}>
              <input value={state.query} onChange={(e) => state.setQuery(e.target.value)} placeholder="track or artist" />
              <button>{state.searching ? 'Ищу…' : 'Найти'}</button>
            </form>
            <div className="tracks">
              {state.results.length === 0 ? (
                <div className="empty">
                  <img src="./memes/squirrel.png" />
                  <strong>{state.searching ? 'SoundCloud отвечает…' : 'Найди что-нибудь.'}</strong>
                </div>
              ) : state.results.map((track, index) => (
                <TrackRow key={track.url} track={track} index={index} favorite={favorites.has(track.url)} />
              ))}
            </div>
          </section>
        )}

        {state.page === 'library' && (
          <section className="page">
            <div className="page-title"><h2>МЕДИАТЕКА.</h2><p>Локальные избранное и история.</p></div>
            <h3 className="section-label">Избранное</h3>
            <div className="tracks">
              {state.data.favorites.map((track, index) => (
                <TrackRow key={track.url} track={track} index={index} favorite />
              ))}
            </div>
            <h3 className="section-label">История</h3>
            <div className="tracks">
              {state.data.history.map((track, index) => (
                <TrackRow key={track.url} track={track} index={index} favorite={favorites.has(track.url)} />
              ))}
            </div>
          </section>
        )}

        {state.page === 'settings' && (
          <section className="page">
            <div className="page-title"><h2>НАСТРОЙКИ.</h2><p>Никаких Client ID/Secret и ручного API-конфига.</p></div>
            <div className="settings-grid">
              <div className="settings-card">
                <strong>Playback</strong>
                <p>SoundCloud Widget API внутри отдельного backend service.</p>
              </div>
              <div className="settings-card">
                <strong>Search</strong>
                <p>Изолированный adapter. Он не управляет воспроизведением.</p>
              </div>
              <div className="settings-card">
                <strong>Ads</strong>
                <p>Nightwave их не блокирует и не обходит. Их частоту определяет SoundCloud.</p>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="playerbar">
        <div className="now">
          <img src={state.player.track?.artwork || './memes/squirrel.png'} />
          <div>
            <strong>{state.player.track?.title || 'Nothing playing'}</strong>
            <small>{state.player.track?.artist || 'SoundCloud Widget player'}</small>
          </div>
        </div>

        <div className="transport">
          <button onClick={() => api.playerCommand(state.player.playing ? 'pause' : 'play')}>
            {state.player.loading ? '…' : state.player.playing ? 'Ⅱ' : '▶'}
          </button>
          <div className="timeline">
            <span>{formatTime(state.player.position)}</span>
            <input
              type="range"
              min={0}
              max={Math.max(1, state.player.duration)}
              value={Math.min(state.player.position, Math.max(1, state.player.duration))}
              onChange={(e) => api.playerCommand('seek', Number(e.target.value) * 1000)}
            />
            <span>{formatTime(state.player.duration)}</span>
          </div>
        </div>

        <div className="volume">
          <span>VOL</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={state.player.volume}
            onChange={(e) => api.playerCommand('volume', Number(e.target.value))}
          />
        </div>
      </footer>
    </div>
  )
}
