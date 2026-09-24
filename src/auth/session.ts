import { randomBytes } from "node:crypto";
import { getCookie } from "hono/cookie";
import type { Context, MiddlewareHandler } from "hono";
import { db } from "../db.js";

export const SESSION_COOKIE = "session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface SessionUser {
  userId: string;
  username: string;
  /** Guilds the user shares with the bot, captured at login. */
  guildIds: string[];
}

export function createSession(user: SessionUser): string {
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());

  const id = randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions (id, user_id, username, guild_ids, expires_at) VALUES (?, ?, ?, ?, ?)").run(
    id,
    user.userId,
    user.username,
    JSON.stringify(user.guildIds),
    Date.now() + SESSION_TTL_MS,
  );
  return id;
}

export function getSession(id: string): SessionUser | undefined {
  const row = db
    .prepare("SELECT user_id, username, guild_ids FROM sessions WHERE id = ? AND expires_at > ?")
    .get(id, Date.now()) as { user_id: string; username: string; guild_ids: string } | undefined;

  return row
    ? { userId: row.user_id, username: row.username, guildIds: JSON.parse(row.guild_ids) as string[] }
    : undefined;
}

export function getCurrentUser(c: Context): SessionUser | undefined {
  const sessionId = getCookie(c, SESSION_COOKIE);
  return sessionId ? getSession(sessionId) : undefined;
}

export const requireAuth: MiddlewareHandler = async (c, next) => {
  if (c.req.path.startsWith("/auth/")) return next();

  const sessionId = getCookie(c, SESSION_COOKIE);
  if (sessionId && getSession(sessionId)) return next();

  const isPageRequest =
    (c.req.method === "GET" || c.req.method === "HEAD") &&
    (c.req.header("accept") ?? "").includes("text/html");

  if (isPageRequest) return c.redirect("/auth/login");
  return c.json({ message: "Unauthenticated" }, 401);
};
