// public/admin.js (PULITO)
// Password admin: del2025bus
// Tratte: localStorage
// Locandine: Firebase (via window.LocandineStore)
// Prenotazioni: Firestore (bookings)

import { listBookings } from "./bookings-store.js";

const ADMIN_PASSWORD = "del2025bus";
const ROUTES_KEY = "delgrosso_routes_v1";

// DOM
const adminBtn = document.getElementById("adminBtn");
const adminModal = document.getElementById("adminModal");
const closeAdmin = document.getElementById("closeAdmin");

const loggedOut = document.getElementById("adminLoggedOut");
const loggedIn = document.getElementById("adminLoggedIn");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

// tratte
const routeName = document.getElementById("routeName");
const routePartenza = document.getElementById("routePartenza");
const addRouteBtn = document.getElementById("addRouteBtn");
const routesList = document.getElementById("routesList");

// prenotazioni
const bookingsBody = document.getElementById("bookingsTableBody");
const exportCsvBtn = document.getElementById("exportCsvBtn");

// locandine
const locTitle = document.getElementById("locTitle");
const locViaggio = document.getElementById("locViaggio");
const locData = document.getElementById("locData");
const locPartenza = document.getElementById("locPartenza");
const locBusType = document.getElementById("locBusType");
const locFile = document.getElementById("locFile");
const uploadLoc = document.getElementById("uploadLoc");
const adminLocandineList = document.getElementById("adminLocandineList");

let isAdmin = localStorage.getItem("isAdmin") === "true";

// helpers
function loadRoutes(){ try { return JSON.parse(localStorage.getItem(ROUTES_KEY) || "[]"); } catch { return []; } }
function saveRoutes(list){ localStorage.setItem(ROUTES_KEY, JSON.stringify(list)); }

function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// modal
adminBtn?.addEventListener("click", () => { adminModal.classList.remove("hidden"); updateUI(); });
closeAdmin?.addEventListener("click", () => adminModal.classList.add("hidden"));
adminModal?.addEventListener("click", (e) => { if (e.target === adminModal) adminModal.classList.add("hidden"); });

// login/logout
loginBtn?.addEventListener("click", async () => {
  const pass = document.getElementById("adminPass")?.value || "";
  if (pass === ADMIN_PASSWORD) {
    isAdmin = true;
    localStorage.setItem("isAdmin", "true");
    await updateUI();
    alert("Admin attivo ✅");
  } else {
    alert("Password errata ❌");
  }
});

logoutBtn?.addEventListener("click", async () => {
  isAdmin = false;
  localStorage.removeItem("isAdmin");
  await updateUI();
  alert("Uscito");
});

// UI
async function updateUI() {
  if (!isAdmin) {
    loggedIn.classList.add("hidden");
    loggedOut.classList.remove("hidden");
    return;
  }

  loggedOut.classList.add("hidden");
  loggedIn.classList.remove("hidden");

  renderRoutes();
  await renderBookings();
  await renderAdminLocandine();
}

// tratte
function renderRoutes(){
  const routes = loadRoutes();
  if (!routesList) return;

  if (!routes.length) {
    routesList.innerHTML = "<em>Nessuna tratta.</em>";
    return;
  }

  routesList.innerHTML = routes.map((r, i) => `
    <div class="routeRow">
      <strong>${escapeHTML(r.name)}</strong>
      <span style="opacity:.75">${escapeHTML(r.partenza)}</span>
      <button type="button" data-del="${i}">Elimina</button>
    </div>
  `).join("");

  routesList.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.del);
      const list = loadRoutes();
      list.splice(idx, 1);
      saveRoutes(list);
      renderRoutes();
      window.dispatchEvent(new CustomEvent("routesUpdated"));
    });
  });
}

addRouteBtn?.addEventListener("click", () => {
  if (!isAdmin) return;

  const name = routeName.value.trim();
  const partenza = routePartenza.value.trim();
  if (!name || !partenza) return alert("Compila Nome viaggio e Partenza.");

  const routes = loadRoutes();
  routes.push({ name, partenza });
  saveRoutes(routes);

  routeName.value = "";
  routePartenza.value = "";
  renderRoutes();
  window.dispatchEvent(new CustomEvent("routesUpdated"));
});

// prenotazioni (Firestore)
async function renderBookings(){
  if (!bookingsBody) return;

  const list = await listBookings(500);

  if (!list.length) {
    bookingsBody.innerHTML = `<tr><td colspan="7"><em>Nessuna prenotazione.</em></td></tr>`;
    return;
  }

  bookingsBody.innerHTML = list.map(b => `
    <tr>
      <td>${escapeHTML(b.data || "")}</td>
      <td>${escapeHTML(b.viaggio || "")}</td>
      <td>${escapeHTML(b.busType || "")}</td>
      <td>${escapeHTML(`${b.nome || ""} ${b.cognome || ""}`)}</td>
      <td>${escapeHTML(b.telefono || "")}</td>
      <td>${escapeHTML((b.seats || []).join(", "))}</td>
      <td>${escapeHTML(b.partenza || "")}</td>
    </tr>
  `).join("");
}

exportCsvBtn?.addEventListener("click", async () => {
  if (!isAdmin) return;

  const list = await listBookings(2000);
  const rows = [
    ["Data","Viaggio","Bus","Nome","Cognome","Telefono","Posti","Partenza"].join(";"),
    ...list.map(b => [
      b.data||"", b.viaggio||"", b.busType||"",
      b.nome||"", b.cognome||"", b.telefono||"",
      (b.seats||[]).join(","), b.partenza||""
    ].join(";"))
  ];

  const blob = new Blob([rows.join("\n")], { type:"text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "prenotazioni.csv";
  a.click();
  URL.revokeObjectURL(url);
});

// locandine
function resetLocForm(){
  locTitle.value = "";
  locViaggio.value = "";
  locData.value = "";
  locPartenza.value = "";
  locBusType.value = "";
  locFile.value = "";
  delete uploadLoc.dataset.editingId;
  uploadLoc.textContent = "Carica locandina";
}

async function renderAdminLocandine(){
  if (!adminLocandineList) return;
  if (!window.LocandineStore) { adminLocandineList.innerHTML = "<em>LocandineStore non disponibile.</em>"; return; }

  const list = await window.LocandineStore.getAll();
  if (!list.length) { adminLocandineList.innerHTML = "<em>Nessuna locandina.</em>"; return; }

  adminLocandineList.innerHTML = list.map(item => `
    <div class="routeRow">
      <strong>${escapeHTML(item.title || "(senza titolo)")}</strong>
      <span style="opacity:.75">${escapeHTML(item.data || "")}</span>
      <button type="button" data-editloc="${item.id}">Modifica</button>
      <button type="button" data-delloc="${item.id}">Elimina</button>
    </div>
  `).join("");

  adminLocandineList.querySelectorAll("[data-editloc]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.editloc;
      const it = list.find(x => x.id === id);
      if (!it) return;

      locTitle.value = it.title || "";
      locViaggio.value = it.viaggio || "";
      locData.value = it.data || "";
      locPartenza.value = it.partenza || "";
      locBusType.value = it.busType || "";

      uploadLoc.dataset.editingId = id;
      uploadLoc.textContent = "Salva modifiche";
      alert("Modifica i campi e premi 'Salva modifiche' ✅");
    });
  });

  adminLocandineList.querySelectorAll("[data-delloc]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.delloc;
      if (!confirm("Eliminare questa locandina?")) return;
      await window.LocandineStore.remove(id);
      resetLocForm();
      await renderAdminLocandine();
    });
  });
}

uploadLoc?.addEventListener("click", async () => {
  if (!isAdmin) return alert("Devi essere admin.");
  if (!window.LocandineStore) return alert("LocandineStore non disponibile.");

  const title = locTitle.value.trim();
  const viaggio = locViaggio.value.trim();
  const data = locData.value.trim();
  const partenza = locPartenza.value.trim();
  const busType = locBusType.value.trim();
  const file = locFile.files?.[0] || null;

  if (!title) return alert("Titolo obbligatorio.");

  const editingId = uploadLoc.dataset.editingId || "";

  try {
    if (editingId) {
      const patch = { title, viaggio, data, partenza, busType };
      await window.LocandineStore.update(editingId, patch, file);
      resetLocForm();
      await renderAdminLocandine();
      alert("Locandina modificata ✅");
      return;
    }

    if (!file) return alert("Per una nuova locandina serve anche l’immagine.");
    await window.LocandineStore.add({ title, viaggio, data, partenza, busType, file });

    resetLocForm();
    await renderAdminLocandine();
    alert("Locandina salvata ✅");
  } catch (e) {
    console.error(e);
    alert("Errore locandina: " + (e?.message || e));
  }
});

window.addEventListener("locandineUpdated", async () => {
  if (isAdmin) await renderAdminLocandine();
});

document.addEventListener("DOMContentLoaded", updateUI);
