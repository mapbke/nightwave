# Nightwave v0.4.3

- Fixed search against newer SoundCloud pages by reading both current DOM and embedded page data.
- Fixed track start: opening a track now waits for the page/player and explicitly starts playback instead of blindly toggling play/pause.
- Extended search wait/retry window for slower SoundCloud loads.
- Kept the fast local monochrome Nightwave UI.
- Note: Google can block authentication inside embedded Electron/Chromium windows. SoundCloud email sign-in remains the reliable in-app login path without official OAuth credentials.
- Portable Windows build: `Nightwave.exe`.
