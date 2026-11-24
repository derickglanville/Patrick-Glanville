"use strict";

const HEATING_ZONE_SEED = [
  { id: "master", floor: "Top floor", rooms: "Master bedroom", conductors: 3 },
  { id: "bedrooms", floor: "Top floor", rooms: "Three other bedrooms", conductors: 3 },
  { id: "main", floor: "Main floor", rooms: "Living room, dining room, kitchen, and hallway", conductors: 4 },
  { id: "basement", floor: "Basement", rooms: "Basement", conductors: 3 }
];
const HEATING_ZONE_CHECKS = [
  ["terminals", "Identify and photograph thermostat and zone-control terminals"],
  ["heatWires", "Confirm which two conductors currently operate heat"],
  ["spare", "Confirm continuity and isolation of the proposed spare conductor"],
  ["transformer", "Identify R and C on the same 24 V control circuit"],
  ["compatibility", "Check Nest model and zone-controller compatibility"],
  ["final", "Record final wiring and test a heat call for this zone"]
];
let selectedHeatingZone = "master";

function heatingSystemData(oil) {
  const system = oil.heatingSystem || (oil.heatingSystem = {});
  if (!system.equipment || typeof system.equipment !== "object") system.equipment = {};
  if (!Array.isArray(system.zones)) system.zones = [];
  if (!Array.isArray(system.history)) system.history = [];
  HEATING_ZONE_SEED.forEach((seed, index) => {
    if (system.zones.some(zone => zone.id === seed.id)) return;
    system.zones.push({ ...seed, heatConductors: 2, currentModel: "", nestModel: "", status: "Not started", thermostatPhoto: "", controlPhoto: "", notes: "", wiring: Array.from({ length: seed.conductors }, () => ({ color: "", terminal: "", controlTerminal: "", function: "", spare: "Unverified" })), checks: {} });
  });
  if (!system.history.length) system.history.push({ id: "initial-zone-observations", date: "2026-11-24", description: "Initial observations: four oil-boiler heating zones; top-floor and basement thermostats each have three conductors, and the main-floor thermostat has four. Two conductors are reported as needed for heat at each thermostat. Terminal functions and spare wires are unverified." });
  return system;
}

function heatingPhotoLink(value, label) {
  const url = String(value || "").trim();
  return /^https:\/\//i.test(url) ? `<a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">${label}</a>` : "Not yet verified";
}

function heatingZonesView(oil) {
  const system = heatingSystemData(oil);
  const equipment = system.equipment;
  const zone = system.zones.find(item => item.id === selectedHeatingZone) || system.zones[0];
  const field = (name, label, placeholder = "Not yet verified") => `<label>${label}<input name="${name}" value="${escapeAttribute(equipment[name] || "")}" placeholder="${placeholder}"></label>`;
  const zoneField = (name, label, placeholder = "Not yet verified") => `<label>${label}<input name="${name}" value="${escapeAttribute(zone[name] || "")}" placeholder="${placeholder}"></label>`;
  return `<div class="heating-zones-page">
    <section class="oil-card"><h3>House heating zones</h3><p class="oil-footnote">Known zone layout; control wiring and heating equipment connections require verification.</p><div class="heating-zone-schema"><div class="heating-boiler-node">Oil-fired boiler and zone controls<small>Equipment and terminals to verify</small></div><div class="heating-zone-schema-grid">${HEATING_ZONE_SEED.map((item, index) => `<button type="button" data-heating-zone="${item.id}" class="${zone.id === item.id ? "active" : ""}"><strong>Zone ${index + 1} · ${item.floor}</strong><span>${item.rooms}</span><small>${item.conductors} conductors at thermostat</small></button>`).join("")}</div></div><p class="oil-footnote">The diagram does not assume zone valves, circulators, relays, or piping connections.</p><div class="oil-table-wrap"><table class="oil-table heating-zones-table"><thead><tr><th>Zone</th><th>Floor</th><th>Rooms</th><th>Conductors</th><th>Reported heat wires</th><th>Installation status</th></tr></thead><tbody>${HEATING_ZONE_SEED.map((item, index) => { const saved = system.zones.find(candidate => candidate.id === item.id); return `<tr><td>${index + 1}</td><td>${item.floor}</td><td>${item.rooms}</td><td>${item.conductors}</td><td>2</td><td>${escapeHtml(saved?.status || "Not started")}</td></tr>`; }).join("")}</tbody></table></div></section>
    <section class="oil-card"><h3>Boiler and control equipment</h3><form id="heatingEquipmentForm" class="heating-zone-fields">${field("boilerModel", "Boiler make / model")}${field("controllerModel", "Zone controller make / model")}${field("transformerRating", "Transformer rating")}${field("controlType", "Zone-control type")}${field("provider", "Service provider")}<label class="wide">Equipment notes<textarea name="notes" rows="2" placeholder="Not yet verified">${escapeHtml(equipment.notes || "")}</textarea></label><button type="submit">Save equipment details</button></form></section>
    <section class="oil-card"><h3>Zone ${HEATING_ZONE_SEED.findIndex(item => item.id === zone.id) + 1} · ${escapeHtml(zone.rooms)}</h3><p>${escapeHtml(zone.floor)} · ${zone.conductors} conductors at thermostat · 2 reported as needed for heat</p><form id="heatingZoneForm" class="heating-zone-fields">${zoneField("currentModel", "Current thermostat model")}${zoneField("nestModel", "Proposed Nest model")}<label>Installation status<select name="status">${["Not started", "Investigating", "Ready for professional review", "Installed", "Needs correction"].map(value => `<option ${zone.status === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>${zoneField("thermostatPhoto", "Thermostat photo link", "https://")}${zoneField("controlPhoto", "Zone-control photo link", "https://")}<label class="wide">Zone notes<textarea name="notes" rows="2" placeholder="Not yet verified">${escapeHtml(zone.notes || "")}</textarea></label><div class="wide heating-zone-photo-links">Photos: ${heatingPhotoLink(zone.thermostatPhoto, "Open thermostat photo")} · ${heatingPhotoLink(zone.controlPhoto, "Open zone-control photo")}</div><button type="submit">Save zone details</button></form>
    <h3>Thermostat wiring</h3><p class="oil-footnote">Wire colors do not establish function. Every conductor begins unverified.</p><form id="heatingWiringForm"><div class="oil-table-wrap"><table class="oil-table heating-wiring-table"><thead><tr><th>Conductor</th><th>Wire color</th><th>Current thermostat terminal</th><th>Boiler / controller terminal</th><th>Observed function</th><th>Verified spare?</th></tr></thead><tbody>${Array.from({ length: zone.conductors }, (_, index) => { const wire = zone.wiring?.[index] || {}; return `<tr><th>${index + 1}</th><td><input name="color-${index}" value="${escapeAttribute(wire.color || "")}" placeholder="Unverified"></td><td><input name="terminal-${index}" value="${escapeAttribute(wire.terminal || "")}" placeholder="Unverified"></td><td><input name="controlTerminal-${index}" value="${escapeAttribute(wire.controlTerminal || "")}" placeholder="Unverified"></td><td><input name="function-${index}" value="${escapeAttribute(wire.function || "")}" placeholder="Unverified"></td><td><select name="spare-${index}">${["Unverified", "Yes", "No"].map(value => `<option ${wire.spare === value ? "selected" : ""}>${value}</option>`).join("")}</select></td></tr>`; }).join("")}</tbody></table></div><button type="submit">Save wiring observations</button></form>
    <h3>Nest readiness</h3><div class="heating-checklist">${HEATING_ZONE_CHECKS.map(([key, label]) => `<label><input type="checkbox" data-heating-check="${key}" ${zone.checks?.[key] ? "checked" : ""}><span>${label}</span></label>`).join("")}</div><p class="oil-footnote">A spare conductor does not supply 24 V on its own. It can serve as C only when connected to common on the appropriate control circuit. See <a href="https://support.google.com/googlehome/answer/10523126" target="_blank" rel="noopener noreferrer">Google’s C-wire guidance</a> and <a href="https://support.google.com/googlehome/answer/9246656" target="_blank" rel="noopener noreferrer">Nest compatibility guidance</a>.</p></section>
    <section class="oil-card"><h3>Dated change log</h3><form id="heatingLogForm" class="heating-zone-fields"><label>Date<input name="date" type="date" value="${oilIsoToday()}" required></label><label class="wide">Observation or change<input name="description" placeholder="What was checked or changed?" required></label><button type="submit">Add log entry</button></form><div class="oil-table-wrap"><table class="oil-table heating-log-table"><thead><tr><th>Date</th><th>Change</th><th>Action</th></tr></thead><tbody>${[...system.history].sort((a, b) => b.date.localeCompare(a.date)).map(item => `<tr><td>${escapeHtml(item.date)}</td><td>${escapeHtml(item.description)}</td><td>${item.id === "initial-zone-observations" ? "Original observation" : `<button type="button" class="ghost" data-heating-log-delete="${escapeAttribute(item.id)}">Delete</button>`}</td></tr>`).join("")}</tbody></table></div></section>
  </div>`;
}

function wireHeatingZones(root, oil) {
  const system = heatingSystemData(oil);
  const zone = system.zones.find(item => item.id === selectedHeatingZone) || system.zones[0];
  const record = description => { system.history.push({ id: crypto.randomUUID(), date: oilIsoToday(), description }); saveState(); renderHomeHeatingOil(); };
  root.querySelectorAll("[data-heating-zone]").forEach(button => button.addEventListener("click", () => { selectedHeatingZone = button.dataset.heatingZone; renderHomeHeatingOil(); }));
  root.querySelector("#heatingEquipmentForm")?.addEventListener("submit", event => { event.preventDefault(); if (!ensureCurrentUser("save heating equipment")) return; const e = event.currentTarget.elements; for (const key of ["boilerModel", "controllerModel", "transformerRating", "controlType", "provider", "notes"]) system.equipment[key] = e[key].value.trim(); record("Updated boiler and zone-control equipment details."); });
  root.querySelector("#heatingZoneForm")?.addEventListener("submit", event => { event.preventDefault(); if (!ensureCurrentUser("save a heating zone")) return; const e = event.currentTarget.elements; for (const key of ["currentModel", "nestModel", "status", "thermostatPhoto", "controlPhoto", "notes"]) zone[key] = e[key].value.trim(); record(`Updated ${zone.rooms} thermostat details and installation status.`); });
  root.querySelector("#heatingWiringForm")?.addEventListener("submit", event => { event.preventDefault(); if (!ensureCurrentUser("save thermostat wiring")) return; const e = event.currentTarget.elements; zone.wiring = Array.from({ length: zone.conductors }, (_, i) => ({ color: e[`color-${i}`].value.trim(), terminal: e[`terminal-${i}`].value.trim(), controlTerminal: e[`controlTerminal-${i}`].value.trim(), function: e[`function-${i}`].value.trim(), spare: e[`spare-${i}`].value })); record(`Updated ${zone.rooms} conductor observations.`); });
  root.querySelectorAll("[data-heating-check]").forEach(input => input.addEventListener("change", () => { if (!ensureCurrentUser("update Nest readiness")) { input.checked = !input.checked; return; } zone.checks ||= {}; zone.checks[input.dataset.heatingCheck] = input.checked; const label = HEATING_ZONE_CHECKS.find(([key]) => key === input.dataset.heatingCheck)?.[1]; record(`${zone.rooms}: ${input.checked ? "completed" : "reopened"} — ${label}.`); }));
  root.querySelector("#heatingLogForm")?.addEventListener("submit", event => { event.preventDefault(); if (!ensureCurrentUser("add a heating-system log entry")) return; const e = event.currentTarget.elements; system.history.push({ id: crypto.randomUUID(), date: e.date.value, description: e.description.value.trim() }); saveState(); renderHomeHeatingOil(); });
  root.querySelectorAll("[data-heating-log-delete]").forEach(button => button.addEventListener("click", () => { if (!ensureCurrentUser("delete a heating-system log entry") || !confirm("Delete this log entry?")) return; system.history = system.history.filter(item => item.id !== button.dataset.heatingLogDelete); saveState(); renderHomeHeatingOil(); }));
}
