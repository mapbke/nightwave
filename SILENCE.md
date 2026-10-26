# silence.

An offline, private desktop journal for Windows. Minimal, monochrome, and distraction-free.

This is an experimental redesign of Nightwave on the `silence-preview` branch. **The original Nightwave remains unchanged on `main`.**

## Features

- Local notes: create, edit, delete
- Search-free, chronological archive
- Manual save with Ctrl+S and unsaved-change warning on switching
- JSON export for backups
- No cloud account or network access required

## Start

```bash
npm install
npm run dev
```

## Build portable Windows EXE

```bash
npm run build:win
```

Find `release/silence.exe`. GitHub Actions also builds an artifact on branch pushes.

**Note:** This is a preview, not a tested release. Notes are stored locally in Electron's userData directory. Keep JSON backups of important notes.
