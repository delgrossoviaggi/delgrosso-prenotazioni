// public/admin.js
// ADMIN — versione pulita e aggiornata
// Password: del2025bus
// Locandine: Firebase (Firestore + Storage)
// Tratte & Prenotazioni: localStorage (per ora)

// ================== CONFIG ==================
const ADMIN_PASSWORD = "del2025bus";

const ROUTES_KEY = "delgrosso_routes_v1";
const BOOKINGS_KEY = "delgrosso_bookings_v1";

// ================== DOM ==================
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
const clearBookingsBtn = document.getElementById("clearBookingsBtn");

// locandine (admin)
const locTitle = document.getElementById("locTitle");
const locViaggio = document.getElementById("locViaggio");
const locData = document.getElementById("locData");
const locPartenza = document.getElementById("locPartenza");
const locBusType = document.getElementById("locBusType");
const locFile = document.getElementById("locFile");
const uploadLoc = document.getElementById("uploadLoc");
const adminLocandineList = document.getElementById("adminLocandineList");

// stato
let isAdmin = localStorage.getItem("isAdmin") === "true";

// ================== HELPERS ==================
function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}
function saveJSON(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}
function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ================== MODAL ==================
function openAdmin() {
  adminModal.classList.remove("hidden");
  updateUI();
}
function closeAdminModal() {
  adminModal.classList.add("hidden");
}

adminBtn?.addEventListener("click", openAdmin);
closeAdmin?.addEventListener("click", closeAdminModal);
adminModal?.addEventListener("click", e => {
  if (e.target === adminModal) closeAdminModal();
});

// ================== LOGIN ==================
loginBtn?.addEventListener("click", async () => {
  const pass = document.getElementById("adminPass")?.value || "";
  if (pass === ADMIN_PASSWORD) {
    isAdmin = true;
    localStorage.setItem("isAdmin", "true");
    await updateUI();
    alert("Accesso admin riuscito ✅");
  } else {
    alert("Password errata ❌");
  }
});

logoutBtn?.addEventListener("click", async () => {
  isAdmin = false;
  localStorage.removeItem("isAdmin");
  await updateUI();
  alert("Uscito dalla modalità admin");
});

// ================== UI ==================
async function updateUI() {
  if (isAdmin) {
    loggedOut.classList.add("hidden");
    loggedIn.classList.remove("hidden");
    renderRoutes();
    renderBookings();
    await renderAdminLocandine();
  } else {
    loggedIn.classList.add("hidden");
    loggedOut.classList.remove("hidden");
  }
}

// ================== TRATTE ==================
function renderRoutes() {
  const routes = loadJSON(ROUTES_KEY, []);
  if (!routesList) return;

  if (!routes.length) {
    routesList.innerHTML = "<em>Nessuna tratta.</em>";
    return;
  }

  routesList.innerHTML = routes.map((r, i) => `
    <div class="routeRow">
      <strong>${escapeHTML(r.name)}</strong>
      <span>${escapeHTML(r.partenza)}</span>
      <button data-del="${i}">Elimina</button>
    </div>
  `).join("");

  routesList.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.del);
      routes.splice(idx, 1);
      saveJSON(ROUTES_KEY, routes);
      renderRoutes();
      window.dispatchEvent(new CustomEvent("routesUpdated"));
    });
  });
}

addRouteBtn?.addEventListener("click", () => {
  if (!isAdmin) return;

  const name = routeName.value.trim();
  const partenza = routePartenza.value.trim();
  if (!name || !partenza) return alert("Compila tutti i campi");

  const routes = loadJSON(ROUTES_KEY, []);
  routes.push({ name, partenza });
  saveJSON(ROUTES_KEY, routes);

  routeName.value = "";
  routePartenza.value = "";
  renderRoutes();
  window.dispatchEvent(new CustomEvent("routesUpdated"));
});

// ================== PRENOTAZIONI ==================
function renderBookings() {
  if (!bookingsBody) return;
  const list = loadJSON(BOOKINGS_KEY, []);

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
      <td>${escapeHTML((b.seats || []).join(","))}</td>
      <td>${escapeHTML(b.partenza || "")}</td>
    </tr>
  `).join("");
}

exportCsvBtn?.addEventListener("click", () => {
  if (!isAdmin) return;
  const list = loadJSON(BOOKINGS_KEY, []);
  const rows = [
    ["Data","Viaggio","Bus","Nome","Cognome","Telefono","Posti","Partenza"].join(";"),
    ...list.map(b => [
      b.data,b.viaggio,b.busType,b.nome,b.cognome,b.telefono,(b.seats||[]).join(","),b.partenza
    ].join(";"))
  ];
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "prenotazioni.csv";
  a.click();
});

// ================== LOCANDINE (FIREBASE) ==================
async function renderAdminLocandine() {
  if (!window.LocandineStore || !adminLocandineList) return;

  const list = await window.LocandineStore.getAll();
  if (!list.length) {
    adminLocandineList.innerHTML = "<em>Nessuna locandina.</em>";
    return;
  }

  adminLocandineList.innerHTML = list.map(l => `
    <div class="routeRow">
      <strong>${escapeHTML(l.title)}</strong>
      <button data-del="${l.id}">Elimina</button>
    </div>
  `).join("");

  adminLocandineList.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Eliminare locandina?")) return;
      await window.LocandineStore.remove(btn.dataset.del);
      await renderAdminLocandine();
    });
  });
}

uploadLoc?.addEventListener("click", async () => {
  if (!isAdmin) return;

  const title = locTitle.value.trim();
  const viaggio = locViaggio.value.trim();
  const data = locData.value.trim();
  const partenza = locPartenza.value.trim();
  const busType = locBusType.value.trim();
  const file = locFile.files?.[0];

  if (!title || !file) return alert("Titolo e immagine obbligatori");

  await window.LocandineStore.add({ title, viaggio, data, partenza, busType, file });

  locTitle.value = locViaggio.value = locData.value = locPartenza.value = locBusType.value = "";
  locFile.value = "";
  await renderAdminLocandine();
  alert("Locandina salvata ✅");
});

// ================== INIT ==================
document.addEventListener("DOMContentLoaded", updateUI);
