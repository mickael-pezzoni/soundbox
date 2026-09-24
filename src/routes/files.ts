import { randomUUID } from "node:crypto";
import { createWriteStream, mkdirSync } from "node:fs";
import { rm } from "node:fs/promises";
import { extname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { getCurrentUser } from "../auth/session.js";
import { client, guildsSharedWith, isGuildMember } from "../bot.js";
import { config } from "../config.js";
import { db } from "../db.js";
import { listGuildVoiceInfo, pickDefaultChannelId } from "../voice/channels.js";
import { playFile } from "../voice/player.js";

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

  const originalFilename = decodeHeader(rawFilename);
  const rawDisplayName = c.req.header("x-display-name");
  const displayName = rawDisplayName ? decodeHeader(rawDisplayName) : originalFilename;
  const id = randomUUID();
  const destination = join(config.uploadsDir, `${id}${extname(originalFilename)}`);

  await pipeline(
    Readable.fromWeb(c.req.raw.body as import("node:stream/web").ReadableStream<Uint8Array>),
    createWriteStream(destination),
  );

  db.prepare(
    "INSERT INTO files (id, display_name, filename) VALUES (?, ?, ?)",
  ).run(id, displayName, originalFilename);

  return c.json({ id, displayName, filename: originalFilename }, 201);
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

  const channelId =
    requestedChannelId ??
    pickDefaultChannelId(
      listGuildVoiceInfo(await guildsSharedWith(user.userId)).flatMap((guild) => guild.channels),
      user.userId,
    );

  if (!channelId) {
    throw new HTTPException(503, { message: "No voice channel available (is the bot connected?)" });
  }

  const channel = client.channels.cache.get(channelId);
  if (!channel || !channel.isVoiceBased()) {
    throw new HTTPException(400, { message: "Invalid voice channel" });
  }
  if (!(await isGuildMember(channel.guild, user.userId))) {
    throw new HTTPException(403, { message: "You are not a member of this server" });
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

  return c.json({ id, playing: true, channelId });
});
