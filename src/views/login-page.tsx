import type { FC } from "hono/jsx";

export const LoginPage: FC = () => (
  <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Connexion · Soundbox</title>
      <link rel="icon" href="/favicon.ico" />
      <script src="https://cdn.tailwindcss.com"></script>
      <script
        dangerouslySetInnerHTML={{
          __html: `tailwind.config = { darkMode: "class" }; document.documentElement.classList.add("dark");`,
        }}
      ></script>
    </head>
    <body class="flex min-h-screen items-center justify-center bg-gray-950 p-5 text-gray-100">
      <main class="w-full max-w-sm rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
        <h1 class="mb-2 text-2xl font-semibold">Soundbox</h1>
        <p class="mb-6 text-sm text-gray-400">
          Connecte-toi avec Discord pour gérer et jouer les sons.
        </p>
        <a
          href="/auth/discord"
          class="inline-block w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-white transition-colors hover:bg-indigo-500"
        >
          Se connecter avec Discord
        </a>
      </main>
    </body>
  </html>
);
