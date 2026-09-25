# Nightwave

Monochrome desktop client shell for SoundCloud built with Electron. Nightwave keeps its own local UI while SoundCloud runs in a persistent background session.

## v0.4.3

- Fast local UI: the app opens without waiting for SoundCloud.
- Improved SoundCloud search and playback against the current web UI.
- Persistent SoundCloud session.
- Search, queue, history, favorites and 10-band EQ.
- Media keys and global hotkeys.
- OBS overlay and Discord Rich Presence support.
- Portable Windows build (`Nightwave.exe`).

## Run

```bat
run-dev.bat
```

## Build one portable EXE

```bat
build-windows.bat
```

The result is written to:

```text
release\Nightwave.exe
```

## Sign-in note

Google may reject sign-in inside embedded Electron/Chromium windows. Use SoundCloud email sign-in in Nightwave, or sign in with Google in a normal browser and use a future official OAuth build when API credentials are available.

##

Nightwave uses the normal SoundCloud web sign-in flow and a persistent Electron session. No SoundCloud API Client ID or Client Secret is required.

This project is unofficial and is not affiliated with SoundCloud.
