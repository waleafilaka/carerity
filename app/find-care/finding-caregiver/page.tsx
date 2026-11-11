"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import CarerityLoadingScreen from "../../../components/ui/CarerityLoadingScreen";

import {
  getBookingDraft,
  saveBookingDraft,
} from "../../../lib/bookingDraft";

export default function FindingCaregiverPage() {
  const router = useRouter();

  const [isStopping, setIsStopping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const booking = getBookingDraft();

    /**
     * Matching must not begin unless Stripe successfully secured
     * a payment method for this care request.
     */
    if (
      booking.paymentMethodStatus !== "secured" ||
      !booking.stripeSetupSessionId
    ) {
      router.replace("/find-care/payment-method");
      return;
    }

    saveBookingDraft({
      requestStatus: "matching",
    });

    const stopSpinTimer = window.setTimeout(() => {
      setIsStopping(true);
    }, 4200);

    const completeTimer = window.setTimeout(() => {
      setIsComplete(true);
    }, 5400);

    const redirectTimer = window.setTimeout(() => {
      /**
       * This screen is only a short transition into the real
       * caregiver search. It does not imply that a caregiver
       * has already been found or has accepted the visit.
       */
      router.replace("/find-care/request-status");
    }, 6800);

    return () => {
      window.clearTimeout(stopSpinTimer);
      window.clearTimeout(completeTimer);
      window.clearTimeout(redirectTimer);
    };
  }, [router]);

  return (
    <CarerityLoadingScreen
      isStopping={isStopping}
      isComplete={isComplete}
      title="Starting your caregiver search..."
      messages={[
        "Care request secured...",
        "Checking care details...",
        "Preparing your caregiver search...",
        "Checking availability and location...",
        "Connecting to live caregiver outreach...",
      ]}
    />
  );
}
