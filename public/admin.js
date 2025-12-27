const ADMIN_PASSWORD = "del2025bus";

const ROUTES_KEY = "delgrosso_routes_v1";
const BOOKINGS_KEY = "delgrosso_bookings_v1";

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

// prenotazioni
const bookingsBody = document.getElementById("bookingsTableBody");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const clearBookingsBtn = document.getElementById("clearBookingsBtn");

// locandine (form)
const locTitle = document.getElementById("locTitle");
const locViaggio = document.getElementById("locViaggio");
const locData = document.getElementById("locData");
const locPartenza = document.getElementById("locPartenza");
const locBusType = document.getElementById("locBusType");
const locFile = document.getElementById("locFile");
const uploadLoc = document.getElementById("uploadLoc");
const adminLocandineList = document.getElementById("adminLocandineList");

let isAdmin = localStorage.getItem("isAdmin") === "true";

function loadRoutes(){ try { return JSON.parse(localStorage.getItem(ROUTES_KEY) || "[]"); } catch { return []; } }
function saveRoutes(list){ localStorage.setItem(ROUTES_KEY, JSON.stringify(list)); }

function loadBookings(){ try { return JSON.parse(localStorage.getItem(BOOKINGS_KEY) || "[]"); } catch { return []; } }
function saveBookings(list){ localStorage.setItem(BOOKINGS_KEY, JSON.stringify(list)); }

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function updateUI() {
  if (isAdmin) {
    loggedOut.classList.add("hidden");
    loggedIn.classList.remove("hidden");
    renderRoutesList();
    renderBookings();
    renderAdminLocandine();
  } else {
    loggedIn.classList.add("hidden");
    loggedOut.classList.remove("hidden");
  }
}

adminBtn?.addEventListener("click", () => {
  adminModal.classList.remove("hidden");
  updateUI();
});
closeAdmin?.addEventListener("click", () => adminModal.classList.add("hidden"));

loginBtn?.addEventListener("click", () => {
  const pass = document.getElementById("adminPass").value;
  if (pass === ADMIN_PASSWORD) {
    isAdmin = true;
    localStorage.setItem("isAdmin", "true");
    updateUI();
    alert("Accesso admin riuscito ✅");
  } else {
    alert("Password errata ❌");
  }
});

logoutBtn?.addEventListener("click", () => {
  isAdmin = false;
  localStorage.removeItem("isAdmin");
  updateUI();
  alert("Uscito dalla modalità admin");
});

/* ===== TRATTE ===== */
function renderRoutesList(){
  const box = document.getElementById("routesList");
  if (!box) return;
  const routes = loadRoutes();
  if (!routes.length) { box.innerHTML = "<em>Nessuna tratta salvata.</em>"; return; }

  box.innerHTML = routes.map((r, i) => `
    <div class="routeRow">
      <strong>${r.name}</strong>
      <span style="opacity:.75">${r.partenza}</span>
      <button type="button" data-edit="${i}">Modifica</button>
      <button type="button" data-del="${i}">Elimina</button>
    </div>
  `).join("");

  box.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.edit);
      const r = loadRoutes()[idx];
      routeName.value = r.name;
      routePartenza.value = r.partenza;
    });
  });

  box.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.del);
      const routes = loadRoutes();
      routes.splice(idx, 1);
      saveRoutes(routes);
      renderRoutesList();
      window.dispatchEvent(new CustomEvent("routesUpdated"));
    });
  });
}

addRouteBtn?.addEventListener("click", () => {
  if (!isAdmin) return alert("Devi essere admin.");

  const name = routeName.value.trim();
  const partenza = routePartenza.value.trim();
  if (!name || !partenza) return alert("Compila nome viaggio e partenza.");

  const routes = loadRoutes();
  const idx = routes.findIndex(r => r.name === name);
  const obj = { name, partenza };
  if (idx >= 0) routes[idx] = obj; else routes.push(obj);

  saveRoutes(routes);
  renderRoutesList();
  window.dispatchEvent(new CustomEvent("routesUpdated"));
  alert("Tratta salvata ✅");
});

/* ===== PRENOTAZIONI ===== */
function renderBookings(){
  if (!bookingsBody) return;
  const list = loadBookings().slice().sort((a,b)=> (b.createdAt||0)-(a.createdAt||0));
  if (!list.length){
    bookingsBody.innerHTML = `<tr><td colspan="7"><em>Nessuna prenotazione.</em></td></tr>`;
    return;
  }
  bookingsBody.innerHTML = list.map(b => `
    <tr>
      <td>${b.data || ""}</td>
      <td>${b.viaggio || ""}</td>
      <td>${b.busType || ""}</td>
      <td>${(b.nome||"") + " " + (b.cognome||"")}</td>
      <td>${b.telefono || ""}</td>
      <td>${(b.seats||[]).join(", ")}</td>
      <td>${b.partenza || ""}</td>
    </tr>
  `).join("");
}

clearBookingsBtn?.addEventListener("click", () => {
  if (!isAdmin) return alert("Devi essere admin.");
  if (!confirm("Cancellare TUTTE le prenotazioni?")) return;
  saveBookings([]);
  renderBookings();
  window.dispatchEvent(new CustomEvent("bookingsUpdated"));
});

exportCsvBtn?.addEventListener("click", () => {
  if (!isAdmin) return alert("Devi essere admin.");
  const list = loadBookings();
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

window.addEventListener("bookingsUpdated", renderBookings);

/* ===== LOCANDINE (NUOVA / MODIFICA / ELIMINA) ===== */
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

function renderAdminLocandine(){
  if (!adminLocandineList) return;
  if (!window.LocandineStore) { adminLocandineList.innerHTML = "<em>LocandineStore non disponibile.</em>"; return; }

  const list = window.LocandineStore.getAll();
  if (!list.length) { adminLocandineList.innerHTML = "<em>Nessuna locandina.</em>"; return; }

  adminLocandineList.innerHTML = list.map(item => `
    <div class="routeRow">
      <strong>${item.title || "(senza titolo)"}</strong>
      <span style="opacity:.75">${item.data || ""}</span>
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
    btn.addEventListener("click", () => {
      const id = btn.dataset.delloc;
      if (!confirm("Eliminare questa locandina?")) return;
      window.LocandineStore.remove(id);
      resetLocForm();
    });
  });
}

uploadLoc?.addEventListener("click", async () => {
  if (!isAdmin) return alert("Devi essere admin.");

  const title = locTitle.value.trim();
  const viaggio = locViaggio.value.trim();
  const data = locData.value.trim();
  const partenza = locPartenza.value.trim();
  const busType = locBusType.value.trim();
  const file = locFile.files?.[0];

  if (!title) return alert("Titolo obbligatorio.");
  if (!window.LocandineStore) return alert("Errore: LocandineStore non disponibile.");

  const editingId = uploadLoc.dataset.editingId || "";

  // MODIFICA senza immagine
  if (editingId && !file) {
    const ok = window.LocandineStore.update(editingId, { title, viaggio, data, partenza, busType });
    if (!ok) return alert("Locandina non trovata.");
    resetLocForm();
    alert("Locandina modificata ✅");
    return;
  }

  // MODIFICA con nuova immagine
  if (editingId && file) {
    const imageUrl = await fileToDataURL(file);
    const ok = window.LocandineStore.update(editingId, { title, imageUrl, viaggio, data, partenza, busType });
    if (!ok) return alert("Locandina non trovata.");
    resetLocForm();
    alert("Locandina modificata (immagine inclusa) ✅");
    return;
  }

  // NUOVA locandina
  if (!file) return alert("Per una nuova locandina serve anche l’immagine.");

  const imageUrl = await fileToDataURL(file);
  const item = {
    id: (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now())),
    title, imageUrl, viaggio, data, partenza, busType,
    createdAt: Date.now()
  };
  window.LocandineStore.add(item);
  resetLocForm();
  alert("Locandina salvata ✅");
});

window.addEventListener("locandineUpdated", () => { if (isAdmin) renderAdminLocandine(); });

document.addEventListener("DOMContentLoaded", updateUI);
