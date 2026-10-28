(function () {
  const button = document.querySelector("#carServiceBtn");
  const dialog = document.querySelector("#carServiceDialog");
  const body = document.querySelector("#carServiceBody");
  if (!button || !dialog || !body) return;

  let selectedVehicleId = "rogue-2016";
  let editingRecordId = "";
  const money = value => Number(value).toLocaleString(undefined, { style: "currency", currency: "USD" });
  const today = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const dateLabel = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "Not set";
  const vehicle = () => state.carService?.vehicles?.find(item => item.id === selectedVehicleId);
  const daysBefore = (date, days) => {
    const result = new Date(`${date}T12:00:00`);
    result.setDate(result.getDate() - days);
    return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, "0")}-${String(result.getDate()).padStart(2, "0")}`;
  };

  function syncVehicleReminders(item) {
    state.adminNotesReminders ||= [];
    for (const [type, title] of [["inspection", "Inspection"], ["registration", "Registration"]]) {
      const due = item[`${type}Due`];
      for (const stage of ["early", "due"]) {
        const id = `car-service-${item.id}-${type}-${stage}`;
        const index = state.adminNotesReminders.findIndex(note => note.id === id);
        if (!due || (stage === "early" && item.reminderDays <= 0)) {
          if (index >= 0) state.adminNotesReminders.splice(index, 1);
          continue;
        }
        const reminderDate = stage === "early" ? daysBefore(due, item.reminderDays) : due;
        const prior = index >= 0 ? state.adminNotesReminders[index] : null;
        const entry = normalizeAdminNotesReminder({
          id,
          title: `${item.name} ${title.toLowerCase()}${stage === "early" ? " coming up" : " due"}`,
          category: "Vehicle",
          date: today(),
          dueDate: reminderDate,
          status: prior?.dueDate === reminderDate ? prior.status : "Open",
          priority: stage === "due" ? "High" : "Normal",
          objective: `${title} deadline: ${dateLabel(due)}. Plate ${item.plate || "not recorded"}.`,
          reminder: stage === "early"
            ? `Prepare for ${item.name} ${title.toLowerCase()} by ${dateLabel(due)}.`
            : `${item.name} ${title.toLowerCase()} is due today. Confirm completion and update the next date in Car Service & Maintenance.`,
          updatedAt: new Date().toISOString()
        });
        if (index >= 0) state.adminNotesReminders[index] = entry;
        else state.adminNotesReminders.push(entry);
      }
    }
  }

  function paint() {
    if (!dialog.open || !isAdminClient()) return;
    state.carService = normalizeCarService(state.carService);
    const item = vehicle();
    if (!item) return;
    const records = [...item.records].sort((a, b) => b.date.localeCompare(a.date));
    const knownCosts = records.filter(record => record.cost != null);
    const total = knownCosts.reduce((sum, record) => sum + record.cost, 0);
    const edit = item.records.find(record => record.id === editingRecordId);
    body.innerHTML = `
      <div class="car-tabs" role="tablist" aria-label="Vehicles">
        ${state.carService.vehicles.map(entry => `<button type="button" role="tab" data-car-tab="${escapeAttribute(entry.id)}" aria-selected="${entry.id === item.id}">${escapeHtml(entry.name)}</button>`).join("")}
      </div>
      <div class="car-summary">
        <article><span>Service records</span><strong>${records.length}</strong><small>${escapeHtml(item.name)}</small></article>
        <article><span>Recorded costs</span><strong>${money(total)}</strong><small>${knownCosts.length} priced record${knownCosts.length === 1 ? "" : "s"}; unknown costs excluded</small></article>
        <article><span>Next inspection</span><strong>${escapeHtml(dateLabel(item.inspectionDue))}</strong><small>${item.inspectionDue ? "Reminder saved" : "Enter the actual expiration date"}</small></article>
        <article><span>Next registration</span><strong>${escapeHtml(dateLabel(item.registrationDue))}</strong><small>${item.registrationDue ? "Reminder saved" : "Enter the actual expiration date"}</small></article>
      </div>
      <div class="car-layout">
        <form id="carProfileForm" class="car-card">
          <h3>Vehicle and reminders</h3>
          <div class="car-fields">
            <label>License plate<input name="plate" value="${escapeAttribute(item.plate || "")}"></label>
            <label>VIN<input name="vin" value="${escapeAttribute(item.vin || "")}"></label>
            <label>Current mileage<input name="mileage" type="number" min="0" step="1" value="${item.mileage ?? ""}"></label>
            <label>Trim / model note<input name="trim" value="${escapeAttribute(item.trim || "")}"></label>
            <label>Next inspection date<input name="inspectionDue" type="date" value="${escapeAttribute(item.inspectionDue)}"></label>
            <label>Next registration date<input name="registrationDue" type="date" value="${escapeAttribute(item.registrationDue)}"></label>
            <label>Advance reminder (days)<input name="reminderDays" type="number" min="0" max="90" step="1" value="${item.reminderDays}"></label>
            <label>Tire specification<input name="tires" value="${escapeAttribute(item.tires || "")}"></label>
          </div>
          <label>Oil specification<input name="oil" value="${escapeAttribute(item.oil || "")}"></label>
          <label>Other vehicle details<textarea name="notes" rows="5">${escapeHtml(item.notes || "")}</textarea></label>
          <button type="submit">Save vehicle and reminders</button>
          <p class="car-hint">Set the dates shown on the inspection sticker and registration. A reminder is added to Admin Notes &amp; Reminders in advance and again on the due date.</p>
        </form>
        <form id="carRecordForm" class="car-card">
          <h3>${edit ? "Update service record" : "Add service record"}</h3>
          <div class="car-fields">
            <label>Service date<input name="date" type="date" required value="${escapeAttribute(edit?.date || today())}"></label>
            <label>Cost ($)<input name="cost" type="number" min="0" step="0.01" placeholder="Leave blank if unknown" value="${edit?.cost ?? ""}"></label>
            <label>Mileage<input name="mileage" type="number" min="0" step="1" value="${edit?.mileage ?? ""}"></label>
            <label>Shop / provider<input name="provider" value="${escapeAttribute(edit?.provider || "")}"></label>
          </div>
          <label>Work done<input name="work" required maxlength="300" value="${escapeAttribute(edit?.work || "")}" placeholder="Describe the service or repair"></label>
          <label>Notes<textarea name="notes" rows="4">${escapeHtml(edit?.notes || "")}</textarea></label>
          <div class="car-actions"><button type="submit">${edit ? "Save changes" : "Add record"}</button>${edit ? '<button type="button" class="ghost" data-car-cancel>Cancel edit</button>' : ""}</div>
          <p class="car-hint">An empty cost means it was not supplied; it is not counted as $0 in the total.</p>
        </form>
      </div>
      <section class="car-card car-ledger">
        <div class="car-ledger-heading"><div><h3>Service history</h3><p>${records.length} dated entries, newest first</p></div></div>
        <div class="car-table-wrap"><table><thead><tr><th>Date</th><th>Work done</th><th>Shop</th><th>Mileage</th><th>Cost</th><th>Actions</th></tr></thead><tbody>
          ${records.length ? records.map(record => `<tr><td>${escapeHtml(dateLabel(record.date))}</td><td><strong>${escapeHtml(record.work)}</strong>${record.notes ? `<small>${escapeHtml(record.notes)}</small>` : ""}</td><td>${escapeHtml(record.provider || "—")}</td><td>${record.mileage == null ? "—" : Number(record.mileage).toLocaleString()}</td><td>${record.cost == null ? "Not recorded" : money(record.cost)}</td><td><button type="button" class="ghost" data-car-edit="${escapeAttribute(record.id)}">Edit</button> <button type="button" class="ghost" data-car-delete="${escapeAttribute(record.id)}">Delete</button></td></tr>`).join("") : '<tr><td colspan="6">No service records yet.</td></tr>'}
        </tbody></table></div>
      </section>
      ${item.links?.length ? `<section class="car-card car-references"><h3>Saved references</h3><div>${item.links.filter(link => /^https:\/\//i.test(link.url)).map(link => `<a href="${escapeAttribute(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`).join("")}</div></section>` : ""}`;
  }

  button.addEventListener("click", () => {
    if (!isAdminClient()) return;
    selectedVehicleId = "rogue-2016";
    editingRecordId = "";
    dialog.showModal();
    paint();
  });
  document.querySelector("#closeCarServiceDialog")?.addEventListener("click", () => dialog.close());

  body.addEventListener("click", event => {
    const tab = event.target.closest("[data-car-tab]");
    if (tab) { selectedVehicleId = tab.dataset.carTab; editingRecordId = ""; paint(); return; }
    const edit = event.target.closest("[data-car-edit]");
    if (edit) { editingRecordId = edit.dataset.carEdit; paint(); body.querySelector("#carRecordForm")?.scrollIntoView({ block: "nearest" }); return; }
    const remove = event.target.closest("[data-car-delete]");
    if (remove) {
      const record = vehicle().records.find(item => item.id === remove.dataset.carDelete);
      if (!record || !confirm(`Delete the ${dateLabel(record.date)} record: ${record.work}?`)) return;
      vehicle().records = vehicle().records.filter(item => item.id !== record.id);
      if (editingRecordId === record.id) editingRecordId = "";
      saveState(); paint(); return;
    }
    if (event.target.closest("[data-car-cancel]")) { editingRecordId = ""; paint(); }
  });

  body.addEventListener("submit", event => {
    if (event.target.id === "carProfileForm") {
      event.preventDefault();
      const form = event.target;
      const field = name => form.elements.namedItem(name).value.trim();
      const item = vehicle();
      for (const key of ["plate", "vin", "trim", "oil", "tires", "notes", "inspectionDue", "registrationDue"]) item[key] = field(key);
      item.mileage = field("mileage") === "" ? null : Math.max(0, Math.round(Number(field("mileage"))));
      item.reminderDays = Math.max(0, Math.min(90, Math.round(Number(field("reminderDays")) || 0)));
      syncVehicleReminders(item);
      saveState(); paint(); return;
    }
    if (event.target.id === "carRecordForm") {
      event.preventDefault();
      const form = event.target;
      const field = name => form.elements.namedItem(name).value.trim();
      const item = vehicle();
      const prior = item.records.find(record => record.id === editingRecordId);
      const record = {
        id: prior?.id || crypto.randomUUID(), date: field("date"), work: field("work").slice(0, 300),
        cost: field("cost") === "" ? null : Math.max(0, Number(field("cost"))),
        mileage: field("mileage") === "" ? null : Math.max(0, Math.round(Number(field("mileage")))),
        provider: field("provider").slice(0, 120), notes: field("notes").slice(0, 1000)
      };
      if (prior) Object.assign(prior, record);
      else item.records.push(record);
      editingRecordId = "";
      saveState(); paint();
    }
  });
})();
