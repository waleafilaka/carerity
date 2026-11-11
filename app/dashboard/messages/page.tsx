"use client";

import DashboardLayout from "../../../components/DashboardLayout";
import { useState } from "react";

export default function MessagesPage() {
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function sendMessage() {
    if (!message.trim()) return;
    setSent(true);
    setMessage("");
    window.setTimeout(() => setSent(false), 3000);
  }

  return (
    <DashboardLayout activeItem="Messages" role="customer">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <p className="text-sm font-semibold text-purple-600">Family Care Portal</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">Messages</h1>
          <p className="text-sm text-gray-500 mt-1">Communicate with your caregiver and Carerity support.</p>
        </div>

        {sent && <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">✓ Message sent.</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <aside className="rounded-3xl border border-purple-200 bg-white p-4 shadow-sm">
            <button className="w-full rounded-2xl border border-purple-300 bg-purple-50 p-4 text-left">
              <p className="font-bold text-gray-900">Sarah M.</p>
              <p className="text-sm text-gray-500 mt-1">Assigned caregiver</p>
            </button>
            <button className="w-full rounded-2xl border border-gray-200 p-4 text-left mt-3 hover:bg-gray-50">
              <p className="font-bold text-gray-900">Carerity Support</p>
              <p className="text-sm text-gray-500 mt-1">Operations and account help</p>
            </button>
          </aside>

          <section className="lg:col-span-2 rounded-3xl border border-purple-200 bg-white p-5 shadow-sm">
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-xl font-bold text-gray-900">Sarah M.</h2>
              <p className="text-sm text-gray-500">Regarding today’s visit</p>
            </div>

            <div className="min-h-72 py-5 space-y-4">
              <div className="max-w-md rounded-2xl bg-gray-100 p-4 text-sm text-gray-700">I am on my way and remain on schedule for today’s visit.</div>
              <div className="ml-auto max-w-md rounded-2xl bg-purple-600 p-4 text-sm text-white">Thank you for the update.</div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 border-t border-gray-200 pt-4">
              <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a message..." className="flex-1 rounded-xl border border-purple-200 px-4 py-3 outline-none focus:ring-2 focus:ring-purple-200" />
              <button type="button" onClick={sendMessage} className="rounded-xl bg-purple-600 px-5 py-3 font-semibold text-white hover:bg-purple-700">Send</button>
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
