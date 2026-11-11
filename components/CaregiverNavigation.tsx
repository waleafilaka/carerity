"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

import { caregiverNavigation } from "../lib/navigation";

import {
  CaregiverApplicationStatus,
  CaregiverOnboardingDraft,
  getCaregiverOnboardingDraft,
} from "../lib/caregiverOnboardingDraft";

import { caregiverSupabase } from "../lib/supabaseClient";

const supabase = caregiverSupabase;

type CaregiverNavigationProps = {
  activeItem: string;
  mobileMenuOpen: boolean;
  onMobileMenuClose: () => void;
};

type NavigationGroup = {
  heading: string;
  labels: string[];
};

const GROUPED_NAVIGATION: NavigationGroup[] = [
  {
    heading: "My Work",
    labels: [
      "Home",
      "Job Offers",
      "My Schedule",
      "Active Visit",
    ],
  },
  {
    heading: "Communication",
    labels: ["Messages"],
  },
  {
    heading: "Account",
    labels: [
      "My Application",
      "Earnings",
      "Documents",
      "Professional Profile",
    ],
  },
  {
    heading: "Help",
    labels: ["Support"],
  },
];

const APPROVAL_REQUIRED_ITEMS = new Set([
  "Job Offers",
  "My Schedule",
  "Active Visit",
  "Earnings",
]);

/*
 * My Application has two destinations:
 *
 * Draft / needs attention:
 *   caregiver can continue editing onboarding.
 *
 * Submitted / under review / approved / declined:
 *   caregiver sees the saved application in read-only mode.
 */
function getCaregiverApplicationItem(
  status: CaregiverApplicationStatus
) {
  const editable =
    status === "draft" ||
    status === "needs_attention";

  return {
    label: "My Application",
    href: editable
      ? "/caregiver/onboarding"
      : "/caregiver/application",
  };
}

export default function CaregiverNavigation({
  activeItem,
  mobileMenuOpen,
  onMobileMenuClose,
}: CaregiverNavigationProps) {
  const [user, setUser] =
    useState<User | null>(null);

  const [draft, setDraft] =
    useState<CaregiverOnboardingDraft>({});

  const [isAuthLoading, setIsAuthLoading] =
    useState(true);

  const [isSigningOut, setIsSigningOut] =
    useState(false);

  /*
   * ============================================================
   * AUTH + CAREGIVER-SCOPED DRAFT
   * ============================================================
   *
   * We load the authenticated caregiver first.
   *
   * The draft helper can then resolve the correct caregiver-
   * specific browser cache instead of reading another
   * caregiver's onboarding state.
   */

  useEffect(() => {
    let mounted = true;

    async function loadAccount() {
      try {
        const {
          data: { session },
          error,
        } =
          await supabase.auth.getSession();

        if (error) {
          console.error(
            "Unable to load caregiver session:",
            error
          );
        }

        if (!mounted) {
          return;
        }

        const currentUser =
          session?.user || null;

        setUser(currentUser);

        setDraft(
          getCaregiverOnboardingDraft(
            currentUser?.id
          )
        );

        setIsAuthLoading(false);
      } catch (error) {
        console.error(
          "Unable to load caregiver authentication:",
          error
        );

        if (!mounted) {
          return;
        }

        setUser(null);
        setDraft({});
        setIsAuthLoading(false);
      }
    }

    loadAccount();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!mounted) {
            return;
          }

          const currentUser =
            session?.user || null;

          setUser(currentUser);

          setDraft(
            getCaregiverOnboardingDraft(
              currentUser?.id
            )
          );

          setIsAuthLoading(false);
        }
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /*
   * ============================================================
   * LISTEN FOR DRAFT CHANGES
   * ============================================================
   */

  useEffect(() => {
    function loadDraft() {
      setDraft(
        getCaregiverOnboardingDraft(
          user?.id
        )
      );
    }

    loadDraft();

    window.addEventListener(
      "carerityCaregiverDraftUpdated",
      loadDraft
    );

    window.addEventListener(
      "carerityCaregiverDraftCleared",
      loadDraft
    );

    window.addEventListener(
      "storage",
      loadDraft
    );

    return () => {
      window.removeEventListener(
        "carerityCaregiverDraftUpdated",
        loadDraft
      );

      window.removeEventListener(
        "carerityCaregiverDraftCleared",
        loadDraft
      );

      window.removeEventListener(
        "storage",
        loadDraft
      );
    };
  }, [user?.id]);

  /*
   * ============================================================
   * DERIVED STATE
   * ============================================================
   */

  const applicationStatus:
    CaregiverApplicationStatus =
      draft.applicationStatus ||
      "draft";

  const isApproved =
    applicationStatus === "approved";

  const firstName =
    getUserFirstName(
      user,
      draft
    );

  const fullName =
    getUserFullName(
      user,
      draft
    );

  const initials =
    getUserInitials(
      user,
      draft
    );

  const statusPresentation =
    useMemo(
      () =>
        getApplicationStatusPresentation(
          applicationStatus
        ),
      [applicationStatus]
    );

  /*
   * ============================================================
   * SIGN OUT
   * ============================================================
   */

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      const rememberedEmail =
        user?.email ||
        draft.email ||
        "";

      if (
        rememberedEmail &&
        typeof window !== "undefined"
      ) {
        window.localStorage.setItem(
          "carerityRememberedCaregiverEmail",
          rememberedEmail
            .trim()
            .toLowerCase()
        );
      }

      const { error } =
        await caregiverSupabase.auth.signOut({
          scope: "local",
        });

      if (error) {
        throw error;
      }

      setUser(null);
      setDraft({});

      onMobileMenuClose();

      window.location.replace(
        "/caregiver/login"
      );
    } catch (error) {
      console.error(
        "Caregiver sign out failed:",
        error
      );

      window.alert(
        "We couldn't sign you out. Please try again."
      );

      setIsSigningOut(false);
    }
  }

  /*
   * ============================================================
   * LOCKED NAVIGATION
   * ============================================================
   */

  function getRestrictedDestination(
    label: string
  ) {
    if (
      isApproved ||
      !APPROVAL_REQUIRED_ITEMS.has(label)
    ) {
      return "";
    }

    if (
      applicationStatus === "draft" ||
      applicationStatus ===
        "needs_attention"
    ) {
      return "/caregiver/onboarding";
    }

    return "/caregiver/dashboard";
  }

  /*
   * ============================================================
   * NAVIGATION ITEM LOOKUP
   * ============================================================
   */

  function getNavigationItem(
    label: string
  ) {
    if (label === "My Application") {
      return getCaregiverApplicationItem(
        applicationStatus
      );
    }

    return caregiverNavigation.find(
      (entry) =>
        entry.label === label
    );
  }

  /*
   * ============================================================
   * NAVIGATION
   * ============================================================
   */

  function renderNavigation() {
    return GROUPED_NAVIGATION.map(
      (group) => (
        <div
          key={group.heading}
          className="mb-5"
        >
          <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600">
            {group.heading}
          </p>

          <div className="space-y-1">
            {group.labels.map(
              (label) => {
                const item =
                  getNavigationItem(
                    label
                  );

                if (!item) {
                  return null;
                }

                const isActive =
                  activeItem ===
                    item.label ||
                  (
                    item.label ===
                      "My Application" &&
                    activeItem ===
                      "Application"
                  );

                const approvalRequired =
                  APPROVAL_REQUIRED_ITEMS.has(
                    item.label
                  );

                const locked =
                  approvalRequired &&
                  !isApproved;

                const href =
                  locked
                    ? getRestrictedDestination(
                        item.label
                      )
                    : item.href;

                return (
                  <Link
                    key={item.label}
                    href={href}
                    onClick={
                      onMobileMenuClose
                    }
                    title={
                      locked
                        ? "Available after caregiver approval"
                        : undefined
                    }
                    className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                      isActive
                        ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                        : locked
                          ? "border-transparent bg-gray-50 text-gray-400 hover:border-emerald-200 hover:bg-emerald-50"
                          : "border-transparent text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                    }`}
                  >
                    <span>
                      {item.label}
                    </span>

                    {locked ? (
                      <span
                        aria-hidden="true"
                        className="text-xs"
                      >
                        🔒
                      </span>
                    ) : item.label ===
                      "My Application" ? (
                      <span
                        aria-hidden="true"
                        className={
                          isActive
                            ? "text-xs text-white"
                            : "text-xs text-emerald-500"
                        }
                      >
                        →
                      </span>
                    ) : null}
                  </Link>
                );
              }
            )}
          </div>
        </div>
      )
    );
  }

  /*
   * ============================================================
   * APPLICATION STATUS PANEL
   * ============================================================
   */

  function renderApplicationStatus() {
    const action =
      getApplicationAction(
        applicationStatus
      );

    return (
      <div
        className={`mt-4 rounded-2xl border p-4 ${statusPresentation.panelClass}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Application
            </p>

            <p className="mt-1 text-sm font-bold text-gray-900">
              {
                statusPresentation.label
              }
            </p>
          </div>

          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusPresentation.badgeClass}`}
          >
            {
              statusPresentation.shortLabel
            }
          </span>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-gray-600">
          {
            statusPresentation.message
          }
        </p>

        <Link
          href={action.href}
          onClick={
            onMobileMenuClose
          }
          className="mt-3 block rounded-xl border border-emerald-300 bg-white px-3 py-2.5 text-center text-xs font-bold text-emerald-700 transition hover:bg-emerald-50"
        >
          {action.label}
        </Link>
      </div>
    );
  }

  /*
   * ============================================================
   * ACCOUNT PANEL
   * ============================================================
   */

  function renderAccountPanel(
    mobile = false
  ) {
    const applicationHref =
      getCaregiverApplicationItem(
        applicationStatus
      ).href;

    return (
      <div
        className={`rounded-2xl border border-emerald-200 bg-emerald-50 p-4 ${
          mobile
            ? "mt-6"
            : "mt-4"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white">
            {isAuthLoading
              ? "…"
              : initials}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-gray-900">
              {isAuthLoading
                ? "Loading account..."
                : fullName ||
                  firstName ||
                  "Caregiver"}
            </p>

            <p className="mt-0.5 truncate text-xs text-gray-500">
              {user?.email ||
                draft.email ||
                "Caregiver Workspace"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2">
          <Link
            href="/caregiver/profile"
            onClick={
              onMobileMenuClose
            }
            className="rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-center text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            Professional Profile
          </Link>

          <Link
            href={applicationHref}
            onClick={
              onMobileMenuClose
            }
            className="rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-center text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            My Application
          </Link>

          <button
            type="button"
            onClick={
              handleSignOut
            }
            disabled={
              isSigningOut
            }
            className="rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningOut
              ? "Signing out..."
              : "Sign Out"}
          </button>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * DESKTOP + MOBILE
   * ============================================================
   */

  return (
    <>
      <aside className="hidden w-72 shrink-0 flex-col border-r border-emerald-200 bg-white p-5 lg:flex">
        <Link
          href="/"
          className="self-start"
        >
          <img
            src="/carerityblacklogo2.png"
            alt="Carerity"
            className="h-20 w-auto object-contain"
          />
        </Link>

        <div className="mb-7 mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
            Caregiver Workspace
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto pr-1">
          {renderNavigation()}
        </nav>

        {renderApplicationStatus()}

        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-bold text-gray-900">
            Need support?
          </p>

          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            Contact Carerity if an
            application or visit issue
            needs attention.
          </p>

          <Link
            href="/caregiver/support"
            onClick={
              onMobileMenuClose
            }
            className="mt-3 inline-block text-xs font-bold text-emerald-700 hover:underline"
          >
            Get support
          </Link>
        </div>

        {renderAccountPanel()}
      </aside>

      {mobileMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Close caregiver menu"
            onClick={
              onMobileMenuClose
            }
            className="fixed inset-0 z-40 bg-black/25 lg:hidden"
          />

          <aside className="fixed bottom-0 right-0 top-0 z-50 w-[86%] max-w-sm overflow-y-auto border-l border-emerald-200 bg-white p-5 shadow-2xl lg:hidden">
            <div className="flex items-center justify-between">
              <Link
                href="/"
                onClick={
                  onMobileMenuClose
                }
              >
                <img
                  src="/carerityblacklogo2.png"
                  alt="Carerity"
                  className="h-14 w-auto object-contain"
                />
              </Link>

              <button
                type="button"
                onClick={
                  onMobileMenuClose
                }
                aria-label="Close caregiver menu"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="mb-6 mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                Caregiver Workspace
              </p>
            </div>

            <nav>
              {renderNavigation()}
            </nav>

            {renderApplicationStatus()}

            <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-bold text-gray-900">
                Need support?
              </p>

              <p className="mt-1 text-xs leading-relaxed text-gray-600">
                Contact Carerity if an
                application or visit
                issue needs attention.
              </p>

              <Link
                href="/caregiver/support"
                onClick={
                  onMobileMenuClose
                }
                className="mt-3 inline-block text-xs font-bold text-emerald-700 hover:underline"
              >
                Get support
              </Link>
            </div>

            {renderAccountPanel(true)}
          </aside>
        </>
      )}
    </>
  );
}

/*
 * ============================================================
 * APPLICATION ACTION
 * ============================================================
 */

function getApplicationAction(
  status: CaregiverApplicationStatus
) {
  switch (status) {
    case "draft":
      return {
        label: "Continue Application",
        href: "/caregiver/onboarding",
      };

    case "needs_attention":
      return {
        label: "Update Application",
        href: "/caregiver/onboarding",
      };

    case "submitted":
      return {
        label: "View Application",
        href: "/caregiver/application",
      };

    case "under_review":
      return {
        label: "View Application",
        href: "/caregiver/application",
      };

    case "approved":
      return {
        label: "View Application",
        href: "/caregiver/application",
      };

    case "declined":
      return {
        label: "View Status",
        href: "/caregiver/application",
      };

    default:
      return {
        label: "View Application",
        href: "/caregiver/application",
      };
  }
}

/*
 * ============================================================
 * APPLICATION STATUS PRESENTATION
 * ============================================================
 */

function getApplicationStatusPresentation(
  status: CaregiverApplicationStatus
) {
  switch (status) {
    case "submitted":
      return {
        label:
          "Application submitted",
        shortLabel:
          "Submitted",
        message:
          "Your profile and documents are waiting for review.",
        panelClass:
          "border-blue-200 bg-blue-50",
        badgeClass:
          "bg-blue-100 text-blue-700",
      };

    case "under_review":
      return {
        label:
          "Application under review",
        shortLabel:
          "In review",
        message:
          "Carerity is reviewing your profile and documents.",
        panelClass:
          "border-amber-200 bg-amber-50",
        badgeClass:
          "bg-amber-100 text-amber-700",
      };

    case "approved":
      return {
        label:
          "Profile approved",
        shortLabel:
          "Approved",
        message:
          "You can access eligible care opportunities and review your submitted application anytime.",
        panelClass:
          "border-emerald-200 bg-emerald-50",
        badgeClass:
          "bg-emerald-100 text-emerald-700",
      };

    case "needs_attention":
      return {
        label:
          "Information required",
        shortLabel:
          "Action needed",
        message:
          "Update the requested application information.",
        panelClass:
          "border-orange-200 bg-orange-50",
        badgeClass:
          "bg-orange-100 text-orange-700",
      };

    case "declined":
      return {
        label:
          "Application not approved",
        shortLabel:
          "Not approved",
        message:
          "Open your application status for more information.",
        panelClass:
          "border-red-200 bg-red-50",
        badgeClass:
          "bg-red-100 text-red-700",
      };

    default:
      return {
        label:
          "Application in progress",
        shortLabel:
          "Draft",
        message:
          "Complete and submit your caregiver application.",
        panelClass:
          "border-gray-200 bg-gray-50",
        badgeClass:
          "bg-gray-200 text-gray-700",
      };
  }
}

/*
 * ============================================================
 * USER DISPLAY HELPERS
 * ============================================================
 */

function getUserFirstName(
  user: User | null,
  draft: CaregiverOnboardingDraft
) {
  const metadata =
    user?.user_metadata || {};

  const firstName =
    metadata.first_name ||
    metadata.firstName ||
    metadata.given_name ||
    draft.firstName ||
    (
      typeof metadata.name ===
      "string"
        ? metadata.name.split(" ")[0]
        : ""
    );

  if (
    typeof firstName ===
      "string" &&
    firstName.trim()
  ) {
    return formatName(
      firstName
    );
  }

  const emailName =
    user?.email?.split("@")[0] ||
    draft.email?.split("@")[0] ||
    "";

  return formatName(
    emailName.split(/[._-]/)[0]
  );
}

function getUserFullName(
  user: User | null,
  draft: CaregiverOnboardingDraft
) {
  const metadata =
    user?.user_metadata || {};

  const firstName =
    metadata.first_name ||
    metadata.firstName ||
    metadata.given_name ||
    draft.firstName ||
    "";

  const lastName =
    metadata.last_name ||
    metadata.lastName ||
    metadata.family_name ||
    draft.lastName ||
    "";

  return [
    firstName,
    lastName,
  ]
    .filter(
      (value) =>
        typeof value ===
          "string" &&
        value.trim()
    )
    .map(
      (value) =>
        formatName(
          String(value)
        )
    )
    .join(" ");
}

function getUserInitials(
  user: User | null,
  draft: CaregiverOnboardingDraft
) {
  const fullName =
    getUserFullName(
      user,
      draft
    );

  if (fullName) {
    const parts =
      fullName
        .split(/\s+/)
        .filter(Boolean);

    if (
      parts.length === 1
    ) {
      return parts[0]
        .slice(0, 2)
        .toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  const firstName =
    getUserFirstName(
      user,
      draft
    );

  return firstName
    ? firstName
        .slice(0, 2)
        .toUpperCase()
    : "CG";
}

function formatName(
  value: string
) {
  const trimmed =
    value.trim();

  if (!trimmed) {
    return "";
  }

  return (
    trimmed
      .charAt(0)
      .toUpperCase() +
    trimmed
      .slice(1)
      .toLowerCase()
  );
}