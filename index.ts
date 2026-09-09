import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

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

    // Honeypot: real visitors never fill this.
    const websiteUrl = cleanText(body.website_url, 500);
    if (websiteUrl) {
      return jsonResponse({ success: true }, 200, origin);
    }

    const clientName = cleanText(body.client_name, 150);
    const contact = cleanText(body.contact, 300);
    const botIdentifier = cleanText(body.bot_identifier, 1500);
    const sourceReference = cleanText(body.source_reference, 3000);
    const note = cleanText(body.note, 6000);
    const donationMethod = cleanText(body.donation_method, 50);

    const donationAmount = Number(body.donation_amount_cad);

    if (!clientName) {
      return jsonResponse(
        { success: false, error: "Name or handle is required." },
        400,
        origin
      );
    }

    if (!contact) {
      return jsonResponse(
        { success: false, error: "Contact information is required." },
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
      donationAmount > 99999999.99
    ) {
      return jsonResponse(
        {
          success: false,
          error: "Enter a valid donation amount in CAD.",
        },
        400,
        origin
      );
    }

    if (!["Stripe", "PayPal"].includes(donationMethod)) {
      return jsonResponse(
        {
          success: false,
          error: "Choose Stripe or PayPal for the donation.",
        },
        400,
        origin
      );
    }

    const requestId = makeRequestId();

    const { error } = await supabaseAdmin
      .from("bot_priority_requests")
      .insert({
        request_id: requestId,
        client_name: clientName,
        contact,
        bot_identifier: botIdentifier,
        source_reference: sourceReference || null,
        note: note || null,
        donation_amount_cad: donationAmount,
        donation_method: donationMethod,
        donation_status: "Awaiting Donation",
        status: "Pending",
      });

    if (error) {
      console.error("priority insert error:", error);

      return jsonResponse(
        {
          success: false,
          error: "The priority request could not be saved.",
        },
        500,
        origin
      );
    }

    return jsonResponse(
      {
        success: true,
        request_id: requestId,
        donation_amount_cad: donationAmount,
        donation_method: donationMethod,
      },
      201,
      origin
    );
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
