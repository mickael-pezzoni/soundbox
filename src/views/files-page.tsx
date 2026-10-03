import type { Child, FC } from "hono/jsx";
import type { FileRecord, Pagination } from "../routes/files.js";
import { formatChannelLabel, type GuildVoiceInfo } from "../voice/channels.js";
import { STICKER_BODY, STICKER_CSS, STICKER_FONT_URL } from "./theme.js";

// Buttons are composed from core + size + variant, never by appending overrides: with Tailwind the
// class order in the attribute doesn't decide which of two conflicting utilities wins.
const BTN_CORE =
  "inline-flex flex-shrink-0 items-center justify-center gap-2 border-2 border-zinc-950 text-sm font-bold shadow-[3px_3px_0_#09090b] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#09090b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const SIZE_MD = "h-11 rounded-xl px-4";
const SIZE_SM = "h-9 rounded-lg px-3";
const VARIANT_PRIMARY = "bg-pink-400 text-zinc-950 hover:bg-pink-300";
const VARIANT_SECONDARY = "bg-white text-zinc-950 hover:bg-yellow-100";
const VARIANT_INK = "bg-zinc-950 text-white hover:bg-zinc-800";
const VARIANT_DANGER = "bg-red-500 text-white hover:bg-red-400";

const BTN_PRIMARY = `${BTN_CORE} ${SIZE_MD} ${VARIANT_PRIMARY}`;
const BTN_SECONDARY = `${BTN_CORE} ${SIZE_MD} ${VARIANT_SECONDARY}`;
const BTN_SECONDARY_SM = `${BTN_CORE} ${SIZE_SM} ${VARIANT_SECONDARY}`;
const BTN_DANGER = `${BTN_CORE} ${SIZE_MD} ${VARIANT_DANGER}`;
// Square header/toolbar button: icon only on phones, icon + label from sm up.
const BTN_TOOL = `${BTN_CORE} h-11 w-11 rounded-xl sm:w-auto sm:px-4`;
const BTN_ICON_SM =
  "inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950";
const BTN_PAD_ACTION =
  "inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-zinc-950 bg-white text-zinc-950 transition-colors hover:bg-yellow-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950";
const FIELD =
  "rounded-xl border-2 border-zinc-950 bg-white text-sm font-medium text-zinc-950 placeholder:text-zinc-500 shadow-[3px_3px_0_#09090b] focus:outline-none focus:ring-2 focus:ring-pink-400";

// Full class strings, so the Tailwind CDN sees them in the rendered DOM.
const PAD_TONES = ["bg-yellow-300", "bg-pink-400", "bg-sky-400", "bg-emerald-300", "bg-orange-400", "bg-violet-300"];
// Stickers are stuck on slightly askew; the tilt comes from the id so it stays put between reloads.
const PAD_TILTS = ["-rotate-[1.5deg]", "-rotate-[0.75deg]", "rotate-0", "rotate-[0.75deg]", "rotate-[1.5deg]"];

function hashOf(id: string): number {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

function toneFor(id: string): string {
  const hash = hashOf(id);
  return `${PAD_TONES[hash % PAD_TONES.length]} ${PAD_TILTS[(hash >>> 3) % PAD_TILTS.length]}`;
}

const ICON = "h-4 w-4 flex-shrink-0";

const PlayIcon: FC<{ class?: string }> = (props) => (
  <svg class={props.class ?? ICON} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M6 4.5v11a.75.75 0 0 0 1.14.64l9-5.5a.75.75 0 0 0 0-1.28l-9-5.5A.75.75 0 0 0 6 4.5Z" />
  </svg>
);

const StarIcon: FC = () => (
  <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M9.32 2.7a.75.75 0 0 1 1.36 0l1.9 3.98 4.36.56a.75.75 0 0 1 .42 1.29l-3.2 3.01.81 4.32a.75.75 0 0 1-1.1.8L10 14.55l-3.87 2.11a.75.75 0 0 1-1.1-.8l.81-4.32-3.2-3.01a.75.75 0 0 1 .42-1.29l4.36-.56 1.9-3.98Z" />
  </svg>
);

const StopIcon: FC = () => (
  <svg class={ICON} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <rect x="5" y="5" width="10" height="10" rx="1.5" />
  </svg>
);

const EditIcon: FC = () => (
  <svg class={ICON} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="m13.19 3.3 3.51 3.51-9.4 9.4a2 2 0 0 1-.9.52l-3.2.89a.5.5 0 0 1-.62-.62l.89-3.2a2 2 0 0 1 .52-.9l9.2-9.6Zm1.06-1.06a2 2 0 0 1 2.83 0l.68.68a2 2 0 0 1 0 2.83l-.55.55-3.51-3.51.55-.55Z" />
  </svg>
);

const DeleteIcon: FC = () => (
  <svg class={ICON} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path
      fill-rule="evenodd"
      d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.44c-.8.1-1.6.22-2.38.36a.75.75 0 1 0 .26 1.48l.15-.03.7 10.03A2.75 2.75 0 0 0 7.48 18h5.04a2.75 2.75 0 0 0 2.75-2.53l.7-10.03.15.03a.75.75 0 0 0 .26-1.48c-.78-.14-1.58-.26-2.38-.36v-.44A2.75 2.75 0 0 0 11.25 1h-2.5ZM7.5 3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25v.32a49 49 0 0 0-5 0v-.32ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
      clip-rule="evenodd"
    />
  </svg>
);

const ScissorsIcon: FC = () => (
  <svg class={ICON} viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
    <circle cx="5.5" cy="5.5" r="2.5" />
    <circle cx="5.5" cy="14.5" r="2.5" />
    <path d="M7.6 6.9 17 14.5M7.6 13.1 17 5.5" />
  </svg>
);

const SpeakerIcon: FC<{ class?: string }> = (props) => (
  <svg class={props.class ?? ICON} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M10.5 3.75a.75.75 0 0 0-1.26-.55L5.46 6.75H3.5A1.5 1.5 0 0 0 2 8.25v3.5a1.5 1.5 0 0 0 1.5 1.5h1.96l3.78 3.55a.75.75 0 0 0 1.26-.55V3.75ZM13.9 6.1a.75.75 0 0 1 1.06 0 5.5 5.5 0 0 1 0 7.8.75.75 0 1 1-1.06-1.06 4 4 0 0 0 0-5.68.75.75 0 0 1 0-1.06Z" />
  </svg>
);

const SearchIcon: FC = () => (
  <svg class={ICON} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path
      fill-rule="evenodd"
      d="M9 3.5a5.5 5.5 0 1 0 3.4 9.83l3.64 3.64a.75.75 0 1 0 1.06-1.06l-3.64-3.64A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
      clip-rule="evenodd"
    />
  </svg>
);

const RefreshIcon: FC = () => (
  <svg class={ICON} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path
      fill-rule="evenodd"
      d="M15.31 11.42a5.5 5.5 0 0 1-9.2 2.47l-.37-.37h2.43a.75.75 0 0 0 0-1.5H4.4a.75.75 0 0 0-.75.75v3.77a.75.75 0 0 0 1.5 0v-2.24l.37.37a7 7 0 0 0 11.7-3.14.75.75 0 1 0-1.45-.39Zm-10.63-2.84a5.5 5.5 0 0 1 9.2-2.47l.37.37h-2.43a.75.75 0 0 0 0 1.5h3.77a.75.75 0 0 0 .75-.75V3.46a.75.75 0 0 0-1.5 0v2.24l-.37-.37a7 7 0 0 0-11.7 3.14.75.75 0 1 0 1.45.39Z"
      clip-rule="evenodd"
    />
  </svg>
);

const PlusIcon: FC = () => (
  <svg class={ICON} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
  </svg>
);

const YoutubeIcon: FC = () => (
  <svg class={ICON} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path
      fill-rule="evenodd"
      d="M17.3 5.6a2 2 0 0 0-1.4-1.4C14.6 3.9 10 3.9 10 3.9s-4.6 0-5.9.3a2 2 0 0 0-1.4 1.4C2.4 6.9 2.4 10 2.4 10s0 3.1.3 4.4a2 2 0 0 0 1.4 1.4c1.3.3 5.9.3 5.9.3s4.6 0 5.9-.3a2 2 0 0 0 1.4-1.4c.3-1.3.3-4.4.3-4.4s0-3.1-.3-4.4ZM8.4 12.7V7.3L13 10l-4.6 2.7Z"
      clip-rule="evenodd"
    />
  </svg>
);

const LogoutIcon: FC = () => (
  <svg class={ICON} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path
      fill-rule="evenodd"
      d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .41.34.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Zm12.22 2.97a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06l-2.25 2.25a.75.75 0 1 1-1.06-1.06l.97-.97H8.75a.75.75 0 0 1 0-1.5h7.44l-.97-.97a.75.75 0 0 1 0-1.06Z"
      clip-rule="evenodd"
    />
  </svg>
);

function formatDate(iso: string): string {
  const date = new Date(`${iso.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function fileExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? filename.slice(dot + 1).toUpperCase() : "AUDIO";
}

function pageHref(page: number, query: string): string {
  const params = new URLSearchParams({ page: String(page) });
  if (query) params.set("q", query);
  return `/?${params}`;
}

const SoundPad: FC<{ file: FileRecord; favorite: boolean }> = ({ file, favorite }) => (
  <li class="group relative">
    <button
      type="button"
      class={`sound-pad relative flex aspect-square w-full flex-col justify-end overflow-hidden rounded-2xl border-2 border-zinc-950 p-3 text-left text-zinc-950 shadow-[4px_4px_0_#09090b] transition hover:-translate-y-0.5 hover:rotate-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-950/30 active:translate-x-[3px] active:translate-y-[3px] active:shadow-[1px_1px_0_#09090b] disabled:cursor-wait ${toneFor(file.id)}`}
      data-action="play"
      data-id={file.id}
      data-name={file.displayName}
      title={`Jouer « ${file.displayName} » · ${fileExtension(file.filename)} · ${formatDate(file.createdAt)}`}
    >
      <span class="pad-ping pointer-events-none absolute inset-0 hidden animate-pulse bg-white/30"></span>
      <span class="relative line-clamp-3 break-words text-base font-extrabold leading-tight tracking-tight">{file.displayName}</span>
    </button>
    <div class="absolute -right-1.5 -top-1.5 flex gap-1">
      <div class="flex gap-1 transition-opacity [@media(hover:hover)]:opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
      <button
        type="button"
        class={BTN_PAD_ACTION}
        data-action="edit"
        data-id={file.id}
        data-name={file.displayName}
        aria-label={`Renommer « ${file.displayName} »`}
        title="Renommer"
      >
        <EditIcon />
      </button>
      <button
        type="button"
        class={BTN_PAD_ACTION}
        data-action="trim"
        data-id={file.id}
        data-name={file.displayName}
        aria-label={`Couper « ${file.displayName} »`}
        title="Couper"
      >
        <ScissorsIcon />
      </button>
      <button
        type="button"
        class={`${BTN_PAD_ACTION} hover:!bg-red-400`}
        data-action="delete"
        data-id={file.id}
        data-name={file.displayName}
        aria-label={`Supprimer « ${file.displayName} »`}
        title="Supprimer"
      >
        <DeleteIcon />
      </button>
      </div>
      <button
        type="button"
        class={`${BTN_PAD_ACTION} ${
          favorite
            ? "!bg-yellow-300"
            : "transition-opacity [@media(hover:hover)]:opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
        }`}
        data-action="favorite"
        data-id={file.id}
        data-favorite={String(favorite)}
        aria-pressed={String(favorite)}
        aria-label={favorite ? `Retirer « ${file.displayName} » des favoris` : `Ajouter « ${file.displayName} » aux favoris`}
        title={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
      >
        <StarIcon />
      </button>
    </div>
  </li>
);

const PAD_GRID =
  "grid content-start grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-x-3 gap-y-4 sm:grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] sm:gap-x-4 sm:gap-y-5";

const ChannelPicker: FC<{ guilds: GuildVoiceInfo[]; defaultChannelId?: string; userChannelId?: string }> = ({
  guilds,
  defaultChannelId,
  userChannelId,
}) => (
  <div class="flex h-11 min-w-0 flex-1 items-center gap-1 rounded-xl border-2 border-zinc-950 bg-white pl-3 pr-1 shadow-[3px_3px_0_#09090b] sm:max-w-sm">
    <SpeakerIcon class="h-4 w-4 flex-shrink-0 text-zinc-950" />
    {guilds.length === 0 ? (
      <span class="min-w-0 flex-1 truncate px-2 text-sm font-medium text-zinc-500">Aucun salon vocal disponible</span>
    ) : (
      <select
        id="channel-select"
        aria-label="Salon vocal"
        data-user-channel={userChannelId ?? ""}
        class="h-full min-w-0 flex-1 cursor-pointer truncate bg-transparent px-2 text-sm font-bold text-zinc-950 focus:outline-none"
      >
        {guilds.map((guild) => (
          <optgroup label={guild.name} class="bg-white text-zinc-500">
            {guild.channels.map((channel) => (
              <option value={channel.id} selected={channel.id === defaultChannelId} class="bg-white text-zinc-950">
                {formatChannelLabel(channel)}
                {channel.id === userChannelId ? " · toi" : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    )}
    <button
      type="button"
      id="refresh-channels"
      class={BTN_ICON_SM}
      title="Rafraîchir les salons"
      aria-label="Rafraîchir les salons"
    >
      <RefreshIcon />
    </button>
  </div>
);

const SearchBar: FC<{ query: string }> = ({ query }) => (
  <form method="get" action="/" role="search" class="relative min-w-0 flex-1">
    <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-950">
      <SearchIcon />
    </span>
    <input
      type="search"
      id="search-input"
      name="q"
      value={query}
      placeholder="Rechercher un son…"
      aria-label="Rechercher un son"
      maxlength={200}
      class={`${FIELD} h-11 w-full pl-9 pr-16 [&::-webkit-search-cancel-button]:hidden`}
    />
    {query ? (
      <a
        href="/"
        class="absolute inset-y-0 right-2 my-2 flex items-center rounded-md px-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
      >
        Effacer
      </a>
    ) : (
      <kbd class="pointer-events-none absolute inset-y-0 right-2 my-2.5 hidden items-center rounded border-2 border-zinc-300 px-1.5 font-mono text-[10px] text-zinc-500 sm:flex">
        /
      </kbd>
    )}
  </form>
);

const PaginationBar: FC<{ pagination: Pagination; query: string }> = ({ pagination, query }) => {
  if (pagination.totalPages <= 1) return null;

  const linkClass = BTN_SECONDARY_SM;
  const disabledClass = "inline-flex h-9 items-center px-3 text-sm font-bold text-zinc-400";

  return (
    <nav class="mt-auto flex items-center justify-center gap-3 pt-8 text-sm" aria-label="Pagination">
      {pagination.page > 1 ? (
        <a class={linkClass} href={pageHref(pagination.page - 1, query)}>
          ← Précédent
        </a>
      ) : (
        <span class={disabledClass}>← Précédent</span>
      )}
      <span class="rounded-full bg-zinc-950 px-3 py-1 font-bold tabular-nums text-white">
        {pagination.page} / {pagination.totalPages}
      </span>
      {pagination.page < pagination.totalPages ? (
        <a class={linkClass} href={pageHref(pagination.page + 1, query)}>
          Suivant →
        </a>
      ) : (
        <span class={disabledClass}>Suivant →</span>
      )}
    </nav>
  );
};

const EmptyState: FC<{ query: string }> = ({ query }) =>
  query ? (
    <div class="flex min-h-[40vh] flex-1 flex-col items-center justify-center gap-4 rounded-3xl border-2 border-zinc-950 bg-white p-8 text-center shadow-[6px_6px_0_#09090b]">
      <p class="text-lg font-bold">Aucun son ne correspond à « {query} ».</p>
      <a href="/" class={BTN_SECONDARY}>
        Voir tous les sons
      </a>
    </div>
  ) : (
    <div class="flex min-h-[40vh] flex-1 flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-zinc-950 bg-white/60 p-8 text-center">
      <span class="flex h-14 w-14 -rotate-6 items-center justify-center rounded-2xl border-2 border-zinc-950 bg-yellow-300 text-zinc-950 shadow-[3px_3px_0_#09090b]">
        <SpeakerIcon class="h-7 w-7" />
      </span>
      <div>
        <p class="text-xl font-extrabold">Ta soundbox est vide</p>
        <p class="mt-1 text-sm text-zinc-600">Glisse un fichier audio ici, ou ajoute-le avec le bouton.</p>
      </div>
      <button type="button" data-action="upload" class={BTN_PRIMARY}>
        <PlusIcon />
        Ajouter un son
      </button>
    </div>
  );

const Modal: FC<{ id: string; labelledBy: string; children?: Child }> = ({ id, labelledBy, children }) => (
  <div
    id={id}
    role="dialog"
    aria-modal="true"
    aria-labelledby={labelledBy}
    data-modal
    class="fixed inset-0 z-30 hidden items-end justify-center bg-zinc-950/40 p-4 backdrop-blur-sm sm:items-center"
  >
    <div class="w-full max-w-md rounded-3xl border-2 border-zinc-950 bg-white p-6 text-zinc-950 shadow-[6px_6px_0_#09090b]">
      {children}
    </div>
  </div>
);

const CLIENT_SCRIPT = `
(() => {
  const state = {
    mode: "upload",
    pendingUpload: null,
    editingId: null,
    deletingId: null,
    nameTouched: false,
    ytController: null,
    trim: null,
    trimToken: null,
    // Set when the cut modal opens on a freshly imported sound the page doesn't list yet.
    reloadOnClose: false,
  };

  const el = (id) => document.getElementById(id);
  const dropzone = el("dropzone");
  const dropOverlay = el("drop-overlay");
  const fileInput = el("file-input");
  const searchInput = el("search-input");

  const nameModal = el("name-modal");
  const nameModalTitle = el("name-modal-title");
  const nameFileRow = el("name-file-row");
  const nameFileLabel = el("name-file-label");
  const modalChooseBtn = el("modal-choose-btn");
  const nameInput = el("name-input");
  const nameModalError = el("name-modal-error");
  const nameConfirm = el("name-confirm");
  const nameCancel = el("name-cancel");

  const deleteModal = el("delete-modal");
  const deleteModalText = el("delete-modal-text");
  const deleteConfirm = el("delete-confirm");
  const deleteCancel = el("delete-cancel");

  const ytModal = el("yt-modal");
  const ytUrl = el("yt-url");
  const ytProgress = el("yt-progress");
  const ytProgressBar = el("yt-progress-bar");
  const ytStatus = el("yt-status");
  const ytError = el("yt-error");
  const ytConfirm = el("yt-confirm");
  const ytTrim = el("yt-trim");
  const ytCancel = el("yt-cancel");

  const trimRow = el("trim-row");
  const trimToggle = el("trim-toggle");
  const trimToggleRow = el("trim-toggle-row");
  const trimPanel = el("trim-panel");
  const trimWarning = el("trim-warning");
  const trimWaveform = el("trim-waveform");
  const trimPlay = el("trim-play");
  const trimPlayLabel = el("trim-play-label");
  const trimRange = el("trim-range");
  const trimStatus = el("trim-status");

  const toast = el("toast");
  let toastTimer = null;
  function showToast(message, isError) {
    toast.textContent = message;
    toast.classList.toggle("bg-white", !isError);
    toast.classList.toggle("bg-red-300", Boolean(isError));
    toast.classList.remove("opacity-0", "translate-y-2");
    toast.classList.add("opacity-100");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("opacity-100");
      toast.classList.add("opacity-0", "translate-y-2");
    }, 3000);
  }

  function show(node) {
    node.classList.remove("hidden");
    node.classList.add("flex");
  }
  function hide(node) {
    node.classList.add("hidden");
    node.classList.remove("flex");
  }
  const isOpen = (node) => !node.classList.contains("hidden");

  function reload() {
    window.location.reload();
  }

  // wavesurfer is only fetched the first time someone ticks "Recouper le son".
  const WAVESURFER_URL = "https://cdn.jsdelivr.net/npm/wavesurfer.js@8.0.1/dist/wavesurfer.esm.js";
  const REGIONS_URL = "https://cdn.jsdelivr.net/npm/wavesurfer.js@8.0.1/dist/plugins/regions.esm.js";
  let wavesurferModules = null;
  function loadWavesurfer() {
    if (!wavesurferModules) {
      wavesurferModules = Promise.all([import(WAVESURFER_URL), import(REGIONS_URL)]).then(
        ([ws, regions]) => ({ WaveSurfer: ws.default, Regions: regions.default }),
        (err) => {
          wavesurferModules = null; // let a later attempt retry the download
          throw err;
        },
      );
    }
    return wavesurferModules;
  }

  const nameModalBox = nameModal.firstElementChild;
  function setModalWide(wide) {
    nameModalBox.classList.toggle("max-w-md", !wide);
    nameModalBox.classList.toggle("max-w-2xl", wide);
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const rest = (seconds - minutes * 60).toFixed(1).padStart(4, "0");
    return minutes + ":" + rest;
  }

  function updateTrimRange() {
    const region = state.trim && state.trim.region;
    trimRange.textContent = region
      ? formatTime(region.start) + " → " + formatTime(region.end) + " (" + formatTime(region.end - region.start) + ")"
      : "";
  }

  function destroyTrim() {
    // Invalidates a load still in flight: its callbacks check they are still the current one.
    state.trimToken = null;
    if (state.trim) state.trim.ws.destroy();
    state.trim = null;
    trimWaveform.innerHTML = "";
    trimPlay.disabled = true;
    trimPlayLabel.textContent = "Écouter l'extrait";
    trimRange.textContent = "";
    trimStatus.textContent = "";
  }

  /** source: the File picked for an upload, or the URL of a sound already stored. */
  async function setupTrim(source) {
    destroyTrim();
    const token = {};
    state.trimToken = token;
    trimStatus.textContent = "Chargement de la forme d'onde…";

    try {
      const { WaveSurfer, Regions } = await loadWavesurfer();
      if (state.trimToken !== token) return;

      const regions = Regions.create();
      const ws = WaveSurfer.create({
        container: trimWaveform,
        height: 80,
        waveColor: "#71717a",
        progressColor: "#ec4899",
        cursorColor: "#09090b",
        plugins: [regions],
      });
      state.trim = { ws, region: null };

      ws.on("decode", (duration) => {
        if (state.trimToken !== token) return;
        state.trim.region = regions.addRegion({
          start: 0,
          end: duration,
          color: "rgba(250, 204, 21, 0.35)",
          minLength: 0.1,
        });
        trimPlay.disabled = false;
        trimStatus.textContent = "Déplace ou étire la zone pour garder seulement ce passage.";
        updateTrimRange();
      });
      regions.on("region-update", updateTrimRange);
      ws.on("play", () => (trimPlayLabel.textContent = "Pause"));
      ws.on("pause", () => (trimPlayLabel.textContent = "Écouter l'extrait"));

      await (typeof source === "string" ? ws.load(source) : ws.loadBlob(source));
    } catch (err) {
      if (state.trimToken !== token) return;
      trimStatus.textContent = wavesurferModules
        ? "Ce format ne peut pas être affiché dans le navigateur."
        : "Impossible de charger l'outil de découpe.";
    }
  }

  function setTrimEnabled(enabled) {
    trimToggle.checked = enabled;
    trimPanel.classList.toggle("hidden", !enabled);
    setModalWide(enabled);
    const source = state.mode === "trim" ? "/files/" + encodeURIComponent(state.editingId) + "/audio" : state.pendingUpload;
    if (enabled && source) {
      setupTrim(source);
    } else {
      destroyTrim();
    }
  }

  trimToggle.addEventListener("change", () => setTrimEnabled(trimToggle.checked));
  trimPlay.addEventListener("click", () => {
    if (!state.trim || !state.trim.region) return;
    if (state.trim.ws.isPlaying()) {
      state.trim.ws.pause();
    } else {
      state.trim.region.play(true);
    }
  });

  function setModalFile(file) {
    if (!file.type.startsWith("audio/")) {
      showToast("Seuls les fichiers audio sont acceptés", true);
      return;
    }
    state.pendingUpload = file;
    trimRow.classList.remove("hidden");
    if (trimToggle.checked) setupTrim(file);
    nameFileLabel.textContent = file.name;
    nameFileLabel.classList.remove("text-zinc-500");
    nameFileLabel.classList.add("text-zinc-950");
    nameModalError.textContent = "";
    if (!state.nameTouched || !nameInput.value.trim()) {
      nameInput.value = file.name.replace(/\\.[^/.]+$/, "");
      state.nameTouched = false;
    }
  }

  function openUploadModal(file) {
    state.mode = "upload";
    state.pendingUpload = null;
    state.editingId = null;
    state.nameTouched = false;
    nameModalTitle.textContent = "Ajouter un son";
    nameFileRow.classList.remove("hidden");
    trimRow.classList.add("hidden");
    trimToggleRow.classList.remove("hidden");
    trimWarning.classList.add("hidden");
    setTrimEnabled(false);
    nameFileLabel.textContent = "Aucun fichier sélectionné";
    nameFileLabel.classList.remove("text-zinc-950");
    nameFileLabel.classList.add("text-zinc-500");
    nameInput.value = "";
    nameModalError.textContent = "";
    show(nameModal);
    if (file) setModalFile(file);
    nameInput.focus();
  }

  function openEditModal(id, name) {
    state.mode = "edit";
    state.pendingUpload = null;
    state.editingId = id;
    nameModalTitle.textContent = "Renommer le son";
    nameFileRow.classList.add("hidden");
    trimRow.classList.add("hidden");
    setTrimEnabled(false);
    nameInput.value = name;
    nameModalError.textContent = "";
    show(nameModal);
    nameInput.focus();
    nameInput.select();
  }

  function openTrimModal(id, name) {
    state.mode = "trim";
    state.pendingUpload = null;
    state.editingId = id;
    nameModalTitle.textContent = "Couper « " + name + " »";
    nameFileRow.classList.add("hidden");
    trimRow.classList.remove("hidden");
    // The waveform is the whole point here: no opt-in checkbox.
    trimToggleRow.classList.add("hidden");
    trimWarning.classList.remove("hidden");
    nameInput.value = name;
    nameModalError.textContent = "";
    show(nameModal);
    setTrimEnabled(true);
    nameInput.focus();
    nameInput.select();
  }

  function closeNameModal() {
    hide(nameModal);
    if (state.reloadOnClose) {
      state.reloadOnClose = false;
      reload();
    }
    setTrimEnabled(false);
    state.pendingUpload = null;
    state.editingId = null;
  }

  function closeDeleteModal() {
    hide(deleteModal);
    state.deletingId = null;
  }

  function openYtModal() {
    ytUrl.value = "";
    ytTrim.checked = false;
    ytError.textContent = "";
    ytStatus.textContent = "";
    ytProgressBar.style.width = "0%";
    ytProgress.classList.add("hidden");
    ytConfirm.disabled = false;
    show(ytModal);
    ytUrl.focus();
  }

  function closeYtModal() {
    // Closing is also how a running import is cancelled: the server kills yt-dlp on disconnect.
    if (state.ytController) state.ytController.abort();
    state.ytController = null;
    hide(ytModal);
  }

  document.querySelectorAll('[data-action="upload"]').forEach((btn) => {
    btn.addEventListener("click", () => openUploadModal(null));
  });
  document.querySelectorAll('[data-action="youtube"]').forEach((btn) => {
    btn.addEventListener("click", openYtModal);
  });
  el("refresh-channels").addEventListener("click", reload);

  // Hint only: the server is the one refusing to play in a channel the user isn't in.
  const channelSelect = el("channel-select");
  const channelWarning = el("channel-warning");
  function updateChannelWarning() {
    if (!channelSelect) return;
    const userChannel = channelSelect.dataset.userChannel;
    if (!userChannel) {
      channelWarning.textContent = "Tu n'es connecté à aucun salon vocal. Rejoins-en un sur Discord, puis rafraîchis les salons (↻) pour jouer un son.";
    } else if (channelSelect.value !== userChannel) {
      channelWarning.textContent = "Tu n'es pas dans ce salon : tu ne peux jouer un son que dans le salon vocal où tu es connecté.";
    } else {
      channelWarning.textContent = "";
    }
    channelWarning.classList.toggle("hidden", !channelWarning.textContent);
  }
  if (channelSelect) {
    channelSelect.addEventListener("change", updateChannelWarning);
    updateChannelWarning();
  }
  modalChooseBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) setModalFile(fileInput.files[0]);
    fileInput.value = "";
  });
  nameInput.addEventListener("input", () => {
    state.nameTouched = true;
  });
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") nameConfirm.click();
  });

  // Each modal knows how to close itself: a chain of if/else would silently close the wrong one.
  const modalClosers = new Map([
    [nameModal, closeNameModal],
    [ytModal, closeYtModal],
    [deleteModal, closeDeleteModal],
  ]);
  const anyModalOpen = () => [...modalClosers.keys()].some(isOpen);

  document.querySelectorAll("[data-modal]").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target !== modal) return;
      const close = modalClosers.get(modal);
      if (close) close();
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      modalClosers.forEach((close, modal) => {
        if (isOpen(modal)) close();
      });
      return;
    }
    const typing = e.target instanceof HTMLElement && e.target.matches("input, textarea, select");
    if (e.key === "/" && !typing && !anyModalOpen()) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });

  const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files");
  let dragDepth = 0;

  dropzone.addEventListener("dragenter", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth += 1;
    show(dropOverlay);
  });
  dropzone.addEventListener("dragover", (e) => {
    if (hasFiles(e)) e.preventDefault();
  });
  dropzone.addEventListener("dragleave", (e) => {
    if (!hasFiles(e)) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) hide(dropOverlay);
  });
  dropzone.addEventListener("drop", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth = 0;
    hide(dropOverlay);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      showToast("Seuls les fichiers audio sont acceptés", true);
      return;
    }
    openUploadModal(file);
  });

  window.addEventListener("dragover", (e) => e.preventDefault());
  window.addEventListener("drop", (e) => e.preventDefault());

  document.querySelectorAll('[data-action="play"]').forEach((btn) => {
    const ping = btn.querySelector(".pad-ping");
    let playingTimer = null;

    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        const channelId = channelSelect && channelSelect.value ? channelSelect.value : undefined;
        const res = await fetch("/files/" + btn.dataset.id + "/play", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelId }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || "Échec de la lecture");
        }
        btn.dataset.playing = "true";
        ping.classList.remove("hidden");
        clearTimeout(playingTimer);
        playingTimer = setTimeout(() => {
          btn.dataset.playing = "false";
          ping.classList.add("hidden");
        }, 1500);
        showToast("Lecture de « " + btn.dataset.name + " »");
      } catch (err) {
        showToast(err.message, true);
      } finally {
        btn.disabled = false;
      }
    });
  });

  const stopBtn = el("stop-sound");
  stopBtn.addEventListener("click", async () => {
    stopBtn.disabled = true;
    try {
      const channelId = channelSelect && channelSelect.value ? channelSelect.value : undefined;
      const res = await fetch("/files/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Impossible d'arrêter le son");
      }
      showToast("Son arrêté");
    } catch (err) {
      showToast(err.message, true);
    } finally {
      stopBtn.disabled = false;
    }
  });

  document.querySelectorAll('[data-action="favorite"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        const res = await fetch("/files/" + btn.dataset.id + "/favorite", {
          method: btn.dataset.favorite === "true" ? "DELETE" : "PUT",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || "Impossible de modifier les favoris");
        }
        reload();
      } catch (err) {
        showToast(err.message, true);
        btn.disabled = false;
      }
    });
  });

  document.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener("click", () => openEditModal(btn.dataset.id, btn.dataset.name));
  });

  document.querySelectorAll('[data-action="trim"]').forEach((btn) => {
    btn.addEventListener("click", () => openTrimModal(btn.dataset.id, btn.dataset.name));
  });

  document.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      state.deletingId = btn.dataset.id;
      deleteModalText.textContent = "« " + btn.dataset.name + " » sera supprimé définitivement.";
      show(deleteModal);
      deleteCancel.focus();
    });
  });

  nameCancel.addEventListener("click", closeNameModal);

  nameConfirm.addEventListener("click", async () => {
    const displayName = nameInput.value.trim();
    if (state.mode === "upload" && !state.pendingUpload) {
      nameModalError.textContent = "Choisis un fichier audio.";
      return;
    }
    if (!displayName) {
      nameModalError.textContent = "Le nom ne peut pas être vide.";
      return;
    }

    let trim = null;
    if (state.mode === "trim" || (state.mode === "upload" && trimToggle.checked)) {
      if (!state.trim || !state.trim.region) {
        nameModalError.textContent =
          state.mode === "trim"
            ? "La forme d'onde n'est pas prête."
            : "La forme d'onde n'est pas prête : décoche « Recouper le son » ou attends.";
        return;
      }
      trim = { start: state.trim.region.start, end: state.trim.region.end };
    }

    nameConfirm.disabled = true;
    try {
      if (state.mode === "upload") {
        await uploadFile(state.pendingUpload, displayName, trim);
      } else if (state.mode === "trim") {
        await trimFile(state.editingId, displayName, trim);
      } else {
        await renameFile(state.editingId, displayName);
      }
      state.reloadOnClose = false;
      closeNameModal();
      reload();
    } catch (err) {
      nameModalError.textContent = err.message || "Une erreur est survenue";
    } finally {
      nameConfirm.disabled = false;
    }
  });

  async function uploadFile(file, displayName, trim) {
    const headers = {
      "Content-Type": file.type || "application/octet-stream",
      "X-Filename": encodeURIComponent(file.name),
      "X-Display-Name": encodeURIComponent(displayName),
    };
    if (trim) {
      headers["X-Trim-Start"] = trim.start.toFixed(3);
      headers["X-Trim-End"] = trim.end.toFixed(3);
    }
    const res = await fetch("/files", { method: "POST", headers, body: file });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Échec de l'envoi");
    }
  }

  async function trimFile(id, displayName, trim) {
    const res = await fetch("/files/" + encodeURIComponent(id) + "/trim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start: trim.start, end: trim.end, displayName }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Échec du découpage");
    }
  }

  async function renameFile(id, displayName) {
    const res = await fetch("/files/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Échec du renommage");
    }
  }

  ytCancel.addEventListener("click", closeYtModal);
  ytUrl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") ytConfirm.click();
  });

  function applyYtEvent(event) {
    if (event.phase === "info") {
      ytStatus.textContent = event.title ? "Téléchargement de « " + event.title + " »…" : "Téléchargement…";
    } else if (event.phase === "progress") {
      ytProgressBar.style.width = Math.min(100, Math.max(0, event.percent)) + "%";
      const details = [Math.round(event.percent) + "%"];
      if (event.speed && event.speed.indexOf("Unknown") === -1) details.push(event.speed);
      if (event.eta && event.eta.indexOf("Unknown") === -1 && event.eta !== "N/A") details.push("reste " + event.eta);
      ytStatus.textContent = details.join(" · ");
    }
  }

  ytConfirm.addEventListener("click", async () => {
    const url = ytUrl.value.trim();
    if (!url) {
      ytError.textContent = "Colle le lien d'une vidéo YouTube.";
      return;
    }

    const controller = new AbortController();
    state.ytController = controller;
    ytConfirm.disabled = true;
    ytError.textContent = "";
    ytStatus.textContent = "Récupération de la vidéo…";
    ytProgressBar.style.width = "0%";
    ytProgress.classList.remove("hidden");

    try {
      const res = await fetch("/files/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });
      // A refusal answers with JSON, not with a stream: check before reading the body as events.
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Échec de l'import");
      }
      if (!res.body) throw new Error("Réponse inattendue du serveur");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let imported = null;

      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });

        const blocks = buffer.split("\\n\\n");
        buffer = blocks.pop();
        for (const block of blocks) {
          const line = block.split("\\n").find((candidate) => candidate.indexOf("data:") === 0);
          if (!line) continue;
          const event = JSON.parse(line.slice(5).trim());
          if (event.phase === "error") throw new Error(event.message);
          if (event.phase === "done") {
            imported = event;
            showToast("« " + event.displayName + " » importé");
          } else {
            applyYtEvent(event);
          }
        }
      }

      // A stream that ends without "done" means the download never completed.
      if (!imported) throw new Error("Connexion interrompue pendant le téléchargement.");

      state.ytController = null;
      hide(ytModal);
      if (ytTrim.checked) {
        openTrimModal(imported.id, imported.displayName);
        state.reloadOnClose = true;
      } else {
        reload();
      }
    } catch (err) {
      if (err.name === "AbortError") return; // cancelled from closeYtModal, which closed the modal
      ytError.textContent = err.message || "Une erreur est survenue";
      ytStatus.textContent = "";
      ytProgress.classList.add("hidden");
    } finally {
      ytConfirm.disabled = false;
      if (state.ytController === controller) state.ytController = null;
    }
  });

  deleteCancel.addEventListener("click", closeDeleteModal);

  deleteConfirm.addEventListener("click", async () => {
    if (!state.deletingId) return;
    deleteConfirm.disabled = true;
    try {
      const res = await fetch("/files/" + state.deletingId, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Échec de la suppression");
      }
      hide(deleteModal);
      reload();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      deleteConfirm.disabled = false;
      state.deletingId = null;
    }
  });
})();
`;

export const FilesPage: FC<{
  files: FileRecord[];
  favorites: FileRecord[];
  pagination: Pagination;
  query: string;
  guilds: GuildVoiceInfo[];
  defaultChannelId?: string;
  userChannelId?: string;
  username?: string;
}> = ({ files, favorites, pagination, query, guilds, defaultChannelId, userChannelId, username }) => {
  const favoriteIds = new Set(favorites.map((file) => file.id));
  return (
    <html lang="fr" style="color-scheme: light">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Soundbox</title>
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href={STICKER_FONT_URL} />
        <script src="https://cdn.tailwindcss.com"></script>
        <style dangerouslySetInnerHTML={{ __html: STICKER_CSS }}></style>
      </head>
      <body class={`flex min-h-screen flex-col ${STICKER_BODY}`}>
        <header class="sticky top-0 z-20 border-b-2 border-zinc-950 bg-[#e6ebf1]/90 backdrop-blur">
          <div class="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
            <a
              href="/"
              class="inline-block -rotate-2 border-2 border-zinc-950 bg-yellow-300 px-2 text-2xl font-extrabold tracking-tight shadow-[3px_3px_0_#09090b] transition hover:rotate-0"
            >
              Soundbox!
            </a>

            <div class="order-last flex w-full sm:order-none sm:ml-auto sm:w-auto sm:flex-1 sm:justify-end">
              <ChannelPicker guilds={guilds} defaultChannelId={defaultChannelId} userChannelId={userChannelId} />
              <button
                type="button"
                id="stop-sound"
                class={`${BTN_TOOL} ${VARIANT_INK} ml-2`}
                title="Arrêter le son en cours"
                aria-label="Arrêter le son en cours"
              >
                <StopIcon />
                <span class="hidden sm:inline">Stop</span>
              </button>
            </div>

            <div class="ml-auto flex items-center gap-3 sm:ml-0">
              {username ? <span class="hidden max-w-[10rem] truncate text-sm font-bold text-zinc-600 md:inline">{username}</span> : null}
              <form method="post" action="/auth/logout" class="m-0 flex">
                <button
                  type="submit"
                  class={`${BTN_TOOL} ${VARIANT_SECONDARY}`}
                  title="Déconnexion"
                  aria-label="Déconnexion"
                >
                  <LogoutIcon />
                  <span class="hidden sm:inline">Déconnexion</span>
                </button>
              </form>
            </div>
          </div>
        </header>

        <main class="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
          <div class="mb-5">
            <h1 class="text-3xl font-extrabold tracking-tight">Sons</h1>
            <p class="mt-1 text-sm font-medium text-zinc-600">
              {query
                ? `${pagination.total} résultat${pagination.total > 1 ? "s" : ""} pour « ${query} »`
                : `${pagination.total} son${pagination.total > 1 ? "s" : ""} · clique sur un son pour le jouer`}
            </p>
          </div>

          <p
            id="channel-warning"
            role="status"
            class="mb-5 hidden rounded-xl border-2 border-zinc-950 bg-yellow-200 px-4 py-3 text-sm font-semibold text-zinc-950 shadow-[3px_3px_0_#09090b]"
          ></p>

          <div class="mb-8 flex gap-3">
            <SearchBar query={query} />
            <button
              type="button"
              data-action="upload"
              class={`${BTN_TOOL} ${VARIANT_PRIMARY}`}
              title="Ajouter un son"
              aria-label="Ajouter un son"
            >
              <PlusIcon />
              <span class="hidden sm:inline">Ajouter un son</span>
            </button>
            <button
              type="button"
              data-action="youtube"
              class={`${BTN_TOOL} ${VARIANT_SECONDARY}`}
              title="Importer depuis YouTube"
              aria-label="Importer depuis YouTube"
            >
              <YoutubeIcon />
              <span class="hidden sm:inline">YouTube</span>
            </button>
          </div>

          {favorites.length > 0 ? (
            <section
              class="mb-10 rounded-3xl border-2 border-zinc-950 bg-white p-4 shadow-[6px_6px_0_#09090b] sm:p-5"
              aria-labelledby="favorites-title"
            >
              <h2 id="favorites-title" class="mb-4 flex items-center gap-2 text-xl font-extrabold tracking-tight">
                Favoris
                <span class="rounded-full bg-zinc-950 px-2.5 py-0.5 text-xs font-bold text-white">{favorites.length}</span>
              </h2>
              <ul class={PAD_GRID}>
                {favorites.map((file) => (
                  <SoundPad file={file} favorite />
                ))}
              </ul>
            </section>
          ) : null}

          <section id="dropzone" class="relative flex flex-1 flex-col">
            {files.length === 0 ? (
              <EmptyState query={query} />
            ) : (
              <ul class={PAD_GRID}>
                {files.map((file) => (
                  <SoundPad file={file} favorite={favoriteIds.has(file.id)} />
                ))}
              </ul>
            )}

            <div
              id="drop-overlay"
              class="pointer-events-none absolute -inset-2 z-10 hidden flex-col items-center justify-center gap-2 rounded-3xl border-4 border-dashed border-zinc-950 bg-pink-300/90 text-zinc-950"
            >
              <PlusIcon />
              <span class="text-2xl font-extrabold">Dépose le fichier audio ici</span>
            </div>
            <PaginationBar pagination={pagination} query={query} />
          </section>

          <input type="file" id="file-input" accept="audio/*" class="hidden" />
        </main>

        <Modal id="name-modal" labelledBy="name-modal-title">
          <h2 id="name-modal-title" class="mb-5 text-2xl font-extrabold tracking-tight">
            Ajouter un son
          </h2>

          <div id="name-file-row" class="mb-4">
            <span class="mb-1.5 block text-sm font-bold text-zinc-700">Fichier audio</span>
            <div class="flex items-center gap-3 rounded-xl border-2 border-dashed border-zinc-950 p-2">
              <button type="button" id="modal-choose-btn" class={BTN_SECONDARY_SM}>
                Choisir…
              </button>
              <span id="name-file-label" class="min-w-0 flex-1 truncate text-sm text-zinc-500">
                Aucun fichier sélectionné
              </span>
            </div>
          </div>

          <div id="trim-row" class="mb-4 hidden">
            <div id="trim-toggle-row">
              <label class="flex w-fit cursor-pointer items-center gap-2 text-sm font-semibold text-zinc-800">
                <input type="checkbox" id="trim-toggle" class="h-4 w-4 accent-pink-500" />
                Recouper le son
              </label>
            </div>
            <p id="trim-warning" class="hidden rounded-xl border-2 border-zinc-950 bg-yellow-200 px-3 py-2 text-sm font-semibold text-zinc-950">
              Le son d'origine sera remplacé par le passage sélectionné.
            </p>
            <div id="trim-panel" class="mt-3 hidden">
              <div id="trim-waveform" class="min-h-[80px] rounded-xl border-2 border-zinc-950 bg-zinc-100 px-2"></div>
              <div class="mt-2 flex items-center gap-3">
                <button type="button" id="trim-play" class={BTN_SECONDARY_SM} disabled>
                  <PlayIcon />
                  <span id="trim-play-label">Écouter l'extrait</span>
                </button>
                <span id="trim-range" class="text-sm font-bold tabular-nums text-zinc-700"></span>
              </div>
              <p id="trim-status" class="mt-2 text-sm text-zinc-600"></p>
            </div>
          </div>

          <label for="name-input" class="mb-1.5 block text-sm font-bold text-zinc-700">
            Nom à afficher
          </label>
          <input type="text" id="name-input" maxlength={200} class={`${FIELD} h-10 w-full px-3`} />
          <div id="name-modal-error" class="mt-2 min-h-[1.25rem] text-sm font-semibold text-red-600" role="alert"></div>

          <div class="mt-4 flex justify-end gap-2">
            <button type="button" class={BTN_SECONDARY} id="name-cancel">
              Annuler
            </button>
            <button type="button" class={BTN_PRIMARY} id="name-confirm">
              Valider
            </button>
          </div>
        </Modal>

        <Modal id="yt-modal" labelledBy="yt-modal-title">
          <h2 id="yt-modal-title" class="mb-5 text-2xl font-extrabold tracking-tight">
            Importer depuis YouTube
          </h2>

          <label for="yt-url" class="mb-1.5 block text-sm font-bold text-zinc-700">
            Lien de la vidéo
          </label>
          <input
            type="url"
            id="yt-url"
            placeholder="https://www.youtube.com/watch?v=…"
            maxlength={500}
            class={`${FIELD} h-10 w-full px-3`}
          />

          <div id="yt-progress" class="mt-4 hidden">
            <div class="h-3 w-full overflow-hidden rounded-full border-2 border-zinc-950 bg-zinc-100">
              <div id="yt-progress-bar" class="h-full w-0 bg-pink-400 transition-[width] duration-200"></div>
            </div>
            <p id="yt-status" class="mt-2 truncate text-sm text-zinc-600"></p>
          </div>

          <label class="mt-4 flex w-fit cursor-pointer items-center gap-2 text-sm font-semibold text-zinc-800">
            <input type="checkbox" id="yt-trim" class="h-4 w-4 accent-pink-500" />
            Couper le son après l'import
          </label>

          <div id="yt-error" class="mt-2 min-h-[1.25rem] text-sm font-semibold text-red-600" role="alert"></div>

          <div class="mt-4 flex justify-end gap-2">
            <button type="button" class={BTN_SECONDARY} id="yt-cancel">
              Annuler
            </button>
            <button type="button" class={BTN_PRIMARY} id="yt-confirm">
              <YoutubeIcon />
              Importer
            </button>
          </div>
        </Modal>

        <Modal id="delete-modal" labelledBy="delete-modal-title">
          <h2 id="delete-modal-title" class="mb-2 text-2xl font-extrabold tracking-tight">
            Supprimer ce son ?
          </h2>
          <p id="delete-modal-text" class="mb-6 text-sm text-zinc-600"></p>
          <div class="flex justify-end gap-2">
            <button type="button" class={BTN_SECONDARY} id="delete-cancel">
              Annuler
            </button>
            <button type="button" class={BTN_DANGER} id="delete-confirm">
              <DeleteIcon />
              Supprimer
            </button>
          </div>
        </Modal>

        <div
          id="toast"
          role="status"
          aria-live="polite"
          class="pointer-events-none fixed bottom-5 left-1/2 z-40 max-w-[calc(100%-2rem)] -translate-x-1/2 translate-y-2 truncate rounded-xl border-2 border-zinc-950 bg-white px-4 py-2.5 text-sm font-bold text-zinc-950 opacity-0 shadow-[3px_3px_0_#09090b] transition duration-200"
        ></div>

        <script dangerouslySetInnerHTML={{ __html: CLIENT_SCRIPT }}></script>
      </body>
    </html>
  );
};
