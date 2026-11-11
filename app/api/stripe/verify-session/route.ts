import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export async function GET(request: NextRequest) {
  try {
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: "Stripe is not configured." },
        { status: 500 }
      );
    }

    const sessionId = request.nextUrl.searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing Stripe session reference." },
        { status: 400 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      {
        expand: ["setup_intent"],
      }
    );

    const setupIntent =
      typeof session.setup_intent === "string"
        ? await stripe.setupIntents.retrieve(session.setup_intent)
        : session.setup_intent;

    if (!setupIntent) {
      return NextResponse.json(
        { error: "Stripe setup was not found." },
        { status: 400 }
      );
    }

    const isSecured =
      session.status === "complete" &&
      setupIntent.status === "succeeded";

    return NextResponse.json({
      id: session.id,
      sessionStatus: session.status,
      setupStatus: setupIntent.status,
      secured: isSecured,
      metadata: session.metadata || {},
    });
  } catch (error) {
    console.error("Stripe setup verification error:", error);

    return NextResponse.json(
      { error: "Unable to verify the payment method." },
      { status: 500 }
    );
  }
}
