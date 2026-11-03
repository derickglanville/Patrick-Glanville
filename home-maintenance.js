(function () {
  const button = document.querySelector("#homeMaintenanceBtn");
  const dialog = document.querySelector("#homeMaintenanceDialog");
  const body = document.querySelector("#homeMaintenanceBody");
  if (!button || !dialog || !body) return;

  const documentId = "admin-home-maintenance";
  const equipmentTypes = [
    { id: "tractor-mower", name: "Tractor Mower" },
    { id: "lawn-mower", name: "Lawn Mower" },
    { id: "weed-whacker", name: "Weed Whacker" },
    { id: "snowblower", name: "Snowblower" }
  ];
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const date = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : "";
  const today = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; };
  const dateLabel = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "Not set";
  const money = value => Number(value).toLocaleString(undefined, { style: "currency", currency: "USD" });
  const seed = () => equipmentTypes.map(type => ({ ...type, make: "", model: "", serial: "", purchaseDate: "", location: "", fuel: "", oil: "", sparkPlug: "", nextServiceDue: "", reminderDays: 30, notes: "", records: [] }));
  const numberOrNull = value => value === "" || value == null ? null : Math.max(0, Number(value) || 0);
  function normalizeRecord(record) {
    return {
      id: String(record?.id || crypto.randomUUID()), date: date(record?.date),
      work: String(record?.work || "").trim().slice(0, 300),
      cost: numberOrNull(record?.cost), hours: numberOrNull(record?.hours),
      provider: String(record?.provider || "").trim().slice(0, 120),
      notes: String(record?.notes || "").trim().slice(0, 1000),
      receiptUrl: /^https:\/\//i.test(String(record?.receiptUrl || "")) ? String(record.receiptUrl).slice(0, 500) : "",
      updatedAt: String(record?.updatedAt || "")
    };
  }
  function normalizeEquipment(raw) {
    const saved = Array.isArray(raw) ? raw : [];
    const custom = saved.filter(item => /^equipment-[a-f0-9-]{36}$/.test(String(item?.id || "")) && String(item?.name || "").trim())
      .map(item => ({ id: item.id, name: String(item.name).trim().slice(0, 80) }));
    const types = [...equipmentTypes, ...custom.filter((item, index) => custom.findIndex(other => other.id === item.id) === index)];
    return types.map(type => {
      const item = saved.find(entry => entry?.id === type.id);
      return {
        ...type, make: String(item?.make || "").slice(0, 100), model: String(item?.model || "").slice(0, 100),
        serial: String(item?.serial || "").slice(0, 120), purchaseDate: date(item?.purchaseDate),
        location: String(item?.location || "").slice(0, 120), fuel: String(item?.fuel || "").slice(0, 120),
        oil: String(item?.oil || "").slice(0, 120), sparkPlug: String(item?.sparkPlug || "").slice(0, 120), nextServiceDue: date(item?.nextServiceDue),
        reminderDays: Math.min(180, Math.max(0, Number(item?.reminderDays ?? 30) || 0)),
        notes: String(item?.notes || "").slice(0, 2000),
        records: Array.isArray(item?.records) ? item.records.filter(Boolean).map(normalizeRecord) : []
      };
    });
  }
  let equipment = seed();
  let selectedId = equipmentTypes[0].id;
  let editingId = "";
  let busy = false;
  let statusText = "";
  let statusError = false;
  let profileFeedback = "";
  let profileFeedbackError = false;
  const selected = () => equipment.find(item => item.id === selectedId);
  const daysBefore = (value, days) => {
    const result = new Date(`${value}T12:00:00`);
    result.setDate(result.getDate() - days);
    return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, "0")}-${String(result.getDate()).padStart(2, "0")}`;
  };
  function setStatus(message, failed = false) {
    statusText = message;
    statusError = failed;
    const target = body.querySelector(".car-source-status");
    if (target) { target.textContent = message; target.classList.toggle("is-error", failed); }
  }
  function syncReminders(item, reminders) {
    for (const stage of ["early", "due"]) {
      const id = `home-maintenance-${item.id}-${stage}`;
      const index = reminders.findIndex(entry => entry.id === id);
      if (!item.nextServiceDue || (stage === "early" && !item.reminderDays)) {
        if (index >= 0) reminders.splice(index, 1);
        continue;
      }
      const reminderDate = stage === "early" ? daysBefore(item.nextServiceDue, item.reminderDays) : item.nextServiceDue;
      const previous = index >= 0 ? reminders[index] : null;
      const reminder = normalizeAdminNotesReminder({
        id, title: `${item.name} service${stage === "early" ? " coming up" : " due"}`,
        category: "Home maintenance", date: today(), dueDate: reminderDate,
        status: previous?.dueDate === reminderDate ? previous.status : "Open",
        priority: stage === "due" ? "High" : "Normal",
        objective: `Service ${item.name} by ${dateLabel(item.nextServiceDue)}.`,
        reminder: stage === "early"
          ? `Prepare for ${item.name} service by ${dateLabel(item.nextServiceDue)}.`
          : `Service is due for ${item.name}. Record the work and set the next date in Home Maintenance.`,
        updatedAt: new Date().toISOString()
      });
      if (index >= 0) reminders[index] = reminder; else reminders.push(reminder);
    }
  }
  async function firebaseClient() {
    await window.__firebaseInitPromise;
    const firebase = window.__patrickFirebase;
    if (!firebase?.db) throw new Error("Firebase is not connected");
    return { firebase, ref: firebase.doc(firebase.db, "tracker_state", documentId) };
  }
  async function load() {
    setStatus("Loading equipment history from Firebase…");
    try {
      const { firebase, ref } = await firebaseClient();
      const snapshot = await (firebase.getDocFromServer || firebase.getDoc)(ref);
      if (!dialog.open || !isAdminClient()) return;
      equipment = normalizeEquipment(snapshot.exists() ? snapshot.data().equipment : null);
      setStatus(snapshot.exists() ? "Loaded from Firebase." : "No equipment history yet. Add details or a service record to save it.");
    } catch (error) {
      setStatus(`Firebase unavailable: ${error.message}. Changes require a connection.`, true);
    }
    paint();
  }
  function setProfileFeedback(message, failed = false) {
    profileFeedback = message;
    profileFeedbackError = failed;
    const target = body.querySelector(".home-maintenance-save-feedback");
    if (target) {
      target.textContent = message;
      target.classList.toggle("is-error", failed);
      target.hidden = !message;
    }
  }
  async function save(change, withReminders = false, successMessage = "") {
    if (busy) return false;
    busy = true;
    const targetId = selectedId;
    if (successMessage) setProfileFeedback("Saving equipment details…");
    else setProfileFeedback("");
    setStatus("Saving to Firebase…");
    try {
      const { firebase, ref } = await firebaseClient();
      const adminRef = withReminders ? firebase.doc(firebase.db, "tracker_state", "admin-glanville") : null;
      if (adminRef && pendingLocalSharedSaveAt) {
        await saveSharedStateNow();
        if (pendingLocalSharedSaveAt) throw new Error("Pending Admin edits must be resolved before updating reminders");
      }
      let savedEquipment;
      let savedReminders;
      let savedAt;
      let adminUpdatedAt = "";
      await firebase.runTransaction(firebase.db, async transaction => {
        const snapshot = await transaction.get(ref);
        const adminSnapshot = adminRef ? await transaction.get(adminRef) : null;
        const next = normalizeEquipment(snapshot.exists() ? snapshot.data().equipment : null);
        change(next, targetId);
        savedAt = new Date().toISOString();
        transaction.set(ref, { kind: documentId, equipment: next, updated_at: savedAt });
        savedEquipment = next;
        if (adminRef) {
          if (!adminSnapshot.exists()) throw new Error("Admin reminders are not available");
          const reminders = Array.isArray(adminSnapshot.data()?.state?.adminNotesReminders)
            ? structuredClone(adminSnapshot.data().state.adminNotesReminders) : [];
          syncReminders(next.find(item => item.id === targetId), reminders);
          savedReminders = reminders;
          adminUpdatedAt = new Date(Math.max(Date.now(), Date.parse(adminSnapshot.data().updated_at || "") + 1 || 0)).toISOString();
          transaction.update(adminRef, { "state.adminNotesReminders": reminders, updated_at: adminUpdatedAt, updated_by: state.currentUser || "" });
        }
      });
      if (adminUpdatedAt && isAdminClient()) cacheRemoteUpdatedAt(adminUpdatedAt);
      if (dialog.open && isAdminClient()) {
        equipment = savedEquipment;
        if (savedReminders) state.adminNotesReminders = savedReminders;
        editingId = "";
        setStatus("Saved to Firebase.");
        if (successMessage) setProfileFeedback(successMessage);
        paint();
      }
      return true;
    } catch (error) {
      setStatus(`Save failed: ${error.message}. Your changes were not saved.`, true);
      if (successMessage) setProfileFeedback(`Could not save equipment details: ${error.message}`, true);
      return false;
    } finally { busy = false; }
  }
  function paint() {
    if (!dialog.open || !isAdminClient()) return;
    const item = selected();
    const records = [...item.records].sort((a, b) => b.date.localeCompare(a.date));
    const priced = records.filter(record => record.cost != null);
    const total = priced.reduce((sum, record) => sum + record.cost, 0);
    const edit = item.records.find(record => record.id === editingId);
    body.innerHTML = `
      <div class="car-tabs" role="tablist" aria-label="Home maintenance equipment">${equipment.map(type => `<button type="button" role="tab" data-equipment-tab="${escape(type.id)}" aria-selected="${type.id === selectedId}">${escape(type.name)}</button>`).join("")}<button type="button" class="ghost" data-equipment-add aria-label="Add equipment category">+ Add category</button></div>
      <form id="equipmentCategoryForm" class="home-maintenance-category-form" hidden><label>New category name<input name="name" maxlength="80" required placeholder="e.g., Leaf Blower"></label><button type="submit">Add category</button><button type="button" class="ghost" data-equipment-add-cancel>Cancel</button></form>
      <div class="car-source-row"><p class="car-source-status${statusError ? " is-error" : ""}" role="status">${escape(statusText)}</p><button type="button" class="ghost" data-equipment-reload>Reload from Firebase</button></div>
      <div class="car-summary">
        <article><span>Service records</span><strong>${records.length}</strong><small>${escape(item.name)}</small></article>
        <article><span>Recorded costs</span><strong>${money(total)}</strong><small>${priced.length} priced record${priced.length === 1 ? "" : "s"}; unknown costs excluded</small></article>
        <article><span>Next service</span><strong>${escape(dateLabel(item.nextServiceDue))}</strong><small>${item.nextServiceDue ? `${item.reminderDays}-day advance reminder` : "Set a date when known"}</small></article>
        <article><span>Last service</span><strong>${escape(dateLabel(records[0]?.date))}</strong><small>${records[0] ? escape(records[0].work) : "No records yet"}</small></article>
      </div>
      <section class="car-card car-ledger"><div class="car-ledger-heading"><div><h3>Service history</h3><p>${records.length} dated entries, newest first</p></div></div>
        <div class="car-table-wrap"><table><thead><tr><th>Date</th><th>Work done</th><th>Provider</th><th>Hours</th><th>Cost</th><th>Actions</th></tr></thead><tbody>
          ${records.length ? records.map(record => `<tr><td>${escape(dateLabel(record.date))}</td><td><strong>${escape(record.work)}</strong>${record.notes ? `<small>${escape(record.notes)}</small>` : ""}</td><td>${escape(record.provider || "—")}</td><td>${record.hours == null ? "—" : record.hours}</td><td>${record.cost == null ? "Not recorded" : money(record.cost)}</td><td>${record.receiptUrl ? `<a href="${escape(record.receiptUrl)}" target="_blank" rel="noopener noreferrer">Receipt</a> ` : ""}<button type="button" class="ghost" data-equipment-edit="${escape(record.id)}">Edit</button> <button type="button" class="ghost" data-equipment-delete="${escape(record.id)}">Delete</button></td></tr>`).join("") : '<tr><td colspan="6">No service records yet.</td></tr>'}
        </tbody></table></div></section>
      <div class="car-layout">
        <form id="equipmentProfileForm" class="car-card"><h3>Equipment and reminder</h3><div class="car-fields">
          <label>Make<input name="make" maxlength="100" value="${escape(item.make)}"></label>
          <label>Model<input name="model" maxlength="100" value="${escape(item.model)}"></label>
          <label>Serial number<input name="serial" maxlength="120" value="${escape(item.serial)}"></label>
          <label>Purchase date<input name="purchaseDate" type="date" value="${escape(item.purchaseDate)}"></label>
          <label>Storage location<input name="location" maxlength="120" value="${escape(item.location)}"></label>
          <label>Fuel specification<input name="fuel" maxlength="120" value="${escape(item.fuel)}"></label>
          <label>Oil specification<input name="oil" maxlength="120" value="${escape(item.oil)}"></label>
          <label>Spark Plug type<input name="sparkPlug" maxlength="120" value="${escape(item.sparkPlug)}" placeholder="Part number or plug type"></label>
          <label>Next service date<input name="nextServiceDue" type="date" value="${escape(item.nextServiceDue)}"></label>
          <label>Advance reminder (days)<input name="reminderDays" type="number" min="0" max="180" step="1" value="${item.reminderDays}"></label>
        </div><label>Equipment notes<textarea name="notes" rows="4" maxlength="2000">${escape(item.notes)}</textarea></label>
        <button type="submit">Save equipment and reminder</button><p class="home-maintenance-save-feedback${profileFeedbackError ? " is-error" : ""}" role="status" aria-live="polite"${profileFeedback ? "" : " hidden"}>${escape(profileFeedback)}</p><p class="car-hint">This button saves the equipment details above. To add work performed to Service history, use the Add service record form. A next-service date creates reminders in Admin Notes &amp; Reminders.</p></form>
        <form id="equipmentRecordForm" class="car-card"><h3>${edit ? "Update service record" : "Add service record"}</h3><div class="car-fields">
          <label>Service date<input name="date" type="date" required value="${escape(edit?.date || today())}"></label>
          <label>Cost ($)<input name="cost" type="number" min="0" step="0.01" placeholder="Leave blank if unknown" value="${edit?.cost ?? ""}"></label>
          <label>Hours used<input name="hours" type="number" min="0" step="0.1" value="${edit?.hours ?? ""}"></label>
          <label>Shop / provider<input name="provider" maxlength="120" value="${escape(edit?.provider || "")}"></label>
        </div><label>Work done<input name="work" required maxlength="300" value="${escape(edit?.work || "")}" placeholder="Describe the service or repair"></label>
        <label>Notes<textarea name="notes" rows="4" maxlength="1000">${escape(edit?.notes || "")}</textarea></label>
        <label>Receipt link (optional)<input name="receiptUrl" type="url" placeholder="https://" value="${escape(edit?.receiptUrl || "")}"></label>
        <div class="car-actions"><button type="submit">${edit ? "Save changes" : "Add record"}</button>${edit ? '<button type="button" class="ghost" data-equipment-cancel>Cancel edit</button>' : ""}</div>
        <p class="car-hint">Leave cost blank when it is unknown. Service records sync across devices through Firebase.</p></form>
      </div>`;
  }

  button.addEventListener("click", () => {
    if (!isAdminClient()) return;
    selectedId = equipmentTypes[0].id;
    editingId = "";
    profileFeedback = "";
    dialog.showModal();
    paint();
    void load();
  });
  document.querySelector("#closeHomeMaintenanceDialog")?.addEventListener("click", () => dialog.close());
  body.addEventListener("click", async event => {
    if (event.target.closest("[data-equipment-add]")) {
      const form = body.querySelector("#equipmentCategoryForm");
      form.hidden = false;
      form.elements.namedItem("name").focus();
      return;
    }
    if (event.target.closest("[data-equipment-add-cancel]")) {
      body.querySelector("#equipmentCategoryForm").hidden = true;
      return;
    }
    const tab = event.target.closest("[data-equipment-tab]");
    if (tab) { selectedId = tab.dataset.equipmentTab; editingId = ""; profileFeedback = ""; paint(); return; }
    if (event.target.closest("[data-equipment-reload]")) { editingId = ""; void load(); return; }
    if (event.target.closest("[data-equipment-cancel]")) { editingId = ""; paint(); return; }
    const edit = event.target.closest("[data-equipment-edit]");
    if (edit) { editingId = edit.dataset.equipmentEdit; paint(); body.querySelector("#equipmentRecordForm")?.scrollIntoView({ block: "nearest" }); return; }
    const remove = event.target.closest("[data-equipment-delete]");
    if (!remove) return;
    const record = selected().records.find(entry => entry.id === remove.dataset.equipmentDelete);
    if (!record || !confirm(`Delete the ${dateLabel(record.date)} service record for ${selected().name}?`)) return;
    await save((next, targetId) => {
      const item = next.find(entry => entry.id === targetId);
      const index = item.records.findIndex(entry => entry.id === record.id);
      if (index < 0 || item.records[index].updatedAt !== record.updatedAt) throw new Error("This record changed on another device. Reload and review it");
      item.records.splice(index, 1);
    });
  });
  body.addEventListener("submit", async event => {
    if (!isAdminClient()) return;
    event.preventDefault();
    const form = event.target;
    const value = name => form.elements.namedItem(name).value.trim();
    if (form.id === "equipmentCategoryForm") {
      const name = value("name").slice(0, 80);
      if (!name) { setStatus("Enter a category name.", true); return; }
      if (equipment.some(item => item.name.toLowerCase() === name.toLowerCase())) { setStatus("That category already exists.", true); return; }
      const newId = `equipment-${crypto.randomUUID()}`;
      const saved = await save(next => {
        if (next.some(item => item.name.toLowerCase() === name.toLowerCase())) throw new Error("That category already exists on another device. Reload and review it");
        next.push({ ...seed()[0], id: newId, name, records: [] });
      });
      if (saved) { selectedId = newId; paint(); }
      return;
    }
    if (form.id === "equipmentProfileForm") {
      const profile = {
        make: value("make"), model: value("model"), serial: value("serial"), purchaseDate: value("purchaseDate"),
        location: value("location"), fuel: value("fuel"), oil: value("oil"), sparkPlug: value("sparkPlug"), nextServiceDue: value("nextServiceDue"),
        reminderDays: value("reminderDays"), notes: value("notes")
      };
      const confirmation = profile.nextServiceDue
        ? "Equipment details saved to Firebase. The next-service reminders are in Admin Notes & Reminders. Add work performed with Add service record."
        : "Equipment details saved to Firebase. No next-service reminder is scheduled. Add work performed with Add service record.";
      await save((next, targetId) => Object.assign(next.find(item => item.id === targetId), profile), true, confirmation);
      return;
    }
    if (form.id !== "equipmentRecordForm") return;
    const record = normalizeRecord({
      id: editingId || crypto.randomUUID(), date: value("date"), work: value("work"),
      cost: value("cost"), hours: value("hours"), provider: value("provider"),
      notes: value("notes"), receiptUrl: value("receiptUrl"), updatedAt: new Date().toISOString()
    });
    if (!record.date || !record.work) { setStatus("Service date and work done are required.", true); return; }
    if (value("receiptUrl") && !record.receiptUrl) { setStatus("Receipt link must begin with https://.", true); return; }
    const wasEditing = Boolean(editingId);
    const previousVersion = selected().records.find(item => item.id === editingId)?.updatedAt;
    await save((next, targetId) => {
      const item = next.find(entry => entry.id === targetId);
      const index = item.records.findIndex(entry => entry.id === record.id);
      if (wasEditing && (index < 0 || item.records[index].updatedAt !== previousVersion)) throw new Error("This record changed on another device. Reload and review it");
      if (index >= 0) item.records[index] = record; else item.records.push(record);
    });
  });
})();
