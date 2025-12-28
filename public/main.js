import { renderSeatMapGT53 } from "./seatmap-gt53.js";
import { renderSeatMapGT63 } from "./seatmap-gt63.js";
import { addBooking, getOccupiedSeatsByTripKey } from "./bookings-store.js";

const ROUTES_KEY = "delgrosso_routes_v1";

const seatMapEl = document.getElementById("seatMap");
const selected = new Set();

function loadRoutes(){ try { return JSON.parse(localStorage.getItem(ROUTES_KEY) || "[]"); } catch { return []; } }

function busCapacity(busType){ return busType === "GT - 63 posti" ? 63 : 53; }

function showMsg(text, ok=false){
  const msg = document.getElementById("msg");
  if (!msg) return;
  msg.textContent = text;
  msg.style.color = ok ? "green" : "crimson";
}

function refreshViaggioOptions(){
  const sel = document.getElementById("viaggio");
  if (!sel) return;
  const current = sel.value;

  const routes = loadRoutes();
  sel.innerHTML = `<option value="">Seleziona…</option>` + routes.map(r => (
    `<option value="${r.name}">${r.name}</option>`
  )).join("");

  if (current) sel.value = current;
}

function updateSelectedUI(){
  const box = document.getElementById("selectedSeats");
  if (!box) return;
  const arr = Array.from(selected).sort((a,b)=>a-b);
  box.textContent = arr.length ? arr.join(", ") : "Nessuno";
}

function currentTripKey(){
  const viaggio = document.getElementById("viaggio").value.trim();
  const data = document.getElementById("dataViaggio").value.trim();
  const bus = document.getElementById("busType").value.trim();
  return `${viaggio}||${data}||${bus}`;
}

let occupiedCache = new Set();

async function getOccupiedSeatsForCurrentTrip(){
  const key = currentTripKey();
  occupiedCache = await getOccupiedSeatsByTripKey(key);
  return occupiedCache;
}

async function toggleSeat(n){
  const occupied = await getOccupiedSeatsForCurrentTrip();
  if (occupied.has(n)) return;

  if (selected.has(n)) selected.delete(n);
  else selected.add(n);

  await renderSeatMap();
  updateSelectedUI();
}

async function renderSeatMap(){
  const busType = document.getElementById("busType").value;
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

function setURLFromUI(){
  const params = new URLSearchParams(window.location.search);

  const viaggio = document.getElementById("viaggio").value;
  const data = document.getElementById("dataViaggio").value;
  const partenza = document.getElementById("partenza").value;
  const bus = document.getElementById("busType").value;

  if (viaggio) params.set("viaggio", viaggio); else params.delete("viaggio");
  if (data) params.set("data", data); else params.delete("data");
  if (partenza) params.set("partenza", partenza); else params.delete("partenza");
  if (bus) params.set("bus", bus); else params.delete("bus");

  window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
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

async function restoreFromURL(){
  const params = new URLSearchParams(window.location.search);

  const viaggio = params.get("viaggio");
  const data = params.get("data");
  const partenza = params.get("partenza");
  const bus = params.get("bus");

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
    // se il bus arriva dal link (o da locandina) lo blocchiamo
    busEl.disabled = true;
  }

  await renderSeatMap();
  updateSelectedUI();
}

["viaggio","dataViaggio","partenza"].forEach(id=>{
  const el = document.getElementById(id);
  el?.addEventListener("input", async () => { setURLFromUI(); await renderSeatMap(); });
  el?.addEventListener("change", async () => { setURLFromUI(); await renderSeatMap(); });
});

// bus cambia solo se NON è bloccato (es: admin o reset)
document.getElementById("busType")?.addEventListener("change", async () => {
  selected.clear();
  updateSelectedUI();
  setURLFromUI();
  await renderSeatMap();
});

document.getElementById("copyLinkBtn")?.addEventListener("click", async () => {
  setURLFromUI();
  await navigator.clipboard.writeText(window.location.href);
  showMsg("Link copiato ✅", true);
});

document.getElementById("prenotaBtn")?.addEventListener("click", async () => {
  const nome = document.getElementById("nome").value.trim();
  const cognome = document.getElementById("cognome").value.trim();
  const telefono = document.getElementById("telefono").value.trim();

  const viaggio = document.getElementById("viaggio").value.trim();
  const data = document.getElementById("dataViaggio").value.trim();
  const partenza = document.getElementById("partenza").value.trim();
  const busType = document.getElementById("busType").value.trim();

  if (!nome || !cognome || !telefono) return showMsg("Inserisci Nome, Cognome e Telefono (obbligatori).");
  if (!viaggio || !data) return showMsg("Seleziona Viaggio e Data.");
  if (selected.size === 0) return showMsg("Seleziona almeno 1 posto.");

  const occupied = await getOccupiedSeatsForCurrentTrip();
  for (const s of selected) {
    if (occupied.has(s)) return showMsg(`Il posto ${s} è già occupato. Riprova.`);
  }

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

window.addEventListener("tripChangedFromLocandina", async () => {
  selected.clear();
  updateSelectedUI();
  setURLFromUI();
  await renderSeatMap();
  document.getElementById("seatSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

window.addEventListener("DOMContentLoaded", async () => {
  refreshViaggioOptions();
  await restoreFromURL();
  await renderSeatMap();
  updateSelectedUI();
});
