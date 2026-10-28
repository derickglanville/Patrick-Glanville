(function () {
  const documentId = "cellphone-history-notes";
  const cacheKey = "cellphone-history-notes-v1";
  const statuses = ["Open", "Waiting", "Resolved", "Closed"];
  let notes = [];
  let busy = false;
  let unsubscribe = null;
  let renderToken = 0;
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : "";
  const validMonth = value => /^\d{4}-\d{2}$/.test(String(value || "")) ? String(value) : "";
  const localToday = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };
  const dateLabel = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
  const monthLabel = value => value ? new Date(`${value}-01T12:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "long" }) : "—";
  const money = value => value == null ? "—" : Number(value).toLocaleString(undefined, { style: "currency", currency: "USD" });
  const root = () => document.querySelector("#cellphoneHistoryNotesContent");
  const cacheNotes = () => { try { localStorage.setItem(cacheKey, JSON.stringify(notes)); } catch { /* Firebase remains authoritative. */ } };

  function normalize(entry) {
    return {
      id: String(entry?.id || crypto.randomUUID()), date: validDate(entry?.date),
      billMonth: validMonth(entry?.billMonth), description: String(entry?.description || "").trim().slice(0, 1000),
      status: statuses.includes(entry?.status) ? entry.status : "Open",
      amount: entry?.amount === "" || entry?.amount == null ? null : Math.max(0, Number(entry.amount) || 0),
      followUpDate: validDate(entry?.followUpDate), contact: String(entry?.contact || "").trim().slice(0, 120),
      details: String(entry?.details || "").trim().slice(0, 1000), updatedAt: String(entry?.updatedAt || "")
    };
  }
  const fromSnapshot = snapshot => (snapshot.exists() && Array.isArray(snapshot.data().notes) ? snapshot.data().notes : []).filter(Boolean).map(normalize);
  function setStatus(message, failed = false) {
    const target = root()?.querySelector("#cellphoneHistoryNotesStatus");
    if (!target) return;
    target.textContent = message;
    target.classList.toggle("is-error", failed);
  }
  function renderGrid() {
    const grid = root()?.querySelector("#cellphoneHistoryNotesGrid");
    if (!grid) return;
    const ordered = [...notes].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
    grid.innerHTML = `<table><thead><tr><th>Date</th><th>Description</th><th>Status</th><th>Amount</th><th>Bill month</th><th>Follow-up</th><th>Actions</th></tr></thead><tbody>
      ${ordered.length ? ordered.map(note => `<tr><td>${escape(dateLabel(note.date))}</td><td><strong>${escape(note.description)}</strong>${note.details ? `<small>${escape(note.details)}</small>` : ""}${note.contact ? `<small>Contact / ref: ${escape(note.contact)}</small>` : ""}</td><td><span class="admin-bill-note-status admin-bill-note-status-${escape(note.status.toLowerCase())}">${escape(note.status)}</span></td><td>${money(note.amount)}</td><td>${escape(monthLabel(note.billMonth))}</td><td>${escape(dateLabel(note.followUpDate))}</td><td><button type="button" class="ghost" data-cellphone-note-edit="${escape(note.id)}">Edit</button> <button type="button" class="ghost" data-cellphone-note-delete="${escape(note.id)}">Delete</button></td></tr>`).join("") : '<tr><td colspan="7">No Cellphone History notes yet.</td></tr>'}
    </tbody></table>`;
  }
  function showForm(note = null) {
    const form = root()?.querySelector("#cellphoneHistoryNoteForm");
    if (!form) return;
    form.reset();
    form.dataset.editingId = note?.id || "";
    form.dataset.editingVersion = note?.updatedAt || "";
    for (const name of ["date", "billMonth", "amount", "status", "followUpDate", "contact", "description", "details"]) {
      form.elements.namedItem(name).value = note?.[name] ?? (name === "date" ? localToday() : name === "status" ? "Open" : "");
    }
    form.querySelector("h4").textContent = note ? "Update note" : "Add note";
    form.hidden = false;
    form.scrollIntoView({ block: "nearest" });
  }
  async function firebaseClient() {
    await window.__firebaseInitPromise;
    const firebase = window.__patrickFirebase;
    if (!firebase?.db) throw new Error("Firebase is not connected");
    return { firebase, ref: firebase.doc(firebase.db, "tracker_state", documentId) };
  }
  async function loadNotes(token) {
    setStatus("Loading notes from Firebase…");
    try {
      const { firebase, ref } = await firebaseClient();
      const snapshot = await (firebase.getDocFromServer || firebase.getDoc)(ref);
      if (token !== renderToken || !root()) return;
      notes = fromSnapshot(snapshot);
      cacheNotes();
      renderGrid();
      setStatus(`${notes.length} note${notes.length === 1 ? "" : "s"} loaded from Firebase.`);
      if (firebase.onSnapshot) unsubscribe = firebase.onSnapshot(ref, next => {
        if (token !== renderToken || !root()) { unsubscribe?.(); unsubscribe = null; return; }
        if (!next.metadata?.fromCache && !next.metadata?.hasPendingWrites && !busy) {
          notes = fromSnapshot(next);
          cacheNotes();
          renderGrid();
        }
      }, error => setStatus(`Live sync failed: ${error.message}`, true));
    } catch (error) {
      if (token !== renderToken || !root()) return;
      try { notes = JSON.parse(localStorage.getItem(cacheKey) || "[]").map(normalize); } catch { notes = []; }
      renderGrid();
      setStatus(`Firebase unavailable: ${error.message}. Showing this device's copy; edits require Firebase.`, true);
    }
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
        transaction.set(ref, { kind: documentId, notes: current, updated_at: new Date().toISOString() });
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

  window.renderCellphoneHistoryNotes = function () {
    if (typeof isAdminClient === "function" && !isAdminClient()) return;
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    const token = ++renderToken;
    const container = root();
    if (!container) return;
    container.innerHTML = `<div class="admin-bill-notes-head"><div><h3>Cellphone History Notes</h3><p>Track bill credits, requests, and follow-ups across billing cycles.</p></div><button type="button" id="addCellphoneHistoryNoteBtn">Add note</button></div>
      <p id="cellphoneHistoryNotesStatus" class="admin-bill-notes-status" role="status" aria-live="polite"></p>
      <div id="cellphoneHistoryNotesGrid" class="admin-bill-notes-grid"></div>
      <form id="cellphoneHistoryNoteForm" class="admin-bill-note-form" hidden>
        <h4>Add note</h4><div class="admin-bill-note-fields">
          <label>Date<input name="date" type="date" required></label><label>Bill month<input name="billMonth" type="month"></label>
          <label>Amount ($)<input name="amount" type="number" min="0" step="0.01" placeholder="Optional"></label>
          <label>Status<select name="status"><option>Open</option><option>Waiting</option><option>Resolved</option><option>Closed</option></select></label>
          <label>Follow-up date<input name="followUpDate" type="date"></label><label>Contact / reference<input name="contact" type="text" maxlength="120" placeholder="Optional"></label>
        </div><label>Description<textarea name="description" rows="3" maxlength="1000" required></textarea></label>
        <label>Additional details<textarea name="details" rows="3" maxlength="1000"></textarea></label>
        <div class="admin-bill-note-actions"><button type="submit">Save note</button><button type="button" class="ghost" id="cancelCellphoneHistoryNoteBtn">Cancel</button></div>
      </form>`;
    container.querySelector("#addCellphoneHistoryNoteBtn").addEventListener("click", () => showForm());
    container.querySelector("#cancelCellphoneHistoryNoteBtn").addEventListener("click", () => { container.querySelector("#cellphoneHistoryNoteForm").hidden = true; });
    container.querySelector("#cellphoneHistoryNotesGrid").addEventListener("click", async event => {
      const edit = event.target.closest("[data-cellphone-note-edit]");
      if (edit) { const note = notes.find(item => item.id === edit.dataset.cellphoneNoteEdit); if (note) showForm(note); return; }
      const remove = event.target.closest("[data-cellphone-note-delete]");
      if (!remove) return;
      const note = notes.find(item => item.id === remove.dataset.cellphoneNoteDelete);
      if (!note || !confirm(`Delete the note from ${dateLabel(note.date)}?`)) return;
      await commit(current => {
        const index = current.findIndex(item => item.id === note.id);
        if (index < 0 || current[index].updatedAt !== note.updatedAt) throw new Error("This note changed on another device; reload and review it");
        current.splice(index, 1);
      });
    });
    container.querySelector("#cellphoneHistoryNoteForm").addEventListener("submit", async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const value = name => form.elements.namedItem(name).value.trim();
      const next = normalize({ id: form.dataset.editingId || crypto.randomUUID(), date: value("date"), billMonth: value("billMonth"), amount: value("amount"), status: value("status"), followUpDate: value("followUpDate"), contact: value("contact"), description: value("description"), details: value("details"), updatedAt: new Date().toISOString() });
      if (!next.date || !next.description) { setStatus("Date and description are required.", true); return; }
      const saved = await commit(current => {
        const index = current.findIndex(item => item.id === next.id);
        if (form.dataset.editingId && (index < 0 || current[index].updatedAt !== form.dataset.editingVersion)) throw new Error("This note changed on another device; reload and review it");
        if (index >= 0) current[index] = next; else current.push(next);
      });
      if (saved && root()?.contains(form)) form.hidden = true;
    });
    loadNotes(token);
  };
})();
