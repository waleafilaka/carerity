"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import { BookingDraft, getBookingDraft } from "../../../lib/bookingDraft";

type BookingCardProps = {
  status: string;
  statusStyle: string;
  title: string;
  caregiver: string;
  date: string;
  time: string;
  href: string;
};

function BookingCard({ status, statusStyle, title, caregiver, date, time, href }: BookingCardProps) {
  return (
    <a href={href} className="block rounded-3xl border border-gray-200 bg-white p-5 shadow-sm hover:border-purple-300 hover:shadow-md active:scale-[0.99] transition-all">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-purple-700 font-semibold mt-1">{caregiver}</p>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusStyle}`}>{status}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
        <InfoBox label="Date" value={date} />
        <InfoBox label="Time" value={time} />
      </div>
    </a>
  );
}

export default function BookingsPage() {
  const [booking, setBooking] = useState<BookingDraft>({});

  useEffect(() => {
    setBooking(getBookingDraft());
  }, []);

  function formatTime(time: string | undefined) {
    if (!time) return "Time not selected";
    const [hourString, minute] = time.split(":");
    const hour = Number(hourString);
    return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
  }

  function formatDate(date: string | undefined) {
    if (!date) return "Date not selected";
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-CA", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const visitTime = booking.startTime && booking.endTime
    ? `${formatTime(booking.startTime)} – ${formatTime(booking.endTime)}`
    : "Time not selected";

  return (
    <DashboardLayout activeItem="Bookings" role="customer">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <p className="text-sm font-semibold text-purple-600">My Care</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">My Bookings</h1>
          <p className="text-sm text-gray-500 mt-1">View current, upcoming, completed, and cancelled care visits.</p>
        </div>

        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Current booking</h2>
            <BookingCard status="Ongoing" statusStyle="bg-green-50 text-green-700 border border-green-200" title="Care visit with Sarah M." caregiver="PSW Certified Caregiver" date={formatDate(booking.careDate)} time={visitTime} href="/find-care/booking-confirmed" />
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Upcoming bookings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BookingCard status="Upcoming" statusStyle="bg-purple-50 text-purple-700 border border-purple-200" title="Follow-up care visit" caregiver="Caregiver pending" date="Next week" time="To be confirmed" href="/find-care/booking-confirmed" />
              <BookingCard status="Recurring" statusStyle="bg-blue-50 text-blue-700 border border-blue-200" title="Weekly companionship" caregiver="Preferred caregiver" date="Every Friday" time="10:00 AM – 2:00 PM" href="/dashboard/recurring-care" />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Completed bookings</h2>
            <BookingCard status="Completed" statusStyle="bg-gray-100 text-gray-700 border border-gray-200" title="Previous care visit" caregiver="Sarah M." date="Completed" time="Visit summary available" href="/dashboard/care-record" />
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Cancelled bookings</h2>
            <div className="rounded-3xl border border-gray-200 bg-white p-5 text-sm text-gray-500">No cancelled bookings yet.</div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-gray-50 border border-gray-200 p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="font-bold text-gray-900">{value}</p>
    </div>
  );
}
