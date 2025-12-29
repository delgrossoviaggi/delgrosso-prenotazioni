import { db, storage } from "./firebase.js";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
  query, orderBy, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const postersCol = collection(db, "posters");

// UI
const grid = document.getElementById("locandineGrid");

// modal
const posterModal = document.getElementById("posterModal");
const posterImg = document.getElementById("posterImg");
const posterTitle = document.getElementById("posterTitle");
const posterInfo = document.getElementById("posterInfo");
const posterUseBtn = document.getElementById("posterUseBtn");
const posterCloseBtn = document.getElementById("posterCloseBtn");

let currentPoster = null;

function setParam(params, key, val) {
  if (val && String(val).trim() !== "") params.set(key, String(val).trim());
  else params.delete(key);
}

function renderEmpty(msg = "Nessuna locandina disponibile.") {
  if (!grid) return;
  grid.innerHTML = `<div style="font-size:12px;opacity:.7">${msg}</div>`;
}

function openPoster(item) {
  currentPoster = item;
  posterTitle.textContent = item.title || "";
  posterImg.src = item.imageUrl || "";
  posterInfo.textContent = [
    item.viaggio ? `Viaggio: ${item.viaggio}` : "",
    item.data ? `Data: ${item.data}` : "",
    item.partenza ? `Partenza: ${item.partenza}` : "",
    item.busType ? `Bus: ${item.busType}` : ""
  ].filter(Boolean).join(" • ");

  posterModal.classList.remove("hidden");
}

function closePoster() {
  posterModal.classList.add("hidden");
  currentPoster = null;
}

posterCloseBtn?.addEventListener("click", closePoster);
posterModal?.addEventListener("click", (e) => { if (e.target === posterModal) closePoster(); });

posterUseBtn?.addEventListener("click", () => {
  if (!currentPoster) return;

  const viaggioEl = document.getElementById("viaggio");
  const dataEl = document.getElementById("dataViaggio");
  const partenzaEl = document.getElementById("partenza");
  const busEl = document.getElementById("busType");

  if (viaggioEl && currentPoster.viaggio) {
    const exists = Array.from(viaggioEl.options).some(o => o.value === currentPoster.viaggio);
    if (!exists) {
      const opt = document.createElement("option");
      opt.value = currentPoster.viaggio;
      opt.textContent = currentPoster.viaggio;
      viaggioEl.appendChild(opt);
    }
    viaggioEl.value = currentPoster.viaggio;
  }
  if (dataEl && currentPoster.data) dataEl.value = currentPoster.data;
  if (partenzaEl && currentPoster.partenza) partenzaEl.value = currentPoster.partenza;

  if (busEl && currentPoster.busType) {
    busEl.value = currentPoster.busType;
    busEl.disabled = true;
  }

  const params = new URLSearchParams(window.location.search);
  setParam(params, "viaggio", currentPoster.viaggio);
  setParam(params, "data", currentPoster.data);
  setParam(params, "partenza", currentPoster.partenza);
  setParam(params, "bus", currentPoster.busType);
  window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);

  window.dispatchEvent(new CustomEvent("tripChangedFromLocandina", { detail: currentPoster }));
  closePoster();
  document.getElementById("bookingForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

function renderLocandine(list) {
  if (!grid) return;
  grid.innerHTML = "";
  if (!list.length) return renderEmpty();

  list.forEach(item => {
    const card = document.createElement("div");
    card.className = "locandina";
    card.innerHTML = `
      <img src="${item.imageUrl}" alt="${item.title}">
      <div class="cap">${item.title || ""}</div>
    `;
    card.addEventListener("click", () => openPoster(item));
    grid.appendChild(card);
  });
}

async function fetchPosters() {
  const q = query(postersCol, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

window.LocandineStore = {
  async getAll() {
    const list = await fetchPosters();
    renderLocandine(list);
    return list;
  },

  async add({ title, viaggio, data, partenza, busType, file }) {
    const path = `posters/${Date.now()}-${file.name}`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    const imageUrl = await getDownloadURL(fileRef);

    await addDoc(postersCol, {
      title: title || "",
      viaggio: viaggio || "",
      data: data || "",
      partenza: partenza || "",
      busType: busType || "",
      imageUrl,
      storagePath: path,
      createdAt: serverTimestamp()
    });

    window.dispatchEvent(new CustomEvent("locandineUpdated"));
  },

  async update(id, patch, newFile) {
    const dref = doc(db, "posters", id);

    if (newFile) {
      const snap = await getDoc(dref);
      const old = snap.data();

      const path = `posters/${Date.now()}-${newFile.name}`;
      const fileRef = ref(storage, path);
      await uploadBytes(fileRef, newFile);
      const imageUrl = await getDownloadURL(fileRef);

      patch.imageUrl = imageUrl;
      patch.storagePath = path;

      if (old?.storagePath) {
        try { await deleteObject(ref(storage, old.storagePath)); } catch {}
      }
    }

    await updateDoc(dref, patch);
    window.dispatchEvent(new CustomEvent("locandineUpdated"));
  },

  async remove(id) {
    const dref = doc(db, "posters", id);
    const snap = await getDoc(dref);
    const data = snap.data();

    if (data?.storagePath) {
      try { await deleteObject(ref(storage, data.storagePath)); } catch {}
    }

    await deleteDoc(dref);
    window.dispatchEvent(new CustomEvent("locandineUpdated"));
  }
};

window.addEventListener("locandineUpdated", async () => {
  try { await window.LocandineStore.getAll(); }
  catch (e) { console.error(e); }
});

document.addEventListener("DOMContentLoaded", async () => {
  try {
    renderEmpty("Caricamento locandine…");
    await window.LocandineStore.getAll();
  } catch (e) {
    console.error("Errore locandine:", e);
    renderEmpty("ERRORE caricamento locandine (controlla Storage/Rules).");
  }
});
