import { LOCANDINE_PROVIDER, LOCANDINE_A_JSON, LOCANDINE_B_JSON_URL, LOCANDINE_C_JSON_URL } from "./config.js";
import { supabase } from "./supabase.js";

const grid = document.getElementById("locandineGrid");

const posterModal = document.getElementById("posterModal");
const posterImg = document.getElementById("posterImg");
const posterTitle = document.getElementById("posterTitle");
const posterInfo = document.getElementById("posterInfo");
const posterUseBtn = document.getElementById("posterUseBtn");
const posterCloseBtn = document.getElementById("posterCloseBtn");

let currentPoster = null;

function renderEmpty(msg = "Nessuna locandina disponibile.") {
  if (!grid) return;
  grid.innerHTML = `<div style="font-size:12px;opacity:.7">${msg}</div>`;
}

function openPoster(item) {
  currentPoster = item;
  posterTitle.textContent = item.title || "";
  posterImg.src = item.image || item.imageUrl || item.img || item.imageURL || "";
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
  if (currentPoster.viaggio) params.set("viaggio", currentPoster.viaggio);
  if (currentPoster.data) params.set("data", currentPoster.data);
  if (currentPoster.partenza) params.set("partenza", currentPoster.partenza);
  if (currentPoster.busType) params.set("bus", currentPoster.busType);
  window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);

  window.dispatchEvent(new CustomEvent("tripChangedFromLocandina", { detail: currentPoster }));
  closePoster();
  document.getElementById("bookingForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

function render(list) {
  if (!grid) return;
  grid.innerHTML = "";
  if (!list?.length) return renderEmpty();

  list.forEach(item => {
    const card = document.createElement("div");
    card.className = "locandina";
    const src = item.image || item.imageUrl || item.img || item.imageURL || "";
    card.innerHTML = `
      <img src="${src}" alt="${item.title || ""}">
      <div class="cap">${item.title || ""}</div>
    `;
    card.addEventListener("click", () => openPoster(item));
    grid.appendChild(card);
  });
}

async function loadJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function loadLocandineFromSupabase() {
  const { data, error } = await supabase
    .from("posters")
    .select("title, viaggio, data, partenza, busType, imageUrl, active, created_at")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(x => ({
    title: x.title || "",
    viaggio: x.viaggio || "",
    data: x.data || "",
    partenza: x.partenza || "",
    busType: x.busType || "",
    imageUrl: x.imageUrl || ""
  }));
}

async function loadLocandine() {
  if (!grid) return;

  renderEmpty("Caricamento locandine…");

  // A) statico (con override locale)
  if (LOCANDINE_PROVIDER === "A") {
    const override = localStorage.getItem("delgrosso_locandine_override_v1");
    if (override) {
      try { return render(JSON.parse(override)); } catch {}
    }
    const list = await loadJSON(LOCANDINE_A_JSON);
    return render(list);
  }

  // B) Cloudinary JSON pubblico
  if (LOCANDINE_PROVIDER === "B") {
    if (!LOCANDINE_B_JSON_URL) return renderEmpty("Provider locandine non configurato.");
    const list = await loadJSON(LOCANDINE_B_JSON_URL);
    return render(list);
  }

  // C) Supabase: se hai un JSON pubblico lo usi, altrimenti leggi la tabella posters
  if (LOCANDINE_PROVIDER === "C") {
    if (LOCANDINE_C_JSON_URL) {
      const list = await loadJSON(LOCANDINE_C_JSON_URL);
      return render(list);
    }
    const list = await loadLocandineFromSupabase();
    return render(list);
  }

  return renderEmpty("Provider locandine non configurato.");
}

document.addEventListener("DOMContentLoaded", () => {
  loadLocandine().catch(() => renderEmpty("ERRORE caricamento locandine."));
});

window.addEventListener("locandineUpdated", () => {
  loadLocandine().catch(() => renderEmpty("ERRORE caricamento locandine."));
});
