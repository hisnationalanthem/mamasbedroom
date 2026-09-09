import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
} from "./supabase-config.js?v=3";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const STATUSES = [
  "New",
  "Needs Discussion",
  "Approved — Awaiting Payment",
  "Paid — Queued",
  "In Progress",
  "Waiting on Client",
  "Complete",
  "Declined",
  "Cancelled"
];

const PAYMENT_STATUSES = [
  "Unpaid",
  "Paid",
  "Refunded",
  "Partially Refunded"
];

const PAYMENT_METHODS = [
  "",
  "Stripe",
  "PayPal"
];

const loginView = document.querySelector("[data-login-view]");
const dashboardView = document.querySelector("[data-dashboard-view]");
const loginForm = document.querySelector("[data-login-form]");
const loginStatus = document.querySelector("[data-login-status]");
const logoutButton = document.querySelector("[data-logout]");
const refreshButton = document.querySelector("[data-refresh]");
const commissionsToggle = document.querySelector("[data-commissions-toggle]");

const list = document.querySelector("[data-commission-list]");
const loading = document.querySelector("[data-loading]");
const empty = document.querySelector("[data-empty]");
const dashboardStatus = document.querySelector("[data-dashboard-status]");

const searchInput = document.querySelector("[data-search]");
const statusFilter = document.querySelector("[data-status-filter]");

const statTotal = document.querySelector("[data-stat-total]");
const statNew = document.querySelector("[data-stat-new]");
const statProgress = document.querySelector("[data-stat-progress]");
const statComplete = document.querySelector("[data-stat-complete]");

let commissions = [];
let commissionsOpen = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function optionHtml(values, selected, blankLabel = "") {
  return values.map(value => {
    const label = value || blankLabel;
    const isSelected = value === (selected ?? "");
    return `<option value="${escapeHtml(value)}"${isSelected ? " selected" : ""}>${escapeHtml(label)}</option>`;
  }).join("");
}

function showLogin(message = "") {
  loginView.hidden = false;
  dashboardView.hidden = true;
  logoutButton.hidden = true;
  loginStatus.textContent = message;
}

function showDashboard() {
  loginView.hidden = true;
  dashboardView.hidden = false;
  logoutButton.hidden = false;
  loginStatus.textContent = "";
}

function setLoading(isLoading) {
  loading.hidden = !isLoading;

  if (isLoading) {
    list.hidden = true;
    empty.hidden = true;
  }
}

function updateStats() {
  statTotal.textContent = String(commissions.length);
  statNew.textContent = String(
    commissions.filter(item => item.status === "New").length
  );
  statProgress.textContent = String(
    commissions.filter(item =>
      ["Paid — Queued", "In Progress", "Waiting on Client"].includes(item.status)
    ).length
  );
  statComplete.textContent = String(
    commissions.filter(item => item.status === "Complete").length
  );
}

function renderCommissionsToggle() {
  if (commissionsOpen === null) {
    commissionsToggle.textContent = "Checking commissions…";
    commissionsToggle.classList.remove("is-open", "is-closed");
    commissionsToggle.disabled = true;
    return;
  }

  commissionsToggle.disabled = false;
  commissionsToggle.textContent =
    commissionsOpen ? "Commissions: OPEN" : "Commissions: CLOSED";
  commissionsToggle.classList.toggle("is-open", commissionsOpen);
  commissionsToggle.classList.toggle("is-closed", !commissionsOpen);
  commissionsToggle.setAttribute("aria-pressed", String(commissionsOpen));
}

async function loadCommissionsSetting() {
  commissionsOpen = null;
  renderCommissionsToggle();

  const { data, error } = await supabase
    .from("public_site_settings")
    .select("value")
    .eq("key", "commissions_open")
    .single();

  if (error) {
    console.error(error);
    dashboardStatus.textContent =
      "Could not read the commissions open/closed setting.";
    return;
  }

  commissionsOpen = data?.value?.open === true;
  renderCommissionsToggle();
}

async function toggleCommissions() {
  if (commissionsOpen === null) return;

  const nextValue = !commissionsOpen;
  commissionsToggle.disabled = true;
  commissionsToggle.textContent = "Saving…";

  const { error } = await supabase
    .from("public_site_settings")
    .update({ value: { open: nextValue } })
    .eq("key", "commissions_open");

  if (error) {
    console.error(error);
    dashboardStatus.textContent =
      "Could not change commission availability.";
    renderCommissionsToggle();
    return;
  }

  commissionsOpen = nextValue;
  dashboardStatus.textContent =
    nextValue
      ? "Commissions are open. New requests can be submitted."
      : "Commissions are closed. New requests will be rejected.";
  renderCommissionsToggle();
}

function getFilteredCommissions() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;

  return commissions.filter(item => {
    const matchesStatus =
      !selectedStatus || item.status === selectedStatus;

    if (!matchesStatus) return false;
    if (!query) return true;

    const haystack = [
      item.request_id,
      item.client_name,
      item.contact,
      item.commission_type,
      item.graveyard_id,
      item.details,
      item.reference_links,
      item.internal_notes
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

async function saveCommission(item, form, statusBox) {
  const formData = new FormData(form);
  const quotedRaw = String(formData.get("quoted_total_cad") || "").trim();

  let quotedTotal = null;

  if (quotedRaw) {
    quotedTotal = Number(quotedRaw);

    if (!Number.isFinite(quotedTotal) || quotedTotal < 0) {
      statusBox.textContent = "Enter a valid CAD quote.";
      return null;
    }
  }

  const updates = {
    status: String(formData.get("status") || item.status),
    payment_status: String(
      formData.get("payment_status") || item.payment_status
    ),
    payment_method:
      String(formData.get("payment_method") || "").trim() || null,
    quoted_total_cad: quotedTotal,
    internal_notes:
      String(formData.get("internal_notes") || "").trim() || null
  };

  statusBox.textContent = "Saving…";

  form.querySelectorAll("button, input, select, textarea").forEach(el => {
    el.disabled = true;
  });

  const { data, error } = await supabase
    .from("commissions")
    .update(updates)
    .eq("id", item.id)
    .select("*")
    .single();

  form.querySelectorAll("button, input, select, textarea").forEach(el => {
    el.disabled = false;
  });

  if (error) {
    console.error(error);
    statusBox.textContent = `Save failed: ${error.message}`;
    return null;
  }

  Object.assign(item, data);
  updateStats();

  const card = form.closest(".commission-card");
  const pill = card?.querySelector(".pill");
  const paymentReadout = card?.querySelector("[data-payment-readout]");
  const quoteReadout = card?.querySelector("[data-quote-readout]");
  const approvedDate = card?.querySelector("[data-approved-at]");
  const paidDate = card?.querySelector("[data-paid-at]");
  const startedDate = card?.querySelector("[data-started-at]");
  const completedDate = card?.querySelector("[data-completed-at]");

  if (pill) pill.textContent = data.status;

  if (paymentReadout) {
    paymentReadout.textContent =
      `${data.payment_status || "—"}${data.payment_method ? ` · ${data.payment_method}` : ""}`;
  }

  if (quoteReadout) {
    quoteReadout.textContent =
      data.quoted_total_cad == null
        ? "—"
        : `$${Number(data.quoted_total_cad).toFixed(2)} CAD`;
  }

  if (approvedDate) approvedDate.textContent = formatDate(data.approved_at);
  if (paidDate) paidDate.textContent = formatDate(data.paid_at);
  if (startedDate) startedDate.textContent = formatDate(data.started_at);
  if (completedDate) completedDate.textContent = formatDate(data.completed_at);

  statusBox.textContent = "Saved.";
  return data;
}

function renderCommissions() {
  const filtered = getFilteredCommissions();

  list.innerHTML = "";

  if (!filtered.length) {
    list.hidden = true;
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  list.hidden = false;

  filtered.forEach(item => {
    const card = document.createElement("details");
    card.className = "commission-card";

    card.innerHTML = `
      <summary>
        <div class="commission-summary">
          <div class="commission-title">
            <strong>${escapeHtml(item.client_name)}</strong>
            <small>${escapeHtml(item.request_id)}</small>
          </div>

          <div class="commission-meta">
            ${escapeHtml(item.commission_type)}
            <br>
            ${escapeHtml(formatDate(item.submitted_at))}
          </div>

          <span class="pill">${escapeHtml(item.status)}</span>
        </div>
      </summary>

      <div class="commission-body">
        <div class="detail-grid">
          <div class="detail">
            <small>Contact</small>
            <p>${escapeHtml(item.contact || "—")}</p>
          </div>

          <div class="detail">
            <small>Payment</small>
            <p data-payment-readout>
              ${escapeHtml(item.payment_status || "—")}
              ${item.payment_method ? ` · ${escapeHtml(item.payment_method)}` : ""}
            </p>
          </div>

          <div class="detail">
            <small>Quoted total</small>
            <p data-quote-readout>
              ${item.quoted_total_cad == null
                ? "—"
                : `$${escapeHtml(Number(item.quoted_total_cad).toFixed(2))} CAD`}
            </p>
          </div>

          <div class="detail">
            <small>Timing</small>
            <p>${escapeHtml(item.timing || "—")}</p>
          </div>

          <div class="detail">
            <small>Add-ons / budget</small>
            <p>${escapeHtml(item.add_ons || "—")}</p>
          </div>

          <div class="detail">
            <small>Graveyard ID</small>
            <p>${escapeHtml(item.graveyard_id || "—")}</p>
          </div>

          <div class="detail full">
            <small>Project details</small>
            <p>${escapeHtml(item.details || "—")}</p>
          </div>

          <div class="detail full">
            <small>References / links</small>
            <p>${escapeHtml(item.reference_links || "—")}</p>
          </div>
        </div>

        <div class="milestone-list">
          <div class="milestone">
            <small>Approved</small>
            <span data-approved-at>${escapeHtml(formatDate(item.approved_at))}</span>
          </div>
          <div class="milestone">
            <small>Paid</small>
            <span data-paid-at>${escapeHtml(formatDate(item.paid_at))}</span>
          </div>
          <div class="milestone">
            <small>Started</small>
            <span data-started-at>${escapeHtml(formatDate(item.started_at))}</span>
          </div>
          <div class="milestone">
            <small>Completed</small>
            <span data-completed-at>${escapeHtml(formatDate(item.completed_at))}</span>
          </div>
        </div>

        <form class="edit-panel" data-edit-form>
          <h3>Manage commission</h3>

          <div class="edit-grid">
            <div class="edit-field">
              <label>Status</label>
              <select name="status">
                ${optionHtml(STATUSES, item.status)}
              </select>
            </div>

            <div class="edit-field">
              <label>Payment status</label>
              <select name="payment_status">
                ${optionHtml(PAYMENT_STATUSES, item.payment_status)}
              </select>
            </div>

            <div class="edit-field">
              <label>Payment method</label>
              <select name="payment_method">
                ${optionHtml(PAYMENT_METHODS, item.payment_method || "", "Not set")}
              </select>
            </div>

            <div class="edit-field">
              <label>Quoted total — CAD</label>
              <input
                name="quoted_total_cad"
                type="number"
                min="0"
                step="0.01"
                value="${item.quoted_total_cad == null ? "" : escapeHtml(item.quoted_total_cad)}"
                placeholder="20.00"
              >
            </div>

            <div class="edit-field full">
              <label>Private internal notes</label>
              <textarea
                name="internal_notes"
                placeholder="Notes only you can see…"
              >${escapeHtml(item.internal_notes || "")}</textarea>
            </div>
          </div>

          <div class="edit-actions">
            <button class="btn btn-primary" type="submit">
              Save changes
            </button>

            <button
              class="btn btn-dark"
              type="button"
              data-mark-complete
            >
              Mark complete
            </button>

            <span class="save-status" data-save-status aria-live="polite"></span>
          </div>
        </form>
      </div>
    `;

    const form = card.querySelector("[data-edit-form]");
    const saveStatus = card.querySelector("[data-save-status]");
    const markComplete = card.querySelector("[data-mark-complete]");

    form.addEventListener("submit", async event => {
      event.preventDefault();
      await saveCommission(item, form, saveStatus);
    });

    markComplete.addEventListener("click", async () => {
      form.elements.status.value = "Complete";
      await saveCommission(item, form, saveStatus);
    });

    list.appendChild(card);
  });
}

async function loadCommissions() {
  setLoading(true);
  dashboardStatus.textContent = "";

  const { data, error } = await supabase
    .from("commissions")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error(error);
    setLoading(false);

    if (error.code === "42501" || /permission|policy|rls/i.test(error.message)) {
      dashboardStatus.textContent =
        "Signed in, but this account is not authorized as an admin.";
    } else {
      dashboardStatus.textContent =
        "Could not load commissions. Check the browser console for details.";
    }

    return;
  }

  commissions = data || [];
  setLoading(false);
  updateStats();
  renderCommissions();
}

async function refreshDashboard() {
  await Promise.all([
    loadCommissions(),
    loadCommissionsSetting()
  ]);
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  const formData = new FormData(loginForm);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  loginStatus.textContent = "Signing in…";

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    loginStatus.textContent = error.message;
    return;
  }

  showDashboard();
  await refreshDashboard();
});

logoutButton.addEventListener("click", async () => {
  await supabase.auth.signOut();
  commissions = [];
  list.innerHTML = "";
  commissionsOpen = null;
  renderCommissionsToggle();
  showLogin();
});

refreshButton.addEventListener("click", refreshDashboard);
commissionsToggle.addEventListener("click", toggleCommissions);

searchInput.addEventListener("input", renderCommissions);
statusFilter.addEventListener("change", renderCommissions);

supabase.auth.onAuthStateChange((_event, session) => {
  if (!session) {
    showLogin();
  }
});

const {
  data: { session }
} = await supabase.auth.getSession();

if (session) {
  showDashboard();
  await refreshDashboard();
} else {
  showLogin();
}
