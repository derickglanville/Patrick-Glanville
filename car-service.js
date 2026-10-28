(function () {
  const button = document.querySelector("#carServiceBtn");
  const dialog = document.querySelector("#carServiceDialog");
  const body = document.querySelector("#carServiceBody");
  if (!button || !dialog || !body) return;

  let selectedVehicleId = "rogue-2016";
  let editingRecordId = "";
  let loadStatus = "";
  const invoiceViewer = document.createElement("dialog");
  invoiceViewer.className = "car-invoice-dialog";
  invoiceViewer.innerHTML = '<div class="car-invoice-head"><strong>Service images</strong><button type="button" class="ghost" data-invoice-close>Close</button></div><div class="car-invoice-actions"><button type="button" class="ghost" data-invoice-receipt>Receipt</button><button type="button" class="ghost" data-invoice-photo hidden>Battery photo</button><a data-invoice-original target="_blank" rel="noopener">Open original receipt</a><a data-invoice-download download="car-service-image.jpg">Download displayed image</a></div><figure data-invoice-receipt-figure><figcaption>Enhanced receipt</figcaption><img data-invoice-receipt-image alt="Enhanced car service receipt"></figure><figure data-invoice-photo-figure hidden><figcaption>Battery photo</figcaption><img data-invoice-photo-image alt="Battery supplied for this service record"></figure>';
  document.body.appendChild(invoiceViewer);
  invoiceViewer.addEventListener("click", event => {
    if (event.target.closest("[data-invoice-close]")) invoiceViewer.close();
    const photo = event.target.closest("[data-invoice-photo]");
    const receipt = event.target.closest("[data-invoice-receipt]");
    if (photo || receipt) {
      const figure = invoiceViewer.querySelector(photo ? "[data-invoice-photo-figure]" : "[data-invoice-receipt-figure]");
      invoiceViewer.querySelector("[data-invoice-download]").href = photo ? invoiceViewer.productImage : invoiceViewer.receiptImage;
      figure.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  });
  const fileData = file => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
  async function statementImages(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Choose a JPG, PNG, or WebP statement image");
    const source = await fileData(file);
    const image = new Image();
    image.src = source;
    await image.decode();
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const original = canvas.toDataURL("image/jpeg", .78).split(",")[1];
    context.fillStyle = "#fff";
    context.filter = "grayscale(1) contrast(1.3) brightness(1.1)";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const enhanced = canvas.toDataURL("image/jpeg", .78).split(",")[1];
    if (original.length + enhanced.length > 750000) throw new Error("Image is too large; choose a smaller photo");
    return { original, enhanced };
  }
  async function openInvoice(invoiceId, showPhoto = false) {
    try {
      await window.__firebaseInitPromise;
      const firebase = window.__patrickFirebase;
      if (!firebase?.db) throw new Error("Firebase is not connected");
      const snapshot = await (firebase.getDocFromServer || firebase.getDoc)(firebase.doc(firebase.db, "tracker_state", invoiceId));
      if (!snapshot.exists()) throw new Error("The statement was not found");
      const saved = snapshot.data();
      const image = `data:image/jpeg;base64,${saved.enhancedBase64 || saved.originalBase64}`;
      invoiceViewer.receiptImage = image;
      invoiceViewer.productImage = saved.productBase64 ? `data:image/jpeg;base64,${saved.productBase64}` : "";
      invoiceViewer.querySelector("[data-invoice-photo]").hidden = !saved.productBase64;
      invoiceViewer.querySelector("[data-invoice-receipt-image]").src = image;
      const photoFigure = invoiceViewer.querySelector("[data-invoice-photo-figure]");
      photoFigure.hidden = !saved.productBase64;
      invoiceViewer.querySelector("[data-invoice-photo-image]").src = invoiceViewer.productImage;
      invoiceViewer.querySelector("[data-invoice-download]").href = image;
      invoiceViewer.querySelector("[data-invoice-original]").href = `data:image/jpeg;base64,${saved.originalBase64}`;
      invoiceViewer.showModal();
      if (showPhoto && saved.productBase64) {
        invoiceViewer.querySelector("[data-invoice-download]").href = invoiceViewer.productImage;
        photoFigure.scrollIntoView({ block: "start" });
      }
    } catch (error) { alert(`Could not open the bill: ${error.message}`); }
  }
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

  async function loadCarServiceFromFirebase() {
    loadStatus = "Loading saved vehicle history from Firebase…";
    if (dialog.open) body.innerHTML = `<p class="car-loading" role="status">${escapeHtml(loadStatus)}</p>`;
    try {
      await window.__firebaseInitPromise;
      const firebase = window.__patrickFirebase;
      if (!firebase?.db) throw new Error("Firebase is not connected");
      const docRef = firebase.doc(firebase.db, "tracker_state", "admin-glanville");
      const snapshot = await (firebase.getDocFromServer || firebase.getDoc)(docRef);
      const saved = snapshot.data()?.state?.carService;
      if (!saved?.vehicles?.length) throw new Error("No saved vehicle history was found");
      const normalized = normalizeCarService(saved);
      const count = normalized.vehicles.reduce((sum, item) => sum + item.records.length, 0);
      if (!count) throw new Error("The saved vehicle history has no service records");
      if (!dialog.open || !isAdminClient()) return;
      state.carService = normalized;
      try {
        const storageKey = getStorageKey();
        const cached = storageKey ? JSON.parse(localStorage.getItem(storageKey) || "null") : null;
        if (cached && typeof cached === "object") {
          cached.carService = normalized;
          localStorage.setItem(storageKey, JSON.stringify(cached));
        }
      } catch { /* The server copy is still available when local cache is full. */ }
      loadStatus = `Loaded ${count} service records from Firebase.`;
    } catch (error) {
      loadStatus = `Could not load Firebase history: ${error.message}. Showing this device's saved copy.`;
    }
    paint();
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
      <div class="car-source-row"><p class="car-source-status" role="status">${escapeHtml(loadStatus)}</p><button type="button" class="ghost" data-car-reload>Reload from Firebase</button></div>
      <div class="car-summary">
        <article><span>Service records</span><strong>${records.length}</strong><small>${escapeHtml(item.name)}</small></article>
        <article><span>Recorded costs</span><strong>${money(total)}</strong><small>${knownCosts.length} priced record${knownCosts.length === 1 ? "" : "s"}; unknown costs excluded</small></article>
        <article><span>Next inspection</span><strong>${escapeHtml(dateLabel(item.inspectionDue))}</strong><small>${item.inspectionDue ? "Reminder saved" : "Enter the actual expiration date"}</small></article>
        <article><span>Next registration</span><strong>${escapeHtml(dateLabel(item.registrationDue))}</strong><small>${item.registrationDue ? "Reminder saved" : "Enter the actual expiration date"}</small></article>
      </div>
      <section class="car-card car-ledger">
        <div class="car-ledger-heading"><div><h3>Service history</h3><p>${records.length} dated entries, newest first</p></div></div>
        <div class="car-table-wrap"><table><thead><tr><th>Date</th><th>Work done</th><th>Shop</th><th>Mileage</th><th>Cost</th><th>Actions</th></tr></thead><tbody>
          ${records.length ? records.map(record => `<tr><td>${escapeHtml(dateLabel(record.date))}</td><td><strong>${escapeHtml(record.work)}</strong>${record.notes ? `<small>${escapeHtml(record.notes)}</small>` : ""}</td><td>${escapeHtml(record.provider || "—")}</td><td>${record.mileage == null ? "—" : Number(record.mileage).toLocaleString()}</td><td>${record.cost == null ? "Not recorded" : money(record.cost)}</td><td>${record.invoiceId ? `<button type="button" class="ghost" data-car-invoice="${escapeAttribute(record.invoiceId)}">View bill</button> ${record.photoAttached ? `<button type="button" class="ghost" data-car-photo="${escapeAttribute(record.invoiceId)}">View photo</button> ` : ""}` : ""}<button type="button" class="ghost" data-car-edit="${escapeAttribute(record.id)}">Edit</button> <button type="button" class="ghost" data-car-delete="${escapeAttribute(record.id)}">Delete</button></td></tr>`).join("") : '<tr><td colspan="6">No service records yet.</td></tr>'}
        </tbody></table></div>
      </section>
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
          <h3>${edit ? "Update service record" : "Add service record or import bill"}</h3>
          <div class="car-fields">
            <label>Service date<input name="date" type="date" required value="${escapeAttribute(edit?.date || today())}"></label>
            <label>Cost ($)<input name="cost" type="number" min="0" step="0.01" placeholder="Leave blank if unknown" value="${edit?.cost ?? ""}"></label>
            <label>Mileage<input name="mileage" type="number" min="0" step="1" value="${edit?.mileage ?? ""}"></label>
            <label>Shop / provider<input name="provider" value="${escapeAttribute(edit?.provider || "")}"></label>
          </div>
          <label>Work done<input name="work" required maxlength="300" value="${escapeAttribute(edit?.work || "")}" placeholder="Describe the service or repair"></label>
          <label>Notes<textarea name="notes" rows="4">${escapeHtml(edit?.notes || "")}</textarea></label>
          <label>Bill statement image (optional)<input name="invoice" type="file" accept="image/jpeg,image/png,image/webp"></label>
          <div class="car-actions"><button type="submit">${edit ? "Save changes" : "Add record"}</button>${edit ? '<button type="button" class="ghost" data-car-cancel>Cancel edit</button>' : ""}</div>
          <p class="car-hint">An empty cost means it was not supplied; it is not counted as $0 in the total.</p>
        </form>
      </div>
      ${item.links?.length ? `<section class="car-card car-references"><h3>Saved references</h3><div>${item.links.filter(link => /^https:\/\//i.test(link.url)).map(link => `<a href="${escapeAttribute(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`).join("")}</div></section>` : ""}`;
  }

  button.addEventListener("click", () => {
    if (!isAdminClient()) return;
    selectedVehicleId = "rogue-2016";
    editingRecordId = "";
    dialog.showModal();
    void loadCarServiceFromFirebase();
  });
  document.querySelector("#closeCarServiceDialog")?.addEventListener("click", () => dialog.close());

  body.addEventListener("click", event => {
    if (event.target.closest("[data-car-reload]")) { void loadCarServiceFromFirebase(); return; }
    const invoice = event.target.closest("[data-car-invoice]");
    if (invoice) { void openInvoice(invoice.dataset.carInvoice); return; }
    const photo = event.target.closest("[data-car-photo]");
    if (photo) { void openInvoice(photo.dataset.carPhoto, true); return; }
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

  body.addEventListener("submit", async event => {
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
        provider: field("provider").slice(0, 120), notes: field("notes").slice(0, 1000), invoiceId: prior?.invoiceId || "", photoAttached: prior?.photoAttached === true
      };
      const file = form.elements.namedItem("invoice").files[0];
      if (file) {
        try {
          const images = await statementImages(file);
          await window.__firebaseInitPromise;
          const firebase = window.__patrickFirebase;
          if (!firebase?.db) throw new Error("Firebase is not connected");
          record.invoiceId = `car-service-invoice-${crypto.randomUUID()}`;
          await firebase.setDoc(firebase.doc(firebase.db, "tracker_state", record.invoiceId), {
            kind: "car-service-invoice", vehicleId: item.id, recordId: record.id, name: file.name.slice(0, 120),
            originalMime: "image/jpeg", originalBase64: images.original,
            enhancedMime: "image/jpeg", enhancedBase64: images.enhanced
          });
        } catch (error) { alert(`Bill import failed: ${error.message}`); return; }
      }
      if (prior) Object.assign(prior, record);
      else item.records.push(record);
      editingRecordId = "";
      saveState(); paint();
    }
  });
})();
