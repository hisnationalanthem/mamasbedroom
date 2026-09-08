import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
} from "./supabase-config.js";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const loginView = document.querySelector("[data-login-view]");
const dashboardView = document.querySelector("[data-dashboard-view]");
const loginForm = document.querySelector("[data-login-form]");
const loginStatus = document.querySelector("[data-login-status]");
const logoutButton = document.querySelector("[data-logout]");
const refreshButton = document.querySelector("[data-refresh]");

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
      item.reference_links
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
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
                : `$${escapeHtml(item.quoted_total_cad)} CAD`}
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

          <div class="detail full">
            <small>Internal notes</small>
            <p>${escapeHtml(item.internal_notes || "—")}</p>
          </div>
        </div>
      </div>
    `;

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
  await loadCommissions();
});

logoutButton.addEventListener("click", async () => {
  await supabase.auth.signOut();
  commissions = [];
  list.innerHTML = "";
  showLogin();
});

refreshButton.addEventListener("click", loadCommissions);

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
  await loadCommissions();
} else {
  showLogin();
}
