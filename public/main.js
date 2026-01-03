import { renderSeatMapGT53 } from "./seatmap-gt53.js";
import { renderSeatMapGT63 } from "./seatmap-gt63.js";
import { addBooking, getOccupiedSeatsByTripKey } from "./bookings-store.js";
import { supabase } from "./supabase.js";

const ROUTES_KEY = "delgrosso_routes_v1"; // fallback locale
const selected = new Set();
const seatMapEl = document.getElementById("seatMap");

async function loadRoutesFromSupabase() {
  const { data, error } = await supabase
    .from("routes")
    .select("name, active, created_at")
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []).map(x => ({ name: x.name }));
}

function loadRoutesLocal() {
  try { return JSON.parse(localStorage.getItem(ROUTES_KEY) || "[]"); }
  catch { return []; }
}

async function loadRoutes() {
  try {
    const r = await loadRoutesFromSupabase();
    if (r?.length) return r;
  } catch {}
  return loadRoutesLocal();
}

async function refreshViaggioOptions() {
  const sel = document.getElementById("viaggio");
  if (!sel) return;
  const current = sel.value;
  const routes = await loadRoutes();

  sel.innerHTML = `<option value="">Seleziona…</option>` +
    routes.map(r => `<option value="${r.name}">${r.name}</option>`).join("");

  if (current) {
    const exists = Array.from(sel.options).some(o => o.value === current);
    if (!exists) {
      const opt = document.createElement("option");
      opt.value = current;
      opt.textContent = current;
      sel.appendChild(opt);
    }
    sel.value = current;
  }
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

function currentTripKey() {
  const viaggio = document.getElementById("viaggio")?.value?.trim() || "";
  const data = document.getElementById("dataViaggio")?.value?.trim() || "";
  const bus  = document.getElementById("busType")?.value?.trim() || "";
  return `${viaggio}||${data}||${bus}`;
}

async function getOccupiedSeatsForCurrentTrip() {
  const key = currentTripKey();
  const [v,d,b] = key.split("||");
  if (!v || !d || !b) return new Set();
  return await getOccupiedSeatsByTripKey(key);
}

function setParam(params, key, val) {
  if (val && String(val).trim() !== "") params.set(key, String(val).trim());
  else params.delete(key);
}
function setURLFromUI() {
  const params = new URLSearchParams(window.location.search);
  setParam(params, "viaggio", document.getElementById("viaggio")?.value || "");
  setParam(params, "data", document.getElementById("dataViaggio")?.value || "");
  setParam(params, "partenza", document.getElementById("partenza")?.value || "");
  setParam(params, "bus", document.getElementById("busType")?.value || "");
  window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
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

  if (viaggio && viaggioEl) {
    const exists = Array.from(viaggioEl.options).some(o => o.value === viaggio);
    if (!exists) {
      const opt = document.createElement("option");
      opt.value = viaggio;
      opt.textContent = viaggio;
      viaggioEl.appendChild(opt);
    }
    viaggioEl.value = viaggio;
  }
  if (dataEl && data) dataEl.value = data;
  if (partenzaEl && partenza) partenzaEl.value = partenza;

  if (busEl && bus) {
    busEl.value = bus;
    busEl.disabled = true;
  }

  await renderSeatMap();
  updateSelectedUI();
}

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

document.getElementById("busType")?.addEventListener("change", async () => {
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
  if (!viaggio || !data) return showMsg("Seleziona Viaggio e Data.");
  if (selected.size === 0) return showMsg("Seleziona almeno 1 posto.");

  const occupied = await getOccupiedSeatsForCurrentTrip();
  for (const s of selected) if (occupied.has(s)) return showMsg(`Il posto ${s} è già occupato.`);

  await addBooking({
    tripKey: currentTripKey(),
    fullName: `${nome} ${cognome}`,
    phone: telefono,
    departure: partenza,
    viaggio, data, partenza, busType,
    seats: Array.from(selected).sort((a,b)=>a-b)
  });

  selected.clear();
  updateSelectedUI();
  await renderSeatMap();
  showMsg("Prenotazione salvata ✅", true);
});

window.addEventListener("routesUpdated", async () => {
  await refreshViaggioOptions();
});

document.addEventListener("DOMContentLoaded", async () => {
  await refreshViaggioOptions();
  await restoreFromURL();
  await renderSeatMap();
  updateSelectedUI();
});
