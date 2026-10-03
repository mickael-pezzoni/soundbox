import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { getCurrentUser } from "../auth/session.js";
import { guildsSharedWith } from "../bot.js";
import { formatChannelLabel, listGuildVoiceInfo, pickDefaultChannelId } from "../voice/channels.js";
import { filesRoute, listFavorites } from "./files.js";

// Everything the browser app reads or changes goes through here; requireAuth guards it with the
// session cookie and answers 401 instead of redirecting.
export const apiRoute = new Hono();

function currentUserOrThrow(c: Parameters<typeof getCurrentUser>[0]) {
  const user = getCurrentUser(c);
  if (!user) {
    throw new HTTPException(401, { message: "Unauthenticated" });
  }
  return user;
}

apiRoute.get("/me", (c) => {
  const user = currentUserOrThrow(c);
  return c.json({ userId: user.userId, username: user.username });
});

apiRoute.get("/channels", async (c) => {
  const user = currentUserOrThrow(c);
  const guilds = listGuildVoiceInfo(await guildsSharedWith(user.userId));
  const channels = guilds.flatMap((guild) => guild.channels);

  return c.json({
    guilds: guilds.map((guild) => ({
      id: guild.id,
      name: guild.name,
      channels: guild.channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        label: formatChannelLabel(channel),
        memberCount: channel.memberCount,
      })),
    })),
    defaultChannelId: pickDefaultChannelId(channels, user.userId) ?? null,
    userChannelId: channels.find((channel) => channel.memberIds.includes(user.userId))?.id ?? null,
  });
});

apiRoute.get("/favorites", (c) => {
  const user = currentUserOrThrow(c);
  return c.json({ files: listFavorites(user.userId) });
});

apiRoute.route("/files", filesRoute);
