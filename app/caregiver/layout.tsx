import {
    ReactNode,
  } from "react";
  
  export default function CaregiverLayout({
    children,
  }: {
    children:
      ReactNode;
  }) {
    /*
     * ============================================================
     * CAREGIVER ROOT LAYOUT
     * ============================================================
     *
     * Keep this layout intentionally neutral.
     *
     * /caregiver contains both PUBLIC routes:
     *
     * - /caregiver/login
     * - /caregiver/join
     *
     * and AUTHENTICATED routes:
     *
     * - /caregiver/dashboard
     * - /caregiver/profile
     * - /caregiver/messages
     * - etc.
     *
     * Therefore this root layout must NOT redirect based
     * on role or session.
     *
     * Protected caregiver workspaces perform their own
     * authorization using DashboardLayout.
     * ============================================================
     */
  
    return (
      <>
        {children}
      </>
    );
  }
  