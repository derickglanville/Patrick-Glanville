"use strict";

const OIL_TANK_CAPACITY = 275;
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
const OIL_BOTTINI_SOURCE = "https://www.bottinifuel.com/actionfuel/";
const OIL_BOTTINI_REPORTED_QUOTE = { price: "$5.779", date: "Nov 4, 2026" };
let oilRegionalPrice = { status: "idle", price: null, date: "", checkedAt: 0, error: "" };
let oilPriceHistory = { status: "idle", rows: [], checkedAt: 0, error: "" };
let oilHistoryRange = "month";
let oilHistorySelectedDate = "";
let oilReadingSaveStatus = { kind: "", text: "" };
const OIL_DAILY_WEATHER_SOURCE = "https://data.rcc-acis.org/StnData";
let oilDailyWeather = { status: "idle", rows: new Map(), checkedAt: 0, start: "", error: "" };

function oilHistoryVisibleRows() {
  const rows = oilPriceHistory.rows;
  const latest = rows.at(-1);
  const rangeDays = { week: 7, month: 30, year: 365 }[oilHistoryRange];
  const cutoff = latest && rangeDays ? new Date(oilDate(latest.date).getTime() - rangeDays * 86400000) : latest && ["sixMonths", "fiveYears"].includes(oilHistoryRange) ? oilDate(latest.date) : null;
  if (cutoff && oilHistoryRange === "sixMonths") cutoff.setMonth(cutoff.getMonth() - 6);
  if (cutoff && oilHistoryRange === "fiveYears") cutoff.setFullYear(cutoff.getFullYear() - 5);
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
  const yearSpan = (lastTime - firstTime) / (365.25 * 86400000);
  const axisTickCount = oilHistoryRange === "all" ? Math.max(4, Math.round(yearSpan)) : oilHistoryRange === "fiveYears" ? 5 : 4;
  const axisFractions = Array.from({ length: axisTickCount + 1 }, (_, index) => index / axisTickCount);
  const axisDates = axisFractions.map(fraction => new Date(firstTime + (lastTime - firstTime) * fraction).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
  const chartMinWidth = oilHistoryRange === "all" ? Math.max(900, axisTickCount * 140) : oilHistoryRange === "fiveYears" ? 900 : 0;
  return `<div class="oil-price-view"><section class="oil-card oil-price-hero"><div><small>Lower Hudson · #2 heating oil</small><h3>Price changes over time</h3><p>Actual NYSERDA survey dates are plotted. Prices are surveyed weekly during heating season and less often outside it; there is no daily observed price for dates between surveys.</p></div><button id="oilRefreshHistory" type="button" ${oilPriceHistory.status === "loading" ? "disabled" : ""}>${oilPriceHistory.status === "loading" ? "Checking…" : "Refresh history"}</button></section>
    <p class="oil-price-quote-note"><a href="${OIL_BOTTINI_SOURCE}" target="_blank" rel="noopener noreferrer">Bottini Fuel (formerly Action Fuel)</a> dealer quote: <strong>${OIL_BOTTINI_REPORTED_QUOTE.price} / gal</strong> · reported ${OIL_BOTTINI_REPORTED_QUOTE.date}. Confirm the current price and terms with the supplier. Dealer quotes are separate from the NYSERDA survey chart.</p>
    ${oilPriceHistory.error ? `<p class="oil-price-error" role="status">${escapeHtml(oilPriceHistory.error)}${rows.length ? " Showing the last fetched history." : ""}</p>` : ""}
    <div class="oil-history-ranges" role="group" aria-label="Price chart range">${[["week","Week"],["month","Month"],["sixMonths","6 Months"],["year","Year"],["fiveYears","5 Years"],["all","All"]].map(([key,label]) => `<button type="button" data-oil-range="${key}" class="${oilHistoryRange === key ? "active" : "ghost"}" aria-pressed="${oilHistoryRange === key}">${label}</button>`).join("")}</div>
    ${latest ? `<div class="oil-price-grid"><section class="oil-card oil-price-metric"><small>Latest surveyed average</small><strong>${oilMoney(latest.price)} / gal</strong><span>${escapeHtml(latest.date)}</span></section><section class="oil-card oil-price-metric"><small>Change since previous survey</small><strong class="${change > 0 ? "oil-price-up" : change < 0 ? "oil-price-down" : ""}">${change > 0 ? "+" : change < 0 ? "−" : ""}${oilMoney(Math.abs(change))} / gal</strong><span>From ${escapeHtml(previous.date)} to ${escapeHtml(latest.date)}</span></section></div>
    <section class="oil-card"><h3>Price trend <small>${chartRows.length} surveys · through latest survey ${escapeHtml(latest.date)}</small></h3><div id="oilHistoryScroll" class="oil-history-scroll" aria-label="Scroll through price history by year" tabindex="0"><div class="oil-history-content" style="min-width:${chartMinWidth}px"><div class="oil-history-chart" role="group" aria-label="Lower Hudson surveyed oil price from ${escapeAttribute(chartRows[0].date)} at ${oilMoney(chartRows[0].price)} per gallon to ${escapeAttribute(latest.date)} at ${oilMoney(latest.price)} per gallon"><div class="oil-history-y-axis" aria-hidden="true">${[0,1,2,3,4].map(i => `<span style="top:${(pad+i*(height-2*pad)/4)/height*100}%">${oilMoney(high-(high-low)*i/4)}</span>`).join("")}</div><svg id="oilHistorySvg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" tabindex="0" aria-label="Tap a survey point or use arrow keys to inspect prices"><g class="oil-history-grid">${[0,1,2,3,4].map(i => `<line x1="${pad}" y1="${pad + i*(height-2*pad)/4}" x2="${width-pad}" y2="${pad + i*(height-2*pad)/4}"/>`).join("")}${axisFractions.map(fraction => `<line x1="${pad + fraction*(width-2*pad)}" y1="${pad}" x2="${pad + fraction*(width-2*pad)}" y2="${height-pad}"/>`).join("")}</g><path d="${path}"/>${chartRows.length <= 100 ? chartRows.map((row, index) => `<circle cx="${x(index).toFixed(1)}" cy="${y(row.price).toFixed(1)}" r="3"><title>${escapeHtml(row.date)}: ${oilMoney(row.price)} / gal</title></circle>`).join("") : ""}<line id="oilHistoryCrosshairX" class="oil-history-crosshair" y1="${pad}" y2="${height-pad}" visibility="hidden"/><line id="oilHistoryCrosshairY" class="oil-history-crosshair" x1="${pad}" x2="${width-pad}" visibility="hidden"/><circle id="oilHistorySelectedPoint" class="oil-history-selected" r="6" visibility="hidden"/></svg><div id="oilHistoryTooltip" class="oil-history-tooltip" aria-hidden="true"></div></div><div class="oil-history-x-axis" aria-label="Chart dates">${axisDates.map(date => `<span>${escapeHtml(date)}</span>`).join("")}</div></div></div>${chartMinWidth ? '<div class="oil-history-scroll-controls"><button type="button" id="oilHistoryEarlier" class="ghost">← Earlier years</button><span>Drag the scrollbar to move through the years.</span><button type="button" id="oilHistoryLater" class="ghost">Later years →</button></div>' : ""}<p id="oilHistoryPointInfo" class="oil-history-point-info" aria-live="polite">Touch or click the chart to inspect a survey point.</p><p>Range: ${oilMoney(low)}–${oilMoney(high)} per gallon. Points show survey observations, not estimated daily prices.</p></section>
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
    <section class="oil-card oil-price-metric"><small>Bottini Fuel · reported dealer quote</small><strong>${OIL_BOTTINI_REPORTED_QUOTE.price} / gal</strong><span>Reported ${OIL_BOTTINI_REPORTED_QUOTE.date}</span><p>Confirm the current price, fees, minimum order, and payment terms with Bottini before ordering. This quote is separate from the NYSERDA regional survey.</p><a href="${OIL_BOTTINI_SOURCE}" target="_blank" rel="noopener noreferrer">Bottini Fuel / Action Fuel page</a> · <a class="oil-compare-yorktown-link" href="${OIL_YORKTOWN_PRICE_SOURCE}" target="_blank" rel="noopener noreferrer">Compare Yorktown prices</a></section></div>
    ${oilRegionalPrice.error ? `<p class="oil-price-error" role="status">${escapeHtml(oilRegionalPrice.error)} ${regional == null ? "Use the source links to check prices." : "The last successful result remains displayed."}</p>` : ""}
    <section class="oil-card"><h3>What that could mean for your next delivery</h3>${regional == null ? "<p>Check the latest regional average to see estimated costs.</p>" : `<div class="oil-price-costs"><div><span>100 gallons</span><strong>${oilMoney(regional * 100)}</strong></div><div><span>150 gallons</span><strong>${oilMoney(regional * 150)}</strong></div><div><span>${oilNumber(data.capacity)} gallons · full tank</span><strong>${oilMoney(regional * data.capacity)}</strong></div></div>`}<p>Gallons × surveyed price only. Taxes, delivery fees, minimum order, payment method and your actual tank space may change the invoice.</p>${latestDelivery ? `<p>Your last entered delivery price: <b>${oilMoney(latestDelivery.price)} / gal</b> on ${escapeHtml(latestDelivery.date)}${latestDelivery.company ? ` from ${escapeHtml(latestDelivery.company)}` : ""}. It is historical, not a current quote.</p>` : ""}</section>
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

function oilTypicalDailyHdd(month) {
  const values = (window.HOME_OIL_WEATHER || []).filter(([period, hdd]) => Number(period.slice(5)) === month + 1 && Number.isFinite(Number(hdd)));
  if (!values.length) return null;
  return values.reduce((sum, [period, hdd]) => sum + Number(hdd) / new Date(Number(period.slice(0, 4)), month + 1, 0).getDate(), 0) / values.length;
}

function oilDailyUse(day, rates, weatherRows) {
  const month = day.getMonth(), seasonal = rates[month];
  const warmBase = [5, 6, 7].reduce((sum, index) => sum + rates[index], 0) / 3;
  const observed = weatherRows.get(getLocalIsoDate(day));
  const typicalHdd = oilTypicalDailyHdd(month);
  if (!observed || !Number.isFinite(observed.hdd) || !typicalHdd || typicalHdd < 1) return { gallons: seasonal, weather: observed || null, source: "seasonal average" };
  const base = Math.min(warmBase, seasonal);
  const factor = Math.min(2.5, Math.max(0, observed.hdd / typicalHdd));
  return { gallons: base + (seasonal - base) * factor, weather: observed, source: "observed weather" };
}

async function oilLoadDailyWeather(force = false) {
  const data = oilData();
  const latest = [...data.readings].sort((a, b) => `${b.date}T${b.time || ""}`.localeCompare(`${a.date}T${a.time || ""}`))[0];
  if (!latest || oilDailyWeather.status === "loading") return;
  const start = latest.date;
  if (!force && oilDailyWeather.start === start && Date.now() - oilDailyWeather.checkedAt < 2 * 3600000) return;
  oilDailyWeather = { ...oilDailyWeather, status: "loading", start, error: "" };
  try {
    const url = `${OIL_DAILY_WEATHER_SOURCE}?${new URLSearchParams({ sid: "KHPN", sdate: start, edate: oilIsoToday(), elems: "avgt,hdd", output: "json" })}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Weather request returned ${response.status}`);
    const result = await response.json();
    if (!Array.isArray(result.data)) throw new Error(result.error || "Daily weather data unavailable");
    const rows = new Map(result.data.map(([date, temp, hdd]) => [date, { temp: temp === "M" ? null : Number(temp), hdd: hdd === "M" ? null : Number(hdd) }]));
    oilDailyWeather = { status: "ready", rows, checkedAt: Date.now(), start, error: "" };
  } catch (error) {
    oilDailyWeather = { ...oilDailyWeather, status: "error", checkedAt: Date.now(), error: error.message || "Weather unavailable" };
  }
  if (document.querySelector("#homeHeatingOilDialog")?.open) renderHomeHeatingOil();
  if (document.querySelector("#oilDailyUsageDialog")?.open) renderOilDailyUsageDialog();
}

function oilProjection(data, today = oilIsoToday()) {
  const latest = [...data.readings].filter(item => item.date <= today).sort((a, b) => `${b.date}T${b.time || "00:00"}`.localeCompare(`${a.date}T${a.time || "00:00"}`))[0];
  if (!latest) return { status: "missing" };
  const age = Math.round((oilDate(today) - oilDate(latest.date)) / 86400000);
  if (age > 90 || age < 0) return { status: "stale", latest, age };
  const rates = oilSeasonalRates(data.deliveries);
  if (!rates.some(rate => rate > 0)) return { status: "no-history", latest };
  let gallons = data.capacity * latest.percent / 100;
  const futureDeliveries = data.deliveries.filter(item => item.date > latest.date && item.date <= today);
  const daily = [];
  const date = oilDate(latest.date);
  while (date < oilDate(today)) {
    const iso = getLocalIsoDate(date);
    const starting = Math.max(0, Math.min(data.capacity, gallons));
    const delivery = iso === latest.date ? 0 : futureDeliveries.filter(item => item.date === iso).reduce((sum, item) => sum + item.gallons, 0);
    gallons = Math.min(data.capacity, gallons + delivery);
    const usage = oilDailyUse(date, rates, oilDailyWeather.rows);
    const readingHour = latest.time && /^\d{2}:\d{2}$/.test(latest.time) ? Number(latest.time.slice(0, 2)) + Number(latest.time.slice(3)) / 60 : 0;
    const dayFraction = iso === latest.date ? Math.max(0, (24 - readingHour) / 24) : 1;
    const used = Math.min(Math.max(0, gallons), usage.gallons * dayFraction);
    gallons -= used;
    daily.push({ date: iso, starting, delivery, used, ending: Math.max(0, gallons), percent: Math.max(0, gallons) / data.capacity * 100, weather: usage.weather, source: usage.source, dayFraction });
    date.setDate(date.getDate() + 1);
  }
  const todayDelivery = futureDeliveries.filter(item => item.date === today).reduce((sum, item) => sum + item.gallons, 0);
  if (todayDelivery) { gallons = Math.min(data.capacity, gallons + todayDelivery); daily.push({ date: today, starting: Math.max(0, gallons - todayDelivery), delivery: todayDelivery, used: 0, ending: gallons, percent: gallons / data.capacity * 100, weather: null, source: "delivery", dayFraction: 0 }); }
  const current = Math.max(0, Math.min(data.capacity, gallons));
  let refillDate = ""; let daysToRefill = 0;
  if (gallons <= data.capacity * 0.25) refillDate = today;
  while (gallons > data.capacity * 0.25 && daysToRefill < 366) {
    gallons -= rates[date.getMonth()];
    daysToRefill++;
    if (gallons <= data.capacity * 0.25) refillDate = getLocalIsoDate(date);
    date.setDate(date.getDate() + 1);
  }
  return { status: age > 30 ? "stale-estimate" : "ready", latest, age, current, percent: current / data.capacity * 100, refillDate, daysToRefill, rates, daily };
}

function oilTankMiniTrend(projection, data) {
  if (!Number.isFinite(projection.percent)) return "";
  const modeled = (projection.daily || []).filter(row => row.dayFraction > 0).slice(-14);
  let levels, caption, description;
  if (modeled.length) {
    levels = [modeled[0].starting / data.capacity * 100, ...modeled.map(row => row.percent)];
    const days = modeled.reduce((sum, row) => sum + row.dayFraction, 0);
    const gallonsPerDay = modeled.reduce((sum, row) => sum + row.used, 0) / Math.max(days, 0.01);
    caption = `Estimated use: ${oilNumber(gallonsPerDay, 1)} gal/day · ${(gallonsPerDay / data.capacity * 100).toFixed(2)} points/day`;
    description = `Simulated tank level over ${oilNumber(days, 1)} days, from ${levels[0].toFixed(1)} to ${levels.at(-1).toFixed(1)} percent`;
  } else {
    const earlier = [...data.readings].filter(row => row.date < projection.latest.date || row.date === projection.latest.date && (row.time || "") < (projection.latest.time || ""))
      .sort((a, b) => `${b.date}T${b.time || ""}`.localeCompare(`${a.date}T${a.time || ""}`))[0];
    if (!earlier) return `<div class="oil-tank-trend-empty">Daily trend starts after the first modeled day.</div>`;
    const days = Math.max(1, Math.round((oilDate(projection.latest.date) - oilDate(earlier.date)) / 86400000));
    const pointsPerDay = (projection.latest.percent - earlier.percent) / days;
    levels = [earlier.percent, projection.latest.percent];
    caption = `Gauge change: ${pointsPerDay < 0 ? "−" : "+"}${Math.abs(pointsPerDay).toFixed(2)} points/day · ${days} days`;
    description = `Physical gauge changed from ${earlier.percent} to ${projection.latest.percent} percent over ${days} days`;
  }
  const low = Math.max(0, Math.min(...levels) - 3), high = Math.min(100, Math.max(...levels) + 3);
  const y = value => 32 - (value - low) / Math.max(1, high - low) * 26;
  const points = levels.map((value, index) => `${(index / Math.max(1, levels.length - 1) * 100).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  return `<div class="oil-tank-trend" role="img" aria-label="${description}"><svg viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true"><path d="M0 32H100" class="oil-tank-trend-baseline"/><polyline points="${points}" class="oil-tank-trend-line"/><circle cx="100" cy="${y(levels.at(-1)).toFixed(1)}" r="2.5" class="oil-tank-trend-dot"/></svg><small>${caption}</small></div>`;
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

function oilProjectionChartPoints(data, projection) {
  if (!Number.isFinite(projection.percent)) return [];
  const points = [{ date: oilIsoToday(), gallons: projection.current, actual: true }];
  const day = oilDate(oilIsoToday());
  for (let index = 1, gallons = projection.current; index <= 30; index++) {
    gallons = Math.max(0, gallons - Math.max(0, projection.rates[day.getMonth()] || 0));
    day.setDate(day.getDate() + 1);
    points.push({ date: getLocalIsoDate(day), gallons, actual: false });
  }
  return points;
}

function renderOilProjectionChart() {
  const dialog = document.querySelector("#oilProjectionChartDialog");
  if (!dialog) return;
  const data = oilData(), projection = oilProjection(data), points = oilProjectionChartPoints(data, projection);
  if (!points.length) { dialog.innerHTML = `<div class="oil-daily-head"><h2>Tank level projection</h2><button type="button" class="icon-button" id="oilChartClose">×</button></div><p>Record a recent gauge reading and delivery history to see a projection.</p>`; dialog.querySelector("#oilChartClose").onclick = () => dialog.close(); return; }
  const width = 1040, height = 410, left = 68, right = 90, top = 25, bottom = 60;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const x = index => left + index / 30 * plotWidth;
  const y = gallons => top + (1 - gallons / data.capacity) * plotHeight;
  const trace = points.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(point.gallons).toFixed(1)}`).join(" ");
  const zoneY = y(data.capacity * .25);
  const threshold = ratio => { const index = points.findIndex(point => point.gallons <= data.capacity * ratio); return index < 0 ? "Beyond 30 days" : `${index} days · ${points[index].date}`; };
  const display = index => `${points[index].date} · ${oilNumber(points[index].gallons, 1)} gal (${(points[index].gallons / data.capacity * 100).toFixed(1)}%)`;
  dialog.innerHTML = `<div class="oil-daily-head"><div><h2>Tank level trend · 31-day projection</h2><p>Starts at the latest physical reading and uses historical seasonal usage. Future weather and deliveries may change the result.</p></div><button type="button" class="icon-button" id="oilChartClose" aria-label="Close chart">×</button></div>
    <div class="oil-projection-summary"><div><small>Estimated now</small><strong>${oilNumber(projection.current, 1)} gal · ${projection.percent.toFixed(1)}%</strong></div><div><small>25% reserve</small><strong>${oilNumber(data.capacity * .25, 1)} gal</strong><span>${threshold(.25)}</span></div><div><small>20% tank level</small><strong>${oilNumber(data.capacity * .2, 1)} gal</strong><span>${threshold(.2)}</span></div></div>
    <div class="oil-projection-chart-wrap"><svg class="oil-projection-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Projected tank gallons over 31 days, with 25, 50 and 75 percent reference lines">
      <rect x="${left}" y="${zoneY}" width="${plotWidth}" height="${top + plotHeight - zoneY}" class="oil-chart-low-zone"/>
      ${[0,.25,.5,.75,1].map(ratio => `<line x1="${left}" x2="${left + plotWidth}" y1="${y(data.capacity * ratio)}" y2="${y(data.capacity * ratio)}" class="${ratio ? "oil-chart-reference" : "oil-chart-axis"}"/><text x="${left - 10}" y="${y(data.capacity * ratio) + 5}" text-anchor="end">${oilNumber(data.capacity * ratio)} gal</text><text x="${left + plotWidth + 10}" y="${y(data.capacity * ratio) + 5}">${ratio * 100}%</text>`).join("")}
      ${[0,5,10,15,20,25,30].map(index => `<line x1="${x(index)}" x2="${x(index)}" y1="${top}" y2="${top + plotHeight}" class="oil-chart-grid"/><text x="${x(index)}" y="${height - 22}" text-anchor="middle">${points[index].date.slice(5)}</text>`).join("")}
      <path d="${trace}" class="oil-chart-projection-line"/>
      ${points.filter((_, index) => index % 3 === 0 || index === 30).map(point => { const index = points.indexOf(point); return `<circle cx="${x(index)}" cy="${y(point.gallons)}" r="4" class="oil-chart-projection-dot"/>`; }).join("")}
      <circle cx="${x(0)}" cy="${y(points[0].gallons)}" r="7" class="oil-chart-actual-dot"/>
      <line class="oil-chart-cursor" x1="${x(0)}" x2="${x(0)}" y1="${top}" y2="${top + plotHeight}"/>
      <rect class="oil-chart-hit" x="${left}" y="${top}" width="${plotWidth}" height="${plotHeight}" fill="transparent"/>
    </svg></div><div class="oil-chart-readout" id="oilChartReadout" aria-live="polite">${display(0)}</div>
    <div class="oil-chart-legend"><span>● Current tank estimate</span><span>● Projected tank level</span><span>-- 25%, 50%, 75% reference</span><span>Low fuel zone (≤25%)</span></div>
    <p class="oil-daily-explain">Touch or move across the chart to inspect a day. This is a projection, not a physical reading. Check the tank gauge before ordering.</p>`;
  dialog.querySelector("#oilChartClose").onclick = () => dialog.close();
  const svg = dialog.querySelector(".oil-projection-chart"), cursor = dialog.querySelector(".oil-chart-cursor"), readout = dialog.querySelector("#oilChartReadout");
  const inspect = event => { const box = svg.getBoundingClientRect(), px = (event.clientX - box.left) / box.width * width; const index = Math.max(0, Math.min(30, Math.round((px - left) / plotWidth * 30))); cursor.setAttribute("x1", x(index)); cursor.setAttribute("x2", x(index)); readout.textContent = display(index); };
  svg.addEventListener("pointermove", inspect); svg.addEventListener("pointerdown", inspect);
}

function openOilProjectionChart() {
  let dialog = document.querySelector("#oilProjectionChartDialog");
  if (!dialog) { dialog = document.createElement("dialog"); dialog.id = "oilProjectionChartDialog"; document.body.append(dialog); }
  renderOilProjectionChart();
  if (!dialog.open) dialog.showModal();
}

function renderOilDailyUsageDialog() {
  const dialog = document.querySelector("#oilDailyUsageDialog");
  if (!dialog) return;
  const data = oilData(), projection = oilProjection(data);
  const daily = projection.daily || [];
  const used = daily.reduce((sum, row) => sum + row.used, 0);
  const weatherDays = daily.filter(row => row.source === "observed weather").length;
  dialog.innerHTML = `<div class="oil-daily-head"><div><h2>Daily tank-level estimate</h2><p>Starting from the latest physical gauge reading, ${projection.latest?.date || "not recorded"}${projection.latest?.time ? ` at ${projection.latest.time}` : ""}.</p></div><button type="button" class="icon-button" id="oilDailyClose" aria-label="Close daily usage">×</button></div>
    ${projection.status === "missing" || projection.status === "stale" || projection.status === "no-history" ? `<p class="oil-info">A recent gauge reading and delivery history are needed to simulate daily tank use.</p>` : `<div class="oil-daily-summary"><div><small>Estimated now</small><strong>${oilNumber(projection.current, 1)} gal · ${projection.percent.toFixed(1)}%</strong></div><div><small>Modeled use since reading</small><strong>${oilNumber(used, 1)} gal</strong></div><div><small>Observed-weather days</small><strong>${weatherDays} of ${daily.length}</strong></div></div>
    <button type="button" id="oilOpenProjectionChart" class="oil-chart-open-button">View 31-day tank projection chart ↗</button>
    <p class="oil-daily-explain">Each completed day subtracts an estimate based on historical delivery intervals and that day's Westchester Airport heating degree days. A missing observation uses the seasonal average. This is a simulation, not a new gauge reading.</p>
    <div class="oil-table-wrap oil-daily-table-wrap"><table class="oil-table oil-daily-table"><thead><tr><th>Day modeled</th><th>Temp</th><th>HDD</th><th>Start</th><th>Delivered</th><th>Used</th><th>End</th><th>Change</th><th>Tank</th><th>Basis</th></tr></thead><tbody>${daily.length ? [...daily].reverse().map(row => `<tr><td>${row.date}</td><td>${Number.isFinite(row.weather?.temp) ? `${oilNumber(row.weather.temp, 1)}°F` : "—"}</td><td>${Number.isFinite(row.weather?.hdd) ? oilNumber(row.weather.hdd, 1) : "—"}</td><td>${oilNumber(row.starting, 1)}</td><td>${row.delivery ? `+${oilNumber(row.delivery, 1)}` : "—"}</td><td>${row.used ? `−${oilNumber(row.used, 2)}` : "—"}</td><td>${oilNumber(row.ending, 1)}</td><td>${row.ending - row.starting >= 0 ? "+" : "−"}${oilNumber(Math.abs(row.ending - row.starting), 2)} gal</td><td>${row.percent.toFixed(1)}%</td><td>${row.source}${row.dayFraction > 0 && row.dayFraction < 1 ? " · partial day" : ""}</td></tr>`).join("") : `<tr><td colspan="10">No completed day since the latest gauge reading. The next day's estimate will appear here.</td></tr>`}</tbody></table></div>`}
    <div class="oil-daily-actions"><a href="${OIL_DAILY_WEATHER_SOURCE}?sid=KHPN&date=${oilIsoToday()}&elems=avgt,hdd&output=json" target="_blank" rel="noopener">ACIS weather source</a><button type="button" id="oilDailyRefresh" class="ghost">Refresh weather</button></div>${oilDailyWeather.error ? `<p class="oil-price-error">Weather request failed: ${escapeHtml(oilDailyWeather.error)}. Seasonal estimates are shown where observations are unavailable.</p>` : ""}`;
  dialog.querySelector("#oilDailyClose")?.addEventListener("click", () => dialog.close());
  dialog.querySelector("#oilOpenProjectionChart")?.addEventListener("click", openOilProjectionChart);
  dialog.querySelector("#oilDailyRefresh")?.addEventListener("click", () => oilLoadDailyWeather(true));
}

function openOilGaugePhotoDialog() {
  let dialog = document.querySelector("#oilGaugePhotoDialog");
  if (!dialog) { dialog = document.createElement("dialog"); dialog.id = "oilGaugePhotoDialog"; document.body.append(dialog); }
  dialog.innerHTML = `<div class="oil-daily-head"><div><h2>Read a tank gauge photo</h2><p>Choose a clear photo, then mark the dial so the app can calculate a level.</p></div><button type="button" class="icon-button" id="oilPhotoClose" aria-label="Close gauge photo">×</button></div>
    <label class="oil-photo-choose">Gauge photo<input id="oilGaugePhotoFile" type="file" accept="image/*"></label>
    <p class="oil-photo-help">Tap these four points on the photo in order: <b>center of the needle pivot</b>, <b>Empty (E)</b>, <b>Full (F)</b>, then <b>the needle tip</b>. The photo is used on this device to calculate the level; the image itself is not saved to Firebase.</p>
    <div class="oil-photo-stage" id="oilPhotoStage" hidden><div class="oil-photo-image-wrap" id="oilPhotoImageWrap"><img id="oilPhotoImage" alt="Uploaded oil tank gauge"></div></div>
    <div class="oil-photo-controls"><strong id="oilPhotoStep" role="status">Choose a photo to begin.</strong><button type="button" class="ghost" id="oilPhotoReset" disabled>Start markings over</button></div>
    <div class="oil-photo-result" id="oilPhotoResult" hidden><strong id="oilPhotoEstimate"></strong><p>Check the suggested level against the physical gauge before saving. The nearest 1/8-tank setting will be selected in the reading form.</p><button type="button" id="oilPhotoUseReading">Use this level in a new reading</button></div>`;
  const steps = ["needle pivot", "Empty (E)", "Full (F)", "needle tip"];
  const fileInput = dialog.querySelector("#oilGaugePhotoFile"), image = dialog.querySelector("#oilPhotoImage"), wrap = dialog.querySelector("#oilPhotoImageWrap"), stage = dialog.querySelector("#oilPhotoStage"), step = dialog.querySelector("#oilPhotoStep"), reset = dialog.querySelector("#oilPhotoReset"), result = dialog.querySelector("#oilPhotoResult"), estimate = dialog.querySelector("#oilPhotoEstimate");
  let photoUrl = "", points = [], suggested = null;
  const resetPoints = () => { points = []; suggested = null; wrap.querySelectorAll(".oil-photo-marker").forEach(marker => marker.remove()); result.hidden = true; step.textContent = `Tap the ${steps[0]}.`; };
  const cleanup = () => { if (photoUrl) URL.revokeObjectURL(photoUrl); photoUrl = ""; };
  dialog.querySelector("#oilPhotoClose").onclick = () => dialog.close();
  dialog.addEventListener("close", cleanup, { once: true });
  fileInput.onchange = () => {
    cleanup(); const file = fileInput.files?.[0]; if (!file) return;
    if (!file.type.startsWith("image/")) { step.textContent = "Choose an image file."; return; }
    photoUrl = URL.createObjectURL(file); image.src = photoUrl; stage.hidden = false; reset.disabled = false; resetPoints();
    image.onerror = () => { step.textContent = "This image could not be displayed. Try a JPEG or PNG photo."; stage.hidden = true; };
  };
  reset.onclick = resetPoints;
  wrap.onclick = event => {
    if (!image.complete || !image.naturalWidth || points.length >= 4) return;
    const rect = image.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    points.push({ x, y });
    const marker = document.createElement("span"); marker.className = "oil-photo-marker"; marker.textContent = String(points.length); marker.style.left = `${x * 100}%`; marker.style.top = `${y * 100}%`; marker.title = steps[points.length - 1]; wrap.append(marker);
    if (points.length < 4) { step.textContent = `Tap the ${steps[points.length]}.`; return; }
    const angle = point => Math.atan2(-(point.y - points[0].y), point.x - points[0].x);
    const turn = (from, to) => (from - to + Math.PI * 2) % (Math.PI * 2);
    const span = turn(angle(points[1]), angle(points[2]));
    const position = turn(angle(points[1]), angle(points[3]));
    if (span < .35 || span > 5.5 || position > span + .25) { step.textContent = "The marks do not describe the gauge arc. Start over and mark E, F, and the needle tip carefully."; reset.disabled = false; return; }
    const percent = Math.max(0, Math.min(100, position / span * 100));
    suggested = Math.round(percent / 12.5) * 12.5;
    estimate.textContent = `Photo estimate: ${percent.toFixed(1)}% · ${oilNumber(oilData().capacity * percent / 100)} gal. Nearest reading setting: ${suggested}% · ${oilNumber(oilData().capacity * suggested / 100)} gal.`;
    step.textContent = "Review the estimate, or start the markings over."; result.hidden = false;
  };
  dialog.querySelector("#oilPhotoUseReading").onclick = () => {
    if (suggested == null) return;
    dialog.close(); oilTab = "readings"; oilEditingReadingId = ""; oilReadingSaveStatus = { kind: "", text: "" }; renderHomeHeatingOil();
    const form = document.querySelector("#oilReadingForm"); if (!form) return;
    form.elements.percent.value = String(suggested);
    const now = new Date(); form.elements.time.value = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    form.elements.note.value = `Gauge photo estimate: ${suggested}%; verify against physical gauge`;
    form.elements.percent.focus();
  };
  if (!dialog.open) dialog.showModal();
}

function openOilDailyUsageDialog() {
  let dialog = document.querySelector("#oilDailyUsageDialog");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "oilDailyUsageDialog";
    document.body.append(dialog);
  }
  renderOilDailyUsageDialog();
  if (!dialog.open) dialog.showModal();
  oilLoadDailyWeather();
}

async function oilSaveTankReading(form, editingId = "") {
  if (!ensureCurrentUser("save a tank reading")) return;
  const button = form.querySelector('button[type="submit"]');
  const status = document.querySelector("#oilReadingSaveStatus");
  const record = { id: editingId || crypto.randomUUID(), date: form.elements.date.value, time: form.elements.time.value,
    percent: Number(form.elements.percent.value), note: form.elements.note.value.trim() };
  if (!record.date || !/^\d{2}:\d{2}$/.test(record.time) || !Number.isFinite(record.percent)) return;
  button.disabled = true;
  button.textContent = "Saving…";
  if (status) { status.textContent = "Saving to Firebase…"; status.className = "oil-reading-save-status"; }
  let cloudSaved = false;
  try {
    if (!supabaseEnabled || !supabaseClient || activeClientId !== "admin") throw new Error("Admin Firebase is not connected. Your entry remains in the form; reconnect and try again.");
    const clientId = activeClientId;
    const priorBaseline = remoteUpdatedAt || "";
    const docRef = supabaseClient.doc(supabaseClient.db, SUPABASE_TABLE, getSupabaseStateId());
    const savedAt = new Date().toISOString();
    let mergedReadings = [], liveBaseline = "";
    await supabaseClient.runTransaction(supabaseClient.db, async transaction => {
      const snapshot = await transaction.get(docRef);
      if (!snapshot.exists()) throw new Error("Admin Firebase record is missing. No reading was saved.");
      const live = snapshot.data() || {};
      liveBaseline = String(live.updated_at || "");
      const readings = Array.isArray(live.state?.homeHeatingOil?.readings) ? live.state.homeHeatingOil.readings : [];
      mergedReadings = readings.map(item => ({ ...item }));
      const sameTime = mergedReadings.find(item => item.date === record.date && item.time === record.time && item.id !== record.id);
      if (sameTime) throw new Error(`A reading for ${record.date} at ${record.time} already exists. Select Edit on that row instead.`);
      const index = mergedReadings.findIndex(item => item.id === record.id);
      if (editingId && index < 0) throw new Error("This reading is no longer in Firebase. Refresh the page and try again.");
      if (index < 0) mergedReadings.push(record);
      else mergedReadings[index] = record;
      transaction.update(docRef, { "state.homeHeatingOil.readings": mergedReadings, "state.lastSavedAt": savedAt, updated_at: savedAt });
    });
    cloudSaved = true;
    if (activeClientId !== clientId) return;
    oilData().readings = mergedReadings;
    state.lastSavedAt = savedAt;
    if (!pendingLocalSharedSaveAt && !sharedSaveInFlight && priorBaseline === liveBaseline) cacheRemoteUpdatedAt(savedAt);
    if (getStorageKey()) tryWriteLocalState(getStorageKey());
    queueJsonBackupSave("tank reading saved");
    oilEditingReadingId = "";
    oilReadingSaveStatus = { kind: "success", text: `Saved to Firebase: ${record.date} at ${record.time}. ${mergedReadings.length} reading${mergedReadings.length === 1 ? "" : "s"} retained.` };
    renderHomeHeatingOil();
  } catch (error) {
    oilReadingSaveStatus = { kind: "error", text: `${cloudSaved ? "Saved to Firebase, but this device could not finish updating: " : "Not saved to Firebase: "}${error.message || error}` };
    if (status) { status.textContent = oilReadingSaveStatus.text; status.className = "oil-reading-save-status is-error"; }
    button.disabled = false;
    button.textContent = editingId ? "Update Reading" : "Save Reading";
  }
}

function renderHomeHeatingOil() {
  const root = document.querySelector("#homeHeatingOilBody"); if (!root) return;
  const data = oilData(), rows = [...data.deliveries].sort((a, b) => b.date.localeCompare(a.date));
  const editingReading = data.readings.find(item => item.id === oilEditingReadingId);
  const latest = rows[0], projection = oilProjection(data);
  const hasTankEstimate = projection.status === "ready" || projection.status === "stale-estimate";
  const year = oilIsoToday().slice(0, 4);
  const yearRows = rows.filter(row => row.date.startsWith(year));
  const usageYears = [...new Set(rows.map(row => row.date.slice(0, 4)))].sort();
  if (!usageYears.includes(oilUsageYear) && oilUsageYear !== "average") oilUsageYear = usageYears.filter(value => value < year).at(-1) || usageYears.at(-1) || "average";
  const usageYearIndex = usageYears.indexOf(oilUsageYear);
  const rate = oilUsageYear === "average" ? oilSeasonalRates(rows) : oilMonthlyUsageForYear(rows, oilUsageYear);
  root.innerHTML = `<div class="oil-tabs" role="tablist">${[["overview","Overview"],["prices","Local Prices"],["priceHistory","Price Changes"],["efficiency","Efficiency Review"],["investment","Siding Investment"],["deliveries","Deliveries"],["readings","Tank Readings"],["savings","Save Energy"]].map(([key,label]) => `<button type="button" data-oil-tab="${key}" class="${oilTab === key ? "active" : "ghost"}" aria-selected="${oilTab === key}">${label}</button>`).join("")}<button type="button" id="oilGaugePhotoBtn" class="oil-gauge-photo-button">Read Gauge Photo</button></div>
  <div class="oil-kpis">
    <div class="oil-refill-group"><span class="oil-remaining-label">Remaining oil in tank</span><article class="${projection.status === "ready" && projection.daysToRefill <= 14 ? "oil-alert" : ""}"><div class="oil-tank-card-main"><div><small>Estimated tank level</small><button type="button" id="oilTankPercentButton" class="oil-tank-percent-button" title="Show daily tank usage"><strong>${hasTankEstimate ? `${Math.round(projection.percent)}%` : "Reading needed"}</strong>${hasTankEstimate ? `<span class="oil-tank-gallons">${oilNumber(projection.current)} gal estimated</span>` : ""}</button></div><button class="oil-tank-dial" id="oilTankDetailButton" type="button" title="Show daily tank usage" aria-label="Show daily tank usage and tank-level changes"><svg viewBox="0 0 120 76" aria-hidden="true"><path class="oil-dial-background" d="M 15 58 A 45 45 0 0 1 105 58"/><path class="oil-dial-fill" d="M 15 58 A 45 45 0 0 1 105 58" pathLength="100" style="stroke-dasharray:${hasTankEstimate ? Math.max(0, Math.min(100, projection.percent)) : 0} 100"/>${hasTankEstimate ? `<line class="oil-dial-needle" x1="60" y1="58" x2="60" y2="20" transform="rotate(${-90 + Math.max(0, Math.min(100, projection.percent)) * 1.8} 60 58)"/>` : ""}<circle class="oil-dial-center" cx="60" cy="58" r="4"/><text x="3" y="73">E</text><text x="26" y="30">1/4</text><text x="60" y="9" text-anchor="middle">1/2</text><text x="94" y="30" text-anchor="middle">3/4</text><text x="108" y="73">F</text></svg></button></div>${hasTankEstimate ? `<div class="oil-tank-level-track" role="meter" aria-label="Estimated tank level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(projection.percent)}"><b style="width:${projection.percent}%"></b></div>` : ""}<span class="oil-tank-estimate-note">${projection.status === "ready" ? `25% reserve around ${projection.refillDate || "later"} · last gauge ${projection.age} days ago` : projection.status === "stale-estimate" ? `Estimate from a ${projection.age}-day-old gauge reading. Check the gauge before ordering.` : projection.status === "stale" ? `Last reading ${projection.age} days old; update the gauge for an estimate.` : "Record a tank gauge reading to start estimating."}</span></article></div>
    <article><small>Tank capacity</small><strong>${oilNumber(data.capacity)} gal</strong></article>
    <article><small>Latest delivery</small><strong>${latest ? `${oilNumber(latest.gallons)} gal` : "—"}</strong><span>${latest?.date || "No deliveries"}</span></article>
    <article><small>${year} delivered</small><strong>${oilNumber(yearRows.reduce((n,r)=>n+r.gallons,0))} gal</strong><span>${oilMoney(yearRows.reduce((n,r)=>n+(r.amount ?? r.gallons*r.price),0))}</span></article>
  </div>
  ${oilTab === "overview" ? `<div class="oil-two-col"><section class="oil-card"><div class="oil-chart-heading"><h3>Monthly use estimate <small>gal / day</small></h3><div class="oil-year-controls"><button type="button" id="oilPrevYear" class="ghost" aria-label="Previous year" ${usageYearIndex <= 0 && oilUsageYear !== "average" ? "disabled" : ""}>←</button><select id="oilUsageYear" aria-label="Usage chart year"><option value="average" ${oilUsageYear === "average" ? "selected" : ""}>2022–present average</option>${usageYears.map(value => `<option value="${value}" ${oilUsageYear === value ? "selected" : ""}>${value}</option>`).join("")}</select><button type="button" id="oilNextYear" class="ghost" aria-label="Next year" ${usageYearIndex >= usageYears.length - 1 || oilUsageYear === "average" ? "disabled" : ""}>→</button></div></div>${oilBarChart(rate, oilUsageYear === "average" ? "2022–present average" : oilUsageYear)}<p>${oilUsageYear === "average" ? "Seasonal average from 2022–present delivery intervals." : `${oilUsageYear} estimate from delivery-to-delivery intervals. A dash means fewer than 14 covered days for that month.`} Delivery amounts approximate use; actual consumption can vary.</p></section><section class="oil-card"><h3>Annual deliveries <small>completed years · scroll for earlier years</small></h3>${oilAnnualChart(rows)}<p>Cost uses recorded invoice totals when available; otherwise gallons × entered unit price.</p></section></div><div class="oil-info">${projection.status === "ready" ? `Based on the ${projection.latest.date} reading, approximately <b>${oilNumber(projection.current)} gallons</b> remain. Plan to order by <b>${projection.refillDate || "your next gauge check"}</b> (25% reserve). ${projection.daysToRefill <= 14 ? "The tank is within the 14-day refill window." : "Recheck the gauge weekly."}` : projection.status === "stale-estimate" ? `The displayed <b>${oilNumber(projection.current)} gallon</b> estimate projects seasonal usage from the ${projection.latest.date} gauge reading. That reading is ${projection.age} days old, so check the gauge before relying on the level or refill date. Oil level alerts use a reading no more than 90 days old and ask you to verify the physical gauge.` : "A gauge reading is required for a reliable oil-level forecast and alerts. Readings older than 90 days are not used to show a tank-level estimate."}</div>` : ""}
  ${oilTab === "efficiency" ? oilEfficiencyView(rows) : ""}
  ${oilTab === "prices" ? oilPriceView(data) : ""}
  ${oilTab === "priceHistory" ? oilPriceHistoryView() : ""}
  ${oilTab === "investment" ? oilInvestmentView(data) : ""}
  ${oilTab === "deliveries" ? `<div class="oil-toolbar"><label>Search deliveries<input id="oilSearch" type="search" value="${escapeAttribute(oilSearch)}" placeholder="Company, payer, notes, date"></label><button id="oilAddDelivery" type="button">Add Delivery</button></div><div id="oilEditor"></div><div class="oil-table-wrap"><table class="oil-table"><thead><tr><th>Date</th><th>Gallons</th><th>Price / gal</th><th>Amount</th><th>Company</th><th>Paid by</th><th>Gauge note</th><th>Notes</th><th>Actions</th></tr></thead><tbody>${rows.filter(row => `${row.date} ${row.company} ${row.paidBy} ${row.notes}`.toLowerCase().includes(oilSearch.toLowerCase())).map(row => `<tr><td>${escapeHtml(row.date)}</td><td>${oilNumber(row.gallons,1)}</td><td>${oilMoney(row.price)}</td><td>${row.amount == null ? "—" : oilMoney(row.amount)}</td><td>${escapeHtml(row.company)}</td><td>${escapeHtml(row.paidBy)}</td><td>${escapeHtml(row.levelNote)}</td><td>${escapeHtml(row.notes)}</td><td><button type="button" class="ghost oil-edit" data-id="${escapeAttribute(row.id)}">Edit</button><button type="button" class="ghost oil-delete" data-id="${escapeAttribute(row.id)}">Delete</button></td></tr>`).join("")}</tbody></table></div><p class="oil-footnote">Source: Home Heating Oil.xlsx. Blank invoice amounts stay blank; historic gauge notes are preserved as written where recognizable.</p>` : ""}
  ${oilTab === "readings" ? `<section class="oil-card"><h3>${editingReading ? "Update tank gauge" : "Record tank gauge"}</h3><p>Read the physical gauge and enter its percentage. A daily check on this computer uses the newest reading when it is at most 90 days old. At or below 1/2, 1/4, and 1/8 tank, it sends an email and attempts a Verizon text once per level until the next delivery. Check the physical gauge before ordering; Verizon's legacy email-to-text delivery is not guaranteed.</p><form id="oilReadingForm" class="oil-reading-form"><label>Date<input name="date" type="date" value="${editingReading?.date || oilIsoToday()}" max="${oilIsoToday()}" required></label><label>Tank level<select name="percent">${[100,87.5,75,62.5,50,37.5,25,12.5,0].map(p => `<option value="${p}"${editingReading?.percent === p ? " selected" : ""}>${p}% · ${oilNumber(data.capacity*p/100)} gal</option>`).join("")}</select></label><label>Note<input name="note" value="${escapeAttribute(editingReading?.note || "")}" placeholder="Gauge check or service note"></label><button type="submit">${editingReading ? "Update Reading" : "Save Reading"}</button>${editingReading ? '<button type="button" id="oilCancelReading" class="ghost">Cancel</button>' : ""}</form><p id="oilReadingSaveStatus" class="oil-reading-save-status ${oilReadingSaveStatus.kind === "error" ? "is-error" : oilReadingSaveStatus.kind === "success" ? "is-success" : ""}" role="status">${escapeHtml(oilReadingSaveStatus.text)}</p></section><div class="oil-table-wrap"><table class="oil-table"><thead><tr><th>Date</th><th>Gauge</th><th>Approx. gallons</th><th>Note</th><th>Actions</th></tr></thead><tbody>${[...data.readings].sort((a,b)=>b.date.localeCompare(a.date)).map(row=>`<tr><td>${row.date}</td><td>${row.percent}%</td><td>${oilNumber(data.capacity*row.percent/100)}</td><td>${escapeHtml(row.note)}</td><td><button type="button" class="ghost oil-edit-reading" data-id="${escapeAttribute(row.id)}">Edit</button><button type="button" class="ghost oil-delete-reading" data-id="${escapeAttribute(row.id)}">Delete</button></td></tr>`).join("")}</tbody></table></div>` : ""}
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
  root.querySelector("#oilTankDetailButton")?.addEventListener("click", openOilDailyUsageDialog);
  root.querySelector("#oilTankPercentButton")?.addEventListener("click", openOilDailyUsageDialog);
  root.querySelector("#oilGaugePhotoBtn")?.addEventListener("click", openOilGaugePhotoDialog);
  root.querySelectorAll("[data-oil-tab]").forEach(button => button.addEventListener("click", () => { oilTab = button.dataset.oilTab; oilEditingId = ""; oilReadingSaveStatus = { kind: "", text: "" }; renderHomeHeatingOil(); if (oilTab === "prices") checkOilRegionalPrice(); if (oilTab === "priceHistory") checkOilPriceHistory(); }));
  root.querySelector("#oilCheckPrice")?.addEventListener("click", () => checkOilRegionalPrice(true));
  root.querySelector("#oilRefreshHistory")?.addEventListener("click", () => checkOilPriceHistory(true));
  root.querySelectorAll("[data-oil-range]").forEach(button => button.addEventListener("click", () => { oilHistoryRange = button.dataset.oilRange; oilHistorySelectedDate = ""; renderHomeHeatingOil(); }));
  const historyScroll = root.querySelector("#oilHistoryScroll");
  root.querySelector("#oilHistoryEarlier")?.addEventListener("click", () => historyScroll?.scrollBy({ left: -historyScroll.clientWidth * .8, behavior: "smooth" }));
  root.querySelector("#oilHistoryLater")?.addEventListener("click", () => historyScroll?.scrollBy({ left: historyScroll.clientWidth * .8, behavior: "smooth" }));
  if (historyScroll && oilHistoryRange === "all") requestAnimationFrame(() => { historyScroll.scrollLeft = historyScroll.scrollWidth; });
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
  root.querySelectorAll(".oil-edit-reading").forEach(button => button.addEventListener("click", () => { oilEditingReadingId = button.dataset.id; oilReadingSaveStatus = { kind: "", text: "" }; renderHomeHeatingOil(); root.querySelector("#oilReadingForm [name='date']")?.focus(); }));
  root.querySelector("#oilCancelReading")?.addEventListener("click", () => { oilEditingReadingId = ""; renderHomeHeatingOil(); });
  root.querySelector("#oilReadingForm")?.addEventListener("submit", event => { event.preventDefault(); oilSaveTankReading(event.currentTarget, oilEditingReadingId); });
  if (document.querySelector("#homeHeatingOilDialog")?.open) oilLoadDailyWeather();
}

function renderOilEditor() {
  const target = document.querySelector("#oilEditor"); if (!target) return;
  const existing = oilData().deliveries.find(item => item.id === oilEditingId) || {};
  target.innerHTML = `<form id="oilDeliveryForm" class="oil-editor"><h3>${oilEditingId === "new" ? "Add delivery" : "Update delivery"}</h3><div class="oil-editor-fields"><label>Date<input name="date" type="date" value="${escapeAttribute(existing.date || oilIsoToday())}" required></label><label>Gallons<input name="gallons" type="number" min="0.1" max="${OIL_TANK_CAPACITY}" step="0.1" value="${existing.gallons || ""}" required></label><label>Price / gal<input name="price" type="number" min="0" step="0.001" value="${existing.price ?? ""}"></label><label>Invoice amount<input name="amount" type="number" min="0" step="0.01" value="${existing.amount ?? ""}"></label><label>Company<input name="company" value="${escapeAttribute(existing.company || "")}"></label><label>Paid by<input name="paidBy" value="${escapeAttribute(existing.paidBy || "")}"></label><label>Gauge note<input name="levelNote" value="${escapeAttribute(existing.levelNote || "")}"></label><label>Notes<input name="notes" value="${escapeAttribute(existing.notes || "")}"></label></div><div class="oil-form-actions"><button type="submit">Save Delivery</button><button type="button" id="oilCancelEdit" class="ghost">Cancel</button></div></form>`;
  target.querySelector("#oilCancelEdit").addEventListener("click", () => { oilEditingId = ""; target.innerHTML = ""; });
  target.querySelector("#oilDeliveryForm").addEventListener("submit", event => { event.preventDefault(); if (!ensureCurrentUser("save an oil delivery")) return; const form = event.currentTarget, e = form.elements; const record = normalizeHomeHeatingOil({ deliveries: [{ id: oilEditingId === "new" ? crypto.randomUUID() : oilEditingId, date: e.date.value, gallons: e.gallons.value, price: e.price.value, amount: e.amount.value, company: e.company.value, paidBy: e.paidBy.value, levelNote: e.levelNote.value, notes: e.notes.value }] }).deliveries[0]; if (!record) return; const data = oilData(); if (oilEditingId === "new") data.deliveries.push(record); else { const i = data.deliveries.findIndex(row => row.id === oilEditingId); if (i >= 0) data.deliveries[i] = record; } oilEditingId = ""; saveState(); renderHomeHeatingOil(); });
}

document.querySelector("#homeHeatingOilBtn")?.addEventListener("click", () => { if (!isAdminClient()) return; oilTab = "overview"; renderHomeHeatingOil(); document.querySelector("#homeHeatingOilDialog").showModal(); oilLoadDailyWeather(); });
document.querySelector("#closeHomeHeatingOilDialog")?.addEventListener("click", () => document.querySelector("#homeHeatingOilDialog").close());
let oilLastDisplayedDate = oilIsoToday();
setInterval(() => {
  const currentDate = oilIsoToday();
  if (currentDate === oilLastDisplayedDate) return;
  oilLastDisplayedDate = currentDate;
  if (document.querySelector("#homeHeatingOilDialog")?.open) { renderHomeHeatingOil(); oilLoadDailyWeather(true); }
  if (document.querySelector("#oilDailyUsageDialog")?.open) renderOilDailyUsageDialog();
}, 60000);
