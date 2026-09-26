import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, unlink } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { config } from "../config.js";

export const MAX_DURATION_S = 15 * 60;
const MAX_FILESIZE = "50M";
const TIMEOUT_MS = 3 * 60 * 1000;
/** yt-dlp emits a progress line every ~100ms with --newline; don't forward every one of them. */
const PROGRESS_MIN_INTERVAL_MS = 500;
const KILL_GRACE_MS = 5_000;
const STDERR_KEPT_LINES = 8;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

/**
 * Returns the normalized URL, or undefined if it isn't a YouTube one. Rejecting anything else also
 * guarantees the value can never look like a yt-dlp option.
 */
export function parseYoutubeUrl(input: string): string | undefined {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return undefined;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
  if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return undefined;

  return url.toString();
}

/** The stored `filename` is displayed in the UI, so it carries the video title, not the uuid. */
export function sanitizeTitle(title: string): string {
  const cleaned = title
    .replace(/[/\\\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 180) || "YouTube";
}

// One download at a time: yt-dlp saturates a small VPS on its own.
let downloadInProgress = false;

export function tryAcquireDownloadSlot(): boolean {
  if (downloadInProgress) return false;
  downloadInProgress = true;
  return true;
}

export function releaseDownloadSlot(): void {
  downloadInProgress = false;
}

export interface DownloadProgress {
  percent: number;
  speed: string;
  eta: string;
}

export interface DownloadOptions {
  url: string;
  /** Row id, also the basename of the downloaded file. */
  id: string;
  signal?: AbortSignal;
  onInfo?: (info: { title: string; duration: number }) => void;
  onProgress?: (progress: DownloadProgress) => void;
}

export interface DownloadResult {
  title: string;
  filename: string;
}

/** Deletes the final file and every leftover yt-dlp may have written (.part, .ytdl, fragments). */
async function removeLeftovers(id: string): Promise<void> {
  const entries = await readdir(config.uploadsDir).catch(() => [] as string[]);
  await Promise.all(
    entries
      .filter((entry) => entry.startsWith(`${id}.`))
      .map((entry) => unlink(join(config.uploadsDir, entry)).catch(() => undefined)),
  );
}

function describeFailure(stderr: string[]): string {
  const joined = stderr.join("\n");

  if (joined.includes("does not pass filter")) {
    return `Video too long (maximum ${MAX_DURATION_S / 60} minutes).`;
  }
  if (/max-filesize|larger than/i.test(joined)) {
    return "Audio file too large.";
  }

  const reported = [...stderr].reverse().find((line) => line.startsWith("ERROR:"));
  return reported ? reported.replace(/^ERROR:\s*/, "") : "Download failed.";
}

export async function downloadAudio(options: DownloadOptions): Promise<DownloadResult> {
  const args = [
    "--no-playlist",
    "--no-cache-dir",
    "--newline",
    // --print implies --quiet, which silences --progress-template: --progress brings it back.
    "--progress",
    "--progress-template",
    "download:PROGRESS %(progress._percent_str)s %(progress._speed_str)s %(progress._eta_str)s",
    "--print",
    "pre_process:INFO %(duration)s %(title)s",
    "--print",
    "after_move:FILE %(filepath)s",
    "--match-filter",
    `duration < ${MAX_DURATION_S}`,
    "--max-filesize",
    MAX_FILESIZE,
    // Audio-only when possible, no re-encoding: playFile() transcodes through ffmpeg anyway.
    "-f",
    "ba[ext=m4a]/ba/ba*/best",
    "-o",
    join(config.uploadsDir, `${options.id}.%(ext)s`),
    "--",
    options.url,
  ];

  // detached: the standalone build is a PyInstaller bundle whose bootloader spawns a child process,
  // so signals have to reach the whole group or an orphan keeps writing into the uploads directory.
  const child = spawn(config.ytdlpPath, args, { detached: true, stdio: ["ignore", "pipe", "pipe"] });

  let title = "";
  let filePath: string | undefined;
  let lastPercent = -1;
  let lastProgressAt = 0;
  const stderrLines: string[] = [];

  let aborted = false;
  let timedOut = false;
  let killTimer: ReturnType<typeof setTimeout> | null = null;

  function terminate() {
    if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) return;
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      return; // already gone
    }
    killTimer = setTimeout(() => {
      try {
        process.kill(-child.pid!, "SIGKILL");
      } catch {
        // already gone
      }
    }, KILL_GRACE_MS);
  }

  const onAbort = () => {
    aborted = true;
    terminate();
  };
  options.signal?.addEventListener("abort", onAbort, { once: true });

  const timeoutTimer = setTimeout(() => {
    timedOut = true;
    terminate();
  }, TIMEOUT_MS);

  const exited = new Promise<void>((resolveExit, rejectExit) => {
    // spawn failures (a missing binary) surface here, asynchronously.
    child.once("error", rejectExit);
    child.once("close", () => resolveExit());
  });

  const readStdout = (async () => {
    for await (const line of createInterface({ input: child.stdout! })) {
      if (line.startsWith("PROGRESS ")) {
        const [percentRaw, speed, eta] = line.slice("PROGRESS ".length).trim().split(/\s+/);
        const percent = Number.parseFloat(percentRaw);
        if (!Number.isFinite(percent)) continue;

        const now = Date.now();
        if (Math.floor(percent) === lastPercent && now - lastProgressAt < PROGRESS_MIN_INTERVAL_MS) continue;
        lastPercent = Math.floor(percent);
        lastProgressAt = now;

        options.onProgress?.({ percent, speed: speed ?? "", eta: eta ?? "" });
      } else if (line.startsWith("INFO ")) {
        const rest = line.slice("INFO ".length);
        const separator = rest.indexOf(" ");
        const rawDuration = Number.parseFloat(separator === -1 ? rest : rest.slice(0, separator));
        title = separator === -1 ? "" : rest.slice(separator + 1).trim();
        options.onInfo?.({ title, duration: Number.isFinite(rawDuration) ? rawDuration : 0 });
      } else if (line.startsWith("FILE ")) {
        filePath = line.slice("FILE ".length).trim();
      }
      // Every other line is yt-dlp chatter ("[youtube] Extracting…"), ignored on purpose.
    }
  })();

  const readStderr = (async () => {
    for await (const line of createInterface({ input: child.stderr! })) {
      stderrLines.push(line);
      if (stderrLines.length > STDERR_KEPT_LINES) stderrLines.shift();
    }
  })();

  try {
    await Promise.all([exited, readStdout, readStderr]);
  } catch (error) {
    await removeLeftovers(options.id);
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`yt-dlp not found (${config.ytdlpPath}). Install it or set YTDLP_PATH.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutTimer);
    if (killTimer) clearTimeout(killTimer);
    options.signal?.removeEventListener("abort", onAbort);
  }

  if (aborted || timedOut) {
    await removeLeftovers(options.id);
    throw new Error(aborted ? "Download cancelled." : "Download took too long.");
  }

  // The exit code is not a reliable verdict: --max-filesize and --match-filter both stop the
  // download without failing. Having the final path, and the file behind it, is.
  if (!filePath || !existsSync(filePath)) {
    await removeLeftovers(options.id);
    throw new Error(describeFailure(stderrLines));
  }

  const resolved = resolve(filePath);
  if (dirname(resolved) !== resolve(config.uploadsDir) || !basename(resolved).startsWith(`${options.id}.`)) {
    await removeLeftovers(options.id);
    throw new Error("Download produced an unexpected file.");
  }

  return { title, filename: `${sanitizeTitle(title)}${extname(resolved)}` };
}
