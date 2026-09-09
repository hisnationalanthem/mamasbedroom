const SUBMIT_PRIORITY_URL =
  "https://ydtbmzffqedgbcsbreqj.supabase.co/functions/v1/submit-priority";

(function () {
  const form =
    document.querySelector("#priority-form");

  if (!form) return;

  const submitButton =
    form.querySelector(
      "[data-submit-priority]"
    );

  const statusBox =
    document.querySelector(
      "[data-priority-status]"
    );

  function setStatus(
    message,
    type = ""
  ) {
    if (!statusBox) return;

    statusBox.textContent = message;

    statusBox.classList.remove(
      "is-success",
      "is-error",
      "is-working"
    );

    if (type) {
      statusBox.classList.add(
        `is-${type}`
      );
    }
  }

  const cancelled =
    new URLSearchParams(
      window.location.search
    ).get("payment");

  if (cancelled === "cancelled") {
    setStatus(
      "Stripe checkout was cancelled. Your saved priority request has not been marked paid.",
      "error"
    );
  }

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const data =
        new FormData(form);

      const donationAmount =
        Number(
          data.get(
            "donation_amount_cad"
          )
        );

      const donationMethod =
        String(
          data.get(
            "donation_method"
          ) || ""
        ).trim();

      const payload = {
        client_name:
          String(
            data.get("name") || ""
          ).trim(),

        contact:
          String(
            data.get("contact") || ""
          ).trim(),

        bot_identifier:
          String(
            data.get(
              "bot_identifier"
            ) || ""
          ).trim(),

        source_reference:
          String(
            data.get(
              "source_reference"
            ) || ""
          ).trim(),

        note:
          String(
            data.get("note") || ""
          ).trim(),

        donation_amount_cad:
          donationAmount,

        donation_method:
          donationMethod,

        website_url:
          String(
            data.get(
              "website_url"
            ) || ""
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

      if (
        !Number.isFinite(
          payload.donation_amount_cad
        ) ||
        payload.donation_amount_cad <= 0
      ) {
        setStatus(
          "Enter the amount you want to contribute in CAD.",
          "error"
        );
        return;
      }

      if (
        payload.donation_method ===
          "Stripe" &&
        payload.donation_amount_cad <
          0.50
      ) {
        setStatus(
          "Stripe support must be at least $0.50 CAD.",
          "error"
        );
        return;
      }

      if (
        !["Stripe", "PayPal"]
          .includes(
            payload.donation_method
          )
      ) {
        setStatus(
          "Choose Stripe or PayPal.",
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
        submitButton.textContent =
          payload.donation_method ===
          "Stripe"
            ? "Creating secure checkout…"
            : "Submitting…";
      }

      setStatus(
        "Saving your priority request…",
        "working"
      );

      try {
        const response =
          await fetch(
            SUBMIT_PRIORITY_URL,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify(payload),
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
            "The priority request could not be submitted."
          );
        }

        if (
          !result.success ||
          !result.request_id
        ) {
          throw new Error(
            "The request was not confirmed."
          );
        }

        sessionStorage.setItem(
          "anthemLastPriorityRequestId",
          result.request_id
        );

        if (
          result.payment_mode ===
            "stripe_checkout" &&
          result.checkout_url
        ) {
          sessionStorage.setItem(
            "anthemPriorityCheckoutUrl",
            result.checkout_url
          );

          setStatus(
            "Request saved. Opening secure Stripe checkout…",
            "success"
          );

          window.setTimeout(() => {
            window.location.assign(
              result.checkout_url
            );
          }, 500);

          return;
        }

        if (
          result.payment_mode ===
          "stripe_checkout_failed"
        ) {
          showStripeFallback(
            result.request_id,
            payload.donation_amount_cad
          );
          return;
        }

        showManualSuccess(
          result.request_id,
          payload.donation_amount_cad,
          payload.donation_method
        );
      } catch (error) {
        console.error(error);

        setStatus(
          error.message ||
          "Something went wrong while submitting.",
          "error"
        );

        if (submitButton) {
          submitButton.disabled =
            false;
          submitButton.textContent =
            "Submit priority request";
        }
      }
    }
  );

  function showManualSuccess(
    requestId,
    donationAmount,
    donationMethod
  ) {
    const container =
      form.closest(".form-card") ||
      form.parentElement;

    const amountLabel =
      new Intl.NumberFormat(
        undefined,
        {
          style: "currency",
          currency: "CAD",
        }
      ).format(donationAmount);

    container.innerHTML = `
      <div class="request-success">
        <p class="eyebrow">Priority request received</p>
        <h3>it is in the pile.</h3>

        <div class="request-success-id">
          <small>PRIORITY REQUEST ID</small>
          <strong>${escapeHtml(requestId)}</strong>
        </div>

        <p>
          You chose
          <strong>${escapeHtml(amountLabel)}</strong>
          through
          <strong>${escapeHtml(donationMethod)}</strong>.
        </p>

        <p>
          PayPal is still verified manually.
          Keep the request ID and use chat to
          arrange/confirm the contribution.
        </p>

        <button
          class="btn btn-primary"
          type="button"
          data-open-priority-chat
        >
          Open chat for payment details
        </button>
      </div>
    `;

    wireChatButton();
  }

  function showStripeFallback(
    requestId,
    donationAmount
  ) {
    const container =
      form.closest(".form-card") ||
      form.parentElement;

    const amountLabel =
      new Intl.NumberFormat(
        undefined,
        {
          style: "currency",
          currency: "CAD",
        }
      ).format(donationAmount);

    container.innerHTML = `
      <div class="request-success">
        <p class="eyebrow">Request saved</p>
        <h3>stripe did not open.</h3>

        <div class="request-success-id">
          <small>PRIORITY REQUEST ID</small>
          <strong>${escapeHtml(requestId)}</strong>
        </div>

        <p>
          Your
          <strong>${escapeHtml(amountLabel)}</strong>
          priority request was saved, but the
          Stripe checkout session could not be
          created. Nothing was charged.
        </p>

        <button
          class="btn btn-primary"
          type="button"
          data-open-priority-chat
        >
          Open chat
        </button>
      </div>
    `;

    wireChatButton();
  }

  function wireChatButton() {
    const chatButton =
      document.querySelector(
        "[data-open-priority-chat]"
      );

    chatButton?.addEventListener(
      "click",
      async () => {
        if (
          window.AnthemChat &&
          typeof window.AnthemChat
            .openWhenReady === "function"
        ) {
          await window.AnthemChat
            .openWhenReady();
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
