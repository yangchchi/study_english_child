"use client";

import {
  VoiceGender,
  getPiperVoiceId,
  getSavedSpeakRate,
  localPiperAssetUrls,
  piperOpfsBasenames,
  PIPER_VOICES,
} from "./piper-voices";

let currentAudio: HTMLAudioElement | null = null;
const seeded = new Set<string>();
let lastVoiceId: string | null = null;

async function writeOpfs(basename: string, blob: Blob) {
  const root = await navigator.storage.getDirectory();
  const dir = await root.getDirectoryHandle("piper", { create: true });
  const file = await dir.getFileHandle(basename, { create: true });
  const writable = await file.createWritable();
  await writable.write(blob);
  await writable.close();
}

/**
 * Prefer project-local ONNX under /piper-voices/, seed into OPFS so
 * @mintplex-labs/piper-tts-web can read them via HF URL basenames.
 * Falls back to Hugging Face download into OPFS if local files are missing.
 */
export async function ensurePiperVoiceReady(
  gender: VoiceGender,
): Promise<"local" | "cdn"> {
  const voiceId = getPiperVoiceId(gender);
  if (seeded.has(voiceId)) return "local";

  const { stored, download } = await import("@mintplex-labs/piper-tts-web");
  const already = await stored();
  if (already.includes(voiceId)) {
    seeded.add(voiceId);
    return "local";
  }

  const urls = localPiperAssetUrls(gender);
  const names = piperOpfsBasenames(gender);
  const [onnxRes, jsonRes] = await Promise.all([
    fetch(urls.onnx),
    fetch(urls.json),
  ]);

  if (onnxRes.ok && jsonRes.ok) {
    await writeOpfs(names.onnx, await onnxRes.blob());
    await writeOpfs(names.json, await jsonRes.blob());
    seeded.add(voiceId);
    return "local";
  }

  await download(voiceId);
  seeded.add(voiceId);
  return "cdn";
}

function stopCurrentAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
}

export async function speakWithPiper(
  text: string,
  gender: VoiceGender,
): Promise<string> {
  const voiceId = getPiperVoiceId(gender);
  await ensurePiperVoiceReady(gender);

  const { TtsSession } = await import("@mintplex-labs/piper-tts-web");

  // Library keeps a singleton session; reset when switching teachers.
  if (lastVoiceId && lastVoiceId !== voiceId) {
    TtsSession._instance = null;
  }
  lastVoiceId = voiceId;

  const session = await TtsSession.create({ voiceId });
  const blob = await session.predict(text.trim());

  stopCurrentAudio();
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.playbackRate = getSavedSpeakRate();
  audio.preservesPitch = true;
  currentAudio = audio;
  audio.onended = () => {
    URL.revokeObjectURL(url);
    if (currentAudio === audio) currentAudio = null;
  };
  await audio.play();

  return PIPER_VOICES[gender].label;
}
