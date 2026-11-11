"use client";

import DashboardLayout from "../../../components/DashboardLayout";

const options = [
  { title: "Get Support", text: "Contact Carerity for help with bookings, visits, or billing.", href: "/dashboard/support", icon: "❓" },
  { title: "Account Settings", text: "Manage account, contact, and communication preferences.", href: "/dashboard/settings", icon: "⚙️" },
  { title: "Notifications", text: "Choose which visit and account updates you receive.", href: "/dashboard/settings#notifications", icon: "🔔" },
  { title: "Privacy", text: "Review family access and privacy preferences.", href: "/dashboard/settings#privacy", icon: "🔒" },
];

export default function AccountPage() {
  return (
    <DashboardLayout activeItem="Support & Settings" role="customer">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <p className="text-sm font-semibold text-purple-600">Family Care Portal</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">Support & Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Get help and manage your account preferences.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {options.map((item) => (
            <a key={item.title} href={item.href} className="rounded-3xl border border-purple-200 bg-white p-5 shadow-sm hover:border-purple-400 hover:shadow-md transition-all">
              <span className="text-3xl">{item.icon}</span>
              <h2 className="text-xl font-bold text-gray-900 mt-4">{item.title}</h2>
              <p className="text-sm text-gray-600 mt-2">{item.text}</p>
              <p className="text-sm font-bold text-purple-700 mt-5">Open →</p>
            </a>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
