import "./db.js";
import { startBot } from "./bot.js";
import { startServer } from "./server.js";

startServer();
startBot().catch((error: unknown) => {
  console.error("Discord bot login failed:", error);
});
