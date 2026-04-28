# TabScribe

Offline-first meeting transcription in your browser.

Live: <https://tabscribe.sestudio.org/>

TabScribe records a browser tab (or just the system mic), transcribes it
locally using the browser's Web Speech API, and stores everything in IndexedDB
on your machine. No account, no upload, no third-party server unless you opt
in to a cloud transcription provider.

## Features

- Record a screen tab with audio, or audio-only sessions
- Live transcription using the browser's Web Speech API (no network required)
- Optional cloud transcription via AssemblyAI for higher quality and speaker
  diarization (bring your own API key, stored locally)
- Import existing audio or video files for transcription
- Download recordings, or extract audio as WebM or MP3
- Local-only storage in IndexedDB with optional auto-cleanup rules

## Running locally

Requires Node 20+.

```sh
git clone https://github.com/Elandig/tabscribe.git
cd tabscribe
npm install
npm run dev
```

To build a static production bundle: `npm run build` (output in `build/`).

## License

MIT. See [LICENSE](LICENSE).
