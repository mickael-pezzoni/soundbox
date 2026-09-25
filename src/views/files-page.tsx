import type { Child, FC } from "hono/jsx";
import type { FileRecord, Pagination } from "../routes/files.js";
import { formatChannelLabel, type GuildVoiceInfo } from "../voice/channels.js";

// Buttons are composed from core + size + variant, never by appending overrides: with Tailwind the
// class order in the attribute doesn't decide which of two conflicting utilities wins.
const BTN_CORE =
  "inline-flex flex-shrink-0 items-center justify-center gap-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50";
const SIZE_MD = "h-10 rounded-lg px-4";
const SIZE_SM = "h-9 rounded-lg px-3";
const VARIANT_PRIMARY = "bg-indigo-600 font-medium text-white hover:bg-indigo-500 focus-visible:ring-indigo-400";
const VARIANT_SECONDARY =
  "border border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 focus-visible:ring-indigo-400";
const VARIANT_DANGER = "bg-red-600 font-medium text-white hover:bg-red-500 focus-visible:ring-red-400";

const BTN_PRIMARY = `${BTN_CORE} ${SIZE_MD} ${VARIANT_PRIMARY}`;
const BTN_SECONDARY = `${BTN_CORE} ${SIZE_MD} ${VARIANT_SECONDARY}`;
const BTN_SECONDARY_SM = `${BTN_CORE} ${SIZE_SM} ${VARIANT_SECONDARY}`;
const BTN_DANGER = `${BTN_CORE} ${SIZE_MD} ${VARIANT_DANGER}`;
const BTN_ICON_SM = `${BTN_CORE} h-8 w-8 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 focus-visible:ring-indigo-400`;
const BTN_PAD_ACTION =
  "inline-flex h-8 w-8 items-center justify-center rounded-md bg-zinc-950/80 text-zinc-400 backdrop-blur transition-colors hover:bg-zinc-800 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400";
const FIELD =
  "rounded-lg border border-zinc-800 bg-zinc-900 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

// Full class strings, so the Tailwind CDN sees them in the rendered DOM.
const PAD_TONES = [
  "bg-indigo-500/15 text-indigo-300",
  "bg-emerald-500/15 text-emerald-300",
  "bg-amber-500/15 text-amber-300",
  "bg-rose-500/15 text-rose-300",
  "bg-sky-500/15 text-sky-300",
  "bg-fuchsia-500/15 text-fuchsia-300",
];

function toneFor(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PAD_TONES[hash % PAD_TONES.length];
}

const ICON = "h-4 w-4 flex-shrink-0";

const PlayIcon: FC<{ class?: string }> = (props) => (
  <svg class={props.class ?? ICON} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M6 4.5v11a.75.75 0 0 0 1.14.64l9-5.5a.75.75 0 0 0 0-1.28l-9-5.5A.75.75 0 0 0 6 4.5Z" />
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

const SoundPad: FC<{ file: FileRecord }> = ({ file }) => (
  <li class="group relative">
    <button
      type="button"
      class="flex h-full min-h-[8.5rem] w-full flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left transition hover:-translate-y-0.5 hover:border-zinc-700 hover:bg-zinc-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:translate-y-0 disabled:cursor-wait data-[playing=true]:border-indigo-500 data-[playing=true]:bg-indigo-950/40"
      data-action="play"
      data-id={file.id}
      data-name={file.displayName}
      title={`Jouer « ${file.displayName} »`}
    >
      <span class={`relative flex h-10 w-10 items-center justify-center rounded-full ${toneFor(file.id)}`}>
        <span class="pad-ping absolute inset-0 hidden animate-ping rounded-full bg-current opacity-30"></span>
        <PlayIcon class="ml-0.5 h-4 w-4" />
      </span>
      <span class="line-clamp-2 break-words pr-2 font-medium leading-snug text-zinc-100">{file.displayName}</span>
      <span class="mt-auto flex items-center gap-2 text-xs text-zinc-500" title={file.filename}>
        <span class="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-zinc-400">
          {fileExtension(file.filename)}
        </span>
        {formatDate(file.createdAt)}
      </span>
    </button>
    <div class="absolute right-2 top-2 flex gap-1 transition-opacity [@media(hover:hover)]:opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
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
        class={`${BTN_PAD_ACTION} hover:!bg-red-950 hover:!text-red-300`}
        data-action="delete"
        data-id={file.id}
        data-name={file.displayName}
        aria-label={`Supprimer « ${file.displayName} »`}
        title="Supprimer"
      >
        <DeleteIcon />
      </button>
    </div>
  </li>
);

const ChannelPicker: FC<{ guilds: GuildVoiceInfo[]; defaultChannelId?: string }> = ({
  guilds,
  defaultChannelId,
}) => (
  <div class="flex h-10 min-w-0 flex-1 items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 pl-3 pr-1 sm:max-w-sm">
    <SpeakerIcon class="h-4 w-4 flex-shrink-0 text-zinc-500" />
    {guilds.length === 0 ? (
      <span class="min-w-0 flex-1 truncate px-2 text-sm text-zinc-500">Aucun salon vocal disponible</span>
    ) : (
      <select
        id="channel-select"
        aria-label="Salon vocal"
        class="h-full min-w-0 flex-1 cursor-pointer truncate bg-transparent px-2 text-sm text-zinc-100 focus:outline-none"
      >
        {guilds.map((guild) => (
          <optgroup label={guild.name} class="bg-zinc-900 text-zinc-400">
            {guild.channels.map((channel) => (
              <option value={channel.id} selected={channel.id === defaultChannelId} class="bg-zinc-900 text-zinc-100">
                {formatChannelLabel(channel)}
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
    <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500">
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
      class={`${FIELD} h-10 w-full pl-9 pr-16 [&::-webkit-search-cancel-button]:hidden`}
    />
    {query ? (
      <a
        href="/"
        class="absolute inset-y-0 right-2 my-1.5 flex items-center rounded-md px-2 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
      >
        Effacer
      </a>
    ) : (
      <kbd class="pointer-events-none absolute inset-y-0 right-2 my-2 hidden items-center rounded border border-zinc-700 px-1.5 font-mono text-[10px] text-zinc-500 sm:flex">
        /
      </kbd>
    )}
  </form>
);

const PaginationBar: FC<{ pagination: Pagination; query: string }> = ({ pagination, query }) => {
  if (pagination.totalPages <= 1) return null;

  const linkClass = BTN_SECONDARY_SM;
  const disabledClass = `${BTN_CORE} ${SIZE_SM} border border-transparent text-zinc-600`;

  return (
    <nav class="mt-auto flex pt-6 items-center justify-center gap-2 text-sm text-zinc-400" aria-label="Pagination">
      {pagination.page > 1 ? (
        <a class={linkClass} href={pageHref(pagination.page - 1, query)}>
          ← Précédent
        </a>
      ) : (
        <span class={disabledClass}>← Précédent</span>
      )}
      <span class="px-2 tabular-nums">
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
    <div class="flex min-h-[40vh] flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-zinc-800 p-8 text-center">
      <p class="text-zinc-300">Aucun son ne correspond à « {query} ».</p>
      <a href="/" class={BTN_SECONDARY}>
        Voir tous les sons
      </a>
    </div>
  ) : (
    <div class="flex min-h-[40vh] flex-1 flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-zinc-800 p-8 text-center">
      <span class="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-300">
        <SpeakerIcon class="h-7 w-7" />
      </span>
      <div>
        <p class="font-medium text-zinc-200">Ta soundbox est vide</p>
        <p class="mt-1 text-sm text-zinc-500">Glisse un fichier audio ici, ou ajoute-le avec le bouton.</p>
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
    class="fixed inset-0 z-30 hidden items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
  >
    <div class="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl shadow-black/50">
      {children}
    </div>
  </div>
);

const CLIENT_SCRIPT = `
(() => {
  const state = { mode: "upload", pendingUpload: null, editingId: null, deletingId: null, nameTouched: false };

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

  const toast = el("toast");
  let toastTimer = null;
  function showToast(message, isError) {
    toast.textContent = message;
    toast.classList.toggle("border-red-500/60", Boolean(isError));
    toast.classList.toggle("text-red-300", Boolean(isError));
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

  function setModalFile(file) {
    if (!file.type.startsWith("audio/")) {
      showToast("Seuls les fichiers audio sont acceptés", true);
      return;
    }
    state.pendingUpload = file;
    nameFileLabel.textContent = file.name;
    nameFileLabel.classList.remove("text-zinc-500");
    nameFileLabel.classList.add("text-zinc-100");
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
    nameFileLabel.textContent = "Aucun fichier sélectionné";
    nameFileLabel.classList.remove("text-zinc-100");
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
    nameInput.value = name;
    nameModalError.textContent = "";
    show(nameModal);
    nameInput.focus();
    nameInput.select();
  }

  function closeNameModal() {
    hide(nameModal);
    state.pendingUpload = null;
    state.editingId = null;
  }

  function closeDeleteModal() {
    hide(deleteModal);
    state.deletingId = null;
  }

  document.querySelectorAll('[data-action="upload"]').forEach((btn) => {
    btn.addEventListener("click", () => openUploadModal(null));
  });
  el("refresh-channels").addEventListener("click", reload);
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

  document.querySelectorAll("[data-modal]").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target !== modal) return;
      if (modal === nameModal) closeNameModal();
      else closeDeleteModal();
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (isOpen(nameModal)) closeNameModal();
      if (isOpen(deleteModal)) closeDeleteModal();
      return;
    }
    const typing = e.target instanceof HTMLElement && e.target.matches("input, textarea, select");
    if (e.key === "/" && !typing && !isOpen(nameModal) && !isOpen(deleteModal)) {
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
        const channelSelect = el("channel-select");
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

  document.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener("click", () => openEditModal(btn.dataset.id, btn.dataset.name));
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

    nameConfirm.disabled = true;
    try {
      if (state.mode === "upload") {
        await uploadFile(state.pendingUpload, displayName);
      } else {
        await renameFile(state.editingId, displayName);
      }
      closeNameModal();
      reload();
    } catch (err) {
      nameModalError.textContent = err.message || "Une erreur est survenue";
    } finally {
      nameConfirm.disabled = false;
    }
  });

  async function uploadFile(file, displayName) {
    const res = await fetch("/files", {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-Filename": encodeURIComponent(file.name),
        "X-Display-Name": encodeURIComponent(displayName),
      },
      body: file,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Échec de l'envoi");
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
  pagination: Pagination;
  query: string;
  guilds: GuildVoiceInfo[];
  defaultChannelId?: string;
  username?: string;
}> = ({ files, pagination, query, guilds, defaultChannelId, username }) => (
  <html lang="fr" style="color-scheme: dark">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Soundbox</title>
      <link rel="icon" href="/favicon.ico" />
      <script src="https://cdn.tailwindcss.com"></script>
      <script
        dangerouslySetInnerHTML={{
          __html: `tailwind.config = { darkMode: "class" }; document.documentElement.classList.add("dark");`,
        }}
      ></script>
    </head>
    <body class="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 antialiased">
      <header class="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur">
        <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
          <a href="/" class="flex items-center gap-2.5 font-semibold tracking-tight">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <SpeakerIcon />
            </span>
            Soundbox
          </a>

          <div class="order-last flex w-full sm:order-none sm:ml-auto sm:w-auto sm:flex-1 sm:justify-end">
            <ChannelPicker guilds={guilds} defaultChannelId={defaultChannelId} />
          </div>

          <div class="ml-auto flex items-center gap-1 sm:ml-0">
            {username ? <span class="hidden max-w-[10rem] truncate text-sm text-zinc-400 md:inline">{username}</span> : null}
            <form method="post" action="/auth/logout" class="m-0 flex">
              <button
                type="submit"
                class={`${BTN_CORE} ${VARIANT_SECONDARY} h-10 w-10 rounded-lg sm:w-auto sm:px-3`}
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

      <main class="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
        <div class="mb-5">
          <h1 class="text-2xl font-semibold tracking-tight">Sons</h1>
          <p class="mt-0.5 text-sm text-zinc-500">
            {query
              ? `${pagination.total} résultat${pagination.total > 1 ? "s" : ""} pour « ${query} »`
              : `${pagination.total} son${pagination.total > 1 ? "s" : ""} · clique sur un son pour le jouer`}
          </p>
        </div>

        <div class="mb-6 flex gap-2">
          <SearchBar query={query} />
          <button
            type="button"
            data-action="upload"
            class={`${BTN_CORE} ${VARIANT_PRIMARY} h-10 w-10 rounded-lg sm:w-auto sm:px-4`}
            title="Ajouter un son"
            aria-label="Ajouter un son"
          >
            <PlusIcon />
            <span class="hidden sm:inline">Ajouter un son</span>
          </button>
        </div>

        <section id="dropzone" class="relative flex flex-1 flex-col">
          {files.length === 0 ? (
            <EmptyState query={query} />
          ) : (
            <ul class="grid content-start grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {files.map((file) => (
                <SoundPad file={file} />
              ))}
            </ul>
          )}

          <div
            id="drop-overlay"
            class="pointer-events-none absolute -inset-2 z-10 hidden flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-500 bg-indigo-950/85 text-indigo-200"
          >
            <PlusIcon />
            <span class="text-lg font-medium">Dépose le fichier audio ici</span>
          </div>
          <PaginationBar pagination={pagination} query={query} />
        </section>

        <input type="file" id="file-input" accept="audio/*" class="hidden" />
      </main>

      <Modal id="name-modal" labelledBy="name-modal-title">
        <h2 id="name-modal-title" class="mb-5 text-lg font-semibold">
          Ajouter un son
        </h2>

        <div id="name-file-row" class="mb-4">
          <span class="mb-1.5 block text-sm text-zinc-400">Fichier audio</span>
          <div class="flex items-center gap-3 rounded-lg border border-dashed border-zinc-700 p-2">
            <button type="button" id="modal-choose-btn" class={BTN_SECONDARY_SM}>
              Choisir…
            </button>
            <span id="name-file-label" class="min-w-0 flex-1 truncate text-sm text-zinc-500">
              Aucun fichier sélectionné
            </span>
          </div>
        </div>

        <label for="name-input" class="mb-1.5 block text-sm text-zinc-400">
          Nom à afficher
        </label>
        <input type="text" id="name-input" maxlength={200} class={`${FIELD} h-10 w-full px-3`} />
        <div id="name-modal-error" class="mt-2 min-h-[1.25rem] text-sm text-red-400" role="alert"></div>

        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class={BTN_SECONDARY} id="name-cancel">
            Annuler
          </button>
          <button type="button" class={BTN_PRIMARY} id="name-confirm">
            Valider
          </button>
        </div>
      </Modal>

      <Modal id="delete-modal" labelledBy="delete-modal-title">
        <h2 id="delete-modal-title" class="mb-2 text-lg font-semibold">
          Supprimer ce son ?
        </h2>
        <p id="delete-modal-text" class="mb-6 text-sm text-zinc-400"></p>
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
        class="pointer-events-none fixed bottom-5 left-1/2 z-40 max-w-[calc(100%-2rem)] -translate-x-1/2 translate-y-2 truncate rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 opacity-0 shadow-lg shadow-black/40 transition duration-200"
      ></div>

      <script dangerouslySetInnerHTML={{ __html: CLIENT_SCRIPT }}></script>
    </body>
  </html>
);
