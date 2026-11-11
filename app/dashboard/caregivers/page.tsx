"use client";

import DashboardLayout from "../../../components/DashboardLayout";
import { useEffect, useState } from "react";
import { BookingDraft, getBookingDraft } from "../../../lib/bookingDraft";

export default function MyCaregiverPage() {
  const [booking, setBooking] = useState<BookingDraft>({});

  useEffect(() => {
    setBooking(getBookingDraft());
  }, []);

  const caregiverName = booking.assignedCaregiverName || "Sarah M.";

  return (
    <DashboardLayout activeItem="My Caregiver" role="customer">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <p className="text-sm font-semibold text-purple-600">Family Care Portal</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">My Caregiver</h1>
          <p className="text-sm text-gray-500 mt-1">
            View the caregiver currently assigned to your care.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <section className="xl:col-span-2 rounded-3xl border border-purple-300 bg-white p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start gap-5">
              <div className="h-24 w-24 rounded-full bg-purple-100 flex items-center justify-center text-5xl shrink-0">
                👩🏽
              </div>

              <div className="flex-1">
                <p className="text-sm font-bold text-green-700">Assigned caregiver</p>
                <h2 className="text-3xl font-bold text-gray-900 mt-1">
                  {caregiverName}
                </h2>
                <p className="text-purple-700 font-semibold mt-1">
                  PSW Certified Caregiver
                </p>

                <div className="flex flex-wrap gap-2 mt-4">
                  {[
                    "Government ID verified",
                    "PSW qualification on file",
                    "VSC current",
                    "Resume on file",
                  ].map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700"
                    >
                      ✓ {badge}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
              <InfoBox label="Care continuity" value="Preferred where available" />
              <InfoBox label="Current status" value="Assigned" />
              <InfoBox label="Next visit" value={booking.careDate || "See schedule"} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
              <a
                href="/dashboard/messages"
                className="rounded-xl bg-purple-600 text-white py-3 text-center font-semibold hover:bg-purple-700"
              >
                Message Caregiver
              </a>

              <a
                href="/dashboard/recurring-care"
                className="rounded-xl border border-purple-300 text-purple-700 py-3 text-center font-semibold hover:bg-purple-50"
              >
                View Schedule
              </a>

              <a
                href="/dashboard/support"
                className="rounded-xl border border-gray-200 text-gray-700 py-3 text-center font-semibold hover:bg-gray-50"
              >
                Request Support
              </a>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-purple-300 bg-purple-50 p-5">
              <h2 className="text-lg font-bold text-gray-900">What you can see</h2>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                Families can view relevant qualifications, assignment details,
                communication, and care continuity information.
              </p>
            </section>

            <section className="rounded-3xl border border-purple-300 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">Privacy protected</h2>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                Earnings, job offers, private schedules, other clients, and
                caregiver account settings are never shown in the family portal.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
