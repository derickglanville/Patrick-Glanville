(function () {
  const panel = document.querySelector("#budgetPanel");
  const tabs = document.querySelector("#adminBillTabs");
  const billsTab = document.querySelector("#adminBillsTab");
  const notesTab = document.querySelector("#adminBillNotesTab");
  const notesPanel = document.querySelector("#adminBillNotesPanel");
  const grid = document.querySelector("#adminBillNotesGrid");
  const status = document.querySelector("#adminBillNotesStatus");
  const form = document.querySelector("#adminBillNoteForm");
  if (!panel || !tabs || !notesPanel || !grid || !form) return;

  const documentId = "admin-bill-notes";
  const cacheKey = "admin-bill-notes-v1";
  const statuses = ["Open", "Waiting", "Resolved", "Closed"];
  let notes = [];
  let editingId = "";
  let editingVersion = "";
  let unsubscribe = null;
  let busy = false;
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : "";
  const validMonth = value => /^\d{4}-\d{2}$/.test(String(value || "")) ? String(value) : "";
  const localToday = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };
  const dateLabel = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
  const monthLabel = value => value ? new Date(`${value}-01T12:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "long" }) : "—";
  const money = value => value == null ? "—" : Number(value).toLocaleString(undefined, { style: "currency", currency: "USD" });
  const cacheNotes = () => { try { localStorage.setItem(cacheKey, JSON.stringify(notes)); } catch { /* Firebase remains authoritative. */ } };
  const fromSnapshot = snapshot => (snapshot.exists() && Array.isArray(snapshot.data().notes) ? snapshot.data().notes : []).filter(Boolean).map(normalize);
  function normalize(entry) {
    return {
      id: String(entry?.id || crypto.randomUUID()), date: validDate(entry?.date),
      billMonth: validMonth(entry?.billMonth),
      description: String(entry?.description || "").trim().slice(0, 1000),
      status: statuses.includes(entry?.status) ? entry.status : "Open",
      amount: entry?.amount === "" || entry?.amount == null ? null : Math.max(0, Number(entry.amount) || 0),
      followUpDate: validDate(entry?.followUpDate), contact: String(entry?.contact || "").trim().slice(0, 120),
      details: String(entry?.details || "").trim().slice(0, 1000), updatedAt: String(entry?.updatedAt || "")
    };
  }
  function setStatus(message, failed = false) {
    status.textContent = message;
    status.classList.toggle("is-error", failed);
  }
  function renderGrid() {
    const ordered = [...notes].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
    grid.innerHTML = `<table><thead><tr><th>Date</th><th>Description</th><th>Status</th><th>Amount</th><th>Bill month</th><th>Follow-up</th><th>Actions</th></tr></thead><tbody>
      ${ordered.length ? ordered.map(note => `<tr><td>${escape(dateLabel(note.date))}</td><td><strong>${escape(note.description)}</strong>${note.details ? `<small>${escape(note.details)}</small>` : ""}${note.contact ? `<small>Contact / ref: ${escape(note.contact)}</small>` : ""}</td><td><span class="admin-bill-note-status admin-bill-note-status-${escape(note.status.toLowerCase())}">${escape(note.status)}</span></td><td>${money(note.amount)}</td><td>${escape(monthLabel(note.billMonth))}</td><td>${escape(dateLabel(note.followUpDate))}</td><td><button type="button" class="ghost" data-bill-note-edit="${escape(note.id)}">Edit</button> <button type="button" class="ghost" data-bill-note-delete="${escape(note.id)}">Delete</button></td></tr>`).join("") : '<tr><td colspan="7">No Admin Bill notes yet.</td></tr>'}
    </tbody></table>`;
  }
  function showForm(note = null) {
    editingId = note?.id || "";
    editingVersion = note?.updatedAt || "";
    form.reset();
    form.elements.namedItem("date").value = note?.date || localToday();
    form.elements.namedItem("billMonth").value = note?.billMonth || "";
    form.elements.namedItem("amount").value = note?.amount ?? "";
    form.elements.namedItem("status").value = note?.status || "Open";
    form.elements.namedItem("followUpDate").value = note?.followUpDate || "";
    form.elements.namedItem("contact").value = note?.contact || "";
    form.elements.namedItem("description").value = note?.description || "";
    form.elements.namedItem("details").value = note?.details || "";
    document.querySelector("#adminBillNoteFormTitle").textContent = note ? "Update note" : "Add note";
    form.hidden = false;
    form.scrollIntoView({ block: "nearest" });
  }
  function showBills() {
    panel.classList.remove("is-admin-notes-view");
    notesPanel.hidden = true;
    billsTab.setAttribute("aria-selected", "true");
    notesTab.setAttribute("aria-selected", "false");
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  }
  window.resetAdminBillNotesTab = showBills;
  async function firebaseClient() {
    await window.__firebaseInitPromise;
    const firebase = window.__patrickFirebase;
    if (!firebase?.db) throw new Error("Firebase is not connected");
    return { firebase, ref: firebase.doc(firebase.db, "tracker_state", documentId) };
  }
  async function loadNotes() {
    setStatus("Loading notes from Firebase…");
    try {
      const { firebase, ref } = await firebaseClient();
      const snapshot = await (firebase.getDocFromServer || firebase.getDoc)(ref);
      notes = fromSnapshot(snapshot);
      cacheNotes();
      renderGrid();
      setStatus(`${notes.length} note${notes.length === 1 ? "" : "s"} loaded from Firebase.`);
      if (!notesPanel.hidden && !unsubscribe) {
        unsubscribe = firebase.onSnapshot(ref, snapshot => {
          if (!notesPanel.hidden && !snapshot.metadata?.fromCache && !snapshot.metadata?.hasPendingWrites) {
            notes = fromSnapshot(snapshot);
            cacheNotes();
            renderGrid();
          }
        }, error => setStatus(`Live sync failed: ${error.message}`, true));
      }
    } catch (error) {
      try { notes = JSON.parse(localStorage.getItem(cacheKey) || "[]").map(normalize); } catch { notes = []; }
      renderGrid();
      setStatus(`Firebase unavailable: ${error.message}. Showing this device's copy; edits require Firebase.`, true);
    }
  }
  async function showNotes() {
    if (!isAdminClient()) return;
    panel.classList.add("is-admin-notes-view");
    notesPanel.hidden = false;
    billsTab.setAttribute("aria-selected", "false");
    notesTab.setAttribute("aria-selected", "true");
    await loadNotes();
  }
  async function commit(change) {
    if (busy) return false;
    busy = true;
    setStatus("Saving note to Firebase…");
    try {
      const { firebase, ref } = await firebaseClient();
      let committed = [];
      await firebase.runTransaction(firebase.db, async transaction => {
        const snapshot = await transaction.get(ref);
        const current = fromSnapshot(snapshot);
        change(current);
        transaction.set(ref, { kind: "admin-bill-notes", notes: current, updated_at: new Date().toISOString() });
        committed = current;
      });
      notes = committed;
      cacheNotes();
      renderGrid();
      setStatus("Saved to Firebase.");
      return true;
    } catch (error) {
      setStatus(`Save failed: ${error.message}. Your changes were not saved.`, true);
      return false;
    } finally { busy = false; }
  }
  billsTab.addEventListener("click", showBills);
  notesTab.addEventListener("click", showNotes);
  document.querySelector("#addAdminBillNoteBtn").addEventListener("click", () => showForm());
  document.querySelector("#cancelAdminBillNoteBtn").addEventListener("click", () => { form.hidden = true; editingId = ""; });
  grid.addEventListener("click", async event => {
    const edit = event.target.closest("[data-bill-note-edit]");
    if (edit) { const note = notes.find(item => item.id === edit.dataset.billNoteEdit); if (note) showForm(note); return; }
    const remove = event.target.closest("[data-bill-note-delete]");
    if (!remove) return;
    const note = notes.find(item => item.id === remove.dataset.billNoteDelete);
    if (!note || !confirm(`Delete the note from ${dateLabel(note.date)}?`)) return;
    await commit(current => {
      const index = current.findIndex(item => item.id === note.id);
      if (index < 0 || current[index].updatedAt !== note.updatedAt) throw new Error("This note changed on another device; reload and review it");
      current.splice(index, 1);
    });
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const value = name => form.elements.namedItem(name).value.trim();
    const next = normalize({ id: editingId || crypto.randomUUID(), date: value("date"), billMonth: value("billMonth"),
      amount: value("amount"), status: value("status"), followUpDate: value("followUpDate"),
      contact: value("contact"), description: value("description"), details: value("details"), updatedAt: new Date().toISOString() });
    if (!next.date || !next.description) { setStatus("Date and description are required.", true); return; }
    const priorVersion = editingVersion;
    const saved = await commit(current => {
      const index = current.findIndex(item => item.id === next.id);
      if (editingId && (index < 0 || current[index].updatedAt !== priorVersion)) throw new Error("This note changed on another device; reload and review it");
      if (index >= 0) current[index] = next;
      else current.push(next);
    });
    if (saved) { form.hidden = true; editingId = ""; }
  });
})();
