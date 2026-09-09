const SUBMIT_PRIORITY_URL =
  "https://ydtbmzffqedgbcsbreqj.supabase.co/functions/v1/submit-priority";

(function () {
  const form = document.querySelector("#priority-form");
  if (!form) return;

  const submitButton = form.querySelector("[data-submit-priority]");
  const statusBox = document.querySelector("[data-priority-status]");

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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const data = new FormData(form);

    const payload = {
      client_name: String(data.get("name") || "").trim(),
      contact: String(data.get("contact") || "").trim(),
      bot_identifier: String(
        data.get("bot_identifier") || ""
      ).trim(),
      source_reference: String(
        data.get("source_reference") || ""
      ).trim(),
      note: String(data.get("note") || "").trim(),
      website_url: String(
        data.get("website_url") || ""
      ).trim(),
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

    if (!payload.bot_identifier) {
      setStatus(
        "Tell Anthem which upcoming bot you want prioritized.",
        "error"
      );
      return;
    }

    if (!data.get("scope_ack")) {
      setStatus(
        "Please confirm that you understand what prioritization does.",
        "error"
      );
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting…";
    }

    setStatus(
      "Saving your priority request…",
      "working"
    );

    try {
      const response = await fetch(
        SUBMIT_PRIORITY_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
          "The priority request could not be submitted."
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
          "Submit priority request";
      }
    }
  });

  function showSuccess(requestId) {
    sessionStorage.setItem(
      "anthemLastPriorityRequestId",
      requestId
    );

    setStatus("", "");

    const formContainer =
      form.closest(".form-card") ||
      form.parentElement;

    formContainer.innerHTML = `
      <div class="request-success">
        <p class="eyebrow">Priority request received</p>
        <h3>it is in the pile.</h3>

        <div class="request-success-id">
          <small>PRIORITY REQUEST ID</small>
          <strong>${escapeHtml(requestId)}</strong>
        </div>

        <p>
          Keep this ID. This request tells Anthem which
          original upcoming bot you want moved higher in
          the posting queue. It does not turn the bot into
          a commission and does not guarantee a specific
          posting date.
        </p>

        <button
          class="btn btn-primary"
          type="button"
          data-open-priority-chat
        >
          Discuss this request in chat
        </button>
      </div>
    `;

    const chatButton =
      document.querySelector(
        "[data-open-priority-chat]"
      );

    chatButton?.addEventListener(
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

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
