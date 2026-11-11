import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const hourlyPriceId = process.env.STRIPE_CARE_HOURLY_PRICE_ID;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type ChargePayload = { offerSessionId?: string; };

type OfferSessionRow = {
  id: string;
  booking_reference: string;
  customer_user_id: string | null;
  status: string;
  selected_caregiver_id: string | null;
  care_recipient_id: string | null;
  care_request_id: string | null;
  care_date: string | null;
  start_time: string | null;
  end_time: string | null;
};

type CareRequestRow = {
  id: string;
  hours_requested: number;
};

const ROUTE_VERSION = "phase-c-request-fix-2026-09-01";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(
    { routeVersion: ROUTE_VERSION, ...body },
    {
      status,
      headers: { "X-Carerity-Route-Version": ROUTE_VERSION },
    }
  );
}

function jsonError(
  message: string,
  status: number,
  extra: Record<string, unknown> = {}
) {
  return jsonResponse({ paid: false, error: message, ...extra }, status);
}

export async function GET() {
  return jsonResponse({
    ok: true,
    message: "Carerity charge-booking route is active.",
  });
}

export async function POST(request: NextRequest) {
  try {
    if (!stripeSecretKey || !hourlyPriceId) {
      return jsonError("Stripe is not configured.", 500);
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonError("Server booking persistence is not configured.", 500);
    }

    const authorization = request.headers.get("authorization") || "";
    const accessToken = authorization.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

    if (!accessToken) {
      return jsonError("Sign in again to confirm this booking.", 401);
    }

    let offerSessionId =
      request.nextUrl.searchParams.get("offer_session_id")?.trim() || "";

    if (!offerSessionId) {
      const rawBody = await request.text();

      if (rawBody.trim()) {
        try {
          const body = JSON.parse(rawBody) as ChargePayload;
          offerSessionId = body.offerSessionId?.trim() || "";
        } catch {
          return jsonError(
            "The booking confirmation request body was not valid JSON.",
            400
          );
        }
      }
    }

    if (!offerSessionId) {
      return jsonError("Missing matching session.", 400);
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      console.error("CUSTOMER AUTH VERIFY FAILED:", {
        message: userError?.message,
        status: userError?.status,
        name: userError?.name,
      });
    
      return jsonError(
        `Customer auth failed: ${userError?.message || "No user returned."}`,
        401
      );
    }

    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from("caregiver_offer_sessions")
      .select(
        [
          "id",
          "booking_reference",
          "customer_user_id",
          "status",
          "selected_caregiver_id",
          "care_recipient_id",
          "care_request_id",
          "care_date",
          "start_time",
          "end_time",
        ].join(",")
      )
      .eq("id", offerSessionId)
      .maybeSingle();

    if (sessionError || !sessionData) {
      console.error("Unable to load matching session:", sessionError);
      return jsonError(
        "We could not load this selected caregiver booking.",
        404
      );
    }

    const session = sessionData as OfferSessionRow;

    if (session.customer_user_id !== user.id) {
      return jsonError(
        "You are not authorized to confirm this booking.",
        403
      );
    }

    if (session.status !== "caregiver_selected") {
      return jsonError(
        "This booking is not ready for payment confirmation.",
        409
      );
    }

    if (
      !session.selected_caregiver_id ||
      !session.care_recipient_id ||
      !session.care_request_id
    ) {
      return jsonError(
        "This selected match is missing its booking links.",
        409
      );
    }

    const { data: careRequestData, error: careRequestError } =
      await supabaseAdmin
        .from("care_requests")
        .select("id,hours_requested")
        .eq("id", session.care_request_id)
        .maybeSingle();

    if (careRequestError || !careRequestData) {
      console.error("Unable to load care request:", careRequestError);
      return jsonError(
        "The care request for this booking could not be loaded.",
        409
      );
    }

    const careRequest = careRequestData as CareRequestRow;
    const durationHours = Number(careRequest.hours_requested);

    if (
      !Number.isInteger(durationHours) ||
      durationHours < 4 ||
      durationHours > 24
    ) {
      return jsonError(
        "The care duration is not valid for charging.",
        409
      );
    }

    const setupSessionId = session.booking_reference?.trim();

    if (!setupSessionId || !setupSessionId.startsWith("cs_")) {
      return jsonError(
        "The secured payment-method reference is missing.",
        409
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    const checkoutSession = await stripe.checkout.sessions.retrieve(
      setupSessionId,
      { expand: ["setup_intent"] }
    );

    const setupIntent =
      typeof checkoutSession.setup_intent === "string"
        ? await stripe.setupIntents.retrieve(checkoutSession.setup_intent)
        : checkoutSession.setup_intent;

    if (
      checkoutSession.status !== "complete" ||
      !setupIntent ||
      setupIntent.status !== "succeeded"
    ) {
      return jsonError("Your saved payment method is not ready.", 409);
    }

    const stripeCustomerId =
      typeof checkoutSession.customer === "string"
        ? checkoutSession.customer
        : checkoutSession.customer?.id;

    const paymentMethodId =
      typeof setupIntent.payment_method === "string"
        ? setupIntent.payment_method
        : setupIntent.payment_method?.id;

    if (!stripeCustomerId || !paymentMethodId) {
      return jsonError(
        "Your saved payment method could not be found.",
        409
      );
    }

    const price = await stripe.prices.retrieve(hourlyPriceId);

    if (price.unit_amount === null || price.unit_amount <= 0) {
      return jsonError(
        "Care price is not configured correctly.",
        500
      );
    }

    const amount = price.unit_amount * durationHours;
    const idempotencyKey =
      `carerity:offer-session:${offerSessionId}`;

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount,
        currency: price.currency,
        customer: stripeCustomerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        description: `Carerity care booking - ${durationHours} hours`,
        metadata: {
          checkout_setup_session_id: setupSessionId,
          offer_session_id: offerSessionId,
          care_request_id: session.care_request_id,
          caregiver_id: session.selected_caregiver_id,
          duration_hours: String(durationHours),
          care_date: session.care_date || "",
          charge_trigger: "customer_caregiver_selection",
        },
      },
      { idempotencyKey }
    );

    if (paymentIntent.status === "succeeded") {
      const customerAmount = paymentIntent.amount_received / 100;

      const { data: finalization, error: finalizationError } =
        await supabaseAdmin.rpc("finalize_paid_matching_session", {
          p_offer_session_id: offerSessionId,
          p_stripe_payment_id: paymentIntent.id,
          p_customer_amount: customerAmount,
        });

      if (finalizationError || !finalization) {
        console.error(
          "Stripe succeeded but booking finalization failed:",
          finalizationError
        );

        return jsonResponse(
          {
            paid: true,
            persisted: false,
            status: paymentIntent.status,
            paymentIntentId: paymentIntent.id,
            amount: customerAmount,
            currency: paymentIntent.currency.toUpperCase(),
            error:
              "Payment succeeded, but booking confirmation needs to be retried.",
          },
          500
        );
      }

      const result = finalization as {
        visit_id?: string;
        visit_public_id?: string;
        payment_id?: string;
        payment_status?: string;
        visit_status?: string;
        already_finalized?: boolean;
      };

      return jsonResponse({
        paid: true,
        persisted: true,
        status: paymentIntent.status,
        paymentIntentId: paymentIntent.id,
        amount: customerAmount,
        currency: paymentIntent.currency.toUpperCase(),
        visitId: result.visit_id,
        visitPublicId: result.visit_public_id,
        paymentId: result.payment_id,
        paymentStatus: result.payment_status,
        visitStatus: result.visit_status,
        alreadyFinalized: Boolean(result.already_finalized),
      });
    }

    if (
      paymentIntent.status === "requires_action" ||
      paymentIntent.status === "requires_payment_method"
    ) {
      return jsonError(
        "Your bank requires payment action before the booking can be confirmed.",
        409,
        {
          status: paymentIntent.status,
          paymentIntentId: paymentIntent.id,
          actionRequired: true,
        }
      );
    }

    return jsonError(
      "Payment has not completed, so the booking is not confirmed.",
      409,
      {
        status: paymentIntent.status,
        paymentIntentId: paymentIntent.id,
      }
    );
  } catch (error) {
    console.error("Deferred Stripe booking charge error:", error);

    return jsonError(
      error instanceof Error
        ? error.message
        : "Payment could not be completed.",
      402,
      { actionRequired: true }
    );
  }
}
