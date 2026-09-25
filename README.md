# Nightwave

Unofficial monochrome SoundCloud desktop client.

## v0.5 architecture

Nightwave v0.5 is a clean-stack refactor:

- **Frontend:** React + TypeScript + Vite
- **Desktop/backend:** Electron main process written in TypeScript
- **Build tooling:** electron-vite + electron-builder
- **State:** Zustand
- **Persistence:** local JSON store in Electron userData
- **Playback:** official SoundCloud Widget, isolated from search
- **Search:** separate SoundCloud web adapter

The old build coupled search, playback and SoundCloud DOM controls together. A markup change could break everything at once. v0.5 separates those concerns.

Playback no longer retries DOM Play clicks. Loading a track mounts one official SoundCloud Widget instance and starts it once when the widget reports READY.

Nightwave does **not** block or bypass SoundCloud advertising. Ad delivery is controlled by SoundCloud.

## Branch

Development lives in:

`refactor/v0.5-react`

## Run

```bat
run-dev.bat
```

or:

```powershell
npm install
npm run dev
```

## Build one portable EXE

```bat
build-windows.bat
```

Result:

```text
release\Nightwave-v0.5.exe
```

## Login

Public search/playback does not require Nightwave API credentials.

SoundCloud email login can be opened from the app. Google can reject authentication inside embedded Electron/Chromium windows; Nightwave does not fake or bypass that restriction.

## Status

v0.5 is intentionally on a separate branch until playback/search are tested on Windows. The current `main` release remains untouched.
