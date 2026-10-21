(function () {
  const button = document.querySelector("#hospitalBillBtn");
  const dialog = document.querySelector("#hospitalBillDialog");
  const body = document.querySelector("#hospitalBillBody");
  const reminderId = "hospital-payment-plan-due";
  let editingId = "";

  const money = value => `$${(Number(value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const today = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const plan = () => state.hospitalBill;
  const remaining = () => Math.max(0, Number(plan().openingBalance) + plan().records.reduce((sum, record) =>
    sum + (record.affectsBalance === false || record.type === "snapshot" ? 0 : record.type === "charge" ? record.amount : -record.amount), 0));

  function syncDueReminder() {
    state.adminNotesReminders ||= [];
    const index = state.adminNotesReminders.findIndex(item => item.id === reminderId);
    if (!plan().reminderEnabled || !plan().dueDate || remaining() <= 0) {
      if (index >= 0) state.adminNotesReminders.splice(index, 1);
      return;
    }
    const entry = normalizeAdminNotesReminder({
      id: reminderId,
      title: "White Plains Hospital payment plan",
      category: "Medical bill",
      date: today(),
      dueDate: plan().dueDate,
      status: "Open",
      priority: "High",
      objective: `Payment plan balance ${money(remaining())}; expected payment ${money(plan().expectedPayment)}.`,
      reminder: `Check the Montefiore MyChart payment plan due today. Expected payment ${money(plan().expectedPayment)}; remaining balance ${money(remaining())}.`,
      updatedAt: new Date().toISOString()
    });
    if (index >= 0) state.adminNotesReminders[index] = entry;
    else state.adminNotesReminders.push(entry);
  }

  function persist() {
    syncDueReminder();
    saveState();
    render();
  }

  function render() {
    if (!dialog.open || !isAdminClient()) return;
    state.hospitalBill = normalizeHospitalBill(state.hospitalBill);
    const bill = plan();
    const balance = remaining();
    const paid = Math.max(0, bill.openingBalance - balance);
    const progress = bill.openingBalance > 0 ? Math.min(100, Math.round(paid / bill.openingBalance * 100)) : 0;
    const dueLabel = !bill.dueDate ? "Set a due date" : bill.dueDate < today() && balance > 0 ? "Overdue" : bill.dueDate;
    const edit = bill.records.find(record => record.id === editingId);
    body.innerHTML = `
      <div class="hospital-summary">
        <article><span>Remaining on plan</span><strong>${money(balance)}</strong><small>After recorded payments, credits, and charges</small></article>
        <article><span>Paid toward plan</span><strong>${money(paid)}</strong><small>${progress}% of starting balance</small></article>
        <article><span>Next due date</span><strong>${escapeHtml(dueLabel)}</strong><small>${money(bill.expectedPayment)} expected</small></article>
        <article><span>Outside payment plan</span><strong>${money(bill.outsidePlanBalance)}</strong><small>Shown separately; not included above</small></article>
      </div>
      <div class="hospital-progress" role="progressbar" aria-label="Payment plan payoff" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><span style="width:${progress}%"></span></div>
      <div class="hospital-layout">
        <form id="hospitalPlanForm" class="hospital-card">
          <h3>Plan and reminder</h3>
          <p class="hospital-hint">Account ${escapeHtml(bill.account)} · ${escapeHtml(bill.paymentMethod)}. The starting balance is inferred from the October 21 email and can be corrected. Older records are historical and do not change this payoff baseline.</p>
          <div class="hospital-fields">
            <label>Starting plan balance<input name="openingBalance" type="number" min="0" step="0.01" required value="${bill.openingBalance.toFixed(2)}"></label>
            <label>Balance outside plan<input name="outsidePlanBalance" type="number" min="0" step="0.01" value="${bill.outsidePlanBalance.toFixed(2)}"></label>
            <label>Next due date<input name="dueDate" type="date" value="${escapeHtml(bill.dueDate)}"></label>
            <label>Expected payment<input name="expectedPayment" type="number" min="0" step="0.01" value="${bill.expectedPayment.toFixed(2)}"></label>
          </div>
          <label class="hospital-check"><input name="reminderEnabled" type="checkbox" ${bill.reminderEnabled ? "checked" : ""}> Text me on the due date through Admin Notes &amp; Reminders</label>
          <label>Notes<textarea name="notes" rows="3">${escapeHtml(bill.notes)}</textarea></label>
          <button type="submit">Save plan</button>
          <p class="hospital-hint">Set the actual next due date. The existing Admin reminder job checks for it daily; the date is not supplied in the email.</p>
        </form>
        <form id="hospitalRecordForm" class="hospital-card">
          <h3>${edit ? "Update record" : "Add new record"}</h3>
          <div class="hospital-fields">
            <label>Date<input name="date" type="date" required value="${escapeHtml(edit?.date || today())}"></label>
            <label>Type<select name="type"><option value="payment" ${edit?.type === "payment" ? "selected" : ""}>Payment</option><option value="credit" ${edit?.type === "credit" ? "selected" : ""}>Credit</option><option value="charge" ${edit?.type === "charge" ? "selected" : ""}>Charge</option><option value="snapshot" ${edit?.type === "snapshot" ? "selected" : ""}>Balance snapshot</option></select></label>
            <label>Amount<input name="amount" type="number" min="0.01" step="0.01" required value="${edit ? edit.amount.toFixed(2) : ""}"></label>
            <label>Method<input name="method" value="${escapeHtml(edit?.method || "")}" placeholder="Card or checking"></label>
          </div>
          <label>Description<input name="description" required value="${escapeHtml(edit?.description || "")}" placeholder="What changed?"></label>
          <label class="hospital-check"><input name="affectsBalance" type="checkbox" ${!edit || edit.affectsBalance !== false ? "checked" : ""}> Apply to current payoff balance</label>
          <div class="hospital-actions"><button type="submit">${edit ? "Save changes" : "Add record"}</button>${edit ? '<button type="button" id="hospitalCancelEdit" class="ghost">Cancel edit</button>' : ""}</div>
        </form>
      </div>
      <section class="hospital-card hospital-ledger"><h3>Payment history and plan changes</h3><div class="hospital-table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Method</th><th>Amount</th><th>Payoff</th><th>Actions</th></tr></thead><tbody>
      ${bill.records.length ? [...bill.records].sort((a, b) => b.date.localeCompare(a.date)).map(record => `<tr><td>${escapeHtml(record.date)}</td><td>${escapeHtml(record.type)}</td><td>${escapeHtml(record.description)}</td><td>${escapeHtml(record.method)}</td><td>${money(record.amount)}</td><td>${record.affectsBalance === false || record.type === "snapshot" ? "Historical" : "Included"}</td><td><button type="button" class="ghost" data-hospital-edit="${escapeHtml(record.id)}">Edit</button> <button type="button" class="ghost" data-hospital-delete="${escapeHtml(record.id)}">Delete</button></td></tr>`).join("") : '<tr><td colspan="7">No records yet.</td></tr>'}
      </tbody></table></div></section>`;
  }

  button?.addEventListener("click", () => {
    if (!isAdminClient()) return;
    editingId = "";
    dialog.showModal();
    render();
  });
  document.querySelector("#closeHospitalBillDialog")?.addEventListener("click", () => dialog.close());
  body?.addEventListener("submit", event => {
    if (event.target.id === "hospitalPlanForm") {
      event.preventDefault();
      const form = event.target;
      const field = name => form.elements.namedItem(name);
      plan().openingBalance = Number(field("openingBalance").value);
      plan().outsidePlanBalance = Number(field("outsidePlanBalance").value);
      plan().dueDate = field("dueDate").value;
      plan().expectedPayment = Number(field("expectedPayment").value);
      plan().reminderEnabled = field("reminderEnabled").checked;
      plan().notes = field("notes").value;
      persist();
    } else if (event.target.id === "hospitalRecordForm") {
      event.preventDefault();
      const form = event.target;
      const field = name => form.elements.namedItem(name);
      const record = { id: editingId || crypto.randomUUID(), date: field("date").value, type: field("type").value, amount: Number(field("amount").value), method: field("method").value.trim(), description: field("description").value.trim(), affectsBalance: field("affectsBalance").checked && field("type").value !== "snapshot" };
      if (!record.date || !record.description || !(record.amount > 0)) return;
      const index = plan().records.findIndex(item => item.id === editingId);
      if (index >= 0) plan().records[index] = record;
      else plan().records.push(record);
      editingId = "";
      persist();
    }
  });
  body?.addEventListener("click", event => {
    if (event.target.id === "hospitalCancelEdit") { editingId = ""; render(); return; }
    if (event.target.dataset.hospitalEdit) { editingId = event.target.dataset.hospitalEdit; render(); body.querySelector("#hospitalRecordForm")?.scrollIntoView({ block: "nearest" }); return; }
    const id = event.target.dataset.hospitalDelete;
    if (id && window.confirm("Delete this payment-plan record?")) {
      plan().records = plan().records.filter(record => record.id !== id);
      if (editingId === id) editingId = "";
      persist();
    }
  });
  window.renderHospitalBillTracker = render;
  window.closeHospitalBillTracker = () => { if (dialog?.open) dialog.close(); };
})();
