import { supabase } from "./supabase.js";
import { getBookingsByTripKey, getOccupiedSeatsByTripKey } from "./bookings-store.js";

const PASS = "del2025bus@";
const ROUTES_KEY = "delgrosso_routes_v1"; // fallback locale
const POSTERS_OVERRIDE_KEY = "delgrosso_locandine_override_v1"; // fallback locale

const adminBtn = document.getElementById("adminBtn");
const adminModal = document.getElementById("adminModal");
const adminCloseBtn = document.getElementById("adminCloseBtn");

const adminLocked = document.getElementById("adminLocked");
const adminPanel = document.getElementById("adminPanel");

const adminPass = document.getElementById("adminPass");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const adminMsg = document.getElementById("adminMsg");

const routesText = document.getElementById("routesText");
const routesSaveBtn = document.getElementById("routesSaveBtn");

const postersText = document.getElementById("postersText");
const postersSaveBtn = document.getElementById("postersSaveBtn");

const BUS_CAPACITY_DEFAULT = 54;
const WARN_THRESHOLD = 0.9;

function showAdminMsg(t, ok=false){
  adminMsg.textContent = t || "";
  adminMsg.style.color = ok ? "green" : "crimson";
}

function openModal(){
  adminModal.classList.remove("hidden");
  adminLocked.classList.remove("hidden");
  adminPanel.classList.add("hidden");
  adminPass.value = "";
  showAdminMsg("");
  loadAdminData();
}

function closeModal(){
  adminModal.classList.add("hidden");
}

async function loadAdminData(){
  // Routes: prova Supabase, fallback localStorage
  try {
    const { data, error } = await supabase
      .from("routes")
      .select("name")
      .eq("active", true)
      .order("created_at", { ascending: true });

    if (!error && data?.length) {
      routesText.value = data.map(r => r.name).join("\n");
    } else {
      let routes = [];
      try { routes = JSON.parse(localStorage.getItem(ROUTES_KEY) || "[]"); } catch {}
      routesText.value = routes.map(r => r.name).join("\n");
    }
  } catch {
    let routes = [];
    try { routes = JSON.parse(localStorage.getItem(ROUTES_KEY) || "[]"); } catch {}
    routesText.value = routes.map(r => r.name).join("\n");
  }

  // Posters override (fallback/backup)
  const ov = localStorage.getItem(POSTERS_OVERRIDE_KEY);
  postersText.value = ov ? ov : "";
}

adminBtn?.addEventListener("click", openModal);
adminCloseBtn?.addEventListener("click", closeModal);
adminModal?.addEventListener("click", (e)=>{ if(e.target===adminModal) closeModal(); });

function ensureExtrasUI(){
  if(!adminPanel) return;

  // Upload locandina
  if (!document.getElementById("posterUpload")) {
    const wrap = document.createElement("div");
    wrap.style.marginTop = "12px";
    wrap.innerHTML = `
      <hr style="margin:14px 0;" />
      <h3 style="margin:6px 0;">📸 Carica locandina (dal PC)</h3>
      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <input type="file" id="posterUpload" accept="image/*" />
        <button id="posterUploadBtn" type="button">Carica su Supabase</button>
        <span id="posterUploadMsg" style="font-size:12px;"></span>
      </div>
      <p style="font-size:12px; opacity:.8; margin:6px 0 0;">
        Salva immagine in Storage (bucket <b>locandine</b>) e crea record nella tabella <b>posters</b>.
        Così si vede anche dal telefono ✅
      </p>
    `;
    postersText?.parentElement?.appendChild(wrap);
  }

  // Dashboard prenotazioni
  if (!document.getElementById("bookingsDash")) {
    const dash = document.createElement("div");
    dash.id = "bookingsDash";
    dash.style.marginTop = "14px";
    dash.innerHTML = `
      <hr style="margin:14px 0;" />
      <h3 style="margin:6px 0;">🚌 Prenotazioni (quadro viaggio)</h3>

      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:end;">
        <div>
          <label style="display:block; font-size:12px;">Viaggio (tripKey)</label>
          <input id="tripKeyInput" placeholder="VIAGGIO||2026-01-15||GT - 53 posti" style="min-width:320px;" />
        </div>

        <div>
          <label style="display:block; font-size:12px;">Capienza bus</label>
          <input id="busCapacityInput" type="number" value="${BUS_CAPACITY_DEFAULT}" style="width:120px;" />
        </div>

        <button id="loadBookingsBtn" type="button">Carica prenotazioni</button>
        <span id="capacityWarning" style="font-weight:600;"></span>
      </div>

      <div id="bookingsSummary" style="margin-top:10px; font-size:13px;"></div>

      <div style="overflow:auto; margin-top:10px; border:1px solid #ddd; border-radius:8px;">
        <table style="border-collapse:collapse; width:100%; min-width:820px;">
          <thead>
            <tr>
              <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Quando</th>
              <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Nome</th>
              <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Telefono</th>
              <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Partenza</th>
              <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Posti</th>
              <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Note</th>
              <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Stato</th>
            </tr>
          </thead>
          <tbody id="bookingsTbody"></tbody>
        </table>
      </div>

      <p style="font-size:12px; opacity:.8; margin-top:6px;">
        ⚠️ Avviso al ${Math.round(WARN_THRESHOLD*100)}%: se superi la soglia, compare un alert.
      </p>
    `;
    adminPanel.appendChild(dash);
  }
}

function setPosterUploadMsg(t, ok=false){
  const el = document.getElementById("posterUploadMsg");
  if(!el) return;
  el.textContent = t || "";
  el.style.color = ok ? "green" : "crimson";
}

async function handlePosterUpload(){
  const input = document.getElementById("posterUpload");
  if(!input?.files?.length) return setPosterUploadMsg("Seleziona una foto prima.");

  const file = input.files[0];
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `locandine/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

  setPosterUploadMsg("Caricamento…");

  const { data, error } = await supabase.storage
    .from("locandine")
    .upload(path, file, { upsert: true });

  if (error) return setPosterUploadMsg("Errore upload ❌ (bucket/policy?)");

  const { data: pub } = supabase.storage.from("locandine").getPublicUrl(data.path);
  const url = pub.publicUrl;

  const { error: insErr } = await supabase.from("posters").insert([{
    title: "Nuova locandina",
    imageUrl: url,
    active: true
  }]);

  if (insErr) {
    console.error(insErr);
    return setPosterUploadMsg("Upload ok, ma errore salvataggio in posters ❌");
  }

  setPosterUploadMsg("Caricata ✅ Visibile anche dal telefono.", true);
  window.dispatchEvent(new CustomEvent("locandineUpdated"));
}

function fmtDate(ms){
  try { return new Date(ms).toLocaleString(); } catch { return ""; }
}

function seatsCount(seats){
  if (Array.isArray(seats)) return seats.length;
  if (typeof seats === "number") return 1;
  return 0;
}

function groupByDeparture(bookings){
  const map = {};
  for(const b of bookings){
    const k = (b.departure || "Non indicata").trim() || "Non indicata";
    map[k] = (map[k] || 0) + seatsCount(b.seats);
  }
  return map;
}

async function loadBookingsDashboard(){
  const tripKey = (document.getElementById("tripKeyInput")?.value || "").trim();
  const cap = Number(document.getElementById("busCapacityInput")?.value || BUS_CAPACITY_DEFAULT) || BUS_CAPACITY_DEFAULT;

  if(!tripKey){
    showAdminMsg("Inserisci tripKey (VIAGGIO||DATA||BUS).");
    return;
  }

  const warnEl = document.getElementById("capacityWarning");
  const sumEl = document.getElementById("bookingsSummary");
  const tbody = document.getElementById("bookingsTbody");
  if(tbody) tbody.innerHTML = "";

  try{
    const bookings = await getBookingsByTripKey(tripKey);
    const occ = (await getOccupiedSeatsByTripKey(tripKey)).size;

    const ratio = occ / cap;
    if (warnEl){
      if (ratio >= WARN_THRESHOLD){
        warnEl.textContent = `⚠️ ${occ}/${cap} posti occupati (${Math.round(ratio*100)}%)`;
        warnEl.style.color = "crimson";
        alert(`⚠️ Attenzione: ${occ}/${cap} posti occupati (${Math.round(ratio*100)}%)`);
      } else {
        warnEl.textContent = `${occ}/${cap} posti occupati (${Math.round(ratio*100)}%)`;
        warnEl.style.color = "green";
      }
    }

    const g = groupByDeparture(bookings);
    const parts = Object.entries(g).map(([k,v])=> `${k}: <b>${v}</b>`).join(" · ");
    if(sumEl){
      sumEl.innerHTML = `Prenotazioni: <b>${bookings.length}</b> · Posti occupati: <b>${occ}</b> / ${cap}<br/>Partenze: ${parts || "—"}`;
    }

    if(tbody){
      tbody.innerHTML = bookings.map(b => `
        <tr>
          <td style="padding:8px; border-bottom:1px solid #eee;">${fmtDate(b.createdAt)}</td>
          <td style="padding:8px; border-bottom:1px solid #eee;">${(b.fullName||"")}</td>
          <td style="padding:8px; border-bottom:1px solid #eee;">${(b.phone||"")}</td>
          <td style="padding:8px; border-bottom:1px solid #eee;">${(b.departure||"")}</td>
          <td style="padding:8px; border-bottom:1px solid #eee;">${seatsCount(b.seats)}</td>
          <td style="padding:8px; border-bottom:1px solid #eee;">${(b.notes||"")}</td>
          <td style="padding:8px; border-bottom:1px solid #eee;">${(b.status||"pending")}</td>
        </tr>
      `).join("");
    }

    showAdminMsg("Prenotazioni caricate ✅", true);
  } catch(e){
    console.error(e);
    showAdminMsg("Errore lettura prenotazioni ❌ (tabella/policy).");
  }
}

adminLoginBtn?.addEventListener("click", () => {
  if ((adminPass.value || "").trim() !== PASS) return showAdminMsg("Password errata.");
  adminLocked.classList.add("hidden");
  adminPanel.classList.remove("hidden");
  showAdminMsg("Accesso OK ✅", true);

  ensureExtrasUI();
  document.getElementById("posterUploadBtn")?.addEventListener("click", handlePosterUpload);
  document.getElementById("loadBookingsBtn")?.addEventListener("click", loadBookingsDashboard);
});

routesSaveBtn?.addEventListener("click", async () => {
  const lines = routesText.value.split("\n").map(s=>s.trim()).filter(Boolean);

  // 1) salva su Supabase (visibile su tutti i dispositivi)
  try {
    await supabase.from("routes").update({ active: false }).neq("name", "");
    if (lines.length) {
      const rows = lines.map(name => ({ name, active: true }));
      const { error } = await supabase.from("routes").insert(rows);
      if (error) throw error;
    }
  } catch(e) {
    console.error(e);
    // fallback locale
    const routes = lines.map(name => ({ name }));
    localStorage.setItem(ROUTES_KEY, JSON.stringify(routes));
  }

  window.dispatchEvent(new CustomEvent("routesUpdated"));
  showAdminMsg("Viaggi salvati ✅", true);
});

postersSaveBtn?.addEventListener("click", () => {
  // override locale (fallback/backup)
  const raw = postersText.value.trim();
  if (!raw) {
    localStorage.removeItem(POSTERS_OVERRIDE_KEY);
    window.dispatchEvent(new CustomEvent("locandineUpdated"));
    return showAdminMsg("Override locandine rimosso ✅", true);
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Deve essere un array JSON");
    localStorage.setItem(POSTERS_OVERRIDE_KEY, JSON.stringify(parsed));
    window.dispatchEvent(new CustomEvent("locandineUpdated"));
    showAdminMsg("Override locandine salvato ✅", true);
  } catch {
    showAdminMsg("JSON locandine non valido ❌");
  }
});
