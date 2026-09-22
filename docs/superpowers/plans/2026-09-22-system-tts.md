# System Device TTS (Remove Piper) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all Piper local-voice machinery and use only Web Speech with the approved female/male `nameHints` lists.

**Architecture:** Consolidate rate/gender helpers into `web/lib/tts.ts`. `speakEnglish` calls `speakWithWebSpeech` only. Delete Piper engine, assets, download script, npm deps, and Dockerfile `voices` stage. Update VoicePicker copy and tests.

**Tech Stack:** Next.js 15, Vitest, browser `speechSynthesis` API.

## Global Constraints

- Female `nameHints` (exact order): allison, susan, serena, samantha, victoria, ava, tessa, martha, moira, karen, flo, microsoft jenny, microsoft aria, zira, google uk english female, female
- Male `nameHints` (exact order): aaron, alex, daniel, microsoft guy, microsoft david, microsoft mark, fred, tom, nathan, google uk english male, male
- Keep `QUALITY_BOOST` / `ROBOTIC_PENALTY` scoring; keep speak-rate localStorage keys and defaults (`DEFAULT_SPEAK_RATE = 0.7`, min 0.5, max 1, step 0.05)
- No Piper packages, scripts, or `public/piper-voices/` remaining when done

## File Structure

| File | Responsibility |
|------|----------------|
| `web/lib/tts.ts` | Voice presets, pickVoice, speakEnglish (Web Speech only), rate helpers |
| `web/lib/tts.test.ts` | pickVoice tests for new hint order |
| `web/components/VoicePicker.tsx` | UI copy for system TTS |
| `web/next.config.ts` | Drop Piper/onnx transpile & related webpack hacks if unused |
| `web/Dockerfile` | No voices stage |
| `web/package.json` / lockfile | Remove piper/onnx deps and `voices:download` |
| Delete | `piper-engine.ts`, `piper-voices.ts`, `piper-voices.test.ts`, `download-piper-voices.mjs`, `public/piper-voices/**` |

---

### Task 1: Update pickVoice tests for new nameHints

**Files:**
- Modify: `web/lib/tts.test.ts`
- Modify: `web/lib/tts.ts` (voice presets + speakEnglish; rate helpers inlined)

**Interfaces:**
- Produces: `VOICE_PRESETS[0].nameHints` / `[1].nameHints` as listed in Global Constraints; `speakEnglish` never imports Piper

- [ ] **Step 1: Rewrite failing tests for new hint order**

Replace `web/lib/tts.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { pickVoice, VOICE_PRESETS } from "./tts";

function fakeVoice(
  name: string,
  lang: string,
  localService = true,
): SpeechSynthesisVoice {
  return {
    name,
    lang,
    default: false,
    localService,
    voiceURI: name,
  } as SpeechSynthesisVoice;
}

describe("tts voice picking", () => {
  it("prefers earlier female hint (Allison over Susan)", () => {
    const voices = [
      fakeVoice("Susan", "en-US"),
      fakeVoice("Allison", "en-US"),
      fakeVoice("Samantha", "en-US"),
    ];
    const picked = pickVoice(VOICE_PRESETS[0], voices);
    expect(picked?.name).toBe("Allison");
  });

  it("prefers Samantha Enhanced over Samantha Compact", () => {
    const voices = [
      fakeVoice("Samantha Compact", "en-US"),
      fakeVoice("Samantha (Enhanced)", "en-US"),
    ];
    const picked = pickVoice(VOICE_PRESETS[0], voices);
    expect(picked?.name).toBe("Samantha (Enhanced)");
  });

  it("prefers earlier male hint (Aaron over Alex)", () => {
    const voices = [
      fakeVoice("Alex", "en-US"),
      fakeVoice("Aaron", "en-US"),
      fakeVoice("Daniel", "en-GB"),
    ];
    const picked = pickVoice(VOICE_PRESETS[1], voices);
    expect(picked?.name).toBe("Aaron");
  });

  it("prefers Microsoft Guy over Fred for male", () => {
    const voices = [
      fakeVoice("Fred", "en-US"),
      fakeVoice("Microsoft Guy", "en-US"),
    ];
    const picked = pickVoice(VOICE_PRESETS[1], voices);
    expect(picked?.name).toBe("Microsoft Guy");
  });

  it("penalizes Compact voices when a better match exists", () => {
    const voices = [
      fakeVoice("Samantha Compact", "en-US"),
      fakeVoice("Samantha", "en-US"),
    ];
    const picked = pickVoice(VOICE_PRESETS[0], voices);
    expect(picked?.name).toBe("Samantha");
  });
});
```

- [ ] **Step 2: Run tests — expect fail on Allison/Aaron until presets updated**

Run: `cd web && npx vitest run lib/tts.test.ts`
Expected: FAIL (wrong winners from old hints)

- [ ] **Step 3: Rewrite `tts.ts` — Web Speech only + new hints + rate helpers**

Replace `web/lib/tts.ts` so that:

1. No imports from `./piper-voices` or `./piper-engine`
2. Define locally:

```ts
export type VoiceGender = "female" | "male";

export const DEFAULT_SPEAK_RATE = 0.7;
export const SPEAK_RATE_MIN = 0.5;
export const SPEAK_RATE_MAX = 1;
export const SPEAK_RATE_STEP = 0.05;

const RATE_STORAGE_KEY = "wordcatch-speak-rate";

export function clampSpeakRate(rate: number): number { /* same as piper-voices.ts */ }
export function getSavedSpeakRate(): number { /* same */ }
export function saveSpeakRate(rate: number) { /* same */ }
```

3. `VOICE_PRESETS` female/male `nameHints` = Global Constraints lists; labels `女老师` / `男老师`; desc like `系统英语女声，优先柔和音色` / `系统英语男声`
4. Keep existing `scoreVoice`, `pickVoice`, `loadVoices`, `listMatchedVoices`, gender storage
5. `speakEnglish`:

```ts
export async function speakEnglish(
  text: string,
  gender: VoiceGender = getSavedVoiceGender(),
): Promise<string | null> {
  if (typeof window === "undefined") return null;
  return speakWithWebSpeech(text, gender);
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `cd web && npx vitest run lib/tts.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/lib/tts.ts web/lib/tts.test.ts
git commit -m "feat(tts): use system speech with preferred voice lists"
```

---

### Task 2: Update VoicePicker copy

**Files:**
- Modify: `web/components/VoicePicker.tsx`

**Interfaces:**
- Consumes: same exports from `@/lib/tts` (rate helpers now from `tts.ts`)

- [ ] **Step 1: Update loading/help copy**

In `choose()`: change `"正在加载本地人声模型…"` → `"正在试听系统发音…"`.

Section intro: replace Piper sentence with  
`使用本机系统英语发音（女声优先较柔和音色）。`

Footer: replace piper-voices path paragraph with  
`语速保存在本机，学习页发音会跟着这里的设置走。实际音色取决于设备/浏览器已安装的英语语音。`

- [ ] **Step 2: Commit**

```bash
git add web/components/VoicePicker.tsx
git commit -m "chore(ui): VoicePicker copy for system TTS"
```

---

### Task 3: Delete Piper code, assets, deps, Docker stage

**Files:**
- Delete: `web/lib/piper-engine.ts`, `web/lib/piper-voices.ts`, `web/lib/piper-voices.test.ts`, `web/scripts/download-piper-voices.mjs`, `web/public/piper-voices/**`
- Modify: `web/package.json`, `web/package-lock.json`, `web/Dockerfile`, `web/next.config.ts`, `web/.gitignore`, `web/README.md`

- [ ] **Step 1: Delete Piper source/assets/scripts**

```bash
rm -f web/lib/piper-engine.ts web/lib/piper-voices.ts web/lib/piper-voices.test.ts
rm -f web/scripts/download-piper-voices.mjs
rm -rf web/public/piper-voices
```

- [ ] **Step 2: Uninstall deps and drop script**

```bash
cd web && npm uninstall @mintplex-labs/piper-tts-web onnxruntime-web --legacy-peer-deps
```

Remove `"voices:download"` from `package.json` scripts if still present.

- [ ] **Step 3: Simplify Dockerfile**

Remove entire `voices` stage and the line  
`COPY --from=voices /app/public/piper-voices ./public/piper-voices`  
from builder. Keep deps / openssl-base / builder / runner.

- [ ] **Step 4: Simplify `next.config.ts`**

Remove `transpilePackages` for piper/onnx. Remove webpack `onnxruntime-node` alias and client fallbacks/`asyncWebAssembly` that existed only for Piper WASM — keep file exporting a valid `NextConfig` (can be empty object `{}` if nothing else remains). Remove unused turbopack resolveAlias for fs/path if only needed for Piper emscripten.

Target end state if no other needs:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

(If other features still need turbopack aliases, keep only those — grep first.)

- [ ] **Step 5: Clean `.gitignore` and README**

Remove `/public/piper-voices/*.onnx` rules from `web/.gitignore`.  
Update `web/README.md`: drop `voices:download`; say pronunciation uses system TTS.

- [ ] **Step 6: Verify no piper references in web runtime**

```bash
cd web && rg -i 'piper|onnxruntime|piper-voices|voices:download' --glob '!package-lock.json' --glob '!docs/**'
```

Expected: no matches in app source (historical docs outside `web/` OK).

- [ ] **Step 7: Run full unit tests**

```bash
cd web && npm test
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add -A web/
git commit -m "chore: remove Piper TTS assets, deps, and Docker voices stage"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Web Speech only | Task 1 |
| New female/male hints | Task 1 |
| Rate/gender persistence unchanged | Task 1 |
| VoicePicker copy | Task 2 |
| Delete piper files/deps/Docker/next.config/gitignore/README | Task 3 |
| Tests for new lists | Task 1 |
| No cloud TTS / non-goals | N/A (not implemented) |
