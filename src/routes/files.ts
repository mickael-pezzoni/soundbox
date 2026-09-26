import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream, mkdirSync } from "node:fs";
import { rename, rm, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { streamSSE } from "hono/streaming";
import { getCurrentUser } from "../auth/session.js";
import { client } from "../bot.js";
import { config } from "../config.js";
import { db } from "../db.js";
import {
  downloadAudio,
  parseYoutubeUrl,
  releaseDownloadSlot,
  tryAcquireDownloadSlot,
} from "../media/youtube.js";
import { TrimRangeError, trimToMp3 } from "../media/trim.js";
import { findUserVoiceChannel } from "../voice/channels.js";
import { getActiveChannelId, playFile, stopPlayback } from "../voice/player.js";

mkdirSync(config.uploadsDir, { recursive: true });

interface FileRow {
  id: string;
  display_name: string;
  filename: string;
  created_at: string;
}

export interface FileRecord {
  id: string;
  displayName: string;
  filename: string;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function listFiles(
  page: number,
  limit: number,
  query = "",
): { files: FileRecord[]; pagination: Pagination } {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const offset = (safePage - 1) * safeLimit;

  const search = query.trim();
  const where = search ? "WHERE display_name LIKE ? ESCAPE '\\'" : "";
  const params = search ? [`%${search.replace(/[\\%_]/g, "\\$&")}%`] : [];

  const { count: total } = db
    .prepare(`SELECT COUNT(*) AS count FROM files ${where}`)
    .get(...params) as { count: number };

  const rows = db
    .prepare(
      `SELECT id, display_name, filename, created_at FROM files ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, safeLimit, offset) as unknown as FileRow[];

  return {
    files: rows.map((row) => ({
      id: row.id,
      displayName: row.display_name,
      filename: row.filename,
      createdAt: row.created_at,
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
}

export function filePathFor(id: string, filename: string): string {
  return join(config.uploadsDir, `${id}${extname(filename)}`);
}

export function getFileById(id: string): FileRecord | undefined {
  const row = db
    .prepare("SELECT id, display_name, filename, created_at FROM files WHERE id = ?")
    .get(id) as FileRow | undefined;

  if (!row) return undefined;

  return {
    id: row.id,
    displayName: row.display_name,
    filename: row.filename,
    createdAt: row.created_at,
  };
}

export function searchFiles(query: string, limit = 25): FileRecord[] {
  const rows = db
    .prepare(
      "SELECT id, display_name, filename, created_at FROM files WHERE display_name LIKE ? ORDER BY display_name LIMIT ?",
    )
    .all(`%${query}%`, limit) as unknown as FileRow[];

  return rows.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    filename: row.filename,
    createdAt: row.created_at,
  }));
}

/** Validates a cut requested in seconds; throws a 400 describing what is wrong. */
function parseTrimRange(start: unknown, end: unknown): { start: number; end: number } {
  if (typeof start !== "number" || typeof end !== "number" || !Number.isFinite(start) || !Number.isFinite(end)) {
    throw new HTTPException(400, { message: "start et end sont requis (en secondes)" });
  }
  if (start < 0 || end <= start) {
    throw new HTTPException(400, { message: "Il faut 0 ≤ start < end" });
  }
  return { start, end };
}

async function trimOrThrow(inputPath: string, outputPath: string, range: { start: number; end: number }) {
  try {
    await trimToMp3({ inputPath, outputPath, ...range });
  } catch (error) {
    throw new HTTPException(error instanceof TrimRangeError ? 400 : 500, {
      message: error instanceof Error ? error.message : "Le découpage a échoué",
    });
  }
}

export const filesRoute = new Hono();

filesRoute.post("/", async (c) => {
  const contentType = c.req.header("content-type") ?? "";
  if (!contentType.startsWith("audio/")) {
    throw new HTTPException(415, {
      message: "Only audio files are accepted",
    });
  }

  const rawFilename = c.req.header("x-filename");
  if (!rawFilename) {
    throw new HTTPException(400, {
      message: "X-Filename header is required (original file name)",
    });
  }

  if (!c.req.raw.body) {
    throw new HTTPException(400, { message: "Request body is missing" });
  }

  const decodeHeader = (value: string) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  const trimStart = c.req.header("x-trim-start");
  const trimEnd = c.req.header("x-trim-end");
  if ((trimStart === undefined) !== (trimEnd === undefined)) {
    throw new HTTPException(400, { message: "X-Trim-Start et X-Trim-End vont ensemble" });
  }
  // Number("") is 0: a blank header has to fail validation rather than mean "from the start".
  const toSeconds = (value: string) => (value.trim() ? Number(value) : Number.NaN);
  const trim = trimStart !== undefined ? parseTrimRange(toSeconds(trimStart), toSeconds(trimEnd!)) : undefined;

  const originalFilename = decodeHeader(rawFilename);
  const rawDisplayName = c.req.header("x-display-name");
  const displayName = rawDisplayName ? decodeHeader(rawDisplayName) : originalFilename;
  const id = randomUUID();
  // A trimmed upload is kept as the MP3 cut only: the full original is a temporary input.
  const filename = trim ? `${basename(originalFilename, extname(originalFilename))}.mp3` : originalFilename;
  const destination = filePathFor(id, filename);
  const received = trim ? join(config.uploadsDir, `${id}.upload${extname(originalFilename)}`) : destination;

  let stored = false;
  try {
    await pipeline(
      Readable.fromWeb(c.req.raw.body as import("node:stream/web").ReadableStream<Uint8Array>),
      createWriteStream(received),
    );
    if (trim) await trimOrThrow(received, destination, trim);
    stored = true;
  } finally {
    if (trim || !stored) await rm(received, { force: true });
  }

  db.prepare(
    "INSERT INTO files (id, display_name, filename) VALUES (?, ?, ?)",
  ).run(id, displayName, filename);

  return c.json({ id, displayName, filename }, 201);
});

filesRoute.post("/youtube", async (c) => {
  const body = await c.req.json().catch(() => null);
  const url = parseYoutubeUrl(typeof body?.url === "string" ? body.url : "");

  // Anything that still needs a status code has to be settled before the stream starts: once the
  // first byte is out, the headers are gone and an HTTPException can no longer be turned into a 4xx.
  if (!url) {
    throw new HTTPException(400, { message: "Colle un lien YouTube valide" });
  }
  if (!tryAcquireDownloadSlot()) {
    throw new HTTPException(409, { message: "Un téléchargement est déjà en cours, réessaie dans un instant" });
  }

  c.header("X-Accel-Buffering", "no"); // nginx buffers proxied responses even when they are chunked

  const id = randomUUID();
  const controller = new AbortController();

  return streamSSE(c, async (stream) => {
    stream.onAbort(() => controller.abort());

    try {
      const { title, filename } = await downloadAudio({
        url,
        id,
        signal: controller.signal,
        onInfo: (info) => {
          void stream.writeSSE({ data: JSON.stringify({ phase: "info", ...info }) });
        },
        onProgress: (progress) => {
          void stream.writeSSE({ data: JSON.stringify({ phase: "progress", ...progress }) });
        },
      });

      const displayName = (title.trim() || filename).slice(0, 200);
      db.prepare("INSERT INTO files (id, display_name, filename) VALUES (?, ?, ?)").run(id, displayName, filename);

      await stream.writeSSE({ data: JSON.stringify({ phase: "done", id, displayName }) });
    } catch (error) {
      // A callback that throws is only console.error'd by Hono, which then closes the stream
      // cleanly — the client would read that as a success. The failure has to be sent explicitly.
      await stream.writeSSE({
        data: JSON.stringify({
          phase: "error",
          message: error instanceof Error ? error.message : "Le téléchargement a échoué",
        }),
      });
    } finally {
      releaseDownloadSlot();
    }
  });
});

filesRoute.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";

  if (!displayName) {
    throw new HTTPException(400, { message: "displayName is required" });
  }

  const result = db
    .prepare("UPDATE files SET display_name = ? WHERE id = ?")
    .run(displayName, id);

  if (result.changes === 0) {
    throw new HTTPException(404, { message: "File not found" });
  }

  return c.json({ id, displayName });
});

filesRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const file = getFileById(id);

  if (!file) {
    throw new HTTPException(404, { message: "File not found" });
  }

  db.prepare("DELETE FROM files WHERE id = ?").run(id);
  await rm(filePathFor(file.id, file.filename), { force: true });

  return c.json({ id, deleted: true });
});

// Only a hint for the browser: wavesurfer decodes whatever bytes it gets.
const AUDIO_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".opus": "audio/ogg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".webm": "audio/webm",
};

filesRoute.get("/:id/audio", async (c) => {
  const file = getFileById(c.req.param("id"));
  if (!file) {
    throw new HTTPException(404, { message: "File not found" });
  }

  const path = filePathFor(file.id, file.filename);
  const size = await stat(path).then((info) => info.size, () => undefined);
  if (size === undefined) {
    throw new HTTPException(404, { message: "File not found" });
  }

  return c.body(Readable.toWeb(createReadStream(path)) as ReadableStream, 200, {
    "Content-Type": AUDIO_TYPES[extname(file.filename).toLowerCase()] ?? "application/octet-stream",
    "Content-Length": String(size),
    "Cache-Control": "private, no-cache",
  });
});

filesRoute.post("/:id/trim", async (c) => {
  const source = getFileById(c.req.param("id"));
  if (!source) {
    throw new HTTPException(404, { message: "File not found" });
  }

  const body = await c.req.json().catch(() => null);
  const range = parseTrimRange(body?.start, body?.end);

  const requestedName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
  const displayName = (requestedName || source.displayName).slice(0, 200);
  const filename = `${basename(source.filename, extname(source.filename))}.mp3`;
  const sourcePath = filePathFor(source.id, source.filename);
  const destination = filePathFor(source.id, filename);
  // ffmpeg can't write over its own input (an MP3 source keeps the same path), so the cut goes to a
  // temporary file first; the rename then swaps it in atomically.
  const temporary = join(config.uploadsDir, `${source.id}.trim-${randomUUID()}.mp3`);

  await trimOrThrow(sourcePath, temporary, range);
  try {
    await rename(temporary, destination);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }

  db.prepare("UPDATE files SET display_name = ?, filename = ? WHERE id = ?").run(displayName, filename, source.id);
  if (sourcePath !== destination) await rm(sourcePath, { force: true });

  return c.json({ id: source.id, displayName, filename });
});

// Web equivalent of /stop: stops the sound but leaves the bot in its voice channel.
filesRoute.post("/stop", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const requestedChannelId = typeof body?.channelId === "string" && body.channelId ? body.channelId : undefined;
  const user = getCurrentUser(c);
  if (!user) {
    throw new HTTPException(401, { message: "Unauthenticated" });
  }

  // The selected channel only picks the server; the bot may be in another channel of it.
  const selected = requestedChannelId
    ? client.channels.cache.get(requestedChannelId)
    : findUserVoiceChannel(client.guilds.cache.values(), user.userId);
  if (!selected || !selected.isVoiceBased()) {
    throw new HTTPException(requestedChannelId ? 400 : 409, {
      message: requestedChannelId ? "Salon vocal invalide" : "Rejoins un salon vocal pour arrêter le son",
    });
  }

  const guild = selected.guild;
  const botChannelId = getActiveChannelId(guild.id);
  if (!botChannelId) {
    throw new HTTPException(409, { message: "Aucun son en cours de lecture" });
  }
  // Same rule as /stop: you can only act on the channel you are in.
  if (guild.voiceStates.cache.get(user.userId)?.channelId !== botChannelId) {
    throw new HTTPException(403, { message: "Tu dois être connecté au salon vocal du bot pour arrêter le son" });
  }

  if (!stopPlayback(guild.id)) {
    throw new HTTPException(409, { message: "Aucun son en cours de lecture" });
  }

  return c.json({ stopped: true, channelId: botChannelId });
});

filesRoute.post("/:id/play", async (c) => {
  const id = c.req.param("id");
  const file = getFileById(id);

  if (!file) {
    throw new HTTPException(404, { message: "File not found" });
  }

  const body = await c.req.json().catch(() => ({}));
  const requestedChannelId = typeof body?.channelId === "string" && body.channelId ? body.channelId : undefined;
  const user = getCurrentUser(c);
  if (!user) {
    throw new HTTPException(401, { message: "Unauthenticated" });
  }

  const channel = requestedChannelId
    ? client.channels.cache.get(requestedChannelId)
    : findUserVoiceChannel(client.guilds.cache.values(), user.userId);

  if (!channel) {
    throw new HTTPException(requestedChannelId ? 400 : 409, {
      message: requestedChannelId ? "Salon vocal invalide" : "Rejoins un salon vocal pour jouer un son",
    });
  }
  if (!channel.isVoiceBased()) {
    throw new HTTPException(400, { message: "Salon vocal invalide" });
  }
  // Being in the voice channel also proves membership of its guild.
  if (!channel.members.has(user.userId)) {
    throw new HTTPException(403, { message: "Tu dois être connecté à ce salon vocal pour y jouer un son" });
  }

  try {
    await playFile({
      guildId: channel.guild.id,
      channelId: channel.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      filePath: filePathFor(file.id, file.filename),
    });
  } catch (error) {
    throw new HTTPException(500, {
      message: error instanceof Error ? error.message : "Playback failed",
    });
  }

  return c.json({ id, playing: true, channelId: channel.id });
});
