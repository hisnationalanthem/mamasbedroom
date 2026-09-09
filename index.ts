import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY =
  Deno.env.get("STRIPE_SECRET_KEY")!;

const SITE_URL =
  "https://hisnationalanthem.github.io/mamasbedroom";

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

const stripe = new Stripe(STRIPE_SECRET_KEY);

const ALLOWED_ORIGINS = new Set([
  "https://hisnationalanthem.github.io",
]);

function corsHeaders(origin: string | null) {
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.has(origin)
      ? origin
      : "https://hisnationalanthem.github.io";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "content-type, apikey",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function jsonResponse(
  body: unknown,
  status: number,
  origin: string | null
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json",
    },
  });
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function makeRequestId() {
  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const random = crypto.randomUUID()
    .replaceAll("-", "")
    .slice(0, 8)
    .toUpperCase();

  return `PRIORITY-${yy}${mm}${dd}-${random}`;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { success: false, error: "Method not allowed." },
      405,
      origin
    );
  }

  try {
    const body = await req.json();

    const websiteUrl =
      cleanText(body.website_url, 500);

    // Honeypot.
    if (websiteUrl) {
      return jsonResponse({ success: true }, 200, origin);
    }

    const clientName =
      cleanText(body.client_name, 150);

    const contact =
      cleanText(body.contact, 300);

    const botIdentifier =
      cleanText(body.bot_identifier, 1500);

    const sourceReference =
      cleanText(body.source_reference, 3000);

    const note =
      cleanText(body.note, 6000);

    const donationMethod =
      cleanText(body.donation_method, 50);

    const donationAmount =
      Number(body.donation_amount_cad);

    if (!clientName) {
      return jsonResponse(
        {
          success: false,
          error: "Name or handle is required.",
        },
        400,
        origin
      );
    }

    if (!contact) {
      return jsonResponse(
        {
          success: false,
          error: "Contact information is required.",
        },
        400,
        origin
      );
    }

    if (!botIdentifier) {
      return jsonResponse(
        {
          success: false,
          error: "Tell Anthem which upcoming bot you mean.",
        },
        400,
        origin
      );
    }

    if (
      !Number.isFinite(donationAmount) ||
      donationAmount <= 0 ||
      donationAmount > 999999.99
    ) {
      return jsonResponse(
        {
          success: false,
          error: "Enter a valid support amount in CAD.",
        },
        400,
        origin
      );
    }

    if (!["Stripe", "PayPal"].includes(donationMethod)) {
      return jsonResponse(
        {
          success: false,
          error: "Choose Stripe or PayPal.",
        },
        400,
        origin
      );
    }

    // Stripe's CAD minimum is $0.50 for CAD settlement.
    // Keep Stripe requests at or above that threshold.
    if (
      donationMethod === "Stripe" &&
      donationAmount < 0.50
    ) {
      return jsonResponse(
        {
          success: false,
          error: "Stripe support must be at least $0.50 CAD.",
        },
        400,
        origin
      );
    }

    const requestId = makeRequestId();
    const rowId = crypto.randomUUID();

    const { error: insertError } =
      await supabaseAdmin
        .from("bot_priority_requests")
        .insert({
          id: rowId,
          request_id: requestId,
          client_name: clientName,
          contact,
          bot_identifier: botIdentifier,
          source_reference:
            sourceReference || null,
          note: note || null,
          donation_amount_cad:
            donationAmount,
          donation_method:
            donationMethod,
          donation_status:
            "Awaiting Donation",
          status: "Pending",
          stripe_payment_status:
            donationMethod === "Stripe"
              ? "checkout_not_started"
              : null,
        });

    if (insertError) {
      console.error(
        "priority insert error:",
        insertError
      );

      return jsonResponse(
        {
          success: false,
          error: "The priority request could not be saved.",
        },
        500,
        origin
      );
    }

    // PayPal remains manually verified.
    if (donationMethod === "PayPal") {
      return jsonResponse(
        {
          success: true,
          request_id: requestId,
          donation_amount_cad:
            donationAmount,
          donation_method:
            donationMethod,
          payment_mode: "manual",
        },
        201,
        origin
      );
    }

    try {
      const amountCents =
        Math.round(donationAmount * 100);

      const checkoutSession =
        await stripe.checkout.sessions.create({
          mode: "payment",
          submit_type: "pay",
          client_reference_id: requestId,

          success_url:
            `${SITE_URL}/priority-payment-success.html` +
            `?request_id=${encodeURIComponent(requestId)}` +
            `&session_id={CHECKOUT_SESSION_ID}`,

          cancel_url:
            `${SITE_URL}/priority-payment-cancelled.html` +
            `?request_id=${encodeURIComponent(requestId)}`,

          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: "cad",
                unit_amount: amountCents,
                product_data: {
                  name: "Upcoming Bot Priority Support",
                  description:
                    "Creator support that influences priority weight for an existing upcoming original bot. It does not purchase creative control or a guaranteed posting date.",
                },
              },
            },
          ],

          metadata: {
            kind: "bot_priority_support",
            priority_request_id: rowId,
            request_id: requestId,
          },

          payment_intent_data: {
            metadata: {
              kind: "bot_priority_support",
              priority_request_id: rowId,
              request_id: requestId,
            },
          },
        });

      const { error: updateError } =
        await supabaseAdmin
          .from("bot_priority_requests")
          .update({
            stripe_checkout_session_id:
              checkoutSession.id,
            stripe_payment_status:
              checkoutSession.payment_status ||
              "unpaid",
          })
          .eq("id", rowId);

      if (updateError) {
        console.error(
          "Could not save Stripe session ID:",
          updateError
        );
      }

      if (!checkoutSession.url) {
        throw new Error(
          "Stripe did not return a checkout URL."
        );
      }

      return jsonResponse(
        {
          success: true,
          request_id: requestId,
          donation_amount_cad:
            donationAmount,
          donation_method:
            donationMethod,
          payment_mode: "stripe_checkout",
          checkout_url:
            checkoutSession.url,
        },
        201,
        origin
      );
    } catch (stripeError) {
      console.error(
        "Stripe Checkout creation failed:",
        stripeError
      );

      await supabaseAdmin
        .from("bot_priority_requests")
        .update({
          stripe_payment_status:
            "checkout_creation_failed",
        })
        .eq("id", rowId);

      // The priority request is still safely stored.
      return jsonResponse(
        {
          success: true,
          request_id: requestId,
          donation_amount_cad:
            donationAmount,
          donation_method:
            donationMethod,
          payment_mode: "stripe_checkout_failed",
          payment_error:
            "The request was saved, but Stripe Checkout could not be opened.",
        },
        201,
        origin
      );
    }
  } catch (error) {
    console.error("submit-priority error:", error);

    return jsonResponse(
      {
        success: false,
        error: "The request could not be processed.",
      },
      500,
      origin
    );
  }
});
