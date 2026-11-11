"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveBookingDraft,
} from "../../../lib/bookingDraft";

type SetupResult = {
  id: string;
  sessionStatus: string | null;
  setupStatus: string;
  secured: boolean;
  metadata: Record<string, string>;
};

export default function PaymentSuccessPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSecured, setIsSecured] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let redirectTimer: number | undefined;
    let cancelled = false;

    async function verifySetup() {
      const sessionId = new URLSearchParams(
        window.location.search
      ).get("session_id");

      if (!sessionId) {
        setError("Payment setup reference is missing.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/stripe/verify-session?session_id=${encodeURIComponent(
            sessionId
          )}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data = (await response.json()) as
          | SetupResult
          | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : "Unable to verify your payment method."
          );
        }

        const result = data as SetupResult;

        if (!result.secured) {
          throw new Error(
            "Your payment method was not fully secured."
          );
        }

        if (cancelled) return;

        saveBookingDraft({
          stripeSetupSessionId: result.id,
          paymentMethodStatus: "secured",
          paymentAuthorizationAcceptedAt:
            new Date().toISOString(),
          paymentStatus: "method_secured",
          requestStatus: "payment_method_secured",
        });

        setIsSecured(true);
        setIsLoading(false);

        redirectTimer = window.setTimeout(() => {
          router.replace("/find-care/finding-caregiver");
        }, 1400);
      } catch (verificationError) {
        if (cancelled) return;

        console.error(
          "Payment method verification failed:",
          verificationError
        );

        setError(
          verificationError instanceof Error
            ? verificationError.message
            : "Unable to verify your payment method."
        );
        setIsLoading(false);
      }
    }

    verifySetup();

    return () => {
      cancelled = true;

      if (redirectTimer) {
        window.clearTimeout(redirectTimer);
      }
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8 text-gray-900">
      <section className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm text-center">
        {isLoading ? (
          <>
            <div className="mx-auto h-12 w-12 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin" />

            <h1 className="mt-5 text-2xl font-bold">
              Securing your payment method
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              One moment.
            </p>
          </>
        ) : error ? (
          <>
            <div className="mx-auto h-14 w-14 rounded-full bg-red-50 flex items-center justify-center text-2xl">
              !
            </div>

            <h1 className="mt-4 text-2xl font-bold">
              Setup incomplete
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                router.replace("/find-care/payment-method")
              }
              className="mt-6 w-full rounded-xl bg-purple-600 px-5 py-3 font-semibold text-white hover:bg-purple-700"
            >
              Try Again
            </button>
          </>
        ) : isSecured ? (
          <>
            <div className="mx-auto h-16 w-16 rounded-full bg-green-50 flex items-center justify-center text-3xl text-green-700">
              ✓
            </div>

            <p className="mt-4 text-sm font-bold text-green-700">
              Payment method secured
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              No charge yet
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              You&apos;ll be charged when a caregiver accepts.
            </p>

            <p className="mt-5 text-xs font-semibold text-purple-700">
              Finding your caregiver...
            </p>
          </>
        ) : null}
      </section>
    </main>
  );
}
