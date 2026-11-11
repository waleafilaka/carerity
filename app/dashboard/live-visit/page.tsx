"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import { BookingDraft, getBookingDraft } from "../../../lib/bookingDraft";

export default function MyCarePage() {
  const [booking, setBooking] = useState<BookingDraft>({});

  useEffect(() => {
    setBooking(getBookingDraft());
  }, []);

  const caregiver = booking.assignedCaregiverName || "Sarah M.";

  return (
    <DashboardLayout activeItem="My Care" role="customer">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <p className="text-sm font-semibold text-purple-600">My Care</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">
            Your Care
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Visits, caregiver and care details.
          </p>
        </div>

        <section className="rounded-3xl border border-purple-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="inline-block rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                {booking.visitStatus || "Confirmed"}
              </span>

              <h2 className="mt-3 text-2xl font-bold">
                {caregiver}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                PSW · Verified caregiver
              </p>
            </div>

            <a
              href="/dashboard/live-visit"
              className="rounded-xl bg-purple-600 px-5 py-3 text-center font-semibold text-white"
            >
              View Live Care
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
            <Detail label="Date" value={formatDate(booking.careDate)} />
            <Detail
              label="Time"
              value={
                booking.startTime && booking.endTime
                  ? `${booking.startTime} – ${booking.endTime}`
                  : "To be confirmed"
              }
            />
            <Detail
              label="Duration"
              value={
                booking.durationHours
                  ? `${booking.durationHours} hours`
                  : "To be confirmed"
              }
            />
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-lg">Care needs</h2>

            <div className="flex flex-wrap gap-2 mt-4">
              {(booking.selectedNeeds || ["Care support"]).map((need) => (
                <span
                  key={need}
                  className="rounded-full bg-purple-50 px-3 py-1.5 text-sm font-semibold text-purple-800"
                >
                  {need}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-lg">Booking</h2>

            <div className="mt-4 space-y-3 text-sm">
              <Row
                label="Type"
                value={booking.scheduleType || "One-Time Care"}
              />
              <Row
                label="Payment"
                value={booking.paymentStatus === "paid" ? "Paid" : "Confirmed"}
              />
              <Row
                label="Language"
                value={booking.primaryLanguage || "English"}
              />
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
          <a
            href="/dashboard/messages"
            className="rounded-xl border border-purple-300 py-3 text-center font-semibold text-purple-700"
          >
            Message Caregiver
          </a>

          <a
            href="/dashboard/care-record"
            className="rounded-xl border border-purple-300 py-3 text-center font-semibold text-purple-700"
          >
            Care Records
          </a>

          <a
            href="/dashboard/payments"
            className="rounded-xl border border-purple-300 py-3 text-center font-semibold text-purple-700"
          >
            Payments
          </a>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-bold mt-1">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );
}

function formatDate(date?: string) {
  if (!date) return "To be confirmed";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
