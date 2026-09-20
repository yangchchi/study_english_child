#!/usr/bin/env node
/**
 * Install Prisma runtime libs without apt-get update.
 * Fetches Debian Packages.gz + .debs from the fastest mirror, then dpkg -i.
 */
import { spawnSync } from "node:child_process";
import { gunzipSync } from "node:zlib";
import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const MIRRORS = [
  "https://mirrors.aliyun.com/debian",
  "https://mirrors.tuna.tsinghua.edu.cn/debian",
  "https://deb.debian.org/debian",
];
const DIST = "bookworm";
const PACKAGES = ["libssl3", "openssl", "ca-certificates"];
const FETCH_MS = 45_000;

const arch = process.arch === "arm64" ? "arm64" : "amd64";

function isInstalled(name) {
  const r = spawnSync(
    "dpkg-query",
    ["-W", "-f=${Status}", name],
    { encoding: "utf8" },
  );
  return r.status === 0 && String(r.stdout).includes("install ok installed");
}

function parsePackages(text) {
  const entries = new Map();
  for (const block of text.split("\n\n")) {
    const name = block.match(/^Package:\s*(.+)$/m)?.[1]?.trim();
    const filename = block.match(/^Filename:\s*(.+)$/m)?.[1]?.trim();
    const depends = block.match(/^Depends:\s*(.+)$/m)?.[1]?.trim() ?? "";
    if (name && filename && !entries.has(name)) {
      entries.set(name, { filename, depends });
    }
  }
  return entries;
}

function depNames(dependsField) {
  return dependsField
    .split(",")
    .map((p) => p.trim().split("|")[0].trim().split(/\s+/)[0])
    .filter(Boolean);
}

function resolveNeeded(index, roots) {
  const needed = [];
  const seen = new Set();
  const queue = [...roots];
  while (queue.length) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    seen.add(name);
    if (isInstalled(name)) continue;
    const entry = index.get(name);
    if (!entry) continue;
    needed.push(name);
    for (const dep of depNames(entry.depends)) {
      if (!seen.has(dep)) queue.push(dep);
    }
  }
  return needed;
}

async function fetchPackagesIndex(mirror, signal) {
  const url = `${mirror}/dists/${DIST}/main/binary-${arch}/Packages.gz`;
  console.log(`↓ try ${url}`);
  const res = await fetch(url, { redirect: "follow", signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const compressed = Buffer.from(await res.arrayBuffer());
  return {
    mirror,
    index: parsePackages(gunzipSync(compressed).toString("utf8")),
  };
}

async function pickMirrorIndex() {
  const controllers = MIRRORS.map(() => new AbortController());
  const timer = setTimeout(() => {
    for (const c of controllers) c.abort();
  }, FETCH_MS);

  try {
    return await Promise.any(
      MIRRORS.map((mirror, i) =>
        fetchPackagesIndex(mirror, controllers[i].signal).then((result) => {
          // Cancel the other mirrors so Node can exit cleanly.
          controllers.forEach((c, j) => {
            if (j !== i) c.abort();
          });
          return result;
        }),
      ),
    );
  } finally {
    clearTimeout(timer);
  }
}

async function downloadDeb(mirror, filename, destDir) {
  const url = `${mirror}/${filename}`;
  const dest = join(destDir, filename.split("/").pop());
  console.log(`↓ ${url}`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  } finally {
    clearTimeout(timer);
  }
  return dest;
}

function dpkgInstall(debPaths) {
  const result = spawnSync("dpkg", ["-i", ...debPaths], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    const retry = spawnSync(
      "dpkg",
      ["-i", "--force-depends", ...debPaths],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    if (retry.status !== 0) {
      throw new Error(retry.stderr || result.stderr || "dpkg failed");
    }
  }
}

console.log(`arch=${arch}`);
const { mirror, index } = await pickMirrorIndex();
console.log(`using mirror: ${mirror}`);

const needed = resolveNeeded(index, PACKAGES);
if (needed.length === 0) {
  console.log("runtime libs already present");
  process.exit(0);
}
console.log("install:", needed.join(", "));

const dir = await mkdtemp(join(tmpdir(), "runtime-debs-"));
try {
  const paths = [];
  for (const name of needed) {
    const entry = index.get(name);
    if (!entry) throw new Error(`package not found: ${name}`);
    paths.push(await downloadDeb(mirror, entry.filename, dir));
  }
  dpkgInstall(paths);
  const ca = spawnSync("update-ca-certificates", [], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (ca.status !== 0) {
    console.warn("update-ca-certificates:", ca.stderr || ca.stdout);
  }
  console.log("runtime libs ready");
} finally {
  await rm(dir, { recursive: true, force: true });
}
