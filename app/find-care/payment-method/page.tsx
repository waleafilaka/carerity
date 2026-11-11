"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProgressHeader from "../../../components/ui/ProgressHeader";
import {
  BookingDraft,
  getBookingDraft,
} from "../../../lib/bookingDraft";

export default function PaymentMethodPage() {
  const searchParams = useSearchParams();
  const manageMode = searchParams.get("mode") === "manage";

  const [booking, setBooking] = useState<BookingDraft>({});
  const [authorized, setAuthorized] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  useEffect(() => {
    setBooking(getBookingDraft());
  }, []);

  const durationHours = booking.durationHours || 8;
  const hourlyRate = booking.hourlyRate || 38;

  const estimatedSubtotal =
    booking.estimatedSubtotal ?? durationHours * hourlyRate;

  const estimatedTotal =
    booking.estimatedTotal ?? estimatedSubtotal;

  const recipientName =
    [booking.firstName, booking.lastName].filter(Boolean).join(" ") ||
    "Care recipient";

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(value || 0);
  }

  async function openStripe() {
    if (isStartingCheckout) return;

    if (!manageMode && !authorized) return;

    setCheckoutError("");
    setIsStartingCheckout(true);

    try {
      const payload = manageMode
        ? {
            mode: "manage",
            email: booking.email || "",
            stripeCustomerId: booking.stripeCustomerId || "",
          }
        : {
            mode: "booking",
            durationHours,
            scheduleType: booking.scheduleType || "One-Time Care",
            careDate: booking.careDate || "",
            email: booking.email || "",
            stripeCustomerId: booking.stripeCustomerId || "",
            authorizationAccepted: true,
          };

      const response = await fetch(
        "/api/stripe/create-checkout-session",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Unable to open Stripe.");
      }

      if (!data.url) {
        throw new Error("Stripe did not return a secure link.");
      }

      window.location.assign(data.url);
    } catch (error) {
      console.error("Stripe setup failed:", error);

      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Unable to open Stripe."
      );

      setIsStartingCheckout(false);
    }
  }

  if (manageMode) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8 text-gray-900">
        <section className="w-full max-w-lg rounded-3xl border border-purple-200 bg-white p-6 shadow-sm">
          <a
            href="/dashboard/payments"
            className="text-sm font-semibold text-purple-700 hover:underline"
          >
            ← Back to Payments
          </a>

          <div className="mt-5">
            <p className="text-sm font-bold text-purple-700">
              Payment Method
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              Update payment method
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Add or replace your saved payment method securely with Stripe.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="font-semibold">🔒 Secure card management</p>

            <p className="mt-1 text-sm text-gray-500">
              Carerity does not store your full card number.
            </p>
          </div>

          {checkoutError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {checkoutError}
            </div>
          )}

          <button
            type="button"
            onClick={openStripe}
            disabled={isStartingCheckout}
            className="mt-5 w-full rounded-xl bg-purple-600 py-3.5 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
          >
            {isStartingCheckout
              ? "Opening Stripe..."
              : "Continue to Stripe"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 py-4 text-gray-900">
      <section className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <ProgressHeader
          backHref="/find-care/review"
          stage="4 of 4"
          progress="w-full"
          title="Secure your payment method"
          subtitle="No charge now. You pay when a caregiver accepts."
        />

        <div className="space-y-4">
          <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
            <p className="text-xs font-bold uppercase text-purple-700">
              Booking amount
            </p>

            <div className="mt-3 space-y-2 text-sm">
              <SummaryRow
                label="Care recipient"
                value={recipientName}
              />

              <SummaryRow
                label={`${durationHours} hrs × ${formatCurrency(
                  hourlyRate
                )}/hr`}
                value={formatCurrency(estimatedSubtotal)}
              />

              <div className="border-t border-purple-200 pt-2">
                <SummaryRow
                  label="Estimated amount"
                  value={formatCurrency(estimatedTotal)}
                  strong
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-center text-sm">
            🔒{" "}
            <strong>
              Card details are handled securely by Stripe.
            </strong>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-purple-200 p-4">
            <input
              type="checkbox"
              checked={authorized}
              onChange={(event) => setAuthorized(event.target.checked)}
              className="mt-0.5 h-4 w-4"
            />

            <span className="text-sm">
              <strong>
                I authorize Carerity to charge this booking when a caregiver
                accepts.
              </strong>

              <br />

              <span className="text-xs text-gray-500">
                No charge is made now.
              </span>
            </span>
          </label>

          {checkoutError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {checkoutError}
            </div>
          )}

          <button
            type="button"
            onClick={openStripe}
            disabled={!authorized || isStartingCheckout}
            className="w-full rounded-xl bg-purple-600 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
          >
            {isStartingCheckout
              ? "Opening Stripe..."
              : "Secure Payment Method"}
          </button>
        </div>
      </section>
    </main>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 ${
        strong ? "font-bold" : ""
      }`}
    >
      <span>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
