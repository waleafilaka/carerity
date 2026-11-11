"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import type {
  User,
} from "@supabase/supabase-js";

import {
  BookingDraft,
  getBookingDraft,
} from "../lib/bookingDraft";

import {
  customerNavigation,
} from "../lib/navigation";

import {
  supabase,
} from "../lib/supabaseClient";

type CustomerDashboardNavigationProps = {
  activeItem: string;
  mobileMenuOpen: boolean;
  onMobileMenuClose: () => void;
};

type NavigationItem = {
  label: string;
  href: string;
};

const CUSTOMER_EMAIL_KEY =
  "carerityLastCustomerEmail";

/*
 * Items that should highlight the parent
 * "My Care" navigation item.
 *
 * Care Profile is deliberately NOT included here
 * because it now has its own navigation button.
 */
const MY_CARE_CHILDREN = [
  "My Care",
  "Bookings",
  "My Bookings",
  "My Caregiver",
  "Caregivers",
  "Visit Updates",
  "Family",
  "Family Access",
];

/*
 * Items that should highlight the parent
 * Support & Settings navigation item.
 */
const ACCOUNT_CHILDREN = [
  "Support & Settings",
  "Support",
  "Settings",
  "Notifications",
  "Privacy",
];

/*
 * Permanent customer dashboard destination.
 *
 * This is NOT part of Find Care onboarding.
 *
 * The Care Profile is the customer's reusable
 * source of care preferences for future bookings
 * and matching.
 */
const CARE_PROFILE_NAVIGATION_ITEM: NavigationItem = {
  label:
    "Care Profile",

  href:
    "/dashboard/care-profile",
};

export default function CustomerDashboardNavigation({
  activeItem,
  mobileMenuOpen,
  onMobileMenuClose,
}: CustomerDashboardNavigationProps) {
  const [
    booking,
    setBooking,
  ] =
    useState<BookingDraft>(
      {}
    );

  const [
    user,
    setUser,
  ] =
    useState<User | null>(
      null
    );

  const [
    isAuthLoading,
    setIsAuthLoading,
  ] =
    useState(true);

  const [
    isSigningOut,
    setIsSigningOut,
  ] =
    useState(false);

  /*
   * ============================================================
   * NAVIGATION
   * ============================================================
   *
   * We keep lib/navigation.ts untouched for now.
   *
   * Care Profile is injected directly after My Care.
   *
   * If Care Profile is later added to customerNavigation,
   * this logic detects it and avoids adding it twice.
   * ============================================================
   */

  const navigationItems =
    useMemo(
      () => {
        const existingItems =
          customerNavigation as NavigationItem[];

        const alreadyHasCareProfile =
          existingItems.some(
            (
              item
            ) =>
              item.label ===
              CARE_PROFILE_NAVIGATION_ITEM.label
          );

        if (
          alreadyHasCareProfile
        ) {
          return existingItems;
        }

        const myCareIndex =
          existingItems.findIndex(
            (
              item
            ) =>
              item.label ===
              "My Care"
          );

        /*
         * If My Care exists, insert Care Profile
         * immediately after it.
         */
        if (
          myCareIndex >=
          0
        ) {
          return [
            ...existingItems.slice(
              0,
              myCareIndex +
                1
            ),

            CARE_PROFILE_NAVIGATION_ITEM,

            ...existingItems.slice(
              myCareIndex +
                1
            ),
          ];
        }

        /*
         * Safe fallback in case navigation structure
         * changes later.
         */
        return [
          ...existingItems,

          CARE_PROFILE_NAVIGATION_ITEM,
        ];
      },
      []
    );

  /*
   * ============================================================
   * BOOKING STATE
   * ============================================================
   */

  useEffect(() => {
    setBooking(
      getBookingDraft()
    );

    function handleBookingUpdate() {
      setBooking(
        getBookingDraft()
      );
    }

    window.addEventListener(
      "storage",
      handleBookingUpdate
    );

    window.addEventListener(
      "carerityBookingDraftUpdated",
      handleBookingUpdate
    );

    window.addEventListener(
      "carerityBookingDraftCleared",
      handleBookingUpdate
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleBookingUpdate
      );

      window.removeEventListener(
        "carerityBookingDraftUpdated",
        handleBookingUpdate
      );

      window.removeEventListener(
        "carerityBookingDraftCleared",
        handleBookingUpdate
      );
    };
  }, []);

  /*
   * ============================================================
   * AUTHENTICATED CUSTOMER
   * ============================================================
   */

  useEffect(() => {
    let mounted =
      true;

    async function loadUser() {
      try {
        const {
          data: {
            session,
          },
          error:
            sessionError,
        } =
          await supabase.auth.getSession();

        if (
          !mounted
        ) {
          return;
        }

        if (
          sessionError
        ) {
          console.error(
            "Unable to read customer navigation session:",
            sessionError
          );
        }

        if (
          !session?.user
        ) {
          setUser(
            null
          );

          setIsAuthLoading(
            false
          );

          return;
        }

        const {
          data: {
            user:
              authenticatedUser,
          },
          error,
        } =
          await supabase.auth.getUser();

        if (
          error
        ) {
          console.error(
            "Unable to load customer navigation user:",
            error
          );
        }

        if (
          !mounted
        ) {
          return;
        }

        setUser(
          authenticatedUser
        );

        setIsAuthLoading(
          false
        );
      } catch (
        error
      ) {
        console.error(
          "Unable to load customer authentication:",
          error
        );

        if (
          mounted
        ) {
          setUser(
            null
          );

          setIsAuthLoading(
            false
          );
        }
      }
    }

    loadUser();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          session
        ) => {
          if (
            !mounted
          ) {
            return;
          }

          setUser(
            session?.user ||
            null
          );

          setIsAuthLoading(
            false
          );
        }
      );

    return () => {
      mounted =
        false;

      subscription.unsubscribe();
    };
  }, []);

  /*
   * ============================================================
   * RECURRING CARE ROUTE
   * ============================================================
   *
   * Existing recurring schedule:
   * -> manage it
   *
   * No recurring schedule:
   * -> start recurring-care booking setup
   * ============================================================
   */

  const hasRecurringSchedule =
    booking.scheduleType ===
      "Recurring Care" &&
    booking.recurringStatus !==
      "Cancelled";

  const recurringHref =
    hasRecurringSchedule
      ? "/dashboard/recurring-care"
      : "/find-care/recurring";

  /*
   * ============================================================
   * USER DISPLAY
   * ============================================================
   */

  const firstName =
    getUserFirstName(
      user
    );

  const fullName =
    getUserFullName(
      user
    );

  const initials =
    getUserInitials(
      user
    );

  /*
   * ============================================================
   * ROUTING
   * ============================================================
   */

  function getHref(
    label:
      string,

    href:
      string
  ) {
    if (
      label ===
      "Recurring Care"
    ) {
      return recurringHref;
    }

    if (
      label ===
      "Care Profile"
    ) {
      return "/dashboard/care-profile";
    }

    return href;
  }

  /*
   * ============================================================
   * ACTIVE NAVIGATION STATE
   * ============================================================
   */

  function isItemActive(
    label:
      string
  ) {
    /*
     * Care Profile has its own navigation item.
     */
    if (
      label ===
      "Care Profile"
    ) {
      return (
        activeItem ===
        "Care Profile"
      );
    }

    /*
     * Child care pages continue to highlight
     * the main My Care navigation item.
     */
    if (
      label ===
      "My Care"
    ) {
      return MY_CARE_CHILDREN.includes(
        activeItem
      );
    }

    if (
      label ===
      "Support & Settings"
    ) {
      return ACCOUNT_CHILDREN.includes(
        activeItem
      );
    }

    return (
      activeItem ===
      label
    );
  }

  /*
   * ============================================================
   * SIGN OUT
   * ============================================================
   */

  async function handleSignOut() {
    if (
      isSigningOut
    ) {
      return;
    }

    setIsSigningOut(
      true
    );

    /*
     * Remember only the email.
     *
     * Passwords are never stored by Carerity.
     */
    const emailToRemember =
      user?.email
        ?.trim()
        .toLowerCase() ||
      "";

    if (
      emailToRemember &&
      typeof window !==
        "undefined"
    ) {
      try {
        window.localStorage.setItem(
          CUSTOMER_EMAIL_KEY,
          emailToRemember
        );
      } catch (
        error
      ) {
        console.warn(
          "Unable to remember customer email:",
          error
        );
      }
    }

    try {
      const {
        data: {
          session,
        },
        error:
          sessionError,
      } =
        await supabase.auth.getSession();

      if (
        sessionError
      ) {
        console.warn(
          "Unable to inspect customer session before logout:",
          sessionError
        );
      }

      if (
        session
      ) {
        const {
          error,
        } =
          await supabase.auth.signOut({
            scope:
              "local",
          });

        if (
          error
        ) {
          throw error;
        }
      }

      setUser(
        null
      );

      onMobileMenuClose();

      /*
       * Hard navigation prevents an authenticated
       * dashboard component from racing against
       * the login route after logout.
       */
      window.location.replace(
        "/login"
      );
    } catch (
      error
    ) {
      console.error(
        "Customer sign out failed:",
        error
      );

      window.alert(
        "We couldn't sign you out. Please try again."
      );

      setIsSigningOut(
        false
      );
    }
  }

  /*
   * ============================================================
   * NAVIGATION LIST
   * ============================================================
   */

  function renderNavigation() {
    return (
      <div className="space-y-2">
        {navigationItems.map(
          (
            item
          ) => {
            const isActive =
              isItemActive(
                item.label
              );

            const resolvedHref =
              getHref(
                item.label,
                item.href
              );

            return (
              <Link
                key={
                  item.label
                }
                href={
                  resolvedHref
                }
                onClick={
                  onMobileMenuClose
                }
                aria-current={
                  isActive
                    ? "page"
                    : undefined
                }
                className={`block rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                  isActive
                    ? "border-purple-600 bg-purple-600 text-white shadow-sm"
                    : "border-transparent text-gray-700 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span>
                    {
                      item.label
                    }
                  </span>

                  {item.label ===
                    "Care Profile" && (
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide ${
                        isActive
                          ? "text-purple-100"
                          : "text-purple-500"
                      }`}
                    >
                      Preferences
                    </span>
                  )}
                </span>
              </Link>
            );
          }
        )}
      </div>
    );
  }

  /*
   * ============================================================
   * ACCOUNT PANEL
   * ============================================================
   */

  function renderAccountPanel(
    mobile =
      false
  ) {
    return (
      <div
        className={`rounded-2xl border border-purple-200 bg-purple-50 p-4 ${
          mobile
            ? "mt-6"
            : "mt-4"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-sm font-bold text-white">
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
                  "Family account"}
            </p>

            <p className="mt-0.5 truncate text-xs text-gray-500">
              {user?.email ||
                "Family Care Portal"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2">
          <Link
            href="/dashboard/account"
            onClick={
              onMobileMenuClose
            }
            className="rounded-xl border border-purple-200 bg-white px-3 py-2.5 text-center text-sm font-semibold text-purple-700 transition hover:bg-purple-100"
          >
            Account & Settings
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
   * PAGE
   * ============================================================
   */

  return (
    <>
      {/* ======================================================
          DESKTOP NAVIGATION
      ====================================================== */}

      <aside className="hidden w-72 shrink-0 flex-col border-r border-purple-200 bg-white p-5 lg:flex">
        <Link
          href="/"
          aria-label="Go to Carerity home"
          className="self-start"
        >
          <img
            src="/carerityblacklogo2.png"
            alt="Carerity"
            className="h-20 w-auto object-contain"
          />
        </Link>

        <div className="mb-7 mt-2 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-700">
            Family Care Portal
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto pr-1">
          {
            renderNavigation()
          }
        </nav>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-bold text-gray-900">
            Need help?
          </p>

          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            Contact Carerity support if you need help managing care.
          </p>

          <Link
            href="/dashboard/account"
            className="mt-3 inline-block text-xs font-bold text-purple-700 hover:underline"
          >
            Get support
          </Link>
        </div>

        {
          renderAccountPanel()
        }
      </aside>

      {/* ======================================================
          MOBILE NAVIGATION
      ====================================================== */}

      {mobileMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Close customer menu"
            onClick={
              onMobileMenuClose
            }
            className="fixed inset-0 z-40 bg-black/25 lg:hidden"
          />

          <aside className="fixed bottom-0 right-0 top-0 z-50 w-[86%] max-w-sm overflow-y-auto border-l border-purple-200 bg-white p-5 shadow-2xl lg:hidden">
            <div className="flex items-center justify-between">
              <Link
                href="/"
                aria-label="Go to Carerity home"
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
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-xl font-bold text-gray-700"
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            <div className="mb-6 mt-3 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-700">
                Family Care Portal
              </p>
            </div>

            <nav>
              {
                renderNavigation()
              }
            </nav>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-bold text-gray-900">
                Need help?
              </p>

              <p className="mt-1 text-xs leading-relaxed text-gray-600">
                Contact Carerity support if you need help managing care.
              </p>

              <Link
                href="/dashboard/account"
                onClick={
                  onMobileMenuClose
                }
                className="mt-3 inline-block text-xs font-bold text-purple-700 hover:underline"
              >
                Get support
              </Link>
            </div>

            {
              renderAccountPanel(
                true
              )
            }
          </aside>
        </>
      )}
    </>
  );
}

/*
 * ============================================================
 * USER DISPLAY HELPERS
 * ============================================================
 */

function getUserFirstName(
  user:
    User |
    null
) {
  if (
    !user
  ) {
    return "";
  }

  const metadata =
    user.user_metadata ||
    {};

  const firstName =
    metadata.first_name ||
    metadata.firstName ||
    metadata.given_name ||
    (
      typeof metadata.name ===
        "string"
        ? metadata.name.split(
            " "
          )[0]
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
    user.email
      ?.split(
        "@"
      )[0] ||
    "";

  const fallbackName =
    emailName.split(
      /[._-]/
    )[0];

  return formatName(
    fallbackName
  );
}

function getUserFullName(
  user:
    User |
    null
) {
  if (
    !user
  ) {
    return "";
  }

  const metadata =
    user.user_metadata ||
    {};

  const firstName =
    metadata.first_name ||
    metadata.firstName ||
    metadata.given_name ||
    "";

  const lastName =
    metadata.last_name ||
    metadata.lastName ||
    metadata.family_name ||
    "";

  const fullName =
    [
      firstName,
      lastName,
    ]
      .filter(
        (
          value
        ) =>
          typeof value ===
            "string" &&
          value.trim()
      )
      .map(
        (
          value
        ) =>
          formatName(
            String(
              value
            )
          )
      )
      .join(
        " "
      );

  if (
    fullName
  ) {
    return fullName;
  }

  if (
    typeof metadata.full_name ===
    "string"
  ) {
    return metadata.full_name.trim();
  }

  if (
    typeof metadata.name ===
    "string"
  ) {
    return metadata.name.trim();
  }

  return "";
}

function getUserInitials(
  user:
    User |
    null
) {
  const fullName =
    getUserFullName(
      user
    );

  if (
    fullName
  ) {
    const parts =
      fullName
        .split(
          /\s+/
        )
        .filter(
          Boolean
        );

    if (
      parts.length ===
      1
    ) {
      return parts[0]
        .slice(
          0,
          2
        )
        .toUpperCase();
    }

    return `${parts[0][0]}${
      parts[
        parts.length -
          1
      ][0]
    }`.toUpperCase();
  }

  const firstName =
    getUserFirstName(
      user
    );

  return firstName
    ? firstName
        .slice(
          0,
          2
        )
        .toUpperCase()
    : "CA";
}

function formatName(
  value:
    string
) {
  const trimmed =
    value.trim();

  if (
    !trimmed
  ) {
    return "";
  }

  return (
    trimmed
      .charAt(
        0
      )
      .toUpperCase() +
    trimmed
      .slice(
        1
      )
      .toLowerCase()
  );
}
