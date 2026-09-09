import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
} from "./supabase-config.js?v=4";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const COMMISSION_STATUSES = [
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

const PRIORITY_STATUSES = [
  "Pending",
  "Accepted",
  "Applied",
  "Declined",
  "Cancelled"
];

const loginView = document.querySelector("[data-login-view]");
const dashboardView = document.querySelector("[data-dashboard-view]");
const loginForm = document.querySelector("[data-login-form]");
const loginStatus = document.querySelector("[data-login-status]");
const logoutButton = document.querySelector("[data-logout]");
const refreshButton = document.querySelector("[data-refresh]");
const commissionsToggle = document.querySelector("[data-commissions-toggle]");
const dashboardStatus = document.querySelector("[data-dashboard-status]");

const commissionList = document.querySelector("[data-commission-list]");
const commissionLoading = document.querySelector("[data-loading]");
const commissionEmpty = document.querySelector("[data-empty]");
const commissionSearch = document.querySelector("[data-search]");
const commissionStatusFilter = document.querySelector("[data-status-filter]");

const statTotal = document.querySelector("[data-stat-total]");
const statNew = document.querySelector("[data-stat-new]");
const statProgress = document.querySelector("[data-stat-progress]");
const statComplete = document.querySelector("[data-stat-complete]");

const priorityList = document.querySelector("[data-priority-list]");
const priorityLoading = document.querySelector("[data-priority-loading]");
const priorityEmpty = document.querySelector("[data-priority-empty]");
const prioritySearch = document.querySelector("[data-priority-search]");
const priorityStatusFilter = document.querySelector("[data-priority-status-filter]");

const priorityStatTotal = document.querySelector("[data-priority-stat-total]");
const priorityStatPending = document.querySelector("[data-priority-stat-pending]");
const priorityStatAccepted = document.querySelector("[data-priority-stat-accepted]");
const priorityStatApplied = document.querySelector("[data-priority-stat-applied]");

let commissions = [];
let priorityRequests = [];
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

function setCommissionLoading(isLoading) {
  commissionLoading.hidden = !isLoading;

  if (isLoading) {
    commissionList.hidden = true;
    commissionEmpty.hidden = true;
  }
}

function setPriorityLoading(isLoading) {
  priorityLoading.hidden = !isLoading;

  if (isLoading) {
    priorityList.hidden = true;
    priorityEmpty.hidden = true;
  }
}

function updateCommissionStats() {
  statTotal.textContent = String(commissions.length);

  statNew.textContent = String(
    commissions.filter(item => item.status === "New").length
  );

  statProgress.textContent = String(
    commissions.filter(item =>
      ["Paid — Queued", "In Progress", "Waiting on Client"]
        .includes(item.status)
    ).length
  );

  statComplete.textContent = String(
    commissions.filter(item => item.status === "Complete").length
  );
}

function updatePriorityStats() {
  priorityStatTotal.textContent =
    String(priorityRequests.length);

  priorityStatPending.textContent = String(
    priorityRequests.filter(item => item.status === "Pending").length
  );

  priorityStatAccepted.textContent = String(
    priorityRequests.filter(item => item.status === "Accepted").length
  );

  priorityStatApplied.textContent = String(
    priorityRequests.filter(item => item.status === "Applied").length
  );
}

function renderCommissionsToggle() {
  if (commissionsOpen === null) {
    commissionsToggle.textContent =
      "Checking commissions…";
    commissionsToggle.classList.remove(
      "is-open",
      "is-closed"
    );
    commissionsToggle.disabled = true;
    return;
  }

  commissionsToggle.disabled = false;
  commissionsToggle.textContent =
    commissionsOpen
      ? "Commissions: OPEN"
      : "Commissions: CLOSED";

  commissionsToggle.classList.toggle(
    "is-open",
    commissionsOpen
  );

  commissionsToggle.classList.toggle(
    "is-closed",
    !commissionsOpen
  );

  commissionsToggle.setAttribute(
    "aria-pressed",
    String(commissionsOpen)
  );
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

  commissionsOpen =
    data?.value?.open === true;

  renderCommissionsToggle();
}

async function toggleCommissions() {
  if (commissionsOpen === null) return;

  const nextValue = !commissionsOpen;

  commissionsToggle.disabled = true;
  commissionsToggle.textContent = "Saving…";

  const { error } = await supabase
    .from("public_site_settings")
    .update({
      value: {
        open: nextValue
      }
    })
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
      ? "Commissions are open. New commission requests can be submitted."
      : "Commissions are closed. New commission requests will be rejected.";

  renderCommissionsToggle();
}

function getFilteredCommissions() {
  const query =
    commissionSearch.value.trim().toLowerCase();

  const selectedStatus =
    commissionStatusFilter.value;

  return commissions.filter(item => {
    if (
      selectedStatus &&
      item.status !== selectedStatus
    ) {
      return false;
    }

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

async function saveCommission(
  item,
  form,
  statusBox
) {
  const formData = new FormData(form);

  const quotedRaw = String(
    formData.get("quoted_total_cad") || ""
  ).trim();

  let quotedTotal = null;

  if (quotedRaw) {
    quotedTotal = Number(quotedRaw);

    if (
      !Number.isFinite(quotedTotal) ||
      quotedTotal < 0
    ) {
      statusBox.textContent =
        "Enter a valid CAD quote.";
      return null;
    }
  }

  const updates = {
    status: String(
      formData.get("status") ||
      item.status
    ),
    payment_status: String(
      formData.get("payment_status") ||
      item.payment_status
    ),
    payment_method:
      String(
        formData.get("payment_method") || ""
      ).trim() || null,
    quoted_total_cad: quotedTotal,
    internal_notes:
      String(
        formData.get("internal_notes") || ""
      ).trim() || null
  };

  statusBox.textContent = "Saving…";

  form
    .querySelectorAll(
      "button, input, select, textarea"
    )
    .forEach(el => {
      el.disabled = true;
    });

  const { data, error } = await supabase
    .from("commissions")
    .update(updates)
    .eq("id", item.id)
    .select("*")
    .single();

  form
    .querySelectorAll(
      "button, input, select, textarea"
    )
    .forEach(el => {
      el.disabled = false;
    });

  if (error) {
    console.error(error);

    statusBox.textContent =
      `Save failed: ${error.message}`;

    return null;
  }

  Object.assign(item, data);
  updateCommissionStats();
  renderCommissions();

  return data;
}

function renderCommissions() {
  const filtered =
    getFilteredCommissions();

  commissionList.innerHTML = "";

  if (!filtered.length) {
    commissionList.hidden = true;
    commissionEmpty.hidden = false;
    return;
  }

  commissionEmpty.hidden = true;
  commissionList.hidden = false;

  filtered.forEach(item => {
    const card =
      document.createElement("details");

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
            <p>
              ${escapeHtml(item.payment_status || "—")}
              ${item.payment_method ? ` · ${escapeHtml(item.payment_method)}` : ""}
            </p>
          </div>

          <div class="detail">
            <small>Quoted total</small>
            <p>
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
            <span>${escapeHtml(formatDate(item.approved_at))}</span>
          </div>
          <div class="milestone">
            <small>Paid</small>
            <span>${escapeHtml(formatDate(item.paid_at))}</span>
          </div>
          <div class="milestone">
            <small>Started</small>
            <span>${escapeHtml(formatDate(item.started_at))}</span>
          </div>
          <div class="milestone">
            <small>Completed</small>
            <span>${escapeHtml(formatDate(item.completed_at))}</span>
          </div>
        </div>

        <form class="edit-panel" data-edit-form>
          <h3>Manage commission</h3>

          <div class="edit-grid">
            <div class="edit-field">
              <label>Status</label>
              <select name="status">
                ${optionHtml(COMMISSION_STATUSES, item.status)}
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

    const form =
      card.querySelector("[data-edit-form]");

    const saveStatus =
      card.querySelector("[data-save-status]");

    const markComplete =
      card.querySelector("[data-mark-complete]");

    form.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const saved = await saveCommission(
          item,
          form,
          saveStatus
        );

        if (saved) {
          dashboardStatus.textContent =
            `${item.request_id} saved.`;
        }
      }
    );

    markComplete.addEventListener(
      "click",
      async () => {
        form.elements.status.value =
          "Complete";

        const saved = await saveCommission(
          item,
          form,
          saveStatus
        );

        if (saved) {
          dashboardStatus.textContent =
            `${item.request_id} marked complete.`;
        }
      }
    );

    commissionList.appendChild(card);
  });
}

function getFilteredPriorityRequests() {
  const query =
    prioritySearch.value.trim().toLowerCase();

  const selectedStatus =
    priorityStatusFilter.value;

  return priorityRequests.filter(item => {
    if (
      selectedStatus &&
      item.status !== selectedStatus
    ) {
      return false;
    }

    if (!query) return true;

    const haystack = [
      item.request_id,
      item.client_name,
      item.contact,
      item.bot_identifier,
      item.source_reference,
      item.note,
      item.internal_notes
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

async function savePriorityRequest(
  item,
  form,
  statusBox
) {
  const formData =
    new FormData(form);

  const updates = {
    status: String(
      formData.get("status") ||
      item.status
    ),
    internal_notes:
      String(
        formData.get("internal_notes") || ""
      ).trim() || null
  };

  statusBox.textContent = "Saving…";

  form
    .querySelectorAll(
      "button, input, select, textarea"
    )
    .forEach(el => {
      el.disabled = true;
    });

  const { data, error } = await supabase
    .from("bot_priority_requests")
    .update(updates)
    .eq("id", item.id)
    .select("*")
    .single();

  form
    .querySelectorAll(
      "button, input, select, textarea"
    )
    .forEach(el => {
      el.disabled = false;
    });

  if (error) {
    console.error(error);

    statusBox.textContent =
      `Save failed: ${error.message}`;

    return null;
  }

  Object.assign(item, data);

  updatePriorityStats();
  renderPriorityRequests();

  return data;
}

function renderPriorityRequests() {
  const filtered =
    getFilteredPriorityRequests();

  priorityList.innerHTML = "";

  if (!filtered.length) {
    priorityList.hidden = true;
    priorityEmpty.hidden = false;
    return;
  }

  priorityEmpty.hidden = true;
  priorityList.hidden = false;

  filtered.forEach(item => {
    const card =
      document.createElement("details");

    card.className = "priority-card";

    card.innerHTML = `
      <summary>
        <div class="priority-summary">
          <div class="priority-title">
            <strong>${escapeHtml(item.bot_identifier)}</strong>
            <small>${escapeHtml(item.request_id)}</small>
          </div>

          <div class="priority-meta">
            ${escapeHtml(item.client_name)}
            <br>
            ${escapeHtml(formatDate(item.submitted_at))}
          </div>

          <span class="pill">${escapeHtml(item.status)}</span>
        </div>
      </summary>

      <div class="priority-body">
        <div class="detail-grid">
          <div class="detail">
            <small>Requested by</small>
            <p>${escapeHtml(item.client_name)}</p>
          </div>

          <div class="detail">
            <small>Contact</small>
            <p>${escapeHtml(item.contact)}</p>
          </div>

          <div class="detail full">
            <small>Bot to prioritize</small>
            <p>${escapeHtml(item.bot_identifier)}</p>
          </div>

          <div class="detail full">
            <small>Where they saw it / reference</small>
            <p>${escapeHtml(item.source_reference || "—")}</p>
          </div>

          <div class="detail full">
            <small>Requester note</small>
            <p>${escapeHtml(item.note || "—")}</p>
          </div>
        </div>

        <div class="milestone-list">
          <div class="milestone">
            <small>Submitted</small>
            <span>${escapeHtml(formatDate(item.submitted_at))}</span>
          </div>
          <div class="milestone">
            <small>Accepted</small>
            <span>${escapeHtml(formatDate(item.accepted_at))}</span>
          </div>
          <div class="milestone">
            <small>Applied</small>
            <span>${escapeHtml(formatDate(item.applied_at))}</span>
          </div>
          <div class="milestone">
            <small>Updated</small>
            <span>${escapeHtml(formatDate(item.updated_at))}</span>
          </div>
        </div>

        <form class="edit-panel" data-priority-edit-form>
          <h3>Manage priority request</h3>

          <div class="edit-grid">
            <div class="edit-field">
              <label>Status</label>
              <select name="status">
                ${optionHtml(PRIORITY_STATUSES, item.status)}
              </select>
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
            <button
              class="btn btn-primary"
              type="submit"
            >
              Save changes
            </button>

            <button
              class="btn btn-dark"
              type="button"
              data-mark-applied
            >
              Mark applied
            </button>

            <span
              class="save-status"
              data-priority-save-status
              aria-live="polite"
            ></span>
          </div>
        </form>
      </div>
    `;

    const form =
      card.querySelector(
        "[data-priority-edit-form]"
      );

    const saveStatus =
      card.querySelector(
        "[data-priority-save-status]"
      );

    const markApplied =
      card.querySelector(
        "[data-mark-applied]"
      );

    form.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const saved =
          await savePriorityRequest(
            item,
            form,
            saveStatus
          );

        if (saved) {
          dashboardStatus.textContent =
            `${item.request_id} saved.`;
        }
      }
    );

    markApplied.addEventListener(
      "click",
      async () => {
        form.elements.status.value =
          "Applied";

        const saved =
          await savePriorityRequest(
            item,
            form,
            saveStatus
          );

        if (saved) {
          dashboardStatus.textContent =
            `${item.request_id} marked applied.`;
        }
      }
    );

    priorityList.appendChild(card);
  });
}

async function loadCommissions() {
  setCommissionLoading(true);

  const { data, error } = await supabase
    .from("commissions")
    .select("*")
    .order(
      "submitted_at",
      { ascending: false }
    );

  if (error) {
    console.error(error);

    setCommissionLoading(false);

    dashboardStatus.textContent =
      "Could not load commissions.";

    return;
  }

  commissions = data || [];

  setCommissionLoading(false);
  updateCommissionStats();
  renderCommissions();
}

async function loadPriorityRequests() {
  setPriorityLoading(true);

  const { data, error } = await supabase
    .from("bot_priority_requests")
    .select("*")
    .order(
      "submitted_at",
      { ascending: false }
    );

  if (error) {
    console.error(error);

    setPriorityLoading(false);

    dashboardStatus.textContent =
      "Could not load priority requests. Make sure priority-requests-setup.sql has been run.";

    return;
  }

  priorityRequests = data || [];

  setPriorityLoading(false);
  updatePriorityStats();
  renderPriorityRequests();
}

async function refreshDashboard() {
  dashboardStatus.textContent = "";

  await Promise.all([
    loadCommissions(),
    loadPriorityRequests(),
    loadCommissionsSetting()
  ]);
}

document
  .querySelectorAll("[data-dashboard-tab]")
  .forEach(button => {
    button.addEventListener("click", () => {
      const target =
        button.dataset.dashboardTab;

      document
        .querySelectorAll("[data-dashboard-tab]")
        .forEach(tab => {
          tab.classList.toggle(
            "is-active",
            tab === button
          );
        });

      document
        .querySelectorAll("[data-dashboard-panel]")
        .forEach(panel => {
          panel.hidden =
            panel.dataset.dashboardPanel !==
            target;
        });
    });
  });

loginForm.addEventListener(
  "submit",
  async event => {
    event.preventDefault();

    const formData =
      new FormData(loginForm);

    const email = String(
      formData.get("email") || ""
    ).trim();

    const password = String(
      formData.get("password") || ""
    );

    loginStatus.textContent =
      "Signing in…";

    const { error } =
      await supabase.auth
        .signInWithPassword({
          email,
          password
        });

    if (error) {
      loginStatus.textContent =
        error.message;
      return;
    }

    showDashboard();
    await refreshDashboard();
  }
);

logoutButton.addEventListener(
  "click",
  async () => {
    await supabase.auth.signOut();

    commissions = [];
    priorityRequests = [];

    commissionList.innerHTML = "";
    priorityList.innerHTML = "";

    commissionsOpen = null;
    renderCommissionsToggle();

    showLogin();
  }
);

refreshButton.addEventListener(
  "click",
  refreshDashboard
);

commissionsToggle.addEventListener(
  "click",
  toggleCommissions
);

commissionSearch.addEventListener(
  "input",
  renderCommissions
);

commissionStatusFilter.addEventListener(
  "change",
  renderCommissions
);

prioritySearch.addEventListener(
  "input",
  renderPriorityRequests
);

priorityStatusFilter.addEventListener(
  "change",
  renderPriorityRequests
);

supabase.auth.onAuthStateChange(
  (_event, session) => {
    if (!session) {
      showLogin();
    }
  }
);

const {
  data: { session }
} = await supabase.auth.getSession();

if (session) {
  showDashboard();
  await refreshDashboard();
} else {
  showLogin();
}
