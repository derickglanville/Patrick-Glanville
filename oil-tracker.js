"use strict";

const OIL_TANK_CAPACITY = 270;
const OIL_INITIAL_READING = { id: "oil-reading-20261014-0930", date: "2026-10-14", time: "09:30", percent: 50, note: "Physical gauge: half a tank" };
let oilTab = "overview";
let oilEditingId = "";
let oilEditingReadingId = "";
let oilSearch = "";
let oilUsageYear = "";
const OIL_REGIONAL_PRICE_API = "https://data.ny.gov/resource/rc94-5y2u.json?$select=date,lower_hudson_average_gal&$order=date%20DESC&$limit=1";
const OIL_PRICE_HISTORY_API = "https://data.ny.gov/resource/rc94-5y2u.json?$select=date,lower_hudson_average_gal&$where=lower_hudson_average_gal%20IS%20NOT%20NULL&$order=date%20DESC&$limit=5000";
const OIL_REGIONAL_PRICE_SOURCE = "https://www.nyserda.ny.gov/energy-prices/home-heating-oil/average-home-heating-oil-prices";
const OIL_YORKTOWN_PRICE_SOURCE = "https://www.gethomeheat.com/prices/ny/yorktown-heights";
let oilRegionalPrice = { status: "idle", price: null, date: "", checkedAt: 0, error: "" };
let oilPriceHistory = { status: "idle", rows: [], checkedAt: 0, error: "" };
let oilHistoryRange = "month";
let oilHistorySelectedDate = "";

function oilHistoryVisibleRows() {
  const rows = oilPriceHistory.rows;
  const latest = rows.at(-1);
  const rangeDays = { week: 7, month: 30, year: 365 }[oilHistoryRange];
  const cutoff = latest && rangeDays ? new Date(oilDate(latest.date).getTime() - rangeDays * 86400000) : latest && oilHistoryRange === "sixMonths" ? oilDate(latest.date) : null;
  if (cutoff && oilHistoryRange === "sixMonths") cutoff.setMonth(cutoff.getMonth() - 6);
  return cutoff ? rows.filter(row => oilDate(row.date) >= cutoff) : rows;
}

function selectOilHistoryPoint(root, event, step = 0) {
  const chart = root.querySelector("#oilHistorySvg");
  const points = oilHistoryVisibleRows();
  if (!chart || !points.length) return;
  const width = 800, height = 240, pad = 36;
  let index;
  if (step) index = Math.max(0, Math.min(points.length - 1, points.findIndex(row => row.date === oilHistorySelectedDate) + step));
  else {
    const rect = chart.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const start = oilDate(points[0].date).getTime(), end = oilDate(points.at(-1).date).getTime();
    const target = start + Math.max(0, Math.min(1, (fraction * width - pad) / (width - 2 * pad))) * (end - start);
    index = points.reduce((best, row, i) => Math.abs(oilDate(row.date).getTime() - target) < Math.abs(oilDate(points[best].date).getTime() - target) ? i : best, 0);
  }
  const row = points[index], all = oilPriceHistory.rows;
  const prior = all[all.findIndex(item => item.date === row.date) - 1];
  const low = Math.min(...points.map(item => item.price)), high = Math.max(...points.map(item => item.price));
  const first = oilDate(points[0].date).getTime(), last = oilDate(points.at(-1).date).getTime();
  const x = pad + (oilDate(row.date).getTime() - first) * (width - 2 * pad) / Math.max(1, last - first);
  const y = high === low ? height / 2 : height - pad - (row.price - low) * (height - 2 * pad) / (high - low);
  oilHistorySelectedDate = row.date;
  const xLine = root.querySelector("#oilHistoryCrosshairX"), yLine = root.querySelector("#oilHistoryCrosshairY"), marker = root.querySelector("#oilHistorySelectedPoint");
  xLine.setAttribute("x1", x); xLine.setAttribute("x2", x); xLine.setAttribute("visibility", "visible");
  yLine.setAttribute("y1", y); yLine.setAttribute("y2", y); yLine.setAttribute("visibility", "visible");
  marker.setAttribute("cx", x); marker.setAttribute("cy", y); marker.setAttribute("visibility", "visible");
  const diff = prior ? row.price - prior.price : null;
  const detail = `${row.date} · ${oilMoney(row.price)} per gallon${prior ? ` · ${diff > 0 ? "+" : diff < 0 ? "−" : ""}${oilMoney(Math.abs(diff))} since ${prior.date}` : " · first available survey"}`;
  root.querySelector("#oilHistoryPointInfo").textContent = detail;
  const tooltip = root.querySelector("#oilHistoryTooltip");
  tooltip.textContent = detail;
  const hostBounds = chart.parentElement.getBoundingClientRect();
  const svgBounds = chart.getBoundingClientRect();
  const pointX = svgBounds.left - hostBounds.left + x * svgBounds.width / width;
  const pointY = svgBounds.top - hostBounds.top + y * svgBounds.height / height;
  const gap = 10, inset = 6;
  let left = pointX + gap;
  if (left + tooltip.offsetWidth > hostBounds.width - inset) left = pointX - tooltip.offsetWidth - gap;
  let top = pointY - tooltip.offsetHeight - gap;
  if (top < inset) top = pointY + gap;
  tooltip.style.left = `${Math.max(inset, Math.min(left, hostBounds.width - tooltip.offsetWidth - inset))}px`;
  tooltip.style.top = `${Math.max(inset, Math.min(top, hostBounds.height - tooltip.offsetHeight - inset))}px`;
}

async function checkOilPriceHistory(force = false) {
  if (oilPriceHistory.status === "loading") return;
  if (!force && oilPriceHistory.checkedAt && Date.now() - oilPriceHistory.checkedAt < 6 * 60 * 60 * 1000) return;
  oilPriceHistory.status = "loading";
  if (oilTab === "priceHistory") renderHomeHeatingOil();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(OIL_PRICE_HISTORY_API, { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`Price service returned ${response.status}`);
    const result = await response.json();
    if (!Array.isArray(result)) throw new Error("Invalid price history");
    const rows = result.map(row => ({ date: String(row.date || "").slice(0, 10), price: Number(row.lower_hudson_average_gal) }))
      .filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && Number.isFinite(row.price) && row.price > 0 && row.price <= 30)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (rows.length < 2) throw new Error("Not enough price observations");
    oilPriceHistory = { status: "ready", rows, checkedAt: Date.now(), error: "" };
  } catch (error) {
    oilPriceHistory = { ...oilPriceHistory, status: "error", checkedAt: Date.now(), error: error?.name === "AbortError" ? "The history check timed out." : "Price history is unavailable right now." };
  } finally {
    clearTimeout(timeout);
    if (oilTab === "priceHistory") renderHomeHeatingOil();
  }
}

function oilPriceHistoryView() {
  const rows = oilPriceHistory.rows;
  const latest = rows.at(-1), previous = rows.at(-2);
  const change = latest && previous ? latest.price - previous.price : null;
  const chartRows = oilHistoryVisibleRows();
  const tableRows = chartRows.slice(-100);
  const low = Math.min(...chartRows.map(row => row.price));
  const high = Math.max(...chartRows.map(row => row.price));
  const width = 800, height = 240, pad = 36;
  const firstTime = oilDate(chartRows[0]?.date || oilIsoToday()).getTime();
  const lastTime = oilDate(chartRows.at(-1)?.date || oilIsoToday()).getTime();
  const x = index => pad + (oilDate(chartRows[index].date).getTime() - firstTime) * (width - 2 * pad) / Math.max(1, lastTime - firstTime);
  const y = price => high === low ? height / 2 : height - pad - (price - low) * (height - 2 * pad) / (high - low);
  const path = chartRows.map((row, index) => `${index ? "L" : "M"}${x(index).toFixed(1)} ${y(row.price).toFixed(1)}`).join(" ");
  const axisDates = [0,.25,.5,.75,1].map(fraction => new Date(firstTime + (lastTime - firstTime) * fraction).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(oilHistoryRange === "all" ? { year: "2-digit" } : {}) }));
  return `<div class="oil-price-view"><section class="oil-card oil-price-hero"><div><small>Lower Hudson · #2 heating oil</small><h3>Price changes over time</h3><p>Actual NYSERDA survey dates are plotted. Prices are surveyed weekly during heating season and less often outside it; there is no daily observed price for dates between surveys.</p></div><button id="oilRefreshHistory" type="button" ${oilPriceHistory.status === "loading" ? "disabled" : ""}>${oilPriceHistory.status === "loading" ? "Checking…" : "Refresh history"}</button></section>
    ${oilPriceHistory.error ? `<p class="oil-price-error" role="status">${escapeHtml(oilPriceHistory.error)}${rows.length ? " Showing the last fetched history." : ""}</p>` : ""}
    <div class="oil-history-ranges" role="group" aria-label="Price chart range">${[["week","Week"],["month","Month"],["sixMonths","6 Months"],["year","Year"],["all","All"]].map(([key,label]) => `<button type="button" data-oil-range="${key}" class="${oilHistoryRange === key ? "active" : "ghost"}" aria-pressed="${oilHistoryRange === key}">${label}</button>`).join("")}</div>
    ${latest ? `<div class="oil-price-grid"><section class="oil-card oil-price-metric"><small>Latest surveyed average</small><strong>${oilMoney(latest.price)} / gal</strong><span>${escapeHtml(latest.date)}</span></section><section class="oil-card oil-price-metric"><small>Change since previous survey</small><strong class="${change > 0 ? "oil-price-up" : change < 0 ? "oil-price-down" : ""}">${change > 0 ? "+" : change < 0 ? "−" : ""}${oilMoney(Math.abs(change))} / gal</strong><span>From ${escapeHtml(previous.date)} to ${escapeHtml(latest.date)}</span></section></div>
    <section class="oil-card"><h3>Price trend <small>${chartRows.length} surveys · through latest survey ${escapeHtml(latest.date)}</small></h3><div class="oil-history-chart" role="group" aria-label="Lower Hudson surveyed oil price from ${escapeAttribute(chartRows[0].date)} at ${oilMoney(chartRows[0].price)} per gallon to ${escapeAttribute(latest.date)} at ${oilMoney(latest.price)} per gallon"><div class="oil-history-y-axis" aria-hidden="true">${[0,1,2,3,4].map(i => `<span style="top:${(pad+i*(height-2*pad)/4)/height*100}%">${oilMoney(high-(high-low)*i/4)}</span>`).join("")}</div><svg id="oilHistorySvg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" tabindex="0" aria-label="Tap a survey point or use arrow keys to inspect prices"><g class="oil-history-grid">${[0,1,2,3,4].map(i => `<line x1="${pad}" y1="${pad + i*(height-2*pad)/4}" x2="${width-pad}" y2="${pad + i*(height-2*pad)/4}"/><line x1="${pad + i*(width-2*pad)/4}" y1="${pad}" x2="${pad + i*(width-2*pad)/4}" y2="${height-pad}"/>`).join("")}</g><path d="${path}"/>${chartRows.length <= 100 ? chartRows.map((row, index) => `<circle cx="${x(index).toFixed(1)}" cy="${y(row.price).toFixed(1)}" r="3"><title>${escapeHtml(row.date)}: ${oilMoney(row.price)} / gal</title></circle>`).join("") : ""}<line id="oilHistoryCrosshairX" class="oil-history-crosshair" y1="${pad}" y2="${height-pad}" visibility="hidden"/><line id="oilHistoryCrosshairY" class="oil-history-crosshair" x1="${pad}" x2="${width-pad}" visibility="hidden"/><circle id="oilHistorySelectedPoint" class="oil-history-selected" r="6" visibility="hidden"/></svg><div id="oilHistoryTooltip" class="oil-history-tooltip" aria-hidden="true"></div></div><div class="oil-history-x-axis" aria-label="Chart dates">${axisDates.map(date => `<span>${escapeHtml(date)}</span>`).join("")}</div><p id="oilHistoryPointInfo" class="oil-history-point-info" aria-live="polite">Touch or click the chart to inspect a survey point.</p><p>Range: ${oilMoney(low)}–${oilMoney(high)} per gallon. Points show survey observations, not estimated daily prices.</p></section>
    <section class="oil-card"><h3>Dated changes <small>${tableRows.length} shown${chartRows.length > 100 ? ` · latest 100 of ${chartRows.length}` : ""}</small></h3><div class="oil-table-wrap"><table class="oil-table oil-history-table"><thead><tr><th>Survey date</th><th>Average / gal</th><th>Change from prior survey</th><th>Days since prior survey</th></tr></thead><tbody>${tableRows.slice().reverse().map((row, index, descending) => { const prior = descending[index + 1], diff = prior ? row.price - prior.price : null; const days = prior ? Math.round((oilDate(row.date) - oilDate(prior.date)) / 86400000) : null; return `<tr><td>${escapeHtml(row.date)}</td><td>${oilMoney(row.price)}</td><td class="${diff > 0 ? "oil-price-up" : diff < 0 ? "oil-price-down" : ""}">${diff == null ? "—" : `${diff > 0 ? "+" : diff < 0 ? "−" : ""}${oilMoney(Math.abs(diff))}`}</td><td>${days ?? "—"}</td></tr>`; }).join("")}</tbody></table></div><p><a href="${OIL_REGIONAL_PRICE_SOURCE}" target="_blank" rel="noopener noreferrer">NYSERDA source and methodology</a>. Lower Hudson includes Westchester; this is a regional posted credit average, not a Yorktown dealer quote.</p></section>` : `<section class="oil-card"><p>${oilPriceHistory.status === "loading" ? "Loading dated price observations…" : "Select Refresh history to load price observations."}</p></section>`}</div>`;
}

async function checkOilRegionalPrice(force = false) {
  if (oilRegionalPrice.status === "loading") return;
  if (!force && oilRegionalPrice.checkedAt && Date.now() - oilRegionalPrice.checkedAt < 6 * 60 * 60 * 1000) return;
  oilRegionalPrice.status = "loading";
  if (oilTab === "prices") renderHomeHeatingOil();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(OIL_REGIONAL_PRICE_API, { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`Price service returned ${response.status}`);
    const rows = await response.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    const price = Number(row?.lower_hudson_average_gal);
    const date = String(row?.date || "").slice(0, 10);
    if (!Number.isFinite(price) || price <= 0 || price > 30 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("No valid Lower Hudson price was returned");
    oilRegionalPrice = { status: "ready", price, date, checkedAt: Date.now(), error: "" };
  } catch (error) {
    oilRegionalPrice = { ...oilRegionalPrice, status: "error", checkedAt: Date.now(), error: error?.name === "AbortError" ? "The price check timed out." : "The price check is unavailable right now." };
  } finally {
    clearTimeout(timeout);
    if (oilTab === "prices") renderHomeHeatingOil();
  }
}

function oilPriceView(data) {
  const latestDelivery = [...data.deliveries].filter(item => item.price > 0).sort((a, b) => b.date.localeCompare(a.date))[0];
  const regional = oilRegionalPrice.price;
  const surveyAge = oilRegionalPrice.date ? Math.floor((oilDate(oilIsoToday()) - oilDate(oilRegionalPrice.date)) / 86400000) : null;
  const stale = surveyAge !== null && surveyAge > 21;
  return `<div class="oil-price-view">
    <section class="oil-card oil-price-hero"><div><small>Yorktown Heights, NY · #2 heating oil</small><h3>Local oil price check</h3><p>Compare the official Lower Hudson survey with local supplier quotes before ordering. Westchester County is included in the Lower Hudson region.</p></div><button id="oilCheckPrice" type="button" ${oilRegionalPrice.status === "loading" ? "disabled" : ""}>${oilRegionalPrice.status === "loading" ? "Checking…" : "Check latest average"}</button></section>
    <div class="oil-price-grid"><section class="oil-card oil-price-metric"><small>NYSERDA · Lower Hudson average</small><strong>${regional == null ? "—" : `${oilMoney(regional)} / gal`}</strong><span>${oilRegionalPrice.date ? `Survey ${escapeHtml(oilRegionalPrice.date)}${stale ? " · older than 3 weeks" : ""}` : "Waiting for current survey"}</span><p>Posted credit price, not a guaranteed Yorktown delivery quote. NYSERDA surveys dealers weekly during heating season.</p><a href="${OIL_REGIONAL_PRICE_SOURCE}" target="_blank" rel="noopener noreferrer">View NYSERDA source</a></section>
    <section class="oil-card oil-price-metric"><small>Yorktown Heights · supplier comparison</small><strong>$5.72 / gal</strong><span>Dealer-reported average · Oct 17, 2026 snapshot</span><p>This local snapshot is not refreshed automatically in the app. The supplier page shows its latest update date and individual quotes.</p><a href="${OIL_YORKTOWN_PRICE_SOURCE}" target="_blank" rel="noopener noreferrer">Check current Yorktown prices</a></section></div>
    ${oilRegionalPrice.error ? `<p class="oil-price-error" role="status">${escapeHtml(oilRegionalPrice.error)} ${regional == null ? "Use the source links to check prices." : "The last successful result remains displayed."}</p>` : ""}
    <section class="oil-card"><h3>What that could mean for your next delivery</h3>${regional == null ? "<p>Check the latest regional average to see estimated costs.</p>" : `<div class="oil-price-costs"><div><span>100 gallons</span><strong>${oilMoney(regional * 100)}</strong></div><div><span>150 gallons</span><strong>${oilMoney(regional * 150)}</strong></div><div><span>270 gallons · full tank</span><strong>${oilMoney(regional * 270)}</strong></div></div>`}<p>Gallons × surveyed price only. Taxes, delivery fees, minimum order, payment method and your actual tank space may change the invoice.</p>${latestDelivery ? `<p>Your last entered delivery price: <b>${oilMoney(latestDelivery.price)} / gal</b> on ${escapeHtml(latestDelivery.date)}${latestDelivery.company ? ` from ${escapeHtml(latestDelivery.company)}` : ""}. It is historical, not a current quote.</p>` : ""}</section>
  </div>`;
}

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
  const readings = (Array.isArray(source.readings) ? source.readings : []).map(item => ({
    id: String(item.id || crypto.randomUUID()),
    date: /^\d{4}-\d{2}-\d{2}$/.test(item.date || "") ? item.date : "",
    time: /^\d{2}:\d{2}$/.test(item.time || "") ? item.time : "",
    percent: Math.min(100, Math.max(0, Number(item.percent) || 0)),
    note: String(item.note || "")
  })).filter(item => item.date);
  if (Number(source.seedVersion || 0) < 1 && !readings.some(item => item.id === OIL_INITIAL_READING.id || item.date === OIL_INITIAL_READING.date && item.time === OIL_INITIAL_READING.time)) {
    readings.push({ ...OIL_INITIAL_READING });
  }
  return {
    seedVersion: 1,
    capacity: OIL_TANK_CAPACITY,
    deliveries: (Array.isArray(source.deliveries) ? source.deliveries : fallback.deliveries || []).map(cleanDelivery).filter(item => item.date && item.gallons > 0),
    readings,
    investment: source.investment && typeof source.investment === "object" ? { ...source.investment } : {}
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

function oilMonthlyUsageForYear(deliveries, year) {
  const rows = [...deliveries].sort((a, b) => a.date.localeCompare(b.date));
  const gallons = Array(12).fill(0), days = Array(12).fill(0);
  for (let i = 0; i < rows.length - 1; i++) {
    const start = oilDate(rows[i].date), end = oilDate(rows[i + 1].date);
    const span = Math.round((end - start) / 86400000);
    if (span < 14 || span > 220 || rows[i].gallons < 40) continue;
    const daily = rows[i].gallons / span;
    for (let d = 0; d < span; d++) {
      const date = new Date(start.getTime() + d * 86400000);
      if (date.getFullYear() !== Number(year)) continue;
      const month = date.getMonth();
      gallons[month] += daily; days[month]++;
    }
  }
  return gallons.map((value, month) => days[month] >= 14 ? value / days[month] : null);
}

function oilProjection(data, today = oilIsoToday()) {
  const latest = [...data.readings].filter(item => item.date <= today).sort((a, b) => `${b.date}T${b.time || "00:00"}`.localeCompare(`${a.date}T${a.time || "00:00"}`))[0];
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

function oilBarChart(rates, label = "seasonal average") {
  const labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const max = Math.max(1, ...rates.filter(Number.isFinite));
  return `<div class="oil-chart-bars" role="img" aria-label="Estimated daily oil use by month for ${escapeAttribute(label)}">${rates.map((rate, i) => `<div class="oil-chart-month ${Number.isFinite(rate) ? "" : "oil-chart-missing"}"><span class="oil-chart-value">${Number.isFinite(rate) ? oilNumber(rate, 1) : "—"}</span><div class="oil-chart-track">${Number.isFinite(rate) ? `<div style="height:${Math.max(2, rate / max * 100)}%"></div>` : ""}</div><span>${labels[i]}</span></div>`).join("")}</div>`;
}

function oilAnnualChart(deliveries) {
  const totals = new Map();
  deliveries.forEach(item => { const year = item.date.slice(0, 4); const prior = totals.get(year) || { gallons: 0, cost: 0 }; prior.gallons += item.gallons; prior.cost += item.amount ?? item.gallons * item.price; totals.set(year, prior); });
  const years = [...totals.keys()].filter(year => year >= "2015" && year < oilIsoToday().slice(0, 4)).sort();
  const max = Math.max(1, ...years.map(year => totals.get(year).gallons));
  return `<div class="oil-annual-bars" role="img" aria-label="Full-year oil deliveries in gallons">${years.map(year => `<div><b>${oilNumber(totals.get(year).gallons)} gal</b><i style="width:${totals.get(year).gallons / max * 100}%"></i><span>${year} · ${oilMoney(totals.get(year).cost)}</span></div>`).join("")}</div>`;
}

function oilEfficiencyAnalysis(deliveries, today = oilIsoToday()) {
  const currentYear = Number(today.slice(0, 4));
  const annual = new Map();
  deliveries.forEach(item => {
    const year = Number(item.date.slice(0, 4));
    annual.set(year, (annual.get(year) || 0) + item.gallons);
  });
  const annualRows = [...annual].filter(([year]) => year >= 2015 && year < currentYear).sort((a, b) => a[0] - b[0]);
  const preAnnual = annualRows.filter(([year]) => year <= 2021);
  const postAnnual = annualRows.filter(([year]) => year >= 2023);
  const seasonEndYear = Number(today.slice(5, 7)) >= 5 ? currentYear : currentYear - 1;
  const seasons = [];
  for (let startYear = 2015; startYear < seasonEndYear; startYear++) {
    const gallons = deliveries.filter(item => item.date >= `${startYear}-09-01` && item.date < `${startYear + 1}-05-01`).reduce((sum, item) => sum + item.gallons, 0);
    if (gallons > 0) seasons.push({ startYear, gallons });
  }
  const preSeasons = seasons.filter(item => item.startYear <= 2021);
  const postSeasons = seasons.filter(item => item.startYear >= 2022);
  const average = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const annualBefore = average(preAnnual.map(([, gallons]) => gallons));
  const annualAfter = average(postAnnual.map(([, gallons]) => gallons));
  const winterBefore = average(preSeasons.map(item => item.gallons));
  const winterAfter = average(postSeasons.map(item => item.gallons));
  return { annualRows, preAnnual, postAnnual, annualBefore, annualAfter, winterBefore, winterAfter, preSeasons, postSeasons };
}

function oilEfficiencyView(deliveries) {
  const analysis = oilEfficiencyAnalysis(deliveries);
  const { annualRows, preAnnual, postAnnual, annualBefore, annualAfter, winterBefore, winterAfter, preSeasons, postSeasons } = analysis;
  if (annualBefore == null || annualAfter == null) return '<section class="oil-card"><h3>Oil use before and after 2022</h3><p>Enter deliveries from both before and after the summer 2022 siding and window work to compare them.</p></section>';
  const annualChange = (annualAfter / annualBefore - 1) * 100;
  const winterChange = winterBefore && winterAfter != null ? (winterAfter / winterBefore - 1) * 100 : null;
  const max = Math.max(...annualRows.map(([, gallons]) => gallons), 1);
  const annualLabel = annualChange < 0 ? `${Math.abs(annualChange).toFixed(1)}% fewer gallons delivered` : `${annualChange.toFixed(1)}% more gallons delivered`;
  return `<div class="oil-efficiency">
    <section class="oil-card oil-efficiency-intro"><h3>Oil use before and after the 2022 home improvements</h3><p>Energy-efficient siding and replacement of several large windows were completed in summer 2022. This compares completed years before the work with completed years after it; 2022 is shown as a transition year.</p><div class="oil-efficiency-kpis"><article><small>Before · 2015–2021</small><strong>${oilNumber(annualBefore)} gal/year</strong><span>${preAnnual.length} completed years</span></article><article><small>After · 2023–${postAnnual.at(-1)?.[0]}</small><strong>${oilNumber(annualAfter)} gal/year</strong><span>${postAnnual.length} completed years</span></article><article class="${annualChange < 0 ? "oil-efficiency-lower" : ""}"><small>Change in delivered oil</small><strong>${annualLabel}</strong><span>${oilNumber(Math.abs(annualAfter - annualBefore))} gal/year ${annualChange < 0 ? "less" : "more"}</span></article></div></section>
    <div class="oil-two-col"><section class="oil-card"><h3>Annual oil deliveries <small>gallons · completed years</small></h3><div class="oil-efficiency-bars" role="img" aria-label="Annual oil deliveries before and after summer 2022">${annualRows.map(([year, gallons]) => `<div class="oil-efficiency-bar ${year === 2022 ? "is-transition" : year < 2022 ? "is-before" : "is-after"}"><span>${year}</span><i><b style="width:${gallons / max * 100}%"></b></i><strong>${oilNumber(gallons)} gal</strong></div>`).join("")}</div><p>Blue: before · gold: 2022 transition · green: after. The latest completed year, ${postAnnual.at(-1)?.[0]}, had ${oilNumber(postAnnual.at(-1)?.[1])} gallons. Results vary by year, so the lower average is not a guaranteed annual saving.</p></section><section class="oil-card"><h3>Heating-season cross-check <small>September–April deliveries</small></h3>${winterChange == null ? '<p>Not enough completed heating seasons for a comparison.</p>' : `<div class="oil-efficiency-season"><div><span>Before · ${preSeasons.length} seasons</span><strong>${oilNumber(winterBefore)} gal/season</strong></div><div><span>After · ${postSeasons.length} seasons</span><strong>${oilNumber(winterAfter)} gal/season</strong></div><div><span>Change</span><strong>${Math.abs(winterChange).toFixed(1)}% ${winterChange < 0 ? "lower" : "higher"}</strong></div></div><p>This uses deliveries in the same September–April window. It supports the annual comparison but can shift oil between seasons when delivery dates change.</p>`}<h3>What the data supports</h3><p>The records suggest lower oil deliveries after the work. They do not prove how much the siding and windows saved. Delivery gallons are not metered consumption, beginning and ending tank levels are unknown, and this comparison does not adjust for winter weather, occupancy, thermostat settings, or other changes.</p></section></div>
  </div>`;
}

function renderHomeHeatingOil() {
  const root = document.querySelector("#homeHeatingOilBody"); if (!root) return;
  const data = oilData(), rows = [...data.deliveries].sort((a, b) => b.date.localeCompare(a.date));
  const editingReading = data.readings.find(item => item.id === oilEditingReadingId);
  const latest = rows[0], projection = oilProjection(data);
  const year = oilIsoToday().slice(0, 4);
  const yearRows = rows.filter(row => row.date.startsWith(year));
  const usageYears = [...new Set(rows.map(row => row.date.slice(0, 4)))].sort();
  if (!usageYears.includes(oilUsageYear) && oilUsageYear !== "average") oilUsageYear = usageYears.filter(value => value < year).at(-1) || usageYears.at(-1) || "average";
  const usageYearIndex = usageYears.indexOf(oilUsageYear);
  const rate = oilUsageYear === "average" ? oilSeasonalRates(rows) : oilMonthlyUsageForYear(rows, oilUsageYear);
  root.innerHTML = `<div class="oil-tabs" role="tablist">${[["overview","Overview"],["prices","Local Prices"],["priceHistory","Price Changes"],["efficiency","Efficiency Review"],["investment","Siding Investment"],["deliveries","Deliveries"],["readings","Tank Readings"],["savings","Save Energy"]].map(([key,label]) => `<button type="button" data-oil-tab="${key}" class="${oilTab === key ? "active" : "ghost"}" aria-selected="${oilTab === key}">${label}</button>`).join("")}</div>
  <div class="oil-kpis"><article><small>Tank capacity</small><strong>270 gal</strong></article><article><small>Latest delivery</small><strong>${latest ? `${oilNumber(latest.gallons)} gal` : "—"}</strong><span>${latest?.date || "No deliveries"}</span></article><article><small>${year} delivered</small><strong>${oilNumber(yearRows.reduce((n,r)=>n+r.gallons,0))} gal</strong><span>${oilMoney(yearRows.reduce((n,r)=>n+(r.amount ?? r.gallons*r.price),0))}</span></article><article class="${projection.status === "ready" && projection.daysToRefill <= 14 ? "oil-alert" : ""}"><small>Refill outlook</small><strong>${projection.status === "ready" ? `${oilNumber(projection.current)} gal` : "Reading needed"}</strong><span>${projection.status === "ready" ? `${Math.round(projection.percent)}% estimated · 25% around ${projection.refillDate || "later"}` : projection.status === "stale" ? `Last reading ${projection.age} days old` : "Record a recent tank gauge reading"}</span></article></div>
  ${oilTab === "overview" ? `<div class="oil-two-col"><section class="oil-card"><div class="oil-chart-heading"><h3>Monthly use estimate <small>gal / day</small></h3><div class="oil-year-controls"><button type="button" id="oilPrevYear" class="ghost" aria-label="Previous year" ${usageYearIndex <= 0 && oilUsageYear !== "average" ? "disabled" : ""}>←</button><select id="oilUsageYear" aria-label="Usage chart year"><option value="average" ${oilUsageYear === "average" ? "selected" : ""}>2022–present average</option>${usageYears.map(value => `<option value="${value}" ${oilUsageYear === value ? "selected" : ""}>${value}</option>`).join("")}</select><button type="button" id="oilNextYear" class="ghost" aria-label="Next year" ${usageYearIndex >= usageYears.length - 1 || oilUsageYear === "average" ? "disabled" : ""}>→</button></div></div>${oilBarChart(rate, oilUsageYear === "average" ? "2022–present average" : oilUsageYear)}<p>${oilUsageYear === "average" ? "Seasonal average from 2022–present delivery intervals." : `${oilUsageYear} estimate from delivery-to-delivery intervals. A dash means fewer than 14 covered days for that month.`} Delivery amounts approximate use; actual consumption can vary.</p></section><section class="oil-card"><h3>Annual deliveries <small>completed years · scroll for earlier years</small></h3>${oilAnnualChart(rows)}<p>Cost uses recorded invoice totals when available; otherwise gallons × entered unit price.</p></section></div><div class="oil-info">${projection.status === "ready" ? `Based on the ${projection.latest.date} reading, approximately <b>${oilNumber(projection.current)} gallons</b> remain. Plan to order by <b>${projection.refillDate || "your next gauge check"}</b> (25% reserve). ${projection.daysToRefill <= 14 ? "The tank is within the 14-day refill window." : "Recheck the gauge weekly."}` : "A current gauge reading is required for a reliable low-oil forecast and text alert. Old workbook gauge notes are not treated as today's level."}</div>` : ""}
  ${oilTab === "efficiency" ? oilEfficiencyView(rows) : ""}
  ${oilTab === "prices" ? oilPriceView(data) : ""}
  ${oilTab === "priceHistory" ? oilPriceHistoryView() : ""}
  ${oilTab === "investment" ? oilInvestmentView(data) : ""}
  ${oilTab === "deliveries" ? `<div class="oil-toolbar"><label>Search deliveries<input id="oilSearch" type="search" value="${escapeAttribute(oilSearch)}" placeholder="Company, payer, notes, date"></label><button id="oilAddDelivery" type="button">Add Delivery</button></div><div id="oilEditor"></div><div class="oil-table-wrap"><table class="oil-table"><thead><tr><th>Date</th><th>Gallons</th><th>Price / gal</th><th>Amount</th><th>Company</th><th>Paid by</th><th>Gauge note</th><th>Notes</th><th>Actions</th></tr></thead><tbody>${rows.filter(row => `${row.date} ${row.company} ${row.paidBy} ${row.notes}`.toLowerCase().includes(oilSearch.toLowerCase())).map(row => `<tr><td>${escapeHtml(row.date)}</td><td>${oilNumber(row.gallons,1)}</td><td>${oilMoney(row.price)}</td><td>${row.amount == null ? "—" : oilMoney(row.amount)}</td><td>${escapeHtml(row.company)}</td><td>${escapeHtml(row.paidBy)}</td><td>${escapeHtml(row.levelNote)}</td><td>${escapeHtml(row.notes)}</td><td><button type="button" class="ghost oil-edit" data-id="${escapeAttribute(row.id)}">Edit</button><button type="button" class="ghost oil-delete" data-id="${escapeAttribute(row.id)}">Delete</button></td></tr>`).join("")}</tbody></table></div><p class="oil-footnote">Source: Home Heating Oil.xlsx. Blank invoice amounts stay blank; historic gauge notes are preserved as written where recognizable.</p>` : ""}
  ${oilTab === "readings" ? `<section class="oil-card"><h3>${editingReading ? "Update tank gauge" : "Record tank gauge"}</h3><p>Read the physical gauge and enter its percentage. The forecast and text alert use the newest reading only when it is at most 30 days old. A daily check on this computer attempts a text to 914-672-2393 when the 25% reserve is within 14 days; Verizon's legacy email-to-text delivery is not guaranteed.</p><form id="oilReadingForm" class="oil-reading-form"><label>Date<input name="date" type="date" value="${editingReading?.date || oilIsoToday()}" max="${oilIsoToday()}" required></label><label>Tank level<select name="percent">${[100,87.5,75,62.5,50,37.5,25,12.5,0].map(p => `<option value="${p}"${editingReading?.percent === p ? " selected" : ""}>${p}% · ${oilNumber(data.capacity*p/100)} gal</option>`).join("")}</select></label><label>Note<input name="note" value="${escapeAttribute(editingReading?.note || "")}" placeholder="Gauge check or service note"></label><button type="submit">${editingReading ? "Update Reading" : "Save Reading"}</button>${editingReading ? '<button type="button" id="oilCancelReading" class="ghost">Cancel</button>' : ""}</form></section><div class="oil-table-wrap"><table class="oil-table"><thead><tr><th>Date</th><th>Gauge</th><th>Approx. gallons</th><th>Note</th><th>Actions</th></tr></thead><tbody>${[...data.readings].sort((a,b)=>b.date.localeCompare(a.date)).map(row=>`<tr><td>${row.date}</td><td>${row.percent}%</td><td>${oilNumber(data.capacity*row.percent/100)}</td><td>${escapeHtml(row.note)}</td><td><button type="button" class="ghost oil-edit-reading" data-id="${escapeAttribute(row.id)}">Edit</button><button type="button" class="ghost oil-delete-reading" data-id="${escapeAttribute(row.id)}">Delete</button></td></tr>`).join("")}</tbody></table></div>` : ""}
  ${oilTab === "savings" ? `<div class="oil-savings"><article><h3>Set a comfortable schedule</h3><p>Lower the thermostat when asleep or away, then restore comfort before the home is occupied. Avoid turning it down so far that pipes could freeze.</p></article><article><h3>Service the heating system</h3><p>Schedule annual burner/boiler service, replace filters as recommended, and address short cycling or unusual shutdowns promptly.</p></article><article><h3>Keep heat inside</h3><p>Seal drafts around doors and windows, insulate accessible hot-water pipes, and check attic insulation and weatherstripping.</p></article><article><h3>Compare delivery costs</h3><p>Track dollars per gallon and supplier differences here. Confirm total invoice charges before assuming the quoted unit price is the full cost.</p></article></div>` : ""}`;
  const annualChart = root.querySelector(".oil-annual-bars");
  if (annualChart) annualChart.scrollTop = annualChart.scrollHeight;
  if (oilTab === "readings") {
    const form = root.querySelector("#oilReadingForm");
    const timeLabel = document.createElement("label");
    timeLabel.innerHTML = `Time<input name="time" type="time" value="${editingReading?.time || "09:30"}" required>`;
    form?.insertBefore(timeLabel, form.querySelector("[name='percent']")?.closest("label"));
    const displayRows = [...data.readings].sort((a, b) => `${b.date}T${b.time || "00:00"}`.localeCompare(`${a.date}T${a.time || "00:00"}`));
    root.querySelectorAll(".oil-table tbody tr").forEach((tr, index) => {
      if (displayRows[index]) tr.cells[0].textContent = `${displayRows[index].date} ${displayRows[index].time || ""}`.trim();
    });
  }
  root.querySelectorAll("[data-oil-tab]").forEach(button => button.addEventListener("click", () => { oilTab = button.dataset.oilTab; oilEditingId = ""; renderHomeHeatingOil(); if (oilTab === "prices") checkOilRegionalPrice(); if (oilTab === "priceHistory") checkOilPriceHistory(); }));
  root.querySelector("#oilCheckPrice")?.addEventListener("click", () => checkOilRegionalPrice(true));
  root.querySelector("#oilRefreshHistory")?.addEventListener("click", () => checkOilPriceHistory(true));
  root.querySelectorAll("[data-oil-range]").forEach(button => button.addEventListener("click", () => { oilHistoryRange = button.dataset.oilRange; oilHistorySelectedDate = ""; renderHomeHeatingOil(); }));
  const historyChart = root.querySelector("#oilHistorySvg");
  historyChart?.addEventListener("pointerdown", event => selectOilHistoryPoint(root, event));
  historyChart?.addEventListener("click", event => selectOilHistoryPoint(root, event));
  historyChart?.addEventListener("touchstart", event => { if (event.touches[0]) selectOilHistoryPoint(root, event.touches[0]); }, { passive: true });
  historyChart?.addEventListener("keydown", event => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); selectOilHistoryPoint(root, event, event.key === "ArrowRight" ? 1 : -1); } });
  if (historyChart) { oilHistorySelectedDate = oilHistoryVisibleRows().at(-1).date; selectOilHistoryPoint(root, null, 1); }
  if (oilTab === "investment") wireOilInvestment(root, data);
  root.querySelector("#oilUsageYear")?.addEventListener("change", event => { oilUsageYear = event.target.value; renderHomeHeatingOil(); });
  root.querySelector("#oilPrevYear")?.addEventListener("click", () => { oilUsageYear = oilUsageYear === "average" ? usageYears.at(-1) : usageYears[Math.max(0, usageYearIndex - 1)]; renderHomeHeatingOil(); });
  root.querySelector("#oilNextYear")?.addEventListener("click", () => { oilUsageYear = usageYears[Math.min(usageYears.length - 1, usageYearIndex + 1)]; renderHomeHeatingOil(); });
  root.querySelector("#oilSearch")?.addEventListener("input", event => { oilSearch = event.target.value; renderHomeHeatingOil(); root.querySelector("#oilSearch")?.focus(); });
  root.querySelector("#oilAddDelivery")?.addEventListener("click", () => { oilEditingId = "new"; renderOilEditor(); });
  root.querySelectorAll(".oil-edit").forEach(button => button.addEventListener("click", () => { oilEditingId = button.dataset.id; renderOilEditor(); }));
  root.querySelectorAll(".oil-delete").forEach(button => button.addEventListener("click", () => { const row = data.deliveries.find(item => item.id === button.dataset.id); if (!row || !ensureCurrentUser("delete an oil delivery") || !confirm(`Delete the ${row.date} oil delivery?`)) return; data.deliveries = data.deliveries.filter(item => item.id !== row.id); saveState(); renderHomeHeatingOil(); }));
  root.querySelectorAll(".oil-delete-reading").forEach(button => button.addEventListener("click", () => { if (!ensureCurrentUser("delete a tank reading") || !confirm("Delete this tank reading?")) return; data.readings = data.readings.filter(item => item.id !== button.dataset.id); saveState(); renderHomeHeatingOil(); }));
  root.querySelectorAll(".oil-edit-reading").forEach(button => button.addEventListener("click", () => { oilEditingReadingId = button.dataset.id; renderHomeHeatingOil(); root.querySelector("#oilReadingForm [name='date']")?.focus(); }));
  root.querySelector("#oilCancelReading")?.addEventListener("click", () => { oilEditingReadingId = ""; renderHomeHeatingOil(); });
  root.querySelector("#oilReadingForm")?.addEventListener("submit", event => { event.preventDefault(); if (!ensureCurrentUser("save a tank reading")) return; const form = event.currentTarget; const record = { id: oilEditingReadingId || crypto.randomUUID(), date: form.elements.date.value, time: form.elements.time.value, percent: Number(form.elements.percent.value), note: form.elements.note.value.trim() }; if (oilEditingReadingId) { const index = data.readings.findIndex(item => item.id === oilEditingReadingId); if (index >= 0) data.readings[index] = record; } else data.readings.push(record); oilEditingReadingId = ""; saveState(); renderHomeHeatingOil(); });
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
