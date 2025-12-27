import { renderSeatMapGT53 } from "./seatmap-gt53.js";
import { renderSeatMapGT63 } from "./seatmap-gt63.js";

const ROUTES_KEY = "delgrosso_routes_v1";
const BOOKINGS_KEY = "delgrosso_bookings_v1";

const seatMapEl = document.getElementById("seatMap");
const selected = new Set();

function loadRoutes(){ try { return JSON.parse(localStorage.getItem(ROUTES_KEY) || "[]"); } catch { return []; } }
function loadBookings(){ try { return JSON.parse(localStorage.getItem(BOOKINGS_KEY) || "[]"); } catch { return []; } }
function saveBookings(list){ localStorage.setItem(BOOKINGS_KEY, JSON.stringify(list)); }

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

function getOccupiedSeatsForCurrentTrip(){
  const key = currentTripKey();
  const bookings = loadBookings().filter(b => b.tripKey === key);
  const occ = new Set();
  bookings.forEach(b => (b.seats || []).forEach(s => occ.add(Number(s))));
  return occ;
}

function toggleSeat(n){
  const occupied = getOccupiedSeatsForCurrentTrip();
  if (occupied.has(n)) return;

  if (selected.has(n)) selected.delete(n);
  else selected.add(n);

  renderSeatMap();
  updateSelectedUI();
}

function renderSeatMap(){
  const busType = document.getElementById("busType").value;
  const occupied = getOccupiedSeatsForCurrentTrip();

  const options = { selected, occupied, onToggleSeat: toggleSeat };
  if (busType === "GT - 53 posti") renderSeatMapGT53(seatMapEl, options);
  else renderSeatMapGT63(seatMapEl, options);

  const cap = busCapacity(busType);
  const full = occupied.size >= cap;

  const prenotaBtn = document.getElementById("prenotaBtn");
  if (prenotaBtn) prenotaBtn.disabled = full;

  if (full) showMsg("BUS PIENO: prenotazioni bloccate ✅", true);
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

function restoreFromURL(){
  const params = new URLSearchParams(window.location.search);

  const viaggio = params.get("viaggio");
  const data = params.get("data");
  const partenza = params.get("partenza");
  const bus = params.get("bus");

  if (viaggio) document.getElementById("viaggio").value = viaggio;
  if (data) document.getElementById("dataViaggio").value = data;
  if (partenza) document.getElementById("partenza").value = partenza;
  if (bus) document.getElementById("busType").value = bus;

  renderSeatMap();
  updateSelectedUI();
}

["viaggio","dataViaggio","partenza"].forEach(id=>{
  const el = document.getElementById(id);
  el?.addEventListener("input", () => { setURLFromUI(); renderSeatMap(); });
  el?.addEventListener("change", () => { setURLFromUI(); renderSeatMap(); });
});

document.getElementById("busType")?.addEventListener("change", () => {
  selected.clear();
  updateSelectedUI();
  setURLFromUI();
  renderSeatMap();
});

document.getElementById("copyLinkBtn")?.addEventListener("click", async () => {
  setURLFromUI();
  await navigator.clipboard.writeText(window.location.href);
  showMsg("Link copiato ✅", true);
});

document.getElementById("prenotaBtn")?.addEventListener("click", () => {
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

  const occupied = getOccupiedSeatsForCurrentTrip();
  for (const s of selected) {
    if (occupied.has(s)) return showMsg(`Il posto ${s} è già occupato. Riprova.`);
  }

  const cap = busCapacity(busType);
  if (occupied.size + selected.size > cap) return showMsg("Non ci sono abbastanza posti disponibili.");

  const booking = {
    id: (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now())),
    tripKey: currentTripKey(),
    viaggio, data, partenza, busType,
    nome, cognome, telefono,
    seats: Array.from(selected).sort((a,b)=>a-b),
    createdAt: Date.now()
  };

  const all = loadBookings();
  all.push(booking);
  saveBookings(all);

  selected.clear();
  updateSelectedUI();
  renderSeatMap();

  window.dispatchEvent(new CustomEvent("bookingsUpdated"));
  showMsg("Prenotazione salvata ✅", true);
});

window.addEventListener("routesUpdated", () => refreshViaggioOptions());

window.addEventListener("tripChangedFromLocandina", () => {
  selected.clear();
  updateSelectedUI();
  setURLFromUI();
  renderSeatMap();
  document.getElementById("seatSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

window.addEventListener("DOMContentLoaded", () => {
  refreshViaggioOptions();
  restoreFromURL();
  renderSeatMap();
});
