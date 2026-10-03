import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { requireAuth } from "./auth/session.js";
import { config } from "./config.js";
import { apiRoute } from "./routes/api.js";
import { authRoute } from "./routes/auth.js";
import { AppShell } from "./views/files-page.js";

export const app = new Hono();

app.get("/favicon.ico", serveStatic({ path: "./public/favicon.ico" }));

app.use("*", requireAuth);

// The app renders in the browser: the page itself carries no data, it all comes from /api.
const shell = "<!DOCTYPE html>" + (<AppShell />);
app.get("/", (c) => c.html(shell));
app.get("/health", (c) => c.json({ status: "healthy" }));
app.route("/api", apiRoute);
app.route("/auth", authRoute);

export function startServer() {
  serve({ fetch: app.fetch, port: config.port }, (info) => {
    console.log(`HTTP server listening on http://localhost:${info.port}`);
  });
}
