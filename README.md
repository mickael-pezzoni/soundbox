# Soundbox

Bot Discord "soundboard" avec une interface web de gestion. Les fichiers audio sont uploadés depuis le site, puis joués dans un salon vocal Discord, depuis le site ou avec la commande `/play`.

## Fonctionnalités

- Interface web (rendue côté serveur) : liste paginée, upload par glisser-déposer ou par bouton, renommage, suppression, lecture dans un salon vocal choisi
- Import depuis YouTube : coller un lien dans la modale « YouTube », la piste audio est téléchargée par `yt-dlp` avec une barre de progression en direct (un seul import à la fois). La case « Couper le son après l'import » ouvre directement la découpe sur le son importé
- Commande Discord `/play fichier:<nom>` avec autocomplétion sur les noms enregistrés, jouée dans le salon vocal où se trouve l'utilisateur
- Commande Discord `/stop` : arrête le son en cours et déconnecte le bot du salon (réservée aux utilisateurs présents dans ce salon)
- Salon par défaut : celui où il y a déjà des utilisateurs connectés
- Connexion via Discord (OAuth2) : seuls les membres d'un serveur précis ont accès, toutes les routes sont protégées
- Upload en stream (pas de fichier chargé en mémoire), audio uniquement
- Découpe à l'upload : l'option « Recouper le son » affiche la forme d'onde ([wavesurfer.js](https://wavesurfer.xyz), chargé via CDN à la demande) pour ne garder qu'un passage, enregistré en MP3. Le bouton ciseaux d'un son existant ouvre la même découpe et remplace le son par le passage choisi (irréversible)

## Stack

Node.js 24, TypeScript, [discord.js](https://discord.js.org) + `@discordjs/voice`, [Hono](https://hono.dev) (JSX pour le rendu), SQLite via `node:sqlite` (intégré à Node), ffmpeg via `ffmpeg-static`, Tailwind (CDN), [yt-dlp](https://github.com/yt-dlp/yt-dlp) (binaire externe) pour l'import YouTube.

## Prérequis côté Discord

Dans le [portail développeur](https://discord.com/developers/applications) :

1. **Bot** : créer le bot et copier son token (`DISCORD_TOKEN`).
2. **OAuth2** : copier le Client ID (`DISCORD_CLIENT_ID`) et le Client Secret (`DISCORD_CLIENT_SECRET`), puis ajouter dans *Redirects* l'URL `<BASE_URL>/auth/callback` (ex. `http://localhost:3000/auth/callback`).
3. **Invitation du bot** : scopes `bot` et `applications.commands`, permissions *Se connecter* et *Parler*.

## Configuration

Copier `.env.example` en `.env` et le remplir.

| Variable | Requis | Défaut | Description |
| --- | --- | --- | --- |
| `DISCORD_TOKEN` | oui | | Token du bot |
| `DISCORD_CLIENT_ID` | pour le site | | Application ID (OAuth2) |
| `DISCORD_CLIENT_SECRET` | pour le site | | Client Secret (OAuth2) |
| `BASE_URL` | non | `http://localhost:3000` | URL publique du site, sert à construire l'URL de callback OAuth |
| `PORT` | non | `3000` | Port HTTP |
| `DB_PATH` | non | `./data/soundbox.db` | Fichier SQLite |
| `UPLOADS_DIR` | non | `./data/uploads` | Dossier des fichiers audio |
| `YTDLP_PATH` | non | `yt-dlp` | Chemin du binaire yt-dlp (fourni dans l'image Docker) |

Sans `DISCORD_CLIENT_ID` et `DISCORD_CLIENT_SECRET`, personne ne peut se connecter au site (les routes restent protégées). Peut se connecter tout membre d'au moins un serveur où le bot est installé.

## Lancer en local

L'import YouTube a besoin du binaire `yt-dlp` sur la machine (`brew install yt-dlp`, ou `YTDLP_PATH` vers un binaire téléchargé à la main). Le reste de l'application fonctionne sans.

```bash
npm install
npm run dev      # rechargement automatique
```

Ou en version compilée :

```bash
npm run build
npm start
```

Le site est sur `http://localhost:3000`. Les commandes `/play` et `/stop` sont enregistrées automatiquement sur chaque serveur où le bot est présent.

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

Les variables non secrètes (`PORT`, `BASE_URL`, `DB_PATH`, `UPLOADS_DIR`) ont des valeurs par défaut dans l'image. Les secrets (`DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`) se fournissent à l'exécution. Pensez à renseigner `BASE_URL` avec l'URL publique réelle et à déclarer son `/auth/callback` dans le portail Discord. Le conteneur tourne avec un utilisateur non-root et expose un `HEALTHCHECK` sur `/health`.

## Routes HTTP

Toutes les routes exigent une session, sauf `/auth/*`. Une page non authentifiée redirige vers `/auth/login`, une requête d'API reçoit un `401`.

| Méthode | Route | Description |
| --- | --- | --- |
| `GET` | `/` | Page de gestion (`?page=N`) |
| `GET` | `/health` | Statut |
| `GET` | `/auth/login` | Redirige vers Discord |
| `GET` | `/auth/callback` | Retour OAuth2, crée la session |
| `POST` | `/files` | Upload en stream (voir ci-dessous) |
| `POST` | `/files/youtube` | Import YouTube, body `{ "url": "..." }`, réponse en flux SSE |
| `PATCH` | `/files/:id` | Renomme, body `{ "displayName": "..." }` |
| `DELETE` | `/files/:id` | Supprime le fichier et son entrée |
| `GET` | `/files/:id/audio` | Contenu du fichier audio (utilisé par la forme d'onde) |
| `POST` | `/files/:id/trim` | Remplace le son par un passage, réencodé en MP3 (même id), body `{ "start": 2.5, "end": 7.8, "displayName": "..." }` (secondes ; nom optionnel, sinon inchangé) |
| `POST` | `/files/:id/play` | Joue dans un salon, body optionnel `{ "channelId": "..." }` |

Upload : le corps de la requête est le fichier brut, avec les en-têtes `Content-Type: audio/*`, `X-Filename` (nom d'origine, encodé avec `encodeURIComponent`) et `X-Display-Name` (optionnel, sinon le nom du fichier). Un autre type de contenu renvoie `415`. Avec `X-Trim-Start` et `X-Trim-End` (en secondes, les deux ensemble), seul ce passage est gardé, réencodé en MP3 ; l'original n'est pas conservé.

Découpe : le passage est réencodé en MP3 par ffmpeg, ce qui rend la coupe précise quel que soit le format d'origine. Un intervalle invalide ou un début au-delà de la fin du fichier renvoie `400`. Une fin au-delà de la durée s'arrête simplement à la fin.

Import YouTube : une URL hors YouTube renvoie `400`, un import déjà en cours `409`. Sinon la réponse est un flux `text/event-stream` dont chaque événement est un objet JSON — `{"phase":"info","title","duration"}`, puis des `{"phase":"progress","percent","speed","eta"}`, et enfin `{"phase":"done","id","displayName"}` ou `{"phase":"error","message"}`. Un flux qui se termine sans `done` signifie que le téléchargement a échoué. Fermer la connexion annule l'import et supprime les fichiers partiels. La route est en `POST` (et non en `GET` consommable par `EventSource`) parce qu'elle télécharge et écrit en base : un `GET` serait la seule forme de requête cross-site à laquelle le cookie de session, en `SameSite=Lax`, reste exposé.

## Structure

```
src/
  index.ts            point d'entrée (base, serveur HTTP, bot)
  config.ts           variables d'environnement
  db.ts               connexion SQLite et tables (files, sessions)
  bot.ts              client Discord, commandes /play et /stop
  server.tsx          application Hono, page d'accueil
  auth/session.ts     sessions et middleware de protection
  media/youtube.ts    téléchargement audio via yt-dlp (progression, annulation, nettoyage)
  media/trim.ts       découpe d'un passage en MP3 via ffmpeg
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
- L'import YouTube n'est pas fiable à 100 %, et ce n'est pas corrigeable côté application : YouTube répond souvent « Sign in to confirm you're not a bot » aux adresses IP d'hébergeurs, et les extracteurs d'une version figée de yt-dlp se périment en quelques semaines. Le message d'erreur remonté dans l'interface est celui de yt-dlp. Pour mettre à jour sans reconstruire l'image, monter un binaire récent et pointer `YTDLP_PATH` dessus ; sinon reconstruire avec `--build-arg YTDLP_VERSION=<release>`.
- L'audio est récupéré sans réencodage (`.m4a` ou `.webm`/opus selon la vidéo) : c'est ffmpeg qui convertit à la lecture, comme pour les fichiers uploadés. Limites en dur dans `src/media/youtube.ts` : 15 minutes, 50 Mo, 3 minutes de timeout, un import à la fois.
