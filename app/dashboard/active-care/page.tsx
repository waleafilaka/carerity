"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBookingDraft } from "../../../lib/bookingDraft";

export default function ActiveCarePage() {
  const router = useRouter();

  useEffect(() => {
    const booking = getBookingDraft();

    const liveStatuses = [
      "On the Way",
      "Delayed",
      "Arrived",
      "Verified",
      "In Progress",
      "Incident",
    ];

    if (
      booking.visitStatus &&
      liveStatuses.includes(booking.visitStatus)
    ) {
      router.replace("/dashboard/live-visit");
      return;
    }

    router.replace("/dashboard/my-care");
  }, [router]);

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin" />
        <p className="mt-4 text-sm font-semibold text-gray-600">
          Opening your care...
        </p>
      </div>
    </main>
  );
}
