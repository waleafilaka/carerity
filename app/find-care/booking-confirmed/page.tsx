"use client";

import { useEffect, useState } from "react";
import { BookingDraft, getBookingDraft } from "../../../lib/bookingDraft";

export default function BookingConfirmedPage() {
  const [booking, setBooking] = useState<BookingDraft>({});

  useEffect(() => {
    setBooking(getBookingDraft());
  }, []);

  const caregiver = booking.assignedCaregiverName || "Sarah M.";
  const paid = booking.paymentStatus === "paid";

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-6">
      <section className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 rounded-full bg-green-500 text-white flex items-center justify-center text-4xl font-bold shadow-lg">
            ✓
          </div>

          <p className="mt-5 text-sm font-bold text-green-700">
            BOOKING CONFIRMED
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            You&apos;re all set
          </h1>

          <p className="mt-2 text-gray-600">
            {caregiver} is booked for your care.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Caregiver</span>
            <span className="font-bold">{caregiver}</span>
          </div>

          <div className="flex items-center justify-between mt-3">
            <span className="text-sm text-gray-600">Payment</span>
            <span
              className={`font-bold ${
                paid ? "text-green-700" : "text-amber-700"
              }`}
            >
              {paid ? "✓ Paid" : "Processing"}
            </span>
          </div>

          <div className="flex items-center justify-between mt-3">
            <span className="text-sm text-gray-600">Visit</span>
            <span className="font-bold text-right">
              {formatDate(booking.careDate)}
            </span>
          </div>

          <div className="flex items-center justify-between mt-3">
            <span className="text-sm text-gray-600">Time</span>
            <span className="font-bold">
              {formatTime(booking.startTime)}
            </span>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-purple-50 p-4 text-center">
          <p className="font-bold text-purple-900">
            We&apos;ll keep you updated.
          </p>
          <p className="text-sm text-purple-800 mt-1">
            Track your caregiver from your dashboard.
          </p>
        </div>

        <a
          href="/dashboard"
          className="mt-6 block w-full rounded-xl bg-purple-600 py-3.5 text-center font-semibold text-white hover:bg-purple-700"
        >
          Go to My Dashboard
        </a>

        <a
          href="/dashboard/my-care"
          className="mt-3 block w-full rounded-xl border border-purple-300 py-3 text-center font-semibold text-purple-700"
        >
          View Booking
        </a>
      </section>
    </main>
  );
}

function formatDate(date?: string) {
  if (!date) return "Confirmed";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

function formatTime(time?: string) {
  if (!time) return "Confirmed";

  const [h, minute = "00"] = time.split(":");
  const hour = Number(h);

  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
}
