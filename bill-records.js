// Read-only history of the Admin bill records saved for each month.
(() => {
  const button = document.querySelector("#adminBillRecordsBtn");
  const dialog = document.querySelector("#adminBillRecordsDialog");
  const close = document.querySelector("#closeAdminBillRecordsDialog");
  const picker = document.querySelector("#adminBillRecordsSelect");
  const body = document.querySelector("#adminBillRecordsBody");
  if (!button || !dialog || !close || !picker || !body) return;

  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
  const money = value => Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
  const identity = bill => String(bill?.templateKey || bill?.name || "").trim().toLowerCase();
  const monthLabel = key => {
    const match = /^(\d{4})-(\d{2})$/.exec(key);
    if (!match) return key;
    return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };
  const snapshots = () => {
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    return Object.entries(state.monthlyBudgets || {})
    .filter(([month, entry]) => /^\d{4}-\d{2}$/.test(month) && month <= currentMonth && Array.isArray(entry?.bills))
    .sort(([a], [b]) => b.localeCompare(a));
  };
  const bills = () => {
    const names = new Map();
    for (const [, snapshot] of snapshots()) {
      for (const bill of snapshot.bills) {
        const key = identity(bill);
        if (key && !names.has(key)) names.set(key, bill.name || key);
      }
    }
    return [...names.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  };

  function render() {
    const selected = picker.value;
    const records = snapshots().flatMap(([month, snapshot]) =>
      snapshot.bills.filter(bill => identity(bill) === selected).map(bill => ({ month, bill }))
    );
    if (!records.length) {
      body.innerHTML = '<p class="documents-note">No saved monthly records for this bill.</p>';
      return;
    }
    body.innerHTML = `
      <p class="bill-records-count">${records.length} saved monthly ${records.length === 1 ? "record" : "records"} · newest to oldest</p>
      <div class="bill-records-scroll"><table class="bill-records-grid"><thead><tr><th scope="col">Month</th><th scope="col">Bill</th><th scope="col">Current Balance</th><th scope="col">Paid Amount</th></tr></thead><tbody>
        ${records.map(({ month, bill }) => `<tr><td>${escapeHtml(monthLabel(month))}</td><td>${escapeHtml(bill.name)}</td><td>${money(bill.currentBalance)}</td><td>${money(bill.paidAmount)}</td></tr>`).join("")}
      </tbody></table></div>`;
  }

  button.addEventListener("click", () => {
    const previous = picker.value;
    const options = bills();
    picker.innerHTML = options.map(([key, name]) => `<option value="${escapeHtml(key)}">${escapeHtml(name)}</option>`).join("");
    if (options.some(([key]) => key === previous)) picker.value = previous;
    render();
    dialog.showModal();
  });
  picker.addEventListener("change", render);
  close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
})();
