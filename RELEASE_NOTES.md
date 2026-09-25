# Nightwave v0.4.2

- Fixed SoundCloud social-login popup handling. SoundCloud opens OAuth providers with `window.open('about:blank', ...)`; Nightwave now allows that bootstrap window and then restricts navigation to SoundCloud, Google, Apple and Facebook domains.
- Authentication windows share the persistent Nightwave SoundCloud session.
- Fast local monochrome UI remains independent of SoundCloud loading speed.
- Portable Windows build: `Nightwave.exe`.
