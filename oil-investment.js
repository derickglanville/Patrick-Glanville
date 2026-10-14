"use strict";

// Delivery totals are a proxy for consumption. Keep every modeled dollar separate
// from a measured utility saving, especially when tank levels are unavailable.
const OIL_PROJECT_DATE = "2022-07-01";
const OIL_PROJECT_END = "2037-06-30";
const OIL_WEATHER_SOURCE = "https://data.rcc-acis.org/StnData?sid=KHPN&sdate=2015-09&edate=2026-09&elems=mly_sum_hdd,mly_sum_cdd&output=csv";
const oilInvestmentDefaults = { cost: 39000, oilPrice: "", oilInflation: 2, electricInflation: 2, discountRate: 4, conservativeGain: 0, centralGain: "", optimisticGain: "", scenario: "central" };

function oilInvestmentInputs(value) {
  const raw = { ...oilInvestmentDefaults, ...(value || {}) };
  const clamp = (item, fallback, min, max) => Number.isFinite(Number(item)) && item !== "" ? Math.min(max, Math.max(min, Number(item))) : fallback;
  return {
    cost: clamp(raw.cost, 39000, 0, 10000000),
    oilPrice: raw.oilPrice === "" ? "" : clamp(raw.oilPrice, "", 0, 100),
    oilInflation: clamp(raw.oilInflation, 2, -10, 30),
    electricInflation: clamp(raw.electricInflation, 2, -10, 30),
    discountRate: clamp(raw.discountRate, 4, 0, 30),
    conservativeGain: clamp(raw.conservativeGain, 0, -100, 100),
    centralGain: raw.centralGain === "" ? "" : clamp(raw.centralGain, "", -100, 100),
    optimisticGain: raw.optimisticGain === "" ? "" : clamp(raw.optimisticGain, "", -100, 100),
    scenario: ["conservative", "central", "optimistic"].includes(raw.scenario) ? raw.scenario : "central"
  };
}

function oilSeasonWeather(startYear, weather = window.HOME_OIL_WEATHER || []) {
  const lookup = new Map(weather.map(([month, hdd]) => [month, hdd]));
  const months = [9,10,11,12].map(month => `${startYear}-${String(month).padStart(2,"0")}`)
    .concat([1,2,3,4].map(month => `${startYear+1}-${String(month).padStart(2,"0")}`));
  if (!months.every(month => Number.isFinite(lookup.get(month)))) return null;
  return months.reduce((sum, month) => sum + lookup.get(month), 0);
}

function oilInvestmentAnalysis(deliveries, weather = window.HOME_OIL_WEATHER || [], today = oilIsoToday()) {
  const endYear = Number(today.slice(0,4)) - (Number(today.slice(5,7)) < 5 ? 1 : 0);
  const seasons = [];
  for (let year = 2015; year <= Math.min(2025, endYear - 1); year++) {
    const hdd = oilSeasonWeather(year, weather);
    if (!hdd) continue;
    const items = deliveries.filter(item => item.date >= `${year}-09-01` && item.date < `${year+1}-05-01`);
    const gallons = items.reduce((sum, item) => sum + item.gallons, 0);
    if (!gallons) continue;
    const cost = items.reduce((sum, item) => sum + (item.amount ?? item.gallons * item.price), 0);
    seasons.push({ year, label: `${year}–${String(year+1).slice(2)}`, gallons, cost, hdd, intensity: gallons / hdd * 1000, price: cost / gallons, period: year < 2022 ? "before" : "after" });
  }
  const before = seasons.filter(row => row.period === "before");
  const after = seasons.filter(row => row.period === "after");
  const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0);
  const baseline = before.length ? sum(before, "gallons") / sum(before, "hdd") : null;
  const postRate = after.length ? sum(after, "gallons") / sum(after, "hdd") : null;
  const observedGain = baseline && postRate != null ? (1 - postRate / baseline) * 100 : null;
  const averageHdd = before.length ? sum(before, "hdd") / before.length : null;
  const historical = seasons.map(row => ({ ...row,
    expectedGallons: row.period === "after" && baseline != null ? baseline * row.hdd : null,
    estimatedGallonsSaved: row.period === "after" && baseline != null ? baseline * row.hdd - row.gallons : null,
    estimatedOilSavings: row.period === "after" && baseline != null ? (baseline * row.hdd - row.gallons) * row.price : null
  }));
  const latestPrice = [...deliveries].sort((a,b) => b.date.localeCompare(a.date)).find(item => item.price > 0)?.price || null;
  return { seasons: historical, before, after, baseline, postRate, observedGain, averageHdd, latestPrice };
}

function oilInvestmentProjection(analysis, inputs) {
  const central = inputs.centralGain === "" ? (analysis.observedGain ?? 0) : inputs.centralGain;
  const optimistic = inputs.optimisticGain === "" ? central + 5 : inputs.optimisticGain;
  const gain = { conservative: inputs.conservativeGain, central, optimistic }[inputs.scenario];
  const byYear = new Map(analysis.seasons.filter(row => row.period === "after").map(row => [row.year, row]));
  let cumulative = 0, npv = -inputs.cost, breakEven = null;
  const rows = [];
  for (let n = 1; n <= 15; n++) {
    const startYear = 2021 + n;
    const actual = byYear.get(startYear);
    const forecast = !actual;
    const price = inputs.oilPrice === "" ? analysis.latestPrice : inputs.oilPrice;
    const oil = actual ? actual.estimatedOilSavings : (analysis.baseline || 0) * (analysis.averageHdd || 0) * gain / 100 * (price || 0) * Math.pow(1 + inputs.oilInflation / 100, Math.max(0, n - 4));
    cumulative += oil;
    npv += oil / Math.pow(1 + inputs.discountRate / 100, n);
    if (breakEven == null && cumulative >= inputs.cost) breakEven = n;
    rows.push({ n, years: `${startYear}–${String(startYear+1).slice(2)}`, forecast, oil, cumulative, net: cumulative - inputs.cost, roi: inputs.cost ? (cumulative - inputs.cost) / inputs.cost * 100 : null, gallons: actual?.estimatedGallonsSaved ?? (analysis.baseline || 0) * (analysis.averageHdd || 0) * gain / 100 });
  }
  return { rows, gain, central, optimistic, npv, breakEven };
}

function oilInvestmentChart(rows, cost) {
  const w = 760, h = 270, left = 66, right = 18, top = 18, bottom = 40;
  const values = [0, cost, ...rows.map(row => row.cumulative)];
  const min = Math.min(0, ...values), max = Math.max(1, ...values);
  const x = n => left + (n - 1) * (w - left - right) / 14;
  const y = value => top + (max - value) * (h - top - bottom) / (max - min || 1);
  const ticks = [0, .25, .5, .75, 1].map(fraction => min + (max - min) * fraction);
  const path = rows.map((row, index) => `${index ? "L" : "M"}${x(row.n).toFixed(1)},${y(row.cumulative).toFixed(1)}`).join(" ");
  return `<div class="oil-investment-chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Modeled cumulative oil savings versus ${oilMoney(cost)} investment over 15 project years">${ticks.map(value => `<line x1="${left}" y1="${y(value)}" x2="${w-right}" y2="${y(value)}" class="grid"/><text x="${left-7}" y="${y(value)+4}" text-anchor="end">${oilMoney(value).replace(/\.00$/, "")}</text>`).join("")}<line x1="${left}" y1="${y(cost)}" x2="${w-right}" y2="${y(cost)}" class="target"/><path d="${path}" class="savings"/>${rows.map(row => `<circle cx="${x(row.n)}" cy="${y(row.cumulative)}" r="3.2" class="dot"><title>Year ${row.n}: ${oilMoney(row.cumulative)} cumulative oil savings</title></circle>`).join("")}${[1,5,10,15].map(n => `<text x="${x(n)}" y="${h-10}" text-anchor="middle">Y${n}</text>`).join("")}</svg><div class="oil-investment-key"><span><i class="line"></i> Cumulative oil estimate</span><span><i class="dash"></i> Project cost</span></div></div>`;
}

function oilInvestmentView(data) {
  const analysis = oilInvestmentAnalysis(data.deliveries);
  const inputs = oilInvestmentInputs(data.investment);
  const projection = oilInvestmentProjection(analysis, inputs);
  const fmt = value => value == null ? "—" : oilMoney(value);
  const signed = value => value == null ? "—" : `${value >= 0 ? "+" : "−"}${oilNumber(Math.abs(value), 1)}`;
  const final = projection.rows.at(-1);
  return `<div class="oil-investment">
    <section class="oil-card oil-investment-hero"><div><small>July 2022 – June 2037 · 15-year analysis</small><h3>Siding, windows and insulation</h3><p>Approximately ${oilMoney(inputs.cost)} invested in siding and replacement windows with two new insulation layers. Yorktown Heights, New York. Oil delivery history is compared with monthly base-65°F heating degree days at Westchester County Airport.</p></div><div class="oil-investment-badge">${analysis.observedGain == null ? "Weather-adjusted gain unavailable" : `${oilNumber(Math.abs(analysis.observedGain),1)}% ${analysis.observedGain >= 0 ? "lower" : "higher"} oil / HDD`}<small>Observed association · not proof of cause</small></div></section>
    <div class="oil-investment-metrics"><article><small>Before · 2015–22</small><strong>${analysis.baseline == null ? "—" : oilNumber(analysis.baseline * 1000,1)}</strong><span>gal / 1,000 HDD</span></article><article><small>After · 2022–26</small><strong>${analysis.postRate == null ? "—" : oilNumber(analysis.postRate * 1000,1)}</strong><span>gal / 1,000 HDD</span></article><article><small>15-year oil-only net</small><strong>${fmt(final.net)}</strong><span>Modeled · ${inputs.scenario} scenario</span></article><article><small>Break-even</small><strong>${projection.breakEven ? `Year ${projection.breakEven}` : "Not reached"}</strong><span>In modeled 15 years</span></article></div>
    <section class="oil-card"><h3>Interpretation and limits</h3><p>The measured record is oil <em>delivered</em>, not oil burned. The weather-adjusted change is an association with the July 2022 work, not a verified causal saving. Delivery timing and unknown starting/ending tank levels can move gallons between seasons. Changes in heating equipment, thermostat settings, occupancy, heated area and oil-fired hot water have not been quantified. Dollar estimates and ROI below are provisional oil-only models.</p><p>The 2025–26 season had <b>${oilNumber(analysis.seasons.find(row => row.year === 2025)?.hdd)} HDD</b>; the seven pre-project seasons averaged <b>${oilNumber(analysis.averageHdd)} HDD</b>. Weather normalization prevents a colder winter from being mistaken for poorer insulation performance.</p></section>
    <section class="oil-card"><h3>Weather-adjusted heating history <small>September–April</small></h3><div class="oil-table-wrap"><table class="oil-table oil-investment-table"><thead><tr><th>Season</th><th>Phase</th><th>Delivered gal</th><th>Recorded cost</th><th>HDD</th><th>Gal / 1,000 HDD</th><th>Expected without work</th><th>Estimated gal saved</th><th>Estimated oil $ saved</th></tr></thead><tbody>${analysis.seasons.map(row => `<tr><td>${row.label}</td><td>${row.period === "before" ? "Before" : "After"}</td><td>${oilNumber(row.gallons)}</td><td>${fmt(row.cost)}</td><td>${oilNumber(row.hdd)}</td><td>${oilNumber(row.intensity,1)}</td><td>${row.expectedGallons == null ? "—" : oilNumber(row.expectedGallons)}</td><td>${row.estimatedGallonsSaved == null ? "—" : signed(row.estimatedGallonsSaved)}</td><td>${fmt(row.estimatedOilSavings)}</td></tr>`).join("")}</tbody></table></div><p>Pre-project baseline = total 2015–22 September–April gallons ÷ total HDD. Expected post gallons = baseline × each season's HDD. Estimated oil dollars = estimated gallons saved × that season's recorded average cost per gallon. Negative values remain negative.</p></section>
    <div class="oil-two-col"><section class="oil-card"><h3>Cooling and solar data</h3><div class="oil-table-wrap"><table class="oil-table oil-investment-cooling"><thead><tr><th>NYSEG bill period</th><th>Grid imports</th><th>Solar generation</th><th>Grid exports</th><th>Total home use</th><th>AC kWh / savings</th></tr></thead><tbody><tr><td>Jul 2–Aug 5, 2026</td><td>810 kWh</td><td>—</td><td>—</td><td>—</td><td>—</td></tr><tr><td>Aug 6–Sep 3, 2026</td><td>518 kWh</td><td>—</td><td>—</td><td>—</td><td>—</td></tr></tbody></table></div><p>Grid import figures come from the project handoff and have not been checked against bills here. They are not total home or AC use. Aligned Sunrun generation, grid exports, pre-project electricity and AC-specific measurements are missing; cooling savings cannot be calculated. Total home use would require generation + imports − exports over matching dates. Westchester Airport recorded ${oilNumber((window.HOME_OIL_WEATHER || []).find(row => row[0] === "2026-07")?.[2])} CDD in July 2026 and ${oilNumber((window.HOME_OIL_WEATHER || []).find(row => row[0] === "2026-08")?.[2])} CDD in August, but these calendar months do not align with the bill periods and CDD alone cannot identify AC consumption.</p></section><section class="oil-card"><h3>Scenario assumptions</h3><form id="oilInvestmentForm" class="oil-investment-form"><label>Project cost<input name="cost" type="number" min="0" step="100" value="${inputs.cost}"></label><label>Future oil price / gal<input name="oilPrice" type="number" min="0" max="100" step="0.01" value="${inputs.oilPrice}" placeholder="Latest ${analysis.latestPrice?.toFixed(2) ?? "unavailable"}"></label><label>Future oil price change / year (%)<input name="oilInflation" type="number" min="-10" max="30" step="0.1" value="${inputs.oilInflation}"></label><label>Future electric price change (%)<input name="electricInflation" type="number" min="-10" max="30" step="0.1" value="${inputs.electricInflation}"></label><label>Discount rate (%)<input name="discountRate" type="number" min="0" max="30" step="0.1" value="${inputs.discountRate}"></label><label>Conservative gain (%)<input name="conservativeGain" type="number" min="-100" max="100" step="0.1" value="${inputs.conservativeGain}"></label><label>Central gain (%)<input name="centralGain" type="number" min="-100" max="100" step="0.1" value="${inputs.centralGain}" placeholder="Observed ${analysis.observedGain?.toFixed(1) ?? "unavailable"}"></label><label>Optimistic gain (%)<input name="optimisticGain" type="number" min="-100" max="100" step="0.1" value="${inputs.optimisticGain}" placeholder="Central + 5 points"></label><label>Forecast scenario<select name="scenario">${["conservative","central","optimistic"].map(item => `<option value="${item}" ${inputs.scenario === item ? "selected" : ""}>${item[0].toUpperCase()+item.slice(1)}</option>`).join("")}</select></label><button type="submit">Apply assumptions</button></form><p>Blank central uses the observed weather-adjusted point estimate (${analysis.observedGain?.toFixed(1) ?? "—"}%). Blank optimistic adds 5 percentage points; conservative starts at 0%. These are adjustable planning assumptions, not measured improvement rates. Future years use the pre-project average HDD and latest recorded oil price (${fmt(analysis.latestPrice)}/gal) unless overridden. The electric price assumption is saved for later cooling analysis and does not affect the current oil-only return.</p></section></div>
    <section class="oil-card"><h3>15-year oil-only outlook</h3><div class="oil-investment-metrics compact"><article><small>Cumulative oil estimate</small><strong>${fmt(final.cumulative)}</strong></article><article><small>Net after project cost</small><strong>${fmt(final.net)}</strong></article><article><small>Simple ROI</small><strong>${final.roi == null ? "—" : `${final.roi.toFixed(1)}%`}</strong></article><article><small>Discounted NPV</small><strong>${fmt(projection.npv)}</strong></article></div>${oilInvestmentChart(projection.rows, inputs.cost)}<p>Years 1–4 use weather-adjusted delivery history (estimated, with actual season oil prices). Later years use the selected gain, pre-project average HDD, latest recorded price and annual price change. Discounted NPV includes the initial cost. Resale value and comfort are excluded from cash returns.</p><div class="oil-table-wrap"><table class="oil-table oil-investment-table"><thead><tr><th>Project year</th><th>Period</th><th>Basis</th><th>Oil saving</th><th>Cooling</th><th>Maintenance</th><th>Annual total*</th><th>Cumulative*</th><th>Net after cost*</th><th>ROI*</th></tr></thead><tbody>${projection.rows.map(row => `<tr><td>${row.n}</td><td>${row.years}</td><td>${row.forecast ? "Forecast" : "History estimate"}</td><td>${fmt(row.oil)}</td><td>—</td><td>—</td><td>${fmt(row.oil)}</td><td>${fmt(row.cumulative)}</td><td>${fmt(row.net)}</td><td>${row.roi == null ? "—" : `${row.roi.toFixed(1)}%`}</td></tr>`).join("")}</tbody></table></div><p>* Oil-only totals; cooling and maintenance are unavailable, not assumed to be zero actual savings. Break-even applies to the oil-only model.</p></section>
    <p class="oil-footnote">Sources: <a href="${OIL_WEATHER_SOURCE}" target="_blank" rel="noopener">ACIS monthly HDD/CDD, Westchester County Airport (KHPN)</a>, base 65°F; Home Heating Oil.xlsx delivery records imported into this app; project facts and 2026 NYSEG import figures from the October 14, 2026 user handoff. Weather months available September 2015–September 2026. Installation July 2022, project horizon through June 2037.</p>
  </div>`;
}

function wireOilInvestment(root, data) {
  root.querySelector("#oilInvestmentForm")?.addEventListener("submit", event => {
    event.preventDefault();
    if (!ensureCurrentUser("save siding investment assumptions")) return;
    const form = event.currentTarget;
    data.investment = oilInvestmentInputs(Object.fromEntries(new FormData(form)));
    saveState();
    renderHomeHeatingOil();
  });
}
