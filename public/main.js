import { renderSeatMapGT53 } from "./seatmap-gt53.js";
import { renderSeatMapGT63 } from "./seatmap-gt63.js";
import { addBooking, getOccupiedSeatsByTripKey } from "./bookings-store.js";

const ROUTES_KEY = "delgrosso_routes_v1";
const selected = new Set();

const seatMapEl = document.getElementById("seatMap");

function loadRoutes() {
  try { return JSON.parse(localStorage.getItem(ROUTES_KEY) || "[]"); }
  catch { return []; }
}

function busCapacity(busType) {
  return busType === "GT - 63 posti" ? 63 : 53;
}

function showMsg(text, ok = false) {
  const msg = document.getElementById("msg");
  if (!msg) return;
  msg.textContent = text || "";
  msg.style.color = ok ? "green" : "crimson";
}

function updateSelectedUI() {
  const box = document.getElementById("selectedSeats");
  if (!box) return;
  const arr = Array.from(selected).sort((a,b)=>a-b);
  box.textContent = arr.length ? arr.join(", ") : "Nessuno";
}

function ensureSelectOption(selectEl, value) {
  if (!selectEl || !value) return;
  const exists = Array.from(selectEl.options).some(o => o.value === value);
  if (!exists) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    selectEl.appendChild(opt);
  }
}

function currentTripKey() {
  const viaggio = document.getElementById("viaggio")?.value?.trim() || "";
  const data = document.getElementById("dataViaggio")?.value?.trim() || "";
  const bus  = document.getElementById("busType")?.value?.trim() || "";
  return `${viaggio}||${data}||${bus}`;
}

async function getOccupiedSeatsForCurrentTrip() {
  const key = currentTripKey();
  const [v, d, b] = key.split("||");
  if (!v || !d || !b) return new Set();
  return await getOccupiedSeatsByTripKey(key);
}

async function toggleSeat(n) {
  const occupied = await getOccupiedSeatsForCurrentTrip();
  if (occupied.has(n)) return;

  if (selected.has(n)) selected.delete(n);
  else selected.add(n);

  await renderSeatMap();
  updateSelectedUI();
}

async function renderSeatMap() {
  if (!seatMapEl) return;

  const busType = document.getElementById("busType")?.value || "GT - 53 posti";
  const occupied = await getOccupiedSeatsForCurrentTrip();

  const options = { selected, occupied, onToggleSeat: toggleSeat };

  if (busType === "GT - 53 posti") renderSeatMapGT53(seatMapEl, options);
  else renderSeatMapGT63(seatMapEl, options);

  const cap = busCapacity(busType);
  const full = occupied.size >= cap;

  const prenotaBtn = document.getElementById("prenotaBtn");
  if (prenotaBtn) prenotaBtn.disabled = full;

  if (full) showMsg("BUS PIENO: prenotazioni bloccate ✅", true);
  else showMsg("", true);
}

function setParam(params, key, val) {
  if (val && String(val).trim() !== "") params.set(key, String(val).trim());
  else params.delete(key);
}

function setURLFromUI() {
  const params = new URLSearchParams(window.location.search);

  const viaggio = document.getElementById("viaggio")?.value || "";
  const data = document.getElementById("dataViaggio")?.value || "";
  const partenza = document.getElementById("partenza")?.value || "";
  const bus = document.getElementById("busType")?.value || "";

  setParam(params, "viaggio", viaggio);
  setParam(params, "data", data);
  setParam(params, "partenza", partenza);
  setParam(params, "bus", bus);

  window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
}

function refreshViaggioOptions() {
  const sel = document.getElementById("viaggio");
  if (!sel) return;

  const current = sel.value;
  const routes = loadRoutes();

  sel.innerHTML = `<option value="">Seleziona…</option>` +
    routes.map(r => `<option value="${r.name}">${r.name}</option>`).join("");

  if (current) ensureSelectOption(sel, current);
  if (current) sel.value = current;
}

async function restoreFromURL() {
  const params = new URLSearchParams(window.location.search);

  const viaggio = params.get("viaggio") || "";
  const data = params.get("data") || "";
  const partenza = params.get("partenza") || "";
  const bus = params.get("bus") || "";

  const viaggioEl = document.getElementById("viaggio");
  const dataEl = document.getElementById("dataViaggio");
  const partenzaEl = document.getElementById("partenza");
  const busEl = document.getElementById("busType");

  if (viaggio) ensureSelectOption(viaggioEl, viaggio);

  if (viaggioEl && viaggio) viaggioEl.value = viaggio;
  if (dataEl && data) dataEl.value = data;
  if (partenzaEl && partenza) partenzaEl.value = partenza;

  if (busEl && bus) {
    busEl.value = bus;
    busEl.disabled = true; // se arriva dal link, non lo cambia l'utente
  }

  await renderSeatMap();
  updateSelectedUI();
}

// ====== EVENTI ======
document.getElementById("copyLinkBtn")?.addEventListener("click", async () => {
  setURLFromUI();
  await navigator.clipboard.writeText(window.location.href);
  showMsg("Link copiato ✅", true);
});

["viaggio","dataViaggio","partenza"].forEach(id => {
  const el = document.getElementById(id);
  el?.addEventListener("change", async () => {
    selected.clear();
    updateSelectedUI();
    setURLFromUI();
    await renderSeatMap();
  });
  el?.addEventListener("input", () => setURLFromUI());
});

window.addEventListener("tripChangedFromLocandina", async () => {
  selected.clear();
  updateSelectedUI();
  setURLFromUI();
  await renderSeatMap();
});

document.getElementById("prenotaBtn")?.addEventListener("click", async () => {
  const nome = document.getElementById("nome")?.value?.trim() || "";
  const cognome = document.getElementById("cognome")?.value?.trim() || "";
  const telefono = document.getElementById("telefono")?.value?.trim() || "";

  const viaggio = document.getElementById("viaggio")?.value?.trim() || "";
  const data = document.getElementById("dataViaggio")?.value?.trim() || "";
  const partenza = document.getElementById("partenza")?.value?.trim() || "";
  const busType = document.getElementById("busType")?.value?.trim() || "";

  if (!nome || !cognome || !telefono) return showMsg("Inserisci Nome, Cognome e Telefono (obbligatori).");
  if (!viaggio || !data || !busType) return showMsg("Seleziona Viaggio e Data.");
  if (selected.size === 0) return showMsg("Seleziona almeno 1 posto.");

  const occupied = await getOccupiedSeatsForCurrentTrip();
  for (const s of selected) if (occupied.has(s)) return showMsg(`Il posto ${s} è già occupato.`);

  const cap = busCapacity(busType);
  if (occupied.size + selected.size > cap) return showMsg("Non ci sono abbastanza posti disponibili.");

  const booking = {
    tripKey: currentTripKey(),
    viaggio, data, partenza, busType,
    nome, cognome, telefono,
    seats: Array.from(selected).sort((a,b)=>a-b)
  };

  await addBooking(booking);

  selected.clear();
  updateSelectedUI();
  await renderSeatMap();
  showMsg("Prenotazione salvata ✅", true);
});

window.addEventListener("routesUpdated", () => refreshViaggioOptions());

document.addEventListener("DOMContentLoaded", async () => {
  refreshViaggioOptions();
  await restoreFromURL();

  // sempre render
  await renderSeatMap();
  updateSelectedUI();
});
