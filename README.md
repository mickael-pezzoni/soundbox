# Soundbox

Bot Discord "soundboard" avec une interface web de gestion. Les fichiers audio sont uploadés depuis le site, puis joués dans un salon vocal Discord, depuis le site ou avec la commande `/play`.

## Fonctionnalités

- Interface web (rendue côté serveur) : liste paginée, upload par glisser-déposer ou par bouton, renommage, suppression, lecture dans un salon vocal choisi
- Commande Discord `/play fichier:<nom> [salon:<salon>]` avec autocomplétion sur les noms enregistrés et sur les salons vocaux
- Salon par défaut : celui où il y a déjà des utilisateurs connectés
- Connexion via Discord (OAuth2) : seuls les membres d'un serveur précis ont accès, toutes les routes sont protégées
- Upload en stream (pas de fichier chargé en mémoire), audio uniquement

## Stack

Node.js 24, TypeScript, [discord.js](https://discord.js.org) + `@discordjs/voice`, [Hono](https://hono.dev) (JSX pour le rendu), SQLite via `node:sqlite` (intégré à Node), ffmpeg via `ffmpeg-static`, Tailwind (CDN).

## Prérequis côté Discord

Dans le [portail développeur](https://discord.com/developers/applications) :

1. **Bot** : créer le bot et copier son token (`DISCORD_TOKEN`).
2. **OAuth2** : copier le Client ID (`DISCORD_CLIENT_ID`) et le Client Secret (`DISCORD_CLIENT_SECRET`), puis ajouter dans *Redirects* l'URL `<BASE_URL>/auth/callback` (ex. `http://localhost:3000/auth/callback`).
3. **Invitation du bot** : scopes `bot` et `applications.commands`, permissions *Se connecter* et *Parler*.
4. Récupérer l'id du serveur autorisé à se connecter au site (`DISCORD_GUILD_ID`, mode développeur activé dans Discord, clic droit sur le serveur).

## Configuration

Copier `.env.example` en `.env` et le remplir.

| Variable | Requis | Défaut | Description |
| --- | --- | --- | --- |
| `DISCORD_TOKEN` | oui | | Token du bot |
| `DISCORD_CLIENT_ID` | pour le site | | Application ID (OAuth2) |
| `DISCORD_CLIENT_SECRET` | pour le site | | Client Secret (OAuth2) |
| `DISCORD_GUILD_ID` | pour le site | | Serveur dont les membres peuvent se connecter |
| `BASE_URL` | non | `http://localhost:3000` | URL publique du site, sert à construire l'URL de callback OAuth |
| `PORT` | non | `3000` | Port HTTP |
| `DB_PATH` | non | `./data/soundbox.db` | Fichier SQLite |
| `UPLOADS_DIR` | non | `./data/uploads` | Dossier des fichiers audio |

Sans `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` et `DISCORD_GUILD_ID`, personne ne peut se connecter au site (les routes restent protégées).

## Lancer en local

```bash
npm install
npm run dev      # rechargement automatique
```

Ou en version compilée :

```bash
npm run build
npm start
```

Le site est sur `http://localhost:3000`. La commande `/play` est enregistrée automatiquement sur chaque serveur où le bot est présent.

## Docker

```bash
docker build -t soundbox .

docker run -d --name soundbox \
  -p 3000:3000 \
  --env-file .env \
  -e DB_PATH=/data/db/soundbox.db \
  -v soundbox-db:/data/db \
  -v soundbox-uploads:/data/uploads \
  soundbox
```

Deux volumes :

- `/data/db` : le dossier contenant la base SQLite (`soundbox.db`). On monte un dossier et non le fichier seul, car SQLite y crée des fichiers annexes.
- `/data/uploads` : les fichiers audio.

Les variables non secrètes (`PORT`, `BASE_URL`, `DB_PATH`, `UPLOADS_DIR`) ont des valeurs par défaut dans l'image. Les secrets (`DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_GUILD_ID`) se fournissent à l'exécution. Pensez à renseigner `BASE_URL` avec l'URL publique réelle et à déclarer son `/auth/callback` dans le portail Discord. Le conteneur tourne avec un utilisateur non-root et expose un `HEALTHCHECK` sur `/health`.

## Routes HTTP

Toutes les routes exigent une session, sauf `/auth/*`. Une page non authentifiée redirige vers `/auth/login`, une requête d'API reçoit un `401`.

| Méthode | Route | Description |
| --- | --- | --- |
| `GET` | `/` | Page de gestion (`?page=N`) |
| `GET` | `/health` | Statut |
| `GET` | `/auth/login` | Redirige vers Discord |
| `GET` | `/auth/callback` | Retour OAuth2, crée la session |
| `POST` | `/files` | Upload en stream (voir ci-dessous) |
| `PATCH` | `/files/:id` | Renomme, body `{ "displayName": "..." }` |
| `DELETE` | `/files/:id` | Supprime le fichier et son entrée |
| `POST` | `/files/:id/play` | Joue dans un salon, body optionnel `{ "channelId": "..." }` |

Upload : le corps de la requête est le fichier brut, avec les en-têtes `Content-Type: audio/*`, `X-Filename` (nom d'origine, encodé avec `encodeURIComponent`) et `X-Display-Name` (optionnel, sinon le nom du fichier). Un autre type de contenu renvoie `415`.

## Structure

```
src/
  index.ts            point d'entrée (base, serveur HTTP, bot)
  config.ts           variables d'environnement
  db.ts               connexion SQLite et tables (files, sessions)
  bot.ts              client Discord, commande /play
  server.tsx          application Hono, page d'accueil
  auth/session.ts     sessions et middleware de protection
  routes/auth.ts      login et callback OAuth2
  routes/files.ts     API des fichiers
  voice/channels.ts   liste des salons vocaux et salon par défaut
  voice/player.ts     connexion vocale et lecture
  views/files-page.tsx  page de gestion (JSX)
```

## Notes

- Les sessions sont stockées dans SQLite (7 jours) et survivent aux redémarrages.
- Tailwind est chargé via son CDN : pratique pour une interface interne, à remplacer par un build statique pour un usage public à fort trafic.
- Le bot se déconnecte du salon vocal après 5 minutes d'inactivité.
