# Piper Local Voices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace robotic browser TTS with two bundled Piper neural voices (female + male) loaded from the project.

**Architecture:** Client-side `@mintplex-labs/piper-tts-web` + `onnxruntime-web`. Voice ONNX files live under `public/piper-voices/`. On first speak we seed OPFS from those local files (library caches by basename), then synthesize WAV and play. If Piper fails, fall back to Web Speech.

**Tech Stack:** Next.js 15, `@mintplex-labs/piper-tts-web`, `onnxruntime-web`, Piper ONNX voices from Hugging Face.

**Spec:** Chat-approved design (B): female `en_US-hfc_female-medium`, male `en_US-ryan-medium`.

## Global Constraints

- Only two teacher voices for now
- Keep existing VoicePicker female/male UX
- Large `.onnx` files gitignored; download via script / Docker build
- Prefer local public assets over Hugging Face at runtime

---

### Task 1: Download script + package wiring

**Files:**
- Create: `web/scripts/download-piper-voices.mjs`
- Modify: `web/package.json`, `web/.gitignore`, `web/Dockerfile`
- Create: `web/public/piper-voices/.gitkeep`

- [ ] Add script downloading both voices (+ `.onnx.json`) into `public/piper-voices/`
- [ ] `npm run voices:download`
- [ ] Ignore `*.onnx` under `public/piper-voices/`
- [ ] Install `onnxruntime-web`; keep `@mintplex-labs/piper-tts-web`
- [ ] Dockerfile builder runs `npm run voices:download` before build

### Task 2: Piper voice config + OPFS seed (TDD)

**Files:**
- Create: `web/lib/piper-voices.ts`
- Create: `web/lib/piper-voices.test.ts`
- Modify: `web/lib/tts.ts`, `web/lib/tts.test.ts`

- [ ] RED: tests for gender → voiceId mapping and local asset paths
- [ ] GREEN: implement mapping + `seedPiperVoiceFromPublic`
- [ ] `speakEnglish` prefers Piper; falls back to Web Speech on failure
- [ ] Update VoicePicker copy to Piper teachers

### Task 3: Verify

- [ ] Run unit tests
- [ ] Download voices locally
- [ ] Smoke: app still builds (`next build` or typecheck)
