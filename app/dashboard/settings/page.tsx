"use client";

import DashboardLayout from "../../../components/DashboardLayout";
import { useState } from "react";

export default function SettingsPage() {
  const [visitUpdates, setVisitUpdates] = useState(true);
  const [bookingReminders, setBookingReminders] = useState(true);
  const [billingUpdates, setBillingUpdates] = useState(true);
  const [saved, setSaved] = useState(false);

  function saveSettings() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  }

  return (
    <DashboardLayout activeItem="Settings" role="customer">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <p className="text-sm font-semibold text-purple-600">Support & Settings</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage account, notification, and privacy preferences.</p>
        </div>

        {saved && <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">✓ Settings saved.</div>}

        <div className="space-y-5">
          <section className="rounded-3xl border border-purple-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Account details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <input placeholder="First name" className="rounded-xl border border-purple-200 px-4 py-3" />
              <input placeholder="Last name" className="rounded-xl border border-purple-200 px-4 py-3" />
              <input placeholder="Email" className="rounded-xl border border-purple-200 px-4 py-3" />
              <input placeholder="Phone" className="rounded-xl border border-purple-200 px-4 py-3" />
            </div>
          </section>

          <section id="notifications" className="rounded-3xl border border-purple-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
            <div className="space-y-4 mt-4">
              <Toggle label="Visit updates" checked={visitUpdates} onChange={setVisitUpdates} />
              <Toggle label="Booking reminders" checked={bookingReminders} onChange={setBookingReminders} />
              <Toggle label="Billing updates" checked={billingUpdates} onChange={setBillingUpdates} />
            </div>
          </section>

          <section id="privacy" className="rounded-3xl border border-purple-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Privacy</h2>
            <p className="text-sm text-gray-600 mt-2">Manage family access, account security, and communication permissions.</p>
            <a href="/dashboard/family" className="inline-block mt-4 rounded-xl border border-purple-300 px-4 py-3 font-semibold text-purple-700 hover:bg-purple-50">Manage Family Access</a>
          </section>

          <button type="button" onClick={saveSettings} className="rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-700">Save Settings</button>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 p-4">
      <span className="font-semibold text-gray-900">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-purple-600" />
    </label>
  );
}
