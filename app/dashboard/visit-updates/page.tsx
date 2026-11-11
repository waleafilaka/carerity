"use client";

import DashboardLayout from "../../../components/DashboardLayout";

const updates = [
  { time: "9:05 AM", title: "Caregiver arrived", text: "Sarah checked in at the care location." },
  { time: "9:25 AM", title: "Morning meal served", text: "Meal support was completed." },
  { time: "10:10 AM", title: "Medication reminder completed", text: "Medication reminder was marked as completed." },
  { time: "11:30 AM", title: "Mobility support", text: "Mobility support was completed safely." },
];

export default function VisitUpdatesPage() {
  return (
    <DashboardLayout activeItem="Visit Updates" role="customer">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <p className="text-sm font-semibold text-purple-600">My Care</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">Visit Updates</h1>
          <p className="text-sm text-gray-500 mt-1">See live and recent updates shared during care visits.</p>
        </div>

        <div className="rounded-3xl border border-purple-300 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Today’s visit</h2>
              <p className="text-sm text-gray-500 mt-1">Sarah M. · Visit in progress</p>
            </div>
            <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">Live</span>
          </div>

          <div className="space-y-5">
            {updates.map((update, index) => (
              <div key={`${update.time}-${update.title}`} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-4 w-4 rounded-full bg-purple-600" />
                  {index !== updates.length - 1 && <div className="mt-2 w-px flex-1 bg-purple-200" />}
                </div>
                <div className="pb-5">
                  <p className="text-xs font-semibold text-purple-600">{update.time}</p>
                  <p className="font-bold text-gray-900">{update.title}</p>
                  <p className="text-sm text-gray-500 mt-1">{update.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
