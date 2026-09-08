const SUBMIT_COMMISSION_URL =
  "https://ydtbmzffqedgbcsbreqj.supabase.co/functions/v1/submit-commission";

(function () {
  const form = document.querySelector("#commission-form");

  if (!form) return;

  const submitButton =
    form.querySelector("[data-submit-request]");

  const statusBox =
    document.querySelector("[data-copy-status]");

  function setStatus(message, type = "") {
    if (!statusBox) return;

    statusBox.textContent = message;

    statusBox.classList.remove(
      "is-success",
      "is-error",
      "is-working"
    );

    if (type) {
      statusBox.classList.add(`is-${type}`);
    }
  }

  function getGraveyardId() {
    const params =
      new URLSearchParams(window.location.search);

    return params.get("graveyard_id") || "";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const data = new FormData(form);

    const payload = {
      client_name:
        String(data.get("name") || "").trim(),

      contact:
        String(data.get("contact") || "").trim(),

      commission_type:
        String(data.get("type") || "").trim(),

      graveyard_id:
        getGraveyardId(),

      add_ons:
        String(data.get("budget") || "").trim(),

      timing:
        String(data.get("timing") || "").trim(),

      details:
        String(data.get("details") || "").trim(),

      reference_links:
        String(data.get("references") || "").trim(),

      website_url:
        String(data.get("website_url") || "").trim()
    };

    if (!payload.client_name) {
      setStatus(
        "Add your name or handle before submitting.",
        "error"
      );
      return;
    }

    if (!payload.contact) {
      setStatus(
        "Add a contact method before submitting.",
        "error"
      );
      return;
    }

    if (!payload.commission_type) {
      setStatus(
        "Choose a commission type.",
        "error"
      );
      return;
    }

    if (!payload.details) {
      setStatus(
        "Add your project details before submitting.",
        "error"
      );
      return;
    }

    if (!data.get("tos")) {
      setStatus(
        "Please read and accept the TOS before submitting.",
        "error"
      );
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting…";
    }

    setStatus(
      "Saving your commission request…",
      "working"
    );

    try {
      const response = await fetch(
        SUBMIT_COMMISSION_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (result.closed) {
          throw new Error(
            "Commissions are currently closed."
          );
        }

        throw new Error(
          result.error ||
          "The request could not be submitted."
        );
      }

      if (!result.success || !result.request_id) {
        throw new Error(
          "The request was not confirmed."
        );
      }

      showSuccess(result.request_id);

    } catch (error) {
      console.error(error);

      setStatus(
        error.message ||
        "Something went wrong while submitting.",
        "error"
      );

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent =
          "Submit request to Anthem";
      }
    }
  });


  function showSuccess(requestId) {
    sessionStorage.setItem(
      "anthemLastSubmittedRequestId",
      requestId
    );

    setStatus("", "");

    const formContainer =
      form.closest(".form-card") ||
      form.parentElement;

    formContainer.innerHTML = `
      <div class="request-success">
        <p class="eyebrow">
          Request received
        </p>

        <h3>
          Your commission is saved.
        </h3>

        <div class="request-success-id">
          <small>REQUEST ID</small>
          <strong>${escapeHtml(requestId)}</strong>
        </div>

        <p>
          Keep this request ID. Your submission has
          been stored, but it is not approved until
          Anthem confirms the final scope and CAD total.
        </p>

        <button
          class="btn btn-primary"
          type="button"
          data-open-request-chat
        >
          Discuss this request in chat
        </button>
      </div>
    `;

    const chatButton =
      document.querySelector(
        "[data-open-request-chat]"
      );

    if (chatButton) {
      chatButton.addEventListener(
        "click",
        async () => {
          if (
            window.AnthemChat &&
            typeof window.AnthemChat.openWhenReady
              === "function"
          ) {
            await window.AnthemChat.openWhenReady();
          }
        }
      );
    }
  }


  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
