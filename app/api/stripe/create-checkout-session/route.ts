import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const SUPPORTED_DURATIONS = new Set([
  4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 20, 24,
]);

type CheckoutPayload = {
  mode?: "booking" | "manage";

  durationHours?: number;
  scheduleType?: string;
  careDate?: string;

  email?: string;
  stripeCustomerId?: string;

  authorizationAccepted?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    if (!stripeSecretKey) {
      return NextResponse.json(
        {
          error: "Stripe is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    const body = (await request.json()) as CheckoutPayload;

    const mode = body.mode === "manage" ? "manage" : "booking";

    const origin =
      request.headers.get("origin") || request.nextUrl.origin;

    const cleanEmail = body.email?.trim().toLowerCase() || "";

    let customerId = body.stripeCustomerId?.trim() || "";

    /*
     * Try to reuse the customer's Stripe customer
     * rather than creating duplicates.
     */
    if (!customerId && cleanEmail) {
      const existingCustomers = await stripe.customers.list({
        email: cleanEmail,
        limit: 1,
      });

      customerId = existingCustomers.data[0]?.id || "";
    }

    /*
     * ============================================================
     * MANAGE PAYMENT METHOD
     * ============================================================
     *
     * Important:
     * This flow has NOTHING to do with a care duration.
     *
     * Therefore durationHours is deliberately not validated here.
     */
    if (mode === "manage") {
      if (!cleanEmail && !customerId) {
        return NextResponse.json(
          {
            error:
              "We could not identify your payment profile. Please sign in again.",
          },
          {
            status: 400,
          }
        );
      }

      const metadata = {
        flow: "payment_method_update",
      };

      const session = await stripe.checkout.sessions.create({
        mode: "setup",

        payment_method_types: ["card"],

        ...(customerId
          ? {
              customer: customerId,
            }
          : {
              customer_creation: "always",
              customer_email: cleanEmail,
            }),

        billing_address_collection: "auto",

        success_url:
          `${origin}/dashboard/payments?payment_method=updated&session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${origin}/dashboard/payments?payment_method=cancelled`,

        metadata,

        setup_intent_data: {
          metadata,
        },
      });

      if (!session.url) {
        return NextResponse.json(
          {
            error: "Stripe did not return a secure setup link.",
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        url: session.url,
        sessionId: session.id,
      });
    }

    /*
     * ============================================================
     * NEW BOOKING PAYMENT METHOD
     * ============================================================
     */

    const durationHours = Number(body.durationHours);

    if (
      !Number.isInteger(durationHours) ||
      !SUPPORTED_DURATIONS.has(durationHours)
    ) {
      return NextResponse.json(
        {
          error: "Unsupported care duration.",
        },
        {
          status: 400,
        }
      );
    }

    if (body.authorizationAccepted !== true) {
      return NextResponse.json(
        {
          error: "Payment authorization is required.",
        },
        {
          status: 400,
        }
      );
    }

    const metadata: Record<string, string> = {
      flow: "booking_payment_setup",

      booking_type:
        body.scheduleType || "One-Time Care",

      care_date: body.careDate || "",

      duration_hours: String(durationHours),

      charge_trigger: "caregiver_acceptance",

      authorization_received: "true",
    };

    const session = await stripe.checkout.sessions.create({
      mode: "setup",

      payment_method_types: ["card"],

      ...(customerId
        ? {
            customer: customerId,
          }
        : {
            customer_creation: "always",

            customer_email:
              cleanEmail || undefined,
          }),

      billing_address_collection: "auto",

      success_url:
        `${origin}/find-care/payment-success?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url:
        `${origin}/find-care/payment-method?setup=cancelled`,

      metadata,

      setup_intent_data: {
        metadata,
      },
    });

    if (!session.url) {
      return NextResponse.json(
        {
          error: "Stripe did not return a secure setup link.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Stripe checkout session error:", error);

    return NextResponse.json(
      {
        error: "Unable to open secure payment setup.",
      },
      {
        status: 500,
      }
    );
  }
}
