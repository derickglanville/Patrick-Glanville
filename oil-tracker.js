"use strict";

const OIL_TANK_CAPACITY = 270;
let oilTab = "overview";
let oilEditingId = "";
let oilEditingReadingId = "";
let oilSearch = "";

function normalizeHomeHeatingOil(value, fallback = {}) {
  const source = value && typeof value === "object" ? value : fallback;
  const cleanDelivery = item => ({
    id: String(item.id || crypto.randomUUID()),
    date: /^\d{4}-\d{2}-\d{2}$/.test(item.date || "") ? item.date : "",
    gallons: Math.max(0, Number(item.gallons) || 0),
    price: Math.max(0, Number(item.price) || 0),
    amount: item.amount === null || item.amount === "" || item.amount === undefined ? null : Math.max(0, Number(item.amount) || 0),
    paidBy: String(item.paidBy || ""), company: String(item.company || ""),
    levelNote: String(item.levelNote || ""), notes: String(item.notes || "")
  });
  return {
    capacity: OIL_TANK_CAPACITY,
    deliveries: (Array.isArray(source.deliveries) ? source.deliveries : fallback.deliveries || []).map(cleanDelivery).filter(item => item.date && item.gallons > 0),
    readings: (Array.isArray(source.readings) ? source.readings : []).map(item => ({
      id: String(item.id || crypto.randomUUID()),
      date: /^\d{4}-\d{2}-\d{2}$/.test(item.date || "") ? item.date : "",
      percent: Math.min(100, Math.max(0, Number(item.percent) || 0)),
      note: String(item.note || "")
    })).filter(item => item.date)
  };
}

function oilData() {
  if (!state.homeHeatingOil) state.homeHeatingOil = normalizeHomeHeatingOil(null, { deliveries: window.HOME_HEATING_OIL_HISTORY || [] });
  return state.homeHeatingOil;
}

function oilIsoToday() { return getLocalIsoDate(new Date()); }
function oilDate(value) { return new Date(`${value}T12:00:00`); }
function oilMoney(value) { return Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" }); }
function oilNumber(value, digits = 0) { return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: digits }); }

// The workbook has delivery intervals rather than metered gallons consumed. Treat gallons
// delivered as an approximation of interval use and allocate each interval to calendar months.
function oilSeasonalRates(deliveries) {
  const rows = [...deliveries].filter(item => item.date >= "2022-01-01").sort((a, b) => a.date.localeCompare(b.date));
  const gallons = Array(12).fill(0), days = Array(12).fill(0);
  for (let i = 0; i < rows.length - 1; i++) {
    const start = oilDate(rows[i].date), end = oilDate(rows[i + 1].date);
    const span = Math.round((end - start) / 86400000);
    if (span < 14 || span > 220 || rows[i].gallons < 40) continue;
    const daily = rows[i].gallons / span;
    for (let d = 0; d < span; d++) {
      const date = new Date(start.getTime() + d * 86400000);
      const month = date.getMonth(); gallons[month] += daily; days[month]++;
    }
  }
  const overall = days.reduce((a, b) => a + b, 0) ? gallons.reduce((a, b) => a + b, 0) / days.reduce((a, b) => a + b, 0) : 0;
  return gallons.map((value, i) => days[i] >= 14 ? value / days[i] : overall);
}

function oilProjection(data, today = oilIsoToday()) {
  const latest = [...data.readings].filter(item => item.date <= today).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!latest) return { status: "missing" };
  const age = Math.round((oilDate(today) - oilDate(latest.date)) / 86400000);
  if (age > 30 || age < 0) return { status: "stale", latest, age };
  const rates = oilSeasonalRates(data.deliveries);
  if (!rates.some(rate => rate > 0)) return { status: "no-history", latest };
  let gallons = data.capacity * latest.percent / 100;
  const futureDeliveries = data.deliveries.filter(item => item.date > latest.date && item.date <= today);
  const date = oilDate(latest.date);
  while (date <= oilDate(today)) {
    const iso = getLocalIsoDate(date);
    if (iso !== latest.date) gallons = Math.min(data.capacity, gallons + futureDeliveries.filter(item => item.date === iso).reduce((sum, item) => sum + item.gallons, 0));
    if (iso !== today) gallons -= rates[date.getMonth()];
    date.setDate(date.getDate() + 1);
  }
  const current = Math.max(0, Math.min(data.capacity, gallons));
  let refillDate = ""; let daysToRefill = 0;
  if (gallons <= data.capacity * 0.25) refillDate = today;
  while (gallons > data.capacity * 0.25 && daysToRefill < 366) {
    gallons -= rates[date.getMonth()];
    daysToRefill++;
    if (gallons <= data.capacity * 0.25) refillDate = getLocalIsoDate(date);
    date.setDate(date.getDate() + 1);
  }
  return { status: "ready", latest, age, current, percent: current / data.capacity * 100, refillDate, daysToRefill, rates };
}

function oilBarChart(rates) {
  const labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const max = Math.max(1, ...rates);
  return `<div class="oil-chart-bars" role="img" aria-label="Estimated daily oil use by month, based on delivery intervals">${rates.map((rate, i) => `<div class="oil-chart-month"><span class="oil-chart-value">${oilNumber(rate, 1)}</span><div class="oil-chart-track"><div style="height:${Math.max(2, rate / max * 100)}%"></div></div><span>${labels[i]}</span></div>`).join("")}</div>`;
}

function oilAnnualChart(deliveries) {
  const totals = new Map();
  deliveries.forEach(item => { const year = item.date.slice(0, 4); const prior = totals.get(year) || { gallons: 0, cost: 0 }; prior.gallons += item.gallons; prior.cost += item.amount ?? item.gallons * item.price; totals.set(year, prior); });
  const years = [...totals.keys()].filter(year => year >= "2020" && year < oilIsoToday().slice(0, 4)).sort();
  const max = Math.max(1, ...years.map(year => totals.get(year).gallons));
  return `<div class="oil-annual-bars" role="img" aria-label="Full-year oil deliveries in gallons">${years.map(year => `<div><b>${oilNumber(totals.get(year).gallons)} gal</b><i style="width:${totals.get(year).gallons / max * 100}%"></i><span>${year} · ${oilMoney(totals.get(year).cost)}</span></div>`).join("")}</div>`;
}

function renderHomeHeatingOil() {
  const root = document.querySelector("#homeHeatingOilBody"); if (!root) return;
  const data = oilData(), rows = [...data.deliveries].sort((a, b) => b.date.localeCompare(a.date));
  const editingReading = data.readings.find(item => item.id === oilEditingReadingId);
  const latest = rows[0], projection = oilProjection(data);
  const year = oilIsoToday().slice(0, 4);
  const yearRows = rows.filter(row => row.date.startsWith(year));
  const rate = oilSeasonalRates(rows);
  root.innerHTML = `<div class="oil-tabs" role="tablist">${[["overview","Overview"],["deliveries","Deliveries"],["readings","Tank Readings"],["savings","Save Energy"]].map(([key,label]) => `<button type="button" data-oil-tab="${key}" class="${oilTab === key ? "active" : "ghost"}" aria-selected="${oilTab === key}">${label}</button>`).join("")}</div>
  <div class="oil-kpis"><article><small>Tank capacity</small><strong>270 gal</strong></article><article><small>Latest delivery</small><strong>${latest ? `${oilNumber(latest.gallons)} gal` : "—"}</strong><span>${latest?.date || "No deliveries"}</span></article><article><small>${year} delivered</small><strong>${oilNumber(yearRows.reduce((n,r)=>n+r.gallons,0))} gal</strong><span>${oilMoney(yearRows.reduce((n,r)=>n+(r.amount ?? r.gallons*r.price),0))}</span></article><article class="${projection.status === "ready" && projection.daysToRefill <= 14 ? "oil-alert" : ""}"><small>Refill outlook</small><strong>${projection.status === "ready" ? `${oilNumber(projection.current)} gal` : "Reading needed"}</strong><span>${projection.status === "ready" ? `${Math.round(projection.percent)}% estimated · 25% around ${projection.refillDate || "later"}` : projection.status === "stale" ? `Last reading ${projection.age} days old` : "Record a recent tank gauge reading"}</span></article></div>
  ${oilTab === "overview" ? `<div class="oil-two-col"><section class="oil-card"><h3>Seasonal daily use <small>gal / day</small></h3>${oilBarChart(rate)}<p>Estimate uses 2022–present delivery intervals. Actual use can vary with weather, occupancy, and hot water use.</p></section><section class="oil-card"><h3>Annual deliveries <small>completed years</small></h3>${oilAnnualChart(rows)}<p>Cost uses recorded invoice totals when available; otherwise gallons × entered unit price.</p></section></div><div class="oil-info">${projection.status === "ready" ? `Based on the ${projection.latest.date} reading, approximately <b>${oilNumber(projection.current)} gallons</b> remain. Plan to order by <b>${projection.refillDate || "your next gauge check"}</b> (25% reserve). ${projection.daysToRefill <= 14 ? "The tank is within the 14-day refill window." : "Recheck the gauge weekly."}` : "A current gauge reading is required for a reliable low-oil forecast and text alert. Old workbook gauge notes are not treated as today's level."}</div>` : ""}
  ${oilTab === "deliveries" ? `<div class="oil-toolbar"><label>Search deliveries<input id="oilSearch" type="search" value="${escapeAttribute(oilSearch)}" placeholder="Company, payer, notes, date"></label><button id="oilAddDelivery" type="button">Add Delivery</button></div><div id="oilEditor"></div><div class="oil-table-wrap"><table class="oil-table"><thead><tr><th>Date</th><th>Gallons</th><th>Price / gal</th><th>Amount</th><th>Company</th><th>Paid by</th><th>Gauge note</th><th>Notes</th><th>Actions</th></tr></thead><tbody>${rows.filter(row => `${row.date} ${row.company} ${row.paidBy} ${row.notes}`.toLowerCase().includes(oilSearch.toLowerCase())).map(row => `<tr><td>${escapeHtml(row.date)}</td><td>${oilNumber(row.gallons,1)}</td><td>${oilMoney(row.price)}</td><td>${row.amount == null ? "—" : oilMoney(row.amount)}</td><td>${escapeHtml(row.company)}</td><td>${escapeHtml(row.paidBy)}</td><td>${escapeHtml(row.levelNote)}</td><td>${escapeHtml(row.notes)}</td><td><button type="button" class="ghost oil-edit" data-id="${escapeAttribute(row.id)}">Edit</button><button type="button" class="ghost oil-delete" data-id="${escapeAttribute(row.id)}">Delete</button></td></tr>`).join("")}</tbody></table></div><p class="oil-footnote">Source: Home Heating Oil.xlsx. Blank invoice amounts stay blank; historic gauge notes are preserved as written where recognizable.</p>` : ""}
  ${oilTab === "readings" ? `<section class="oil-card"><h3>${editingReading ? "Update tank gauge" : "Record tank gauge"}</h3><p>Read the physical gauge and enter its percentage. The forecast and text alert use the newest reading only when it is at most 30 days old. A daily check on this computer attempts a text to 914-672-2393 when the 25% reserve is within 14 days; Verizon's legacy email-to-text delivery is not guaranteed.</p><form id="oilReadingForm" class="oil-reading-form"><label>Date<input name="date" type="date" value="${editingReading?.date || oilIsoToday()}" max="${oilIsoToday()}" required></label><label>Tank level<select name="percent">${[100,87.5,75,62.5,50,37.5,25,12.5,0].map(p => `<option value="${p}"${editingReading?.percent === p ? " selected" : ""}>${p}% · ${oilNumber(data.capacity*p/100)} gal</option>`).join("")}</select></label><label>Note<input name="note" value="${escapeAttribute(editingReading?.note || "")}" placeholder="Gauge check or service note"></label><button type="submit">${editingReading ? "Update Reading" : "Save Reading"}</button>${editingReading ? '<button type="button" id="oilCancelReading" class="ghost">Cancel</button>' : ""}</form></section><div class="oil-table-wrap"><table class="oil-table"><thead><tr><th>Date</th><th>Gauge</th><th>Approx. gallons</th><th>Note</th><th>Actions</th></tr></thead><tbody>${[...data.readings].sort((a,b)=>b.date.localeCompare(a.date)).map(row=>`<tr><td>${row.date}</td><td>${row.percent}%</td><td>${oilNumber(data.capacity*row.percent/100)}</td><td>${escapeHtml(row.note)}</td><td><button type="button" class="ghost oil-edit-reading" data-id="${escapeAttribute(row.id)}">Edit</button><button type="button" class="ghost oil-delete-reading" data-id="${escapeAttribute(row.id)}">Delete</button></td></tr>`).join("")}</tbody></table></div>` : ""}
  ${oilTab === "savings" ? `<div class="oil-savings"><article><h3>Set a comfortable schedule</h3><p>Lower the thermostat when asleep or away, then restore comfort before the home is occupied. Avoid turning it down so far that pipes could freeze.</p></article><article><h3>Service the heating system</h3><p>Schedule annual burner/boiler service, replace filters as recommended, and address short cycling or unusual shutdowns promptly.</p></article><article><h3>Keep heat inside</h3><p>Seal drafts around doors and windows, insulate accessible hot-water pipes, and check attic insulation and weatherstripping.</p></article><article><h3>Compare delivery costs</h3><p>Track dollars per gallon and supplier differences here. Confirm total invoice charges before assuming the quoted unit price is the full cost.</p></article></div>` : ""}`;
  root.querySelectorAll("[data-oil-tab]").forEach(button => button.addEventListener("click", () => { oilTab = button.dataset.oilTab; oilEditingId = ""; renderHomeHeatingOil(); }));
  root.querySelector("#oilSearch")?.addEventListener("input", event => { oilSearch = event.target.value; renderHomeHeatingOil(); root.querySelector("#oilSearch")?.focus(); });
  root.querySelector("#oilAddDelivery")?.addEventListener("click", () => { oilEditingId = "new"; renderOilEditor(); });
  root.querySelectorAll(".oil-edit").forEach(button => button.addEventListener("click", () => { oilEditingId = button.dataset.id; renderOilEditor(); }));
  root.querySelectorAll(".oil-delete").forEach(button => button.addEventListener("click", () => { const row = data.deliveries.find(item => item.id === button.dataset.id); if (!row || !ensureCurrentUser("delete an oil delivery") || !confirm(`Delete the ${row.date} oil delivery?`)) return; data.deliveries = data.deliveries.filter(item => item.id !== row.id); saveState(); renderHomeHeatingOil(); }));
  root.querySelectorAll(".oil-delete-reading").forEach(button => button.addEventListener("click", () => { if (!ensureCurrentUser("delete a tank reading") || !confirm("Delete this tank reading?")) return; data.readings = data.readings.filter(item => item.id !== button.dataset.id); saveState(); renderHomeHeatingOil(); }));
  root.querySelectorAll(".oil-edit-reading").forEach(button => button.addEventListener("click", () => { oilEditingReadingId = button.dataset.id; renderHomeHeatingOil(); root.querySelector("#oilReadingForm [name='date']")?.focus(); }));
  root.querySelector("#oilCancelReading")?.addEventListener("click", () => { oilEditingReadingId = ""; renderHomeHeatingOil(); });
  root.querySelector("#oilReadingForm")?.addEventListener("submit", event => { event.preventDefault(); if (!ensureCurrentUser("save a tank reading")) return; const form = event.currentTarget; const record = { id: oilEditingReadingId || crypto.randomUUID(), date: form.elements.date.value, percent: Number(form.elements.percent.value), note: form.elements.note.value.trim() }; if (oilEditingReadingId) { const index = data.readings.findIndex(item => item.id === oilEditingReadingId); if (index >= 0) data.readings[index] = record; } else data.readings.push(record); oilEditingReadingId = ""; saveState(); renderHomeHeatingOil(); });
}

function renderOilEditor() {
  const target = document.querySelector("#oilEditor"); if (!target) return;
  const existing = oilData().deliveries.find(item => item.id === oilEditingId) || {};
  target.innerHTML = `<form id="oilDeliveryForm" class="oil-editor"><h3>${oilEditingId === "new" ? "Add delivery" : "Update delivery"}</h3><div class="oil-editor-fields"><label>Date<input name="date" type="date" value="${escapeAttribute(existing.date || oilIsoToday())}" required></label><label>Gallons<input name="gallons" type="number" min="0.1" max="270" step="0.1" value="${existing.gallons || ""}" required></label><label>Price / gal<input name="price" type="number" min="0" step="0.001" value="${existing.price ?? ""}"></label><label>Invoice amount<input name="amount" type="number" min="0" step="0.01" value="${existing.amount ?? ""}"></label><label>Company<input name="company" value="${escapeAttribute(existing.company || "")}"></label><label>Paid by<input name="paidBy" value="${escapeAttribute(existing.paidBy || "")}"></label><label>Gauge note<input name="levelNote" value="${escapeAttribute(existing.levelNote || "")}"></label><label>Notes<input name="notes" value="${escapeAttribute(existing.notes || "")}"></label></div><div class="oil-form-actions"><button type="submit">Save Delivery</button><button type="button" id="oilCancelEdit" class="ghost">Cancel</button></div></form>`;
  target.querySelector("#oilCancelEdit").addEventListener("click", () => { oilEditingId = ""; target.innerHTML = ""; });
  target.querySelector("#oilDeliveryForm").addEventListener("submit", event => { event.preventDefault(); if (!ensureCurrentUser("save an oil delivery")) return; const form = event.currentTarget, e = form.elements; const record = normalizeHomeHeatingOil({ deliveries: [{ id: oilEditingId === "new" ? crypto.randomUUID() : oilEditingId, date: e.date.value, gallons: e.gallons.value, price: e.price.value, amount: e.amount.value, company: e.company.value, paidBy: e.paidBy.value, levelNote: e.levelNote.value, notes: e.notes.value }] }).deliveries[0]; if (!record) return; const data = oilData(); if (oilEditingId === "new") data.deliveries.push(record); else { const i = data.deliveries.findIndex(row => row.id === oilEditingId); if (i >= 0) data.deliveries[i] = record; } oilEditingId = ""; saveState(); renderHomeHeatingOil(); });
}

document.querySelector("#homeHeatingOilBtn")?.addEventListener("click", () => { if (!isAdminClient()) return; oilTab = "overview"; renderHomeHeatingOil(); document.querySelector("#homeHeatingOilDialog").showModal(); });
document.querySelector("#closeHomeHeatingOilDialog")?.addEventListener("click", () => document.querySelector("#homeHeatingOilDialog").close());
