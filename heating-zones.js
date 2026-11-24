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
  if (Number(system.schemaVersion || 0) < 2) {
    system.equipment.boilerModel ||= "Weil-McLain GOLD oil-fired boiler";
    system.equipment.controlType ||= "Motorized zone valves (reported; connections unverified)";
    system.equipment.notes ||= "Boiler supplies heating and domestic hot water. Zone-control equipment and transformer rating remain unverified.";
    system.zones.forEach(zone => { zone.currentModel ||= "Honeywell (exact model unconfirmed)"; });
    const livingRoom = system.zones.find(zone => zone.id === "main");
    if (livingRoom) {
      livingRoom.nestModel ||= "Nest Learning Thermostat, 3rd generation (A0013)";
      if (livingRoom.status === "Not started") livingRoom.status = "Investigating";
    }
    if (!system.history.some(entry => entry.id === "thermostat-plan-20261124")) system.history.push({ id: "thermostat-plan-20261124", date: "2026-11-24", description: "Confirmed Honeywell thermostats in all four zones and Weil-McLain GOLD oil boiler. Planning a 3rd-generation Nest for the living-room zone after compatible 24 V power is provided; exact Honeywell model, black-wire function, and proposed relay arrangement remain unverified." });
    system.schemaVersion = 2;
  }
  if (Number(system.schemaVersion || 0) < 3) {
    system.zones.forEach(zone => {
      if (zone.currentModel === "Honeywell (exact model unconfirmed)") zone.currentModel = "Honeywell Home programmable (exact model unconfirmed)";
    });
    if (!system.history.some(entry => entry.id === "honeywell-photo-20261124")) system.history.push({ id: "honeywell-photo-20261124", date: "2026-11-24", description: "Thermostat photos show a Honeywell Home battery-powered programmable wall thermostat with Set, Hold, and Run buttons, heat/off/cool and fan auto/on switches, two AAA batteries, and a gas/oil fan setting. Its exact model and zone location are not established by the photos." });
    system.schemaVersion = 3;
  }
  if (Number(system.schemaVersion || 0) < 4) {
    if (!system.history.some(entry => entry.id === "boiler-photo-20261124")) system.history.push({ id: "boiler-photo-20261124", date: "2026-11-24", description: "Boiler photo confirms Weil-McLain GOLD OIL cabinet. Visible: Taco circulator, front temperature/pressure gauge, service switch, Honeywell-labeled burner control, oil-burner assembly, flue, and hydronic piping. Exact WGO/WTGO model, series, burner model, controller model, and zone-valve connections are not readable in this photo." });
    system.schemaVersion = 4;
  }
  return system;
}

function heatingPhotoLink(value, label) {
  const url = String(value || "").trim();
  return /^https:\/\//i.test(url) ? `<a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">${label}</a>` : "Not yet verified";
}

function heatingHouseSvg(activeZone) {
  const room = (id, label, subtitle, x, y, width, height, fill) => `<g class="heating-house-zone ${activeZone === id ? "active" : ""}" data-heating-zone="${id}" role="button" tabindex="0" aria-label="Show ${label} zone"><title>Show ${label} zone</title><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="9" fill="${fill}"/><text x="${x + 16}" y="${y + 31}" class="heating-house-room-title">${label}</text><text x="${x + 16}" y="${y + 53}" class="heating-house-room-subtitle">${subtitle}</text>${id === "main" ? `<g class="heating-house-nest-hotspot" role="button" tabindex="0" aria-label="Planned Google Nest thermostat information" aria-controls="heatingNestInfo" aria-expanded="false"><circle cx="${x + width - 64}" cy="${y + 24}" r="18" fill="transparent"/><circle cx="${x + width - 64}" cy="${y + 24}" r="13" class="heating-house-nest"/><text x="${x + width - 64}" y="${y + 28}" text-anchor="middle" class="heating-house-nest-label">N</text></g>` : ""}<g class="heating-house-thermostat-hotspot" role="button" tabindex="0" aria-label="Honeywell thermostat information" aria-controls="heatingHoneywellInfo" aria-expanded="false"><rect x="${x + width - 44}" y="${y + 5}" width="38" height="39" fill="transparent"/><rect x="${x + width - 35}" y="${y + 12}" width="19" height="25" rx="4" class="heating-house-thermostat"/><circle cx="${x + width - 25.5}" cy="${y + 24}" r="5" class="heating-house-thermostat-screen"/></g></g>`;
  return `<svg class="heating-house-image" viewBox="0 0 760 430" role="group" aria-label="Three-floor house showing four selectable heating zones and thermostat information"><path d="M85 95 380 15 675 95" class="heating-house-roof"/><rect x="85" y="95" width="590" height="322" rx="10" class="heating-house-outline"/><text x="380" y="118" text-anchor="middle" class="heating-house-floor">TOP FLOOR</text>${room("master", "Zone 1 · Master bedroom", "Honeywell · 3 wires · model TBD", 103, 129, 269, 85, "#d8ecfc")}${room("bedrooms", "Zone 2 · Other bedrooms", "Honeywell · 3 wires · model TBD", 388, 129, 269, 85, "#e1ebff")}<text x="380" y="238" text-anchor="middle" class="heating-house-floor">MAIN FLOOR</text>${room("main", "Zone 3 · Living areas", "Honeywell now → Nest 3rd gen planned · 4 wires", 103, 247, 554, 75, "#e4f3df")}<text x="380" y="346" text-anchor="middle" class="heating-house-floor">BASEMENT</text>${room("basement", "Zone 4 · Basement", "Honeywell · 3 wires · model TBD", 103, 354, 554, 54, "#f9ead6")}</svg>`;
}

function heatingHoneywellInfo() {
  const terminals = [["R", "Heating circuit supply", "Yes"], ["W", "Call for heat", "Yes"], ["Rc", "Cooling circuit supply", "Factory jumper with R"], ["B / O", "Heat pump reversing valve", "No"], ["G", "Fan control", "No"], ["Y", "Cooling control", "No"], ["C", "Common power wire", "No for this Honeywell"]];
  return `<div id="heatingHoneywellInfo" class="heating-honeywell-info" role="dialog" aria-label="Honeywell thermostat wiring information" hidden><button type="button" class="ghost heating-honeywell-close" aria-label="Close thermostat information">Close</button><h4>Honeywell thermostat · heating-only wiring</h4><p>The photographed thermostat resembles the <strong>RTH2300/RTH221 family</strong>; its exact model is still unconfirmed. For a compatible conventional heating-only boiler, this family can control heat with <strong>R and W</strong>. Two AAA batteries power its display and programming, so it does not need a C wire for those functions.</p><table><thead><tr><th>Terminal</th><th>Function</th><th>Heating-only use</th></tr></thead><tbody>${terminals.map(([terminal, functionName, use]) => `<tr><th>${terminal}</th><td>${functionName}</td><td>${use}</td></tr>`).join("")}</tbody></table><p>For a conventional system, retain the factory <strong>R–Rc jumper</strong> unless the actual wiring calls for separate supplies. The <a href="https://customer.resideo.com/resources/techlit/TechLitDocuments/33-00000s/33-00102ES.pdf" target="_blank" rel="noopener noreferrer">Resideo installation manual</a> says not to connect B on a non-heat-pump system.</p><p><strong>Living-room wires reported:</strong> red at R, white at W, black at B. The black wire’s actual function and its connection at the boiler or zone controller remain <strong>unverified</strong>. Identify both ends before disconnecting or repurposing it.</p><p><strong>Nest comparison:</strong> The planned 3rd-generation Nest can call for heat using R and W, but it needs a compatible power arrangement. A C wire may be needed in this installation; a spare conductor alone does not supply power. The Honeywell’s batteries explain why it can work where usable continuous 24 V power has not yet been identified for the Nest.</p></div>`;
}

function heatingNestInfo() {
  return `<div id="heatingNestInfo" class="heating-honeywell-info" role="dialog" aria-label="Google Nest thermostat information" hidden><button type="button" class="ghost heating-thermostat-close" aria-label="Close Nest information">Close</button><h4>Google Nest · planned for the main-floor zone</h4><p><strong>Model:</strong> Nest Learning Thermostat, 3rd generation (A0013). This is a planned replacement for the living-room Honeywell; it is <strong>not installed</strong>. It previously powered on but did not control heating.</p><table><thead><tr><th>Item</th><th>What is known</th><th>Next check</th></tr></thead><tbody><tr><th>Heat call</th><td>Conventional heat usually uses R and W1.</td><td>Trace and verify the existing heat-control pair at both ends.</td></tr><tr><th>Power</th><td>Nest has an internal rechargeable battery and needs a compatible 24 V AC system. Some installations need a C wire or Nest Power Connector.</td><td>Measure the actual control circuit and follow the model-specific compatibility check.</td></tr><tr><th>Spare wire</th><td>Four conductors are reported at the main-floor thermostat; only two are reported as used for heat.</td><td>Verify the function and continuity of each spare. A spare wire does not supply power until correctly connected.</td></tr><tr><th>Black wire</th><td>Reported at B on the Honeywell; its actual function is unverified.</td><td>Identify its terminal and circuit before changing it.</td></tr></tbody></table><p><strong>Proposed parts:</strong> MG Electronics MGT-2440 external 24 V AC, 40 VA transformer and RIBU1C isolation relay. Their compatibility and final wiring are <strong>not verified</strong>. The outlet behind the living-room couch and a paintable raceway were proposed for the power route.</p><p>Google says the 3rd-generation Nest Learning Thermostat works with many 24 V oil-heating systems, but some systems need a C wire or <a href="https://support.google.com/googlehome/answer/10523126" target="_blank" rel="noopener noreferrer">Nest Power Connector</a>. Check the exact system with Google’s <a href="https://support.google.com/googlehome/answer/9246656" target="_blank" rel="noopener noreferrer">compatibility guidance</a> before installation. Do not connect an independent transformer directly to the boiler control circuit without a verified isolation design.</p></div>`;
}

function heatingZonesView(oil) {
  const system = heatingSystemData(oil);
  const equipment = system.equipment;
  const zone = system.zones.find(item => item.id === selectedHeatingZone) || system.zones[0];
  const field = (name, label, placeholder = "Not yet verified") => `<label>${label}<input name="${name}" value="${escapeAttribute(equipment[name] || "")}" placeholder="${placeholder}"></label>`;
  const zoneField = (name, label, placeholder = "Not yet verified") => `<label>${label}<input name="${name}" value="${escapeAttribute(zone[name] || "")}" placeholder="${placeholder}"></label>`;
  return `<div class="heating-zones-page">
    <section class="oil-card"><h3>House heating zones</h3><p class="oil-footnote">Known zone layout; control wiring and heating equipment connections require verification.</p><div class="heating-zone-schema"><div class="heating-boiler-node">Oil-fired boiler and zone controls<small>Equipment and terminals to verify</small></div><div class="heating-zone-schema-grid">${HEATING_ZONE_SEED.map((item, index) => `<button type="button" data-heating-zone="${item.id}" class="${zone.id === item.id ? "active" : ""}"><strong>Zone ${index + 1} · ${item.floor}</strong><span>${item.rooms}</span><small>${item.conductors} conductors at thermostat</small></button>`).join("")}</div></div><p class="oil-footnote">The diagram does not assume zone valves, circulators, relays, or piping connections.</p><div class="oil-table-wrap"><table class="oil-table heating-zones-table"><thead><tr><th>Zone</th><th>Floor</th><th>Rooms</th><th>Conductors</th><th>Reported heat wires</th><th>Installation status</th></tr></thead><tbody>${HEATING_ZONE_SEED.map((item, index) => { const saved = system.zones.find(candidate => candidate.id === item.id); return `<tr><td>${index + 1}</td><td>${item.floor}</td><td>${item.rooms}</td><td>${item.conductors}</td><td>2</td><td>${escapeHtml(saved?.status || "Not started")}</td></tr>`; }).join("")}</tbody></table></div></section>
    <section class="oil-card heating-system-brief"><h3>Current controls and Nest plan</h3><p>All four zones currently use operational Honeywell thermostats. The planned change is for the <strong>main-floor living-room zone</strong> to use a Google Nest after compatible 24 V power and control wiring are verified.</p><div class="heating-system-brief-grid"><div><strong>Honeywell · all zones</strong><span>Conventional wall thermostat · exact model unconfirmed</span><span>Reported wiring: red (R), white (W), black (B). The black wire’s function and each zone’s actual terminal connections still need confirmation.</span><span>Wi-Fi capability unconfirmed.</span></div><div><strong>Google Nest · planned for main floor</strong><span>Nest Learning Thermostat, 3rd generation · A0013 · Wi-Fi enabled</span><span>Previously powered on but did not control heating. No usable 24 V AC supply was identified at the living-room thermostat.</span><span>Installation depends on a compatible 24 V supply and verified control wiring.</span></div></div><p>The Weil-McLain GOLD oil-fired boiler supplies heating and domestic hot water. Motorized zone valves are reported to control hot-water circulation; the exact wiring and control equipment remain to be checked.</p><h4>Proposed living-room installation</h4><ul><li>MG Electronics MGT-2440 external transformer · 24 V AC, 40 VA.</li><li>RIBU1C isolation relay · proposed, compatibility and wiring still to be verified.</li><li>Use the outlet behind the living-room couch and a paintable raceway to conceal wiring.</li></ul><p>DuctlessAire and Dreo have separate built-in electronic temperature controls; they operate independently of the oil-boiler thermostats.</p></section>
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
  const schema = root.querySelector(".heating-zone-schema");
  if (schema) schema.innerHTML = `${heatingHouseSvg(zone.id)}<p class="oil-footnote">Hover or tap the rectangular Honeywell icon, or the round Nest icon on the main floor, for details.</p>${heatingHoneywellInfo()}${heatingNestInfo()}<div class="heating-mobile-zone-list">${HEATING_ZONE_SEED.map((item, index) => `<button type="button" data-heating-zone="${item.id}" class="${zone.id === item.id ? "active" : ""}">Zone ${index + 1} · ${item.rooms}</button>`).join("")}</div>`;
  const showThermostatInfo = type => {
    for (const [key, selector] of [["honeywell", ".heating-house-thermostat-hotspot"], ["nest", ".heating-house-nest-hotspot"]]) {
      const open = key === type;
      const panel = schema?.querySelector(key === "nest" ? "#heatingNestInfo" : "#heatingHoneywellInfo");
      if (panel) panel.hidden = !open;
      schema?.querySelectorAll(selector).forEach(icon => icon.setAttribute("aria-expanded", String(open)));
    }
  };
  for (const [type, selector] of [["honeywell", ".heating-house-thermostat-hotspot"], ["nest", ".heating-house-nest-hotspot"]]) {
    schema?.querySelectorAll(selector).forEach(icon => {
      icon.addEventListener("pointerenter", () => showThermostatInfo(type));
      icon.addEventListener("focus", () => showThermostatInfo(type));
      icon.addEventListener("click", event => { event.stopPropagation(); showThermostatInfo(type); });
      icon.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); showThermostatInfo(type); } });
    });
  }
  schema?.querySelectorAll(".heating-honeywell-close, .heating-thermostat-close").forEach(button => button.addEventListener("click", () => showThermostatInfo("")));
  const brief = root.querySelector(".heating-system-brief");
  if (brief) {
    const identification = document.createElement("div");
    identification.className = "heating-photo-identification";
    identification.innerHTML = `<strong>Thermostat identified from photos</strong><span>Honeywell Home battery-powered programmable thermostat. The front has Set, Hold, and Run buttons; up/down controls; and Heat/Off/Cool and Fan Auto/On switches. The back has two AAA batteries and a Gas or Oil / Electric or Heat Pump fan-setting switch.</span><span>It resembles Honeywell’s RTH2300/RTH221 family, but similar models share this housing. The exact model number and which house zone this photographed unit serves are unconfirmed. <a href="https://customer.resideo.com/resources/techlit/TechLitDocuments/33-00000s/33-00102ES.pdf" target="_blank" rel="noopener noreferrer">Compare the official Honeywell/Resideo manual</a>.</span>`;
    brief.querySelector("h3")?.after(identification);
    const boilerPhoto = document.createElement("details");
    boilerPhoto.className = "heating-boiler-photo";
    boilerPhoto.innerHTML = `<summary>Boiler photo observations</summary><div class="heating-boiler-photo-content"><strong>Visible in your photo</strong><ul><li>Weil-McLain <strong>GOLD OIL</strong> badge on the boiler cabinet.</li><li><strong>Taco circulator</strong> on the left-side piping.</li><li>Front <strong>temperature/pressure gauge</strong> and <strong>service switch</strong>.</li><li><strong>Honeywell-labeled burner control</strong> at the right and oil-burner assembly below.</li><li>Flue and heating-water piping.</li></ul><p>The rating plate is too small to read. The exact model and series, WGO versus WTGO configuration, burner and control model numbers, and the four zones’ valve wiring remain unverified. A close-up of the boiler rating plate and zone controls would resolve those details.</p><a href="https://www.weil-mclain.com/wp-content/uploads/Weil-McLain_WTGO-Brochure_Series3.pdf" target="_blank" rel="noopener noreferrer">Weil-McLain GOLD OIL manual for model-identification reference</a></div>`;
    brief.appendChild(boilerPhoto);
  }
  const zoneTable = root.querySelector(".heating-zones-table")?.closest(".oil-table-wrap");
  if (zoneTable) {
    const details = document.createElement("details");
    details.className = "heating-zone-details";
    details.innerHTML = "<summary>View four-zone reference table</summary>";
    zoneTable.replaceWith(details);
    details.appendChild(zoneTable);
  }
  const foldCard = (selector, label) => {
    const card = root.querySelector(selector)?.closest(".oil-card");
    if (!card) return;
    const details = document.createElement("details");
    details.className = "heating-compact-details";
    details.innerHTML = `<summary>${label}</summary>`;
    card.querySelector("h3")?.remove();
    while (card.firstChild) details.appendChild(card.firstChild);
    card.appendChild(details);
  };
  foldCard("#heatingEquipmentForm", "Boiler and control equipment · edit details");
  foldCard("#heatingLogForm", `Dated change log · ${system.history.length} entries`);
  const zoneCard = root.querySelector("#heatingZoneForm")?.closest(".oil-card");
  if (zoneCard) {
    const headings = [...zoneCard.querySelectorAll(":scope > h3")];
    for (const heading of headings.slice(1)) {
      const details = document.createElement("details");
      details.className = "heating-compact-details";
      details.innerHTML = `<summary>${heading.textContent}</summary>`;
      let sibling = heading.nextElementSibling;
      heading.replaceWith(details);
      while (sibling && sibling.tagName !== "H3") {
        const next = sibling.nextElementSibling;
        details.appendChild(sibling);
        sibling = next;
      }
    }
  }
  const record = description => { system.history.push({ id: crypto.randomUUID(), date: oilIsoToday(), description }); saveState(); renderHomeHeatingOil(); };
  root.querySelectorAll("[data-heating-zone]").forEach(button => button.addEventListener("click", () => { selectedHeatingZone = button.dataset.heatingZone; renderHomeHeatingOil(); }));
  root.querySelectorAll(".heating-house-zone").forEach(button => button.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectedHeatingZone = button.dataset.heatingZone; renderHomeHeatingOil(); } }));
  root.querySelector("#heatingEquipmentForm")?.addEventListener("submit", event => { event.preventDefault(); if (!ensureCurrentUser("save heating equipment")) return; const e = event.currentTarget.elements; for (const key of ["boilerModel", "controllerModel", "transformerRating", "controlType", "provider", "notes"]) system.equipment[key] = e[key].value.trim(); record("Updated boiler and zone-control equipment details."); });
  root.querySelector("#heatingZoneForm")?.addEventListener("submit", event => { event.preventDefault(); if (!ensureCurrentUser("save a heating zone")) return; const e = event.currentTarget.elements; for (const key of ["currentModel", "nestModel", "status", "thermostatPhoto", "controlPhoto", "notes"]) zone[key] = e[key].value.trim(); record(`Updated ${zone.rooms} thermostat details and installation status.`); });
  root.querySelector("#heatingWiringForm")?.addEventListener("submit", event => { event.preventDefault(); if (!ensureCurrentUser("save thermostat wiring")) return; const e = event.currentTarget.elements; zone.wiring = Array.from({ length: zone.conductors }, (_, i) => ({ color: e[`color-${i}`].value.trim(), terminal: e[`terminal-${i}`].value.trim(), controlTerminal: e[`controlTerminal-${i}`].value.trim(), function: e[`function-${i}`].value.trim(), spare: e[`spare-${i}`].value })); record(`Updated ${zone.rooms} conductor observations.`); });
  root.querySelectorAll("[data-heating-check]").forEach(input => input.addEventListener("change", () => { if (!ensureCurrentUser("update Nest readiness")) { input.checked = !input.checked; return; } zone.checks ||= {}; zone.checks[input.dataset.heatingCheck] = input.checked; const label = HEATING_ZONE_CHECKS.find(([key]) => key === input.dataset.heatingCheck)?.[1]; record(`${zone.rooms}: ${input.checked ? "completed" : "reopened"} — ${label}.`); }));
  root.querySelector("#heatingLogForm")?.addEventListener("submit", event => { event.preventDefault(); if (!ensureCurrentUser("add a heating-system log entry")) return; const e = event.currentTarget.elements; system.history.push({ id: crypto.randomUUID(), date: e.date.value, description: e.description.value.trim() }); saveState(); renderHomeHeatingOil(); });
  root.querySelectorAll("[data-heating-log-delete]").forEach(button => button.addEventListener("click", () => { if (!ensureCurrentUser("delete a heating-system log entry") || !confirm("Delete this log entry?")) return; system.history = system.history.filter(item => item.id !== button.dataset.heatingLogDelete); saveState(); renderHomeHeatingOil(); }));
}
