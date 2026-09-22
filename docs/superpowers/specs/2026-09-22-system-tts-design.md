# System Device TTS (Remove Piper) — Design

**Date:** 2026-09-22  
**Status:** Approved (user: OK / option A)  
**Goal:** Stop bundling Piper ONNX voices; use the device’s Web Speech (`speechSynthesis`) only, with explicit female/male voice preference lists.

## Problem

Local Piper models (`public/piper-voices/`, ~120MB) plus `@mintplex-labs/piper-tts-web` / `onnxruntime-web` inflate Docker builds and image size. Playback already falls back to system TTS; making that the only path simplifies the app and speeds deploy.

## Decision

**Approach 1 (chosen):** Keep the existing `pickVoice` scoring in `web/lib/tts.ts`, replace `nameHints` with the approved preference lists, and make `speakEnglish` call Web Speech only. Fully delete Piper assets, engine, download script, npm packages, and Dockerfile `voices` stage.

Rejected:

- Strict first-match without quality/robotic scoring (may pick Compact/Eloquence variants).
- Cloud TTS APIs (out of scope: cost, network, privacy).

## Behavior

- **Engine:** `window.speechSynthesis` + `SpeechSynthesisUtterance` only.
- **Gender:** still `female` | `male`, persisted as `wordcatch-voice-gender`.
- **Rate:** still kid-friendly default `0.7`, range `0.5–1.0`, persisted as `wordcatch-speak-rate` (constants move from `piper-voices.ts` into `tts.ts`).
- **Voice selection:** case-insensitive substring match on `nameHints` order (higher list position → higher score). Retain existing `QUALITY_BOOST` / `ROBOTIC_PENALTY` and English-lang filtering.
- **UI (`VoicePicker`):** copy refers to system/device voices; no Piper model loading messages or `public/piper-voices/` paths.
- **Unavailable speech API:** return `null` / graceful failure (same as today’s Web Speech path).

### Preferred voice name fragments

Female (priority order):

`allison`, `susan`, `serena`, `samantha`, `victoria`, `ava`, `tessa`, `martha`, `moira`, `karen`, `flo`, `microsoft jenny`, `microsoft aria`, `zira`, `google uk english female`, `female`

Male (priority order):

`aaron`, `alex`, `daniel`, `microsoft guy`, `microsoft david`, `microsoft mark`, `fred`, `tom`, `nathan`, `google uk english male`, `male`

Preset labels/descriptions become generic teacher labels (e.g. 女老师 / 男老师) describing system English voices, not Piper model names.

## Removals

| Item | Action |
|------|--------|
| `web/public/piper-voices/` | Delete directory (onnx + json + any keep files) |
| `web/lib/piper-engine.ts` | Delete |
| `web/lib/piper-voices.ts` | Delete; move rate helpers + `VoiceGender` into `tts.ts` |
| `web/lib/piper-voices.test.ts` | Delete |
| `web/scripts/download-piper-voices.mjs` | Delete |
| `package.json` `voices:download` | Remove |
| deps `@mintplex-labs/piper-tts-web`, `onnxruntime-web` | Uninstall; refresh lockfile |
| `web/Dockerfile` `voices` stage + `COPY --from=voices` | Remove |
| `web/next.config.ts` Piper/onnx transpile & webpack aliases added solely for Piper | Simplify to app needs without those packages |
| `web/.gitignore` piper-voices onnx rules | Remove |
| `web/README.md` Piper / voices:download | Update to system TTS |

Historical docs under `docs/superpowers/plans/2026-09-16-piper-local-voices.md` may remain as archive; no need to rewrite past plans.

## Tests

Update `web/lib/tts.test.ts`:

- Prefer earlier female hints (e.g. Allison over Susan when both present).
- Prefer earlier male hints (e.g. Aaron over Alex).
- Keep Compact penalty behavior when a non-Compact hint match exists.
- Adjust or drop cases that assumed old hint order (Samantha / Google US English / Daniel Premium) if they conflict with the new lists; replace with cases aligned to the lists above.

## Non-goals

- Guaranteeing identical voice timbre across OS/browsers.
- Replacing TTS with recorded audio or a server-side synthesizer.
- Changing when/where `speakEnglish` is called in learning flows.

## Success criteria

1. No Piper packages, scripts, or voice assets remain in `web/`.
2. Docker build has no voices download/copy stage.
3. Choosing 女声/男声 still previews English via system TTS and shows the matched voice name when available.
4. Unit tests for `pickVoice` pass with the new preference lists.
