import type { FC } from "hono/jsx";
import type { FileRecord, Pagination } from "../routes/files.js";
import { formatChannelLabel, type GuildVoiceInfo } from "../voice/channels.js";

const BTN_PRIMARY =
  "rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50";
const BTN_SECONDARY =
  "inline-block rounded-lg border border-gray-800 bg-gray-800 px-4 py-2 text-gray-100 transition-colors hover:bg-gray-700";
const BTN_ICON =
  "rounded-lg border border-gray-800 px-2.5 py-1.5 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-100";

function formatDate(iso: string): string {
  const date = new Date(`${iso.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

const FileRow: FC<{ file: FileRecord }> = ({ file }) => (
  <div class="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-800/40">
    <div class="min-w-0 flex-1">
      <div class="truncate font-semibold">{file.displayName}</div>
      <div class="truncate text-xs text-gray-400">
        {file.filename} · {formatDate(file.createdAt)}
      </div>
    </div>
    <div class="flex flex-shrink-0 gap-1.5">
      <button
        type="button"
        class="rounded-lg border border-indigo-800 bg-indigo-950 px-2.5 py-1.5 text-sm text-indigo-300 transition-colors hover:bg-indigo-900"
        data-action="play"
        data-id={file.id}
        data-name={file.displayName}
      >
        ▶ Lire
      </button>
      <button type="button" class={BTN_ICON} data-action="edit" data-id={file.id} data-name={file.displayName}>
        Renommer
      </button>
      <button type="button" class={BTN_ICON} data-action="delete" data-id={file.id} data-name={file.displayName}>
        Supprimer
      </button>
    </div>
  </div>
);

const PaginationBar: FC<{ pagination: Pagination }> = ({ pagination }) => {
  const linkClass =
    "rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-gray-100 transition-colors hover:bg-gray-800";
  const disabledClass = "rounded-lg border border-gray-800 px-3 py-1.5 text-gray-600 opacity-50";

  return (
    <div class="flex items-center justify-between gap-3 border-t border-gray-800 px-4 py-3 text-sm text-gray-400">
      <span>
        {pagination.total} fichier{pagination.total > 1 ? "s" : ""}
      </span>
      <div class="flex items-center gap-3">
        {pagination.page > 1 ? (
          <a class={linkClass} href={`/?page=${pagination.page - 1}`}>
            Précédent
          </a>
        ) : (
          <span class={disabledClass}>Précédent</span>
        )}
        <span>
          Page {pagination.page} / {pagination.totalPages}
        </span>
        {pagination.page < pagination.totalPages ? (
          <a class={linkClass} href={`/?page=${pagination.page + 1}`}>
            Suivant
          </a>
        ) : (
          <span class={disabledClass}>Suivant</span>
        )}
      </div>
    </div>
  );
};

const ChannelSelect: FC<{ guilds: GuildVoiceInfo[]; defaultChannelId?: string }> = ({
  guilds,
  defaultChannelId,
}) => {
  if (guilds.length === 0) {
    return <p class="text-sm text-gray-500">Aucun salon vocal disponible (bot non connecté ou absent des serveurs).</p>;
  }

  return (
    <div class="flex items-center gap-2">
      <label for="channel-select" class="text-sm text-gray-400">
        Salon vocal
      </label>
      <select
        id="channel-select"
        class="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-gray-100 focus:border-indigo-500 focus:outline-none"
      >
        {guilds.map((guild) => (
          <optgroup label={guild.name}>
            {guild.channels.map((channel) => (
              <option value={channel.id} selected={channel.id === defaultChannelId}>
                {formatChannelLabel(channel)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
};

const CLIENT_SCRIPT = `
(() => {
  const state = { mode: "upload", pendingUpload: null, editingId: null, deletingId: null, nameTouched: false };

  const el = (id) => document.getElementById(id);
  const dropzone = el("dropzone");
  const dropOverlay = el("drop-overlay");
  const fileInput = el("file-input");
  const uploadBtn = el("upload-btn");

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
    toast.classList.toggle("border-red-500", Boolean(isError));
    toast.classList.toggle("text-red-400", Boolean(isError));
    toast.classList.remove("opacity-0");
    toast.classList.add("opacity-100");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("opacity-100");
      toast.classList.add("opacity-0");
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
    nameFileLabel.classList.remove("text-gray-500");
    nameFileLabel.classList.add("text-gray-100");
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
    nameModalTitle.textContent = "Ajouter un fichier";
    nameFileRow.classList.remove("hidden");
    nameFileLabel.textContent = "Aucun fichier sélectionné";
    nameFileLabel.classList.remove("text-gray-100");
    nameFileLabel.classList.add("text-gray-500");
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
    nameModalTitle.textContent = "Renommer le fichier";
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

  uploadBtn.addEventListener("click", () => openUploadModal(null));
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
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        const channelSelect = document.getElementById("channel-select");
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
        showToast("Lecture de « " + btn.dataset.name + " » en cours");
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
      deleteModalText.textContent = "Supprimer « " + btn.dataset.name + " » ? Cette action est irréversible.";
      show(deleteModal);
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

  deleteCancel.addEventListener("click", () => {
    hide(deleteModal);
    state.deletingId = null;
  });

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
  guilds: GuildVoiceInfo[];
  defaultChannelId?: string;
}> = ({ files, pagination, guilds, defaultChannelId }) => (
  <html lang="fr">
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
    <body class="flex min-h-screen flex-col bg-gray-950 text-gray-100">
      <main class="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 py-6">
        <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 class="text-2xl font-semibold">Fichiers audio</h1>
          <div class="flex flex-wrap items-center gap-3">
            <ChannelSelect guilds={guilds} defaultChannelId={defaultChannelId} />
            <button type="button" id="upload-btn" class={BTN_PRIMARY}>
              + Uploader un fichier
            </button>
          </div>
        </header>

        <section
          id="dropzone"
          class="relative flex min-h-[70vh] flex-1 flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-900"
        >
          <div class="flex-1 divide-y divide-gray-800">
            {files.length === 0 ? (
              <div class="flex h-full min-h-[50vh] flex-col items-center justify-center gap-1 text-center text-gray-400">
                <p>Aucun fichier pour le moment.</p>
                <p class="text-sm text-gray-500">Glissez-déposez un fichier audio ici pour l'ajouter.</p>
              </div>
            ) : (
              files.map((file) => <FileRow file={file} />)
            )}
          </div>

          <PaginationBar pagination={pagination} />

          <div
            id="drop-overlay"
            class="pointer-events-none absolute inset-0 hidden items-center justify-center border-2 border-dashed border-indigo-500 bg-indigo-950/80 text-lg font-medium text-indigo-200"
          >
            Déposez le fichier audio ici
          </div>
        </section>

        <input type="file" id="file-input" accept="audio/*" class="hidden" />
      </main>

      <div id="name-modal" class="fixed inset-0 z-10 hidden items-center justify-center bg-black/60 p-5">
        <div class="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 id="name-modal-title" class="mb-4 text-lg font-semibold">
            Ajouter un fichier
          </h2>

          <div id="name-file-row" class="mb-4">
            <span class="mb-1.5 block text-sm text-gray-400">Fichier audio</span>
            <div class="flex items-center gap-3">
              <button type="button" id="modal-choose-btn" class={BTN_SECONDARY}>
                Choisir…
              </button>
              <span id="name-file-label" class="min-w-0 flex-1 truncate text-sm text-gray-500">
                Aucun fichier sélectionné
              </span>
            </div>
          </div>

          <label for="name-input" class="mb-1.5 block text-sm text-gray-400">
            Nom à afficher
          </label>
          <input
            type="text"
            id="name-input"
            maxlength={200}
            class="mb-4 w-full rounded-lg border border-gray-800 bg-gray-800 px-3 py-2.5 text-gray-100 focus:border-indigo-500 focus:outline-none"
          />
          <div id="name-modal-error" class="-mt-2 mb-3 min-h-[1em] text-sm text-red-400"></div>
          <div class="flex justify-end gap-2">
            <button type="button" class={BTN_SECONDARY} id="name-cancel">
              Annuler
            </button>
            <button type="button" class={BTN_PRIMARY} id="name-confirm">
              Valider
            </button>
          </div>
        </div>
      </div>

      <div id="delete-modal" class="fixed inset-0 z-10 hidden items-center justify-center bg-black/60 p-5">
        <div class="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 class="mb-4 text-lg font-semibold">Supprimer le fichier</h2>
          <p id="delete-modal-text" class="mb-4 text-gray-400"></p>
          <div class="flex justify-end gap-2">
            <button type="button" class={BTN_SECONDARY} id="delete-cancel">
              Annuler
            </button>
            <button
              type="button"
              class="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              id="delete-confirm"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>

      <div
        id="toast"
        class="pointer-events-none fixed bottom-5 left-1/2 -translate-x-1/2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm opacity-0 transition-opacity"
      ></div>

      <script dangerouslySetInnerHTML={{ __html: CLIENT_SCRIPT }}></script>
    </body>
  </html>
);
