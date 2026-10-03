import type { FC } from "hono/jsx";
import { STICKER_BODY, STICKER_FONT_URL } from "./theme.js";

export const LoginPage: FC = () => (
  <html lang="fr" style="color-scheme: light">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Connexion · Soundbox</title>
      <link rel="icon" href="/favicon.ico" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href={STICKER_FONT_URL} />
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class={`flex min-h-screen items-center justify-center p-5 ${STICKER_BODY}`}>
      <main class="w-full max-w-sm rounded-3xl border-2 border-zinc-950 bg-white p-8 text-center shadow-[6px_6px_0_#09090b]">
        <h1 class="mb-4">
          <span class="inline-block -rotate-2 border-2 border-zinc-950 bg-yellow-300 px-2 text-4xl font-extrabold tracking-tight shadow-[3px_3px_0_#09090b]">
            Soundbox!
          </span>
        </h1>
        <p class="mb-6 text-sm font-medium text-zinc-600">Connecte-toi avec Discord pour gérer et jouer les sons.</p>
        <a
          href="/auth/discord"
          class="inline-flex h-11 w-full items-center justify-center rounded-xl border-2 border-zinc-950 bg-pink-400 px-4 font-bold text-zinc-950 shadow-[3px_3px_0_#09090b] transition hover:bg-pink-300 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#09090b]"
        >
          Se connecter avec Discord
        </a>
      </main>
    </body>
  </html>
);
