import { spawn } from "node:child_process";
import { unlink } from "node:fs/promises";
import { createRequire } from "node:module";

// ffmpeg-static is CommonJS but types itself as an ES default export, which NodeNext resolves to
// the module object: require() gets the actual path.
const ffmpegPath = createRequire(import.meta.url)("ffmpeg-static") as string | null;

const TIMEOUT_MS = 60 * 1000;
const STDERR_KEPT_LINES = 8;

export interface TrimOptions {
  inputPath: string;
  outputPath: string;
  /** Seconds from the start of the input. */
  start: number;
  /** Seconds from the start of the input, exclusive. Past the end of the input just stops there. */
  end: number;
}

/** A failure caused by the requested range rather than by the server. */
export class TrimRangeError extends Error {}

/**
 * Re-encodes [start, end) of the input to MP3. Re-encoding (rather than -c copy) makes the cut
 * sample-accurate whatever the source container, and gives an output every browser can decode.
 */
export async function trimToMp3(options: TrimOptions): Promise<void> {
  if (!ffmpegPath) {
    throw new Error("ffmpeg is not available for this platform.");
  }

  const args = [
    "-hide_banner",
    "-nostdin",
    "-v",
    "warning",
    // Input seeking: fast, and accurate since the audio is decoded anyway.
    "-ss",
    options.start.toFixed(3),
    "-t",
    (options.end - options.start).toFixed(3),
    "-i",
    options.inputPath,
    "-map",
    "0:a:0",
    "-c:a",
    "libmp3lame",
    "-q:a",
    "2",
    "-f",
    "mp3",
    "-y",
    options.outputPath,
  ];

  const child = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
  const stderrLines: string[] = [];
  child.stderr!.setEncoding("utf8");
  child.stderr!.on("data", (chunk: string) => {
    stderrLines.push(...chunk.split("\n").filter(Boolean));
    stderrLines.splice(0, Math.max(0, stderrLines.length - STDERR_KEPT_LINES));
  });

  let timedOut = false;
  const timeoutTimer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGKILL");
  }, TIMEOUT_MS);

  let exitCode: number | null;
  try {
    exitCode = await new Promise<number | null>((resolve, reject) => {
      child.once("error", reject);
      child.once("close", resolve);
    });
  } catch (error) {
    await unlink(options.outputPath).catch(() => {});
    throw error;
  } finally {
    clearTimeout(timeoutTimer);
  }

  const stderr = stderrLines.join("\n");
  const failure = timedOut
    ? new Error("Trimming took too long.")
    : exitCode !== 0
      ? new Error(stderrLines.at(-1) ?? "Trimming failed.")
      : // ffmpeg exits 0 when seeking past the end: it just writes nothing.
        /Output file is empty/i.test(stderr)
        ? new TrimRangeError("Start is past the end of the file.")
        : undefined;

  if (failure) {
    await unlink(options.outputPath).catch(() => {});
    throw failure;
  }
}
