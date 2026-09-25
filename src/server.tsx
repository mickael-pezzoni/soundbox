import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { getCurrentUser, requireAuth } from "./auth/session.js";
import { guildsSharedWith } from "./bot.js";
import { config } from "./config.js";
import { authRoute } from "./routes/auth.js";
import { filesRoute, listFiles } from "./routes/files.js";
import { listGuildVoiceInfo, pickDefaultChannelId } from "./voice/channels.js";
import { FilesPage } from "./views/files-page.js";

export const app = new Hono();

app.get("/favicon.ico", serveStatic({ path: "./public/favicon.ico" }));

app.use("*", requireAuth);

app.get("/", async (c) => {
  const page = Number(c.req.query("page") ?? 1);
  const query = c.req.query("q")?.trim() ?? "";
  const { files, pagination } = listFiles(page, 20, query);

  const user = getCurrentUser(c);
  const guilds = listGuildVoiceInfo(user ? await guildsSharedWith(user.userId) : []);
  const channels = guilds.flatMap((guild) => guild.channels);
  const defaultChannelId = pickDefaultChannelId(channels, user?.userId);
  const userChannelId = user ? channels.find((channel) => channel.memberIds.includes(user.userId))?.id : undefined;

  return c.html(
    "<!DOCTYPE html>" +
    <FilesPage
      files={files}
      pagination={pagination}
      query={query}
      guilds={guilds}
      defaultChannelId={defaultChannelId}
      userChannelId={userChannelId}
      username={user?.username}
    />,
  );
});
app.get("/health", (c) => c.json({ status: "healthy" }));
app.route("/files", filesRoute);
app.route("/auth", authRoute);

export function startServer() {
  serve({ fetch: app.fetch, port: config.port }, (info) => {
    console.log(`HTTP server listening on http://localhost:${info.port}`);
  });
}
