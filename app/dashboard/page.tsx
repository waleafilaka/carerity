"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import type {
  User,
} from "@supabase/supabase-js";

import DashboardLayout from "../../components/DashboardLayout";

import {
  BookingDraft,
  getBookingDraft,
  replaceBookingDraft,
} from "../../lib/bookingDraft";

import {
  CustomerCareProfile,
  loadCustomerCareProfileFromSupabase,
} from "../../lib/customerCareProfile";

import {
  customerSupabase,
} from "../../lib/supabaseClient";

import {
  CanonicalDashboardVisit,
  loadCustomerCurrentVisit,
} from "../../lib/visitDashboardPersistence";

import {
  CustomerVisitHistoryItem,
  loadMyCustomerVisitHistory,
} from "../../lib/customerVisitHistoryPersistence";

const supabase =
  customerSupabase;

export default function CustomerDashboardPage() {
  const router =
    useRouter();

  const [
    user,
    setUser,
  ] =
    useState<User | null>(
      null
    );

  const [
    booking,
    setBooking,
  ] =
    useState<BookingDraft>(
      {}
    );

  const [
    careProfile,
    setCareProfile,
  ] =
    useState<CustomerCareProfile>(
      {}
    );

  const [
    canonicalVisit,
    setCanonicalVisit,
  ] =
    useState<CanonicalDashboardVisit | null>(
      null
    );

  const [
    customerVisits,
    setCustomerVisits,
  ] =
    useState<CustomerVisitHistoryItem[]>(
      []
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isStartingNewCare,
    setIsStartingNewCare,
  ] =
    useState(false);

  const [
    newCareError,
    setNewCareError,
  ] =
    useState("");

  /*
   * ============================================================
   * LOAD DASHBOARD
   * ============================================================
   */

  useEffect(() => {
    let mounted =
      true;

    async function loadDashboard() {
      try {
        const [
          userResult,
          profileResult,
          visitResult,
          historyResult,
        ] =
          await Promise.all([
            supabase.auth.getUser(),

            loadCustomerCareProfileFromSupabase(),

            loadCustomerCurrentVisit(),

            loadMyCustomerVisitHistory(),
          ]);

        if (
          !mounted
        ) {
          return;
        }

        setUser(
          userResult.data.user
        );

        setBooking(
          getBookingDraft()
        );

        if (
          visitResult.success
        ) {
          setCanonicalVisit(
            visitResult.visit
          );
        }

        if (
          historyResult.success
        ) {
          setCustomerVisits(
            historyResult.visits
          );
        }

        if (
          profileResult.success
        ) {
          setCareProfile(
            profileResult.profile
          );
        } else {
          /*
           * Dashboard can still function even if
           * the reusable Care Profile could not
           * be refreshed.
           *
           * Starting new care will attempt to
           * refresh it again.
           */
          setCareProfile(
            profileResult.profile ||
              {}
          );
        }
      } catch (
        error
      ) {
        console.error(
          "Unable to load customer dashboard:",
          error
        );

        if (
          mounted
        ) {
          setBooking(
            getBookingDraft()
          );
        }
      } finally {
        if (
          mounted
        ) {
          setIsLoading(
            false
          );
        }
      }
    }

    loadDashboard();

    function refreshBooking() {
      setBooking(
        getBookingDraft()
      );
    }

    window.addEventListener(
      "storage",
      refreshBooking
    );

    window.addEventListener(
      "carerityBookingDraftUpdated",
      refreshBooking
    );

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
        }
      );

    return () => {
      mounted =
        false;

      subscription.unsubscribe();

      window.removeEventListener(
        "storage",
        refreshBooking
      );

      window.removeEventListener(
        "carerityBookingDraftUpdated",
        refreshBooking
      );
    };
  }, []);

  /*
   * ============================================================
   * DERIVED DASHBOARD VALUES
   * ============================================================
   */

  const firstName =
    getCustomerFirstName(
      user,
      booking
    );

  const visitStatus =
    canonicalVisit
      ? mapCanonicalVisitStatus(
          canonicalVisit.status
        )
      : booking.visitStatus ||
        getVisitStatusFromRequest(
          booking.requestStatus
        );

  const hasVisit =
    Boolean(
      canonicalVisit
    ) ||
    Boolean(
      booking.careDate
    ) ||
    Boolean(
      booking.assignedCaregiverName
    );

  const isActiveVisit =
    canonicalVisit?.status ===
      "in_progress" ||
    visitStatus ===
      "On the Way" ||
    visitStatus ===
      "Arrived" ||
    visitStatus ===
      "Verified" ||
    visitStatus ===
      "In Progress";

  const upcomingVisits =
    customerVisits.filter(
      (
        visit
      ) =>
        (
          visit.status ===
            "scheduled" &&
          isFutureOrCurrentHistoryVisit(
            visit.endDatetime
          )
        ) ||
        visit.status ===
          "in_progress"
    );

  const upcomingVisitCount =
    upcomingVisits.length;

  const caregiverName =
    canonicalVisit?.caregiverName ||
    booking.assignedCaregiverName ||
    "Caregiver not assigned";

  const recipientName =
    canonicalVisit?.recipientName ||
    booking.careRecipientName ||
    booking.recipientName ||
    [
      booking.firstName,
      booking.lastName,
    ]
      .filter(
        Boolean
      )
      .join(
        " "
      ) ||
    "Care recipient";

  const messageCount =
    booking.assignedCaregiverName
      ? 1
      : 0;

  const notificationCount =
    hasVisit
      ? 1
      : 0;

  const carePlanLabel =
    booking.scheduleType ===
    "Recurring Care"
      ? "Recurring care"
      : hasVisit
        ? "One-time care"
        : "No care plan";

  const upcomingVisitLabel =
    useMemo(
      () => {
        if (
          canonicalVisit
        ) {
          return formatCanonicalVisitWindow(
            canonicalVisit.startDatetime,
            canonicalVisit.endDatetime
          );
        }

        if (
          !booking.careDate
        ) {
          return "No upcoming visit";
        }

        return formatCareDate(
          booking.careDate,
          booking.startTime,
          booking.endTime
        );
      },
      [
        canonicalVisit,
        booking.careDate,
        booking.startTime,
        booking.endTime,
      ]
    );

  /*
   * ============================================================
   * START NEW CARE
   * ============================================================
   *
   * IMPORTANT:
   *
   * This is for an ALREADY SIGNED-IN customer.
   *
   * It must NOT send the customer through:
   *
   * /find-care
   * -> acquisition
   * -> account creation
   *
   * Instead:
   *
   * Customer Care Profile
   * -> fresh booking draft
   * -> first incomplete booking step
   *
   * Existing booking/payment/visit information is NOT copied
   * into the fresh request.
   * ============================================================
   */

  async function handleBookNewCare() {
    if (
      isStartingNewCare
    ) {
      return;
    }

    setIsStartingNewCare(
      true
    );

    setNewCareError(
      ""
    );

    try {
      /*
       * Confirm there is still an authenticated
       * customer session.
       */
      const {
        data: {
          user:
            authenticatedUser,
        },
        error:
          userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !authenticatedUser
      ) {
        router.replace(
          "/login"
        );

        return;
      }

      /*
       * Refresh the reusable Care Profile before
       * creating the new booking.
       *
       * This means the latest saved preferences
       * become the starting truth.
       */
      const profileResult =
        await loadCustomerCareProfileFromSupabase();

      if (
        !profileResult.authenticated
      ) {
        router.replace(
          "/login"
        );

        return;
      }

      const latestProfile =
        profileResult.profile ||
        careProfile;

      setCareProfile(
        latestProfile
      );

      const metadata =
        authenticatedUser.user_metadata ||
        {};

      const accountFirstName =
        getMetadataString(
          metadata,
          [
            "first_name",
            "firstName",
            "given_name",
          ]
        );

      const accountLastName =
        getMetadataString(
          metadata,
          [
            "last_name",
            "lastName",
            "family_name",
          ]
        );

      /*
       * ========================================================
       * FRESH REQUEST
       * ========================================================
       *
       * We use replaceBookingDraft instead of saveBookingDraft.
       *
       * That is deliberate.
       *
       * The old booking may contain:
       *
       * - assigned caregiver
       * - paid status
       * - Stripe IDs
       * - confirmed visit
       * - live visit status
       * - cancellation state
       *
       * None of those belong to a NEW care request.
       * ========================================================
       */

      const freshBooking:
        BookingDraft = {
        /*
         * CUSTOMER ACCOUNT
         */

        firstName:
          accountFirstName ||
          undefined,

        lastName:
          accountLastName ||
          undefined,

        email:
          authenticatedUser.email ||
          undefined,

        phone:
          getMetadataString(
            metadata,
            [
              "phone",
              "phone_number",
            ]
          ) ||
          undefined,

        /*
         * CARE RECIPIENT
         */

        bookingFor:
          latestProfile.bookingFor,

        careRecipientName:
          latestProfile.careRecipientName,

        recipientName:
          latestProfile.careRecipientName,

        /*
         * DEFAULT CARE LOCATION
         */

        country:
          latestProfile.country ||
          "Canada",

        address:
          latestProfile.address,

        unit:
          latestProfile.unit,

        city:
          latestProfile.city,

        province:
          latestProfile.province ||
          "Ontario",

        postalCode:
          latestProfile.postalCode,

        latitude:
          latestProfile.latitude,

        longitude:
          latestProfile.longitude,

        placeId:
          latestProfile.googlePlaceId,

        googlePlaceId:
          latestProfile.googlePlaceId,

        /*
         * MATCHING PREFERENCES
         */

        selectedNeeds:
          latestProfile.selectedNeeds
            ? [
                ...latestProfile.selectedNeeds,
              ]
            : undefined,

        selectedContext:
          latestProfile.selectedContext
            ? [
                ...latestProfile.selectedContext,
              ]
            : undefined,

        otherNeed:
          latestProfile.otherNeed,

        otherContext:
          latestProfile.otherContext,

        primaryLanguage:
          latestProfile.primaryLanguage,

        secondaryLanguage:
          latestProfile.secondaryLanguage,

        /*
         * CARE CONTINUITY
         */

        preferSameCaregiver:
          latestProfile.preferSameCaregiver,

        /*
         * NEW REQUEST STATE
         *
         * Nothing from the previous booking lifecycle
         * is copied.
         */

        requestStatus:
          "draft",

        paymentMethodStatus:
          "not_set",

        paymentStatus:
          "not_set",
      };

      replaceBookingDraft(
        freshBooking
      );

      setBooking(
        freshBooking
      );

      /*
       * ========================================================
       * ROUTE TO FIRST NEEDED STEP
       * ========================================================
       */

      const hasRecipient =
        (
          latestProfile.bookingFor ===
            "myself" ||
          latestProfile.bookingFor ===
            "someoneElse"
        ) &&
        Boolean(
          latestProfile.careRecipientName?.trim()
        );

      const hasVerifiedLocation =
        Boolean(
          latestProfile.address?.trim()
        ) &&
        Boolean(
          latestProfile.city?.trim()
        ) &&
        Boolean(
          latestProfile.province?.trim()
        ) &&
        Boolean(
          latestProfile.postalCode?.trim()
        ) &&
        typeof latestProfile.latitude ===
          "number" &&
        Number.isFinite(
          latestProfile.latitude
        ) &&
        typeof latestProfile.longitude ===
          "number" &&
        Number.isFinite(
          latestProfile.longitude
        );

      /*
       * Recipient missing:
       *
       * Go directly to recipient step.
       * Do NOT go through account creation.
       */
      if (
        !hasRecipient
      ) {
        router.push(
          "/find-care/who-needs-care"
        );

        return;
      }

      /*
       * Recipient exists but care location
       * is missing/unverified.
       */
      if (
        !hasVerifiedLocation
      ) {
        router.push(
          "/find-care/location"
        );

        return;
      }

      /*
       * Reusable profile already gives us:
       *
       * - account
       * - recipient
       * - verified address
       *
       * Customer can start directly with current
       * care needs for this new request.
       *
       * Saved needs/context remain editable.
       */
      router.push(
        "/find-care/needs"
      );
    } catch (
      error
    ) {
      console.error(
        "Unable to start a new care request:",
        error
      );

      setNewCareError(
        "We couldn't start a new care request. Please try again."
      );
    } finally {
      setIsStartingNewCare(
        false
      );
    }
  }

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (
    isLoading
  ) {
    return (
      <DashboardLayout
        activeItem="Home"
        role="customer"
      >
        <CustomerDashboardSkeleton />
      </DashboardLayout>
    );
  }

  const hasActiveCaregiverSearch =
    Boolean(booking.matchingSessionId) &&
    booking.requestStatus === "matching";

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <DashboardLayout
      activeItem="Home"
      role="customer"
      messageCount={
        messageCount
      }
      notificationCount={
        notificationCount
      }
    >
      <div className="mx-auto max-w-6xl">
        <section className="mb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold sm:text-4xl">
                Hi{" "}
                {firstName ||
                  "there"}
                !
              </h1>

              <p className="mt-1 text-sm text-gray-500 sm:text-base">
                See what&apos;s happening with your care.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <CompactStatus
                label="Care plan"
                value={
                  carePlanLabel
                }
              />

              <CompactStatus
                label={
                  isActiveVisit
                    ? "Ongoing"
                    : "Upcoming"
                }
                value={
                  hasVisit
                    ? "1 visit"
                    : "None"
                }
                active={
                  isActiveVisit
                }
              />

              {messageCount >
                0 && (
                <CompactStatus
                  label="Messages"
                  value={String(
                    messageCount
                  )}
                />
              )}
            </div>
          </div>
        </section>

        {newCareError && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
          >
            {
              newCareError
            }
          </div>
        )}

        {hasActiveCaregiverSearch && (
          <section className="mb-5 rounded-3xl border border-purple-200 bg-gradient-to-r from-purple-50 to-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                  <span className="absolute h-3 w-3 animate-ping rounded-full bg-purple-400 opacity-60" />
                  <span className="relative h-3 w-3 rounded-full bg-purple-600" />
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-purple-700">
                    Caregiver search active
                  </p>
                  <h2 className="mt-1 text-lg font-black text-gray-950">
                    We’re still working on your care request
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Caregiver outreach continues in the background while you use Carerity.
                  </p>
                </div>
              </div>

              <Link
                href="/find-care/request-status"
                className="shrink-0 rounded-xl bg-purple-600 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-purple-700"
              >
                View caregiver search
              </Link>
            </div>
          </section>
        )}

        <section className="mb-5">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
            <div className="space-y-4">
              {isActiveVisit ? (
                <>
                  <LiveCareActivityCard
                    visitStatus={
                      visitStatus
                    }
                    caregiverName={
                      caregiverName
                    }
                    recipientName={
                      recipientName
                    }
                    caregiverEta={
                      booking.caregiverEta
                    }
                    visitStartedAt={
                      booking.visitStartedAt
                    }
                    upcomingVisitLabel={
                      upcomingVisitLabel
                    }
                  />

                  <RecentActivityCard
                    booking={
                      booking
                    }
                    caregiverName={
                      caregiverName
                    }
                    recipientName={
                      recipientName
                    }
                    upcomingVisitLabel={
                      upcomingVisitLabel
                    }
                    visitStatus={
                      visitStatus
                    }
                    isActiveVisit
                    visits={
                      customerVisits
                    }
                  />

                  <PriorityCareCard
                    hasVisit={
                      hasVisit
                    }
                    isActiveVisit={
                      false
                    }
                    visitStatus={
                      visitStatus
                    }
                    recipientName={
                      recipientName
                    }
                    upcomingVisitLabel={
                      upcomingVisitLabel
                    }
                    caregiverEta={
                      booking.caregiverEta
                    }
                    onBookCare={
                      handleBookNewCare
                    }
                    isStartingNewCare={
                      isStartingNewCare
                    }
                    movedBelow
                  />
                </>
              ) : (
                <>
                  <PriorityCareCard
                    hasVisit={
                      hasVisit
                    }
                    isActiveVisit={
                      false
                    }
                    visitStatus={
                      visitStatus
                    }
                    recipientName={
                      recipientName
                    }
                    upcomingVisitLabel={
                      upcomingVisitLabel
                    }
                    caregiverEta={
                      booking.caregiverEta
                    }
                    onBookCare={
                      handleBookNewCare
                    }
                    isStartingNewCare={
                      isStartingNewCare
                    }
                  />

                  <RecentActivityCard
                    booking={
                      booking
                    }
                    caregiverName={
                      caregiverName
                    }
                    recipientName={
                      recipientName
                    }
                    upcomingVisitLabel={
                      upcomingVisitLabel
                    }
                    visitStatus={
                      visitStatus
                    }
                    isActiveVisit={
                      false
                    }
                    visits={
                      customerVisits
                    }
                  />
                </>
              )}
            </div>

            <aside className="space-y-4">
              <CaregiverDetailsCard
                caregiverName={
                  caregiverName
                }
                hasAssignedCaregiver={Boolean(
                  canonicalVisit?.caregiverId ||
                  booking.assignedCaregiverName
                )}
                visitStatus={
                  visitStatus
                }
                isActiveVisit={
                  isActiveVisit
                }
              />

              <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                <SectionHeading
                  title="Care overview"
                  subtitle="Key details for your current request."
                />

                <div className="mt-3 space-y-3">
                  <DetailRow
                    label="Care recipient"
                    value={
                      recipientName
                    }
                  />

                  <DetailRow
                    label="Care plan"
                    value={
                      carePlanLabel
                    }
                  />

                  <DetailRow
                    label="Location"
                    value={
                      [
                        canonicalVisit?.city ||
                          booking.city,
                        canonicalVisit?.province ||
                          booking.province,
                      ]
                        .filter(
                          Boolean
                        )
                        .join(
                          ", "
                        ) ||
                      "Not set"
                    }
                  />

                  <DetailRow
                    label="Status"
                    value={
                      hasVisit
                        ? visitStatus
                        : "No active request"
                    }
                    active={
                      isActiveVisit
                    }
                  />
                </div>

                <Link
                  href="/dashboard/care"
                  className="mt-4 inline-block text-sm font-bold text-purple-700 hover:underline"
                >
                  Open My Care →
                </Link>
              </section>
            </aside>
          </div>
        </section>

        {/* ====================================================
            QUICK ACTIONS
        ==================================================== */}

        <section className="mb-5">
          <SectionHeading
            title="Quick actions"
            subtitle="Manage care in a few taps."
          />

          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {/*
             * IMPORTANT:
             *
             * This is no longer:
             *
             * href="/find-care"
             *
             * The signed-in customer starts a fresh
             * booking using the reusable Care Profile.
             */}

            <QuickAction
              onClick={
                handleBookNewCare
              }
              disabled={
                isStartingNewCare
              }
              icon={
                isStartingNewCare
                  ? "…"
                  : "＋"
              }
              title={
                isStartingNewCare
                  ? "Starting..."
                  : "Book Care"
              }
              detail="Start a new request"
            />

            <QuickAction
              href="/dashboard/recurring-care"
              icon="↻"
              title="Recurring Care"
              detail="Manage your schedule"
            />

            <QuickAction
              href="/dashboard/messages"
              icon="💬"
              title="Messages"
              detail="Contact your caregiver"
            />

            <QuickAction
              href="/dashboard/payments"
              icon="💳"
              title="Payments"
              detail="Cards and receipts"
            />
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

/*
 * ============================================================
 * LIVE CARE
 * ============================================================
 */

function LiveCareActivityCard({
  visitStatus,
  caregiverName,
  recipientName,
  caregiverEta,
  visitStartedAt,
  upcomingVisitLabel,
}: {
  visitStatus:
    string;

  caregiverName:
    string;

  recipientName:
    string;

  caregiverEta?:
    string;

  visitStartedAt?:
    string;

  upcomingVisitLabel:
    string;
}) {
  const liveDetail =
    visitStatus ===
    "On the Way"
      ? caregiverEta
        ? `${caregiverName} is on the way. Estimated arrival: ${caregiverEta}.`
        : `${caregiverName} is on the way to the care location.`
      : visitStatus ===
          "Arrived"
        ? `${caregiverName} has arrived at the care location.`
        : visitStatus ===
            "Verified"
          ? `${caregiverName}'s arrival has been verified. Care is ready to begin.`
          : `${caregiverName} is currently supporting ${recipientName}.`;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-white p-4 shadow-sm sm:p-5">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-100/60 blur-2xl" />

      <div className="relative">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />

                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
              </span>

              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                Live care activity
              </p>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white shadow-sm">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />

                Live
              </span>
            </div>

            <h2 className="mt-3 text-2xl font-bold text-gray-900">
              {
                visitStatus
              }
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
              {
                liveDetail
              }
            </p>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
              <span>
                <strong className="text-gray-700">
                  Visit:
                </strong>{" "}

                {
                  upcomingVisitLabel
                }
              </span>

              {visitStartedAt && (
                <span>
                  <strong className="text-gray-700">
                    Started:
                  </strong>{" "}

                  {formatDateTime(
                    visitStartedAt
                  )}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:min-w-48">
            <Link
              href="/dashboard/live-visit"
              className="rounded-xl bg-emerald-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Open Live Visit
            </Link>

            <Link
              href="/dashboard/messages"
              className="rounded-xl border border-emerald-300 bg-white px-5 py-3 text-center text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              Message Caregiver
            </Link>
          </div>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-emerald-100">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-emerald-500" />
        </div>
      </div>
    </section>
  );
}

/*
 * ============================================================
 * RECENT ACTIVITY
 * ============================================================
 */

function RecentActivityCard({
  booking,
  caregiverName,
  recipientName,
  upcomingVisitLabel,
  visitStatus,
  isActiveVisit,
  visits,
}: {
  booking:
    BookingDraft;

  caregiverName:
    string;

  recipientName:
    string;

  upcomingVisitLabel:
    string;

  visitStatus:
    string;

  isActiveVisit:
    boolean;

  visits:
    CustomerVisitHistoryItem[];
}) {
  const hasVisit =
    Boolean(
      booking.careDate
    ) ||
    Boolean(
      booking.assignedCaregiverName
    );

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <SectionHeading
          title={
            isActiveVisit
              ? "Live updates"
              : "Recent activity"
          }
          subtitle={
            isActiveVisit
              ? "Updates from the care visit as they happen."
              : "The latest updates related to your care."
          }
        />

        {isActiveVisit && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />

              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>

            Updating live
          </span>
        )}
      </div>

      <div className="mt-3 space-y-3">
        {hasVisit ? (
          <>
            {isActiveVisit && (
              <ActivityItem
                icon="●"
                title={`Visit ${visitStatus.toLowerCase()}`}
                detail={
                  booking.caregiverEta
                    ? `Estimated arrival: ${booking.caregiverEta}`
                    : `${caregiverName} is supporting ${recipientName}.`
                }
                active
              />
            )}

            {booking.caregiverArrivedAt && (
              <ActivityItem
                icon="📍"
                title="Caregiver arrived"
                detail={formatDateTime(
                  booking.caregiverArrivedAt
                )}
                active={
                  isActiveVisit
                }
              />
            )}

            {booking.visitStartedAt && (
              <ActivityItem
                icon="▶"
                title="Care started"
                detail={formatDateTime(
                  booking.visitStartedAt
                )}
                active={
                  isActiveVisit
                }
              />
            )}

            {visits
              .slice()
              .sort(
                (
                  a,
                  b
                ) =>
                  getCustomerActivityTime(
                    b
                  ) -
                  getCustomerActivityTime(
                    a
                  )
              )
              .slice(
                0,
                3
              )
              .map(
                (
                  visit
                ) => (
                  <div
                    key={
                      visit.id
                    }
                    className="space-y-3"
                  >
                    <ActivityItem
                      icon="✓"
                      title="Visit scheduled"
                      detail={`${formatHistoryVisitWindow(
                        visit.startDatetime,
                        visit.endDatetime
                      )} · ${visit.caregiverName}`}
                    />

                    {visit.paymentStatus ===
                      "paid" && (
                      <ActivityItem
                        icon="💳"
                        title="Payment confirmed"
                        detail={
                          visit.amountPaid !==
                          null
                            ? `Paid · $${visit.amountPaid.toFixed(
                                2
                              )}`
                            : "Paid"
                        }
                      />
                    )}
                  </div>
                )
              )}

            {visits.length ===
              0 && (
              <>
                <ActivityItem
                  icon="✓"
                  title="Care request saved"
                  detail={
                    upcomingVisitLabel
                  }
                />

                {booking.assignedCaregiverName && (
                  <ActivityItem
                    icon="🤝"
                    title="Caregiver assigned"
                    detail={
                      booking.assignedCaregiverName
                    }
                  />
                )}
              </>
            )}
          </>
        ) : (
          <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">
            New care updates will appear here.
          </p>
        )}
      </div>
    </section>
  );
}

/*
 * ============================================================
 * PRIORITY / NEXT CARE CARD
 * ============================================================
 */

function PriorityCareCard({
  hasVisit,
  isActiveVisit,
  visitStatus,
  recipientName,
  upcomingVisitLabel,
  caregiverEta,
  onBookCare,
  isStartingNewCare,
  movedBelow =
    false,
}: {
  hasVisit:
    boolean;

  isActiveVisit:
    boolean;

  visitStatus:
    string;

  recipientName:
    string;

  upcomingVisitLabel:
    string;

  caregiverEta?:
    string;

  onBookCare:
    () => void;

  isStartingNewCare:
    boolean;

  movedBelow?:
    boolean;
}) {
  /*
   * ==========================================================
   * NO VISIT
   * ==========================================================
   *
   * This is the SECOND Book Care entry point.
   *
   * It uses the same function as the Quick Action,
   * rather than href="/find-care".
   * ==========================================================
   */

  if (
    !hasVisit
  ) {
    return (
      <section className="rounded-3xl border border-dashed border-purple-300 bg-purple-50/50 px-5 py-5 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl">
          ♡
        </div>

        <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-purple-700">
          Next up
        </p>

        <h2 className="mt-1 text-xl font-bold">
          No care visit scheduled
        </h2>

        <p className="mt-1 text-sm text-gray-600">
          Book care whenever you need support.
        </p>

        <button
          type="button"
          onClick={
            onBookCare
          }
          disabled={
            isStartingNewCare
          }
          className="mt-4 inline-block rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
        >
          {isStartingNewCare
            ? "Starting..."
            : "Book Care"}
        </button>
      </section>
    );
  }

  return (
    <section
      className={`rounded-3xl border px-5 py-4 shadow-sm ${
        isActiveVisit
          ? "border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-white"
          : movedBelow
            ? "border-gray-200 bg-white"
            : "border-purple-300 bg-gradient-to-br from-purple-50 via-white to-white"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            {isActiveVisit && (
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />

                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
              </span>
            )}

            <p
              className={`text-xs font-bold uppercase tracking-[0.16em] ${
                isActiveVisit
                  ? "text-emerald-700"
                  : "text-purple-700"
              }`}
            >
              {isActiveVisit
                ? "Ongoing care"
                : movedBelow
                  ? "Scheduled visit"
                  : "Next up"}
            </p>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge
              label={
                visitStatus
              }
              active={
                isActiveVisit
              }
            />

            {!isActiveVisit && (
              <span className="text-xs font-semibold text-gray-500">
                {movedBelow
                  ? "Visit details"
                  : "Scheduled care"}
              </span>
            )}
          </div>

          <h2 className="mt-3 text-xl font-bold text-gray-900 sm:text-2xl">
            Care for{" "}
            {
              recipientName
            }
          </h2>

          <p className="mt-1 text-sm font-semibold text-gray-900">
            {
              upcomingVisitLabel
            }
          </p>

          {isActiveVisit &&
            caregiverEta && (
              <p className="mt-1 text-sm text-gray-500">
                Estimated arrival:{" "}
                {
                  caregiverEta
                }
              </p>
            )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={
              isActiveVisit
                ? "/dashboard/live-visit"
                : "/dashboard/care"
            }
            className="rounded-xl border border-purple-300 px-5 py-2.5 text-center text-sm font-semibold text-purple-700 transition hover:bg-purple-50"
          >
            {isActiveVisit
              ? "Open Live Update"
              : "View Details"}
          </Link>

          <Link
            href="/dashboard/messages"
            className="rounded-xl bg-purple-600 px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-purple-700"
          >
            Message Caregiver
          </Link>
        </div>
      </div>
    </section>
  );
}

/*
 * ============================================================
 * CAREGIVER CARD
 * ============================================================
 */

function CaregiverDetailsCard({
  caregiverName,
  hasAssignedCaregiver,
  visitStatus,
  isActiveVisit,
}: {
  caregiverName:
    string;

  hasAssignedCaregiver:
    boolean;

  visitStatus:
    string;

  isActiveVisit:
    boolean;
}) {
  return (
    <section
      className={`rounded-3xl border bg-white p-4 shadow-sm sm:p-5 ${
        isActiveVisit
          ? "border-emerald-300"
          : "border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className={`text-xs font-bold uppercase tracking-[0.16em] ${
            isActiveVisit
              ? "text-emerald-700"
              : "text-purple-700"
          }`}
        >
          Your caregiver
        </p>

        {isActiveVisit && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />

              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>

            Live
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl ${
            isActiveVisit
              ? "bg-emerald-100"
              : "bg-purple-100"
          }`}
        >
          👩🏽
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold text-gray-900">
            {
              caregiverName
            }
          </h2>

          <p
            className={`mt-1 text-sm ${
              isActiveVisit
                ? "text-emerald-700"
                : "text-purple-600"
            }`}
          >
            {hasAssignedCaregiver
              ? "Qualified caregiver"
              : "Matching in progress"}
          </p>

          {hasAssignedCaregiver && (
            <p
              className={`mt-1 text-xs font-semibold ${
                isActiveVisit
                  ? "text-emerald-700"
                  : "text-gray-500"
              }`}
            >
              {isActiveVisit
                ? "Currently supporting care"
                : visitStatus}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2">
        <Link
          href={
            isActiveVisit
              ? "/dashboard/live-visit"
              : "/dashboard/caregivers"
          }
          className={`rounded-xl border px-4 py-2.5 text-center text-sm font-semibold ${
            isActiveVisit
              ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              : "border-purple-300 text-purple-700 hover:bg-purple-50"
          }`}
        >
          {isActiveVisit
            ? "Open Live Visit"
            : "View Caregiver"}
        </Link>

        <Link
          href="/dashboard/messages"
          className={`rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-white ${
            isActiveVisit
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-purple-600 hover:bg-purple-700"
          }`}
        >
          Send Message
        </Link>
      </div>
    </section>
  );
}

/*
 * ============================================================
 * SKELETON
 * ============================================================
 */

function CustomerDashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse">
      <div className="h-10 w-64 rounded bg-gray-200" />

      <div className="mt-2 h-4 w-72 rounded bg-gray-200" />

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="space-y-4">
          <div className="h-44 rounded-3xl bg-gray-200" />

          <div className="h-48 rounded-3xl bg-gray-200" />

          <div className="h-40 rounded-3xl bg-gray-200" />
        </div>

        <div className="space-y-4">
          <div className="h-56 rounded-3xl bg-gray-200" />

          <div className="h-56 rounded-3xl bg-gray-200" />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          1,
          2,
          3,
          4,
        ].map(
          (
            item
          ) => (
            <div
              key={
                item
              }
              className="h-24 rounded-2xl bg-gray-200"
            />
          )
        )}
      </div>
    </div>
  );
}

/*
 * ============================================================
 * COMPACT STATUS
 * ============================================================
 */

function CompactStatus({
  label,
  value,
  active =
    false,
}: {
  label:
    string;

  value:
    string;

  active?:
    boolean;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${
        active
          ? "border-emerald-200 bg-emerald-50"
          : "border-purple-200 bg-purple-50"
      }`}
    >
      {active && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />

          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      )}

      <span className="text-[11px] font-semibold text-gray-500">
        {
          label
        }
      </span>

      <span
        className={`text-xs font-bold ${
          active
            ? "text-emerald-700"
            : "text-purple-700"
        }`}
      >
        {
          value
        }
      </span>
    </div>
  );
}

/*
 * ============================================================
 * QUICK ACTION
 * ============================================================
 *
 * Can now be either:
 *
 * Link
 * OR
 * callback button.
 *
 * Book Care uses callback mode.
 * ============================================================
 */

function QuickAction({
  href,
  onClick,
  icon,
  title,
  detail,
  disabled =
    false,
}: {
  href?:
    string;

  onClick?:
    () => void;

  icon:
    string;

  title:
    string;

  detail:
    string;

  disabled?:
    boolean;
}) {
  const content = (
    <>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-base font-bold text-purple-700">
        {
          icon
        }
      </div>

      <p className="mt-3 font-bold text-gray-900">
        {
          title
        }
      </p>

      <p className="mt-1 text-xs leading-relaxed text-gray-500">
        {
          detail
        }
      </p>
    </>
  );

  const classes =
    "block w-full rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-purple-300 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-60";

  if (
    onClick
  ) {
    return (
      <button
        type="button"
        onClick={
          onClick
        }
        disabled={
          disabled
        }
        className={
          classes
        }
      >
        {
          content
        }
      </button>
    );
  }

  return (
    <Link
      href={
        href ||
        "#"
      }
      className={
        classes
      }
    >
      {
        content
      }
    </Link>
  );
}

/*
 * ============================================================
 * SECTION HEADING
 * ============================================================
 */

function SectionHeading({
  title,
  subtitle,
}: {
  title:
    string;

  subtitle:
    string;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">
        {
          title
        }
      </h2>

      <p className="mt-1 text-sm text-gray-500">
        {
          subtitle
        }
      </p>
    </div>
  );
}

/*
 * ============================================================
 * STATUS BADGE
 * ============================================================
 */

function StatusBadge({
  label,
  active =
    false,
}: {
  label:
    string;

  active?:
    boolean;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
        active
          ? "bg-emerald-100 text-emerald-700"
          : "bg-purple-100 text-purple-700"
      }`}
    >
      {
        label
      }
    </span>
  );
}

/*
 * ============================================================
 * DETAIL ROW
 * ============================================================
 */

function DetailRow({
  label,
  value,
  active =
    false,
}: {
  label:
    string;

  value:
    string;

  active?:
    boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-gray-500">
        {
          label
        }
      </span>

      <span
        className={`max-w-[60%] text-right text-sm font-semibold ${
          active
            ? "text-emerald-700"
            : "text-gray-900"
        }`}
      >
        {
          value
        }
      </span>
    </div>
  );
}

/*
 * ============================================================
 * ACTIVITY ITEM
 * ============================================================
 */

function ActivityItem({
  icon,
  title,
  detail,
  active =
    false,
}: {
  icon:
    string;

  title:
    string;

  detail:
    string;

  active?:
    boolean;
}) {
  return (
    <div
      className={`flex gap-3 rounded-2xl border p-3 ${
        active
          ? "border-emerald-200 bg-emerald-50"
          : "border-gray-100 bg-white"
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          active
            ? "bg-white text-emerald-700"
            : "bg-purple-50 text-purple-700"
        }`}
      >
        {
          icon
        }
      </div>

      <div>
        <p className="text-sm font-bold text-gray-900">
          {
            title
          }
        </p>

        <p className="mt-1 text-xs text-gray-500">
          {
            detail
          }
        </p>
      </div>
    </div>
  );
}

/*
 * ============================================================
 * CUSTOMER NAME
 * ============================================================
 */

function getCustomerFirstName(
  user:
    User | null,

  booking:
    BookingDraft
) {
  const metadata =
    user?.user_metadata ||
    {};

  const name =
    metadata.first_name ||
    metadata.firstName ||
    metadata.given_name ||
    booking.firstName ||
    "";

  if (
    typeof name ===
      "string" &&
    name.trim()
  ) {
    return formatName(
      name
    );
  }

  const emailName =
    user?.email?.split(
      "@"
    )[0] ||
    booking.email?.split(
      "@"
    )[0] ||
    "";

  return formatName(
    emailName.split(
      /[._-]/
    )[0]
  );
}

/*
 * ============================================================
 * METADATA STRING
 * ============================================================
 */

function getMetadataString(
  metadata:
    Record<
      string,
      unknown
    >,

  keys:
    string[]
) {
  for (
    const key of
    keys
  ) {
    const value =
      metadata[
        key
      ];

    if (
      typeof value ===
        "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return "";
}

/*
 * ============================================================
 * VISIT STATUS
 * ============================================================
 */

function isFutureOrCurrentHistoryVisit(
  value:
    string | null
) {
  if (
    !value
  ) {
    return false;
  }

  const date =
    new Date(
      value
    );

  return (
    !Number.isNaN(
      date.getTime()
    ) &&
    date.getTime() >=
      Date.now()
  );
}

function getCustomerActivityTime(
  visit:
    CustomerVisitHistoryItem
) {
  const value =
    visit.paymentCreatedAt ||
    visit.startDatetime ||
    "";

  const date =
    new Date(
      value
    );

  return Number.isNaN(
    date.getTime()
  )
    ? 0
    : date.getTime();
}

function formatHistoryVisitWindow(
  startValue:
    string | null,
  endValue:
    string | null
) {
  if (
    !startValue
  ) {
    return "Scheduled care";
  }

  const start =
    new Date(
      startValue
    );

  const end =
    endValue
      ? new Date(
          endValue
        )
      : null;

  if (
    Number.isNaN(
      start.getTime()
    )
  ) {
    return startValue;
  }

  const dateFormatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        month:
          "short",
        day:
          "numeric",
        year:
          "numeric",
        timeZone:
          "America/Toronto",
      }
    );

  const timeFormatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        hour:
          "numeric",
        minute:
          "2-digit",
        timeZone:
          "America/Toronto",
      }
    );

  return end &&
    !Number.isNaN(
      end.getTime()
    )
    ? `${dateFormatter.format(
        start
      )} · ${timeFormatter.format(
        start
      )} – ${timeFormatter.format(
        end
      )}`
    : `${dateFormatter.format(
        start
      )} · ${timeFormatter.format(
        start
      )}`;
}

function mapCanonicalVisitStatus(
  status:
    CanonicalDashboardVisit["status"]
) {
  if (
    status ===
    "in_progress"
  ) {
    return "In Progress";
  }

  if (
    status ===
    "completed"
  ) {
    return "Completed";
  }

  if (
    status ===
    "cancelled"
  ) {
    return "Cancelled";
  }

  return "Scheduled";
}

function formatCanonicalVisitWindow(
  startDatetime:
    string,
  endDatetime:
    string
) {
  const start =
    new Date(
      startDatetime
    );

  const end =
    new Date(
      endDatetime
    );

  if (
    Number.isNaN(
      start.getTime()
    ) ||
    Number.isNaN(
      end.getTime()
    )
  ) {
    return "Scheduled visit";
  }

  const dateLabel =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        weekday:
          "short",
        month:
          "short",
        day:
          "numeric",
        year:
          "numeric",
        timeZone:
          "America/Toronto",
      }
    ).format(
      start
    );

  const timeFormatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        hour:
          "numeric",
        minute:
          "2-digit",
        timeZone:
          "America/Toronto",
      }
    );

  return `${dateLabel} · ${timeFormatter.format(
    start
  )} – ${timeFormatter.format(
    end
  )}`;
}

function getVisitStatusFromRequest(
  status?:
    BookingDraft["requestStatus"]
) {
  switch (
    status
  ) {
    case "matching":
      return "Matching";

    case "caregiver_accepted":
      return "Accepted";

    case "payment_processing":
      return "Payment processing";

    case "confirmed":
      return "Scheduled";

    case "payment_action_required":
      return "Payment action required";

    case "cancelled":
      return "Cancelled";

    default:
      return "Scheduled";
  }
}

/*
 * ============================================================
 * DATE
 * ============================================================
 */

function formatCareDate(
  dateValue:
    string,

  startTime?:
    string,

  endTime?:
    string
) {
  const date =
    new Date(
      `${dateValue}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return dateValue;
  }

  const formattedDate =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        weekday:
          "short",

        month:
          "short",

        day:
          "numeric",

        year:
          "numeric",
      }
    ).format(
      date
    );

  const timeRange =
    [
      startTime,
      endTime,
    ]
      .filter(
        (
          value
        ): value is string =>
          Boolean(
            value
          )
      )
      .map(
        formatDisplayTime
      )
      .join(
        " – "
      );

  return timeRange
    ? `${formattedDate} · ${timeRange}`
    : formattedDate;
}

function formatDisplayTime(
  value:
    string
) {
  const [
    hourText,
    minute =
      "00",
  ] =
    value.split(
      ":"
    );

  const hour =
    Number(
      hourText
    );

  if (
    Number.isNaN(
      hour
    )
  ) {
    return value;
  }

  return `${hour % 12 || 12}:${minute} ${
    hour >=
    12
      ? "PM"
      : "AM"
  }`;
}

function formatDateTime(
  value:
    string
) {
  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      month:
        "short",

      day:
        "numeric",

      hour:
        "numeric",

      minute:
        "2-digit",
    }
  ).format(
    date
  );
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
