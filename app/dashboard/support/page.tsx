"use client";

import DashboardLayout from "../../../components/DashboardLayout";

export default function SupportPage() {
  return (
    <DashboardLayout activeItem="Support" role="customer">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <p className="text-sm font-semibold text-purple-600">Support & Settings</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">Get Support</h1>
          <p className="text-sm text-gray-500 mt-1">Choose the fastest way to get help.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <a href="/dashboard/messages" className="rounded-3xl border border-purple-200 bg-white p-5 shadow-sm hover:border-purple-400 transition">
            <span className="text-3xl">💬</span>
            <h2 className="text-xl font-bold text-gray-900 mt-4">Message Support</h2>
            <p className="text-sm text-gray-600 mt-2">Best for bookings, billing, and general account questions.</p>
          </a>

          <div className="rounded-3xl border border-purple-200 bg-white p-5 shadow-sm">
            <span className="text-3xl">📞</span>
            <h2 className="text-xl font-bold text-gray-900 mt-4">Urgent Visit Support</h2>
            <p className="text-sm text-gray-600 mt-2">Use for a time-sensitive issue affecting an active visit. For emergencies, call 911 first.</p>
          </div>

          <div className="rounded-3xl border border-purple-200 bg-white p-5 shadow-sm md:col-span-2">
            <h2 className="text-xl font-bold text-gray-900">Common help topics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
              {[
                "Change or cancel a booking",
                "Recurring care support",
                "Payment or refund question",
                "Caregiver assignment question",
                "Family access help",
                "Care Record or document question",
              ].map((topic) => (
                <div key={topic} className="rounded-xl border border-gray-200 bg-gray-50 p-3 font-semibold text-gray-700">{topic}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
