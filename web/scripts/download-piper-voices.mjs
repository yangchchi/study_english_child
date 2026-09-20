#!/usr/bin/env node
/**
 * Download Piper ONNX voices into public/piper-voices/
 * Sources: Hugging Face rhasspy/piper-voices (MIT)
 * Tries several mirrors (helpful when huggingface.co is slow).
 * Uses Node fetch so Docker builds do not need curl/apt.
 */
import { mkdir, access, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MIRRORS = [
  "https://hf-mirror.com/rhasspy/piper-voices/resolve/v1.0.0",
  "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0",
  "https://hf-mirror.com/diffusionstudio/piper-voices/resolve/main",
  "https://huggingface.co/diffusionstudio/piper-voices/resolve/main",
];

const VOICES = [
  {
    id: "en_US-hfc_female-medium",
    path: "en/en_US/hfc_female/medium/en_US-hfc_female-medium",
  },
  {
    id: "en_US-ryan-medium",
    path: "en/en_US/ryan/medium/en_US-ryan-medium",
  },
];

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "piper-voices");

async function exists(file) {
  try {
    await access(file);
    const s = await stat(file);
    return s.size > 1000;
  } catch {
    return false;
  }
}

async function fetchDownload(url, dest) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(dest, buf);
  } finally {
    clearTimeout(timer);
  }
}

async function downloadWithMirrors(relPath, dest) {
  if (await exists(dest)) {
    console.log(`skip (exists) ${dest}`);
    return;
  }
  let lastErr;
  for (const base of MIRRORS) {
    const url = `${base}/${relPath}`;
    try {
      console.log(`↓ ${url}`);
      await fetchDownload(url, dest);
      if (!(await exists(dest))) throw new Error("file too small / missing");
      console.log(`✓ ${dest}`);
      return;
    } catch (err) {
      lastErr = err;
      console.warn(`  failed: ${err.message}`);
    }
  }
  throw lastErr ?? new Error(`Could not download ${relPath}`);
}

await mkdir(outDir, { recursive: true });

for (const v of VOICES) {
  await downloadWithMirrors(`${v.path}.onnx`, join(outDir, `${v.id}.onnx`));
  await downloadWithMirrors(
    `${v.path}.onnx.json`,
    join(outDir, `${v.id}.onnx.json`),
  );
}

console.log("Piper voices ready in public/piper-voices/");
