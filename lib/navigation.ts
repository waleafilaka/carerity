export type NavigationItem = {
  label: string;
  href: string;
};

export const customerNavigation: NavigationItem[] = [
  { label: "Home", href: "/dashboard" },
  { label: "My Care", href: "/dashboard/care" },
  { label: "Recurring Care", href: "/dashboard/recurring-care" },
  { label: "Payments", href: "/dashboard/payments" },
  { label: "Documents", href: "/dashboard/documents" },
  { label: "Support & Settings", href: "/dashboard/account" },
];

export const caregiverNavigation: NavigationItem[] = [
  { label: "Home", href: "/caregiver/dashboard" },
  { label: "Job Offers", href: "/caregiver/job-offers" },
  { label: "My Schedule", href: "/caregiver/schedule" },
  { label: "Active Visit", href: "/caregiver/active-visit" },
  { label: "Messages", href: "/caregiver/messages" },
  { label: "Earnings", href: "/caregiver/earnings" },
  { label: "Documents", href: "/caregiver/documents" },
  { label: "Professional Profile", href: "/caregiver/profile" },
  { label: "Support", href: "/caregiver/support" },
];
