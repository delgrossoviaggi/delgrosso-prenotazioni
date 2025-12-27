const LS_KEY = "delgrosso_locandine_v1";

function loadLocandine() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { return []; }
}
function saveLocandine(list) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}
function setParam(params, key, val) {
  if (val && String(val).trim() !== "") params.set(key, String(val).trim());
  else params.delete(key);
}

/* FULLSCREEN POSTER MODAL */
const posterModal = document.getElementById("posterModal");
const posterImg = document.getElementById("posterImg");
const posterTitle = document.getElementById("posterTitle");
const posterInfo = document.getElementById("posterInfo");
const posterUseBtn = document.getElementById("posterUseBtn");
const posterCloseBtn = document.getElementById("posterCloseBtn");

let currentPoster = null;

function openPoster(item){
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
  posterModal.setAttribute("aria-hidden", "false");
}

function closePoster(){
  posterModal.classList.add("hidden");
  posterModal.setAttribute("aria-hidden", "true");
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

  if (viaggioEl && currentPoster.viaggio) viaggioEl.value = currentPoster.viaggio;
  if (dataEl && currentPoster.data) dataEl.value = currentPoster.data;
  if (partenzaEl && currentPoster.partenza) partenzaEl.value = currentPoster.partenza;
  if (busEl && currentPoster.busType) busEl.value = currentPoster.busType;

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

/* RENDER locandine */
export function renderLocandine(list = []) {
  const grid = document.getElementById("locandineGrid");
  if (!grid) return;

  grid.innerHTML = "";

  if (!list.length) {
    const msg = document.createElement("div");
    msg.style.fontSize = "12px";
    msg.style.opacity = "0.7";
    msg.textContent = "Nessuna locandina. Entra in Admin per aggiungerne 📌";
    grid.appendChild(msg);
    return;
  }

  list.forEach(item => {
    const card = document.createElement("div");
    card.className = "locandina";
    card.innerHTML = `
      <img src="${item.imageUrl}" alt="${item.title}">
      <div class="cap">${item.title}</div>
    `;
    card.addEventListener("click", () => openPoster(item));
    grid.appendChild(card);
  });
}

/* Store globale (Admin) */
window.LocandineStore = {
  getAll() {
    return loadLocandine().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },
  add(item) {
    const list = loadLocandine();
    list.push(item);
    saveLocandine(list);
    renderLocandine(this.getAll());
    window.dispatchEvent(new CustomEvent("locandineUpdated"));
  },
  update(id, patch) {
    const list = loadLocandine();
    const i = list.findIndex(x => x.id === id);
    if (i < 0) return false;
    list[i] = { ...list[i], ...patch, updatedAt: Date.now() };
    saveLocandine(list);
    renderLocandine(this.getAll());
    window.dispatchEvent(new CustomEvent("locandineUpdated"));
    return true;
  },
  remove(id) {
    const list = loadLocandine().filter(x => x.id !== id);
    saveLocandine(list);
    renderLocandine(this.getAll());
    window.dispatchEvent(new CustomEvent("locandineUpdated"));
  }
};

document.addEventListener("DOMContentLoaded", () => {
  renderLocandine(window.LocandineStore.getAll());
});
