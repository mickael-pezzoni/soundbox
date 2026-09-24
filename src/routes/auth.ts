import { randomBytes, timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { createSession, SESSION_COOKIE, SESSION_TTL_MS } from "../auth/session.js";
import { client } from "../bot.js";
import { config } from "../config.js";

const OAUTH_STATE_COOKIE = "oauth_state";
const REDIRECT_URI = `${config.baseUrl}/auth/callback`;
const DISCORD_API = "https://discord.com/api";
const secureCookies = config.baseUrl.startsWith("https://");

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export const authRoute = new Hono();

authRoute.get("/login", (c) => {
  if (!config.discordClientId) {
    throw new HTTPException(500, { message: "DISCORD_CLIENT_ID must be configured" });
  }

  const state = randomBytes(16).toString("hex");
  setCookie(c, OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "Lax",
    secure: secureCookies,
    maxAge: 600,
    path: "/",
  });

  const url = new URL("https://discord.com/oauth2/authorize");
  url.search = new URLSearchParams({
    client_id: config.discordClientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "identify guilds",
    state,
  }).toString();

  return c.redirect(url.toString());
});

authRoute.get("/callback", async (c) => {
  const { discordClientId, discordClientSecret } = config;
  if (!discordClientId || !discordClientSecret) {
    throw new HTTPException(500, {
      message: "DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET must be configured",
    });
  }

  if (c.req.query("error")) {
    throw new HTTPException(400, { message: "Discord authorization denied" });
  }

  const code = c.req.query("code");
  const state = c.req.query("state");
  const expectedState = getCookie(c, OAUTH_STATE_COOKIE);
  deleteCookie(c, OAUTH_STATE_COOKIE, { path: "/" });

  if (!code || !state || !expectedState || !safeEqual(state, expectedState)) {
    throw new HTTPException(400, { message: "Invalid OAuth state, please restart the login" });
  }

  const tokenResponse = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: discordClientId,
      client_secret: discordClientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });
  if (!tokenResponse.ok) {
    throw new HTTPException(502, { message: "Failed to exchange the code with Discord" });
  }

  const { access_token: accessToken } = (await tokenResponse.json()) as { access_token: string };
  const headers = { Authorization: `Bearer ${accessToken}` };

  const [userResponse, guildsResponse] = await Promise.all([
    fetch(`${DISCORD_API}/users/@me`, { headers }),
    fetch(`${DISCORD_API}/users/@me/guilds`, { headers }),
  ]);
  if (!userResponse.ok || !guildsResponse.ok) {
    throw new HTTPException(502, { message: "Failed to fetch the Discord profile" });
  }

  const user = (await userResponse.json()) as { id: string; username: string; global_name?: string | null };
  const guilds = (await guildsResponse.json()) as { id: string }[];

  if (!guilds.some((guild) => client.guilds.cache.has(guild.id))) {
    throw new HTTPException(403, { message: "Access is restricted to members of a server the bot has joined" });
  }

  const sessionId = createSession({ userId: user.id, username: user.global_name ?? user.username });
  setCookie(c, SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "Lax",
    secure: secureCookies,
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  });

  return c.redirect("/");
});
