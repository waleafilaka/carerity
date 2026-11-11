"use client";

import { useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";


const familyMembers = [
  {
    name: "Adewale A.",
    email: "waleafilaka@gmail.com",
    role: "Owner",
    status: "Active",
  },
  {
    name: "Fifi A.",
    email: "family.member@example.com",
    role: "Viewer",
    status: "Invited",
  },
];


export default function FamilyAccessPage() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [permission, setPermission] = useState("Viewer");

  return (
    <DashboardLayout activeItem="Family Access" role="customer">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <p className="text-sm font-semibold text-purple-600">
                Customer Dashboard
              </p>
              <h1 className="text-3xl md:text-4xl font-bold mt-1">
                Family Access
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Invite trusted family members to view visit updates and help
                manage care.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 space-y-5">
                <div className="rounded-3xl border border-purple-200 bg-white p-5 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Invite family member
                  </h2>

                  <p className="text-sm text-gray-500 mb-4">
                    Choose what they can access. You can update or remove access
                    later.
                  </p>

                  <div className="space-y-3">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      placeholder="Family member email"
                      className="w-full border border-purple-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-purple-200"
                    />

                    <select
                      value={permission}
                      onChange={(event) => setPermission(event.target.value)}
                      className="w-full border border-purple-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-purple-200 bg-white"
                    >
                      <option>Viewer</option>
                      <option>Editor</option>
                      <option>Owner</option>
                    </select>

                    <button
                      type="button"
                      className="w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white py-3 rounded-xl font-semibold active:scale-[0.98] transition-all"
                    >
                      Send Invite
                    </button>
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Family members
                  </h2>

                  <div className="space-y-3">
                    {familyMembers.map((member) => (
                      <div
                        key={member.email}
                        className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-gray-900">
                              {member.name}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {member.email}
                            </p>
                          </div>

                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-full border ${
                              member.status === "Active"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-purple-50 text-purple-700 border-purple-200"
                            }`}
                          >
                            {member.status}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className="text-sm text-gray-600">
                            Permission:{" "}
                            <span className="font-bold text-gray-900">
                              {member.role}
                            </span>
                          </p>

                          <button
                            type="button"
                            className="text-sm font-semibold text-purple-700"
                          >
                            Manage
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <aside className="space-y-5">
                <div className="rounded-3xl border border-purple-200 bg-purple-50 p-5">
                  <h2 className="text-lg font-bold text-gray-900 mb-3">
                    Permission levels
                  </h2>

                  <div className="space-y-3 text-sm text-gray-700">
                    <p>
                      <strong>Viewer:</strong> Can view booking and visit
                      updates.
                    </p>

                    <p>
                      <strong>Editor:</strong> Can help manage bookings and care
                      details.
                    </p>

                    <p>
                      <strong>Owner:</strong> Full access to manage family
                      members and care.
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-3">
                    What family can see
                  </h2>

                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>✓ Active booking status</li>
                    <li>✓ Caregiver assigned</li>
                    <li>✓ Live visit updates</li>
                    <li>✓ Visit notes summary</li>
                    <li>✓ Upcoming bookings</li>
                  </ul>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-2">
                    Privacy note
                  </h2>

                  <p className="text-sm text-gray-500 leading-relaxed">
                    Only invite people you trust. Family access is designed to
                    help coordinate care safely and transparently.
                  </p>
                </div>
              </aside>
            </div>
          </div>
    </DashboardLayout>
  );
}
