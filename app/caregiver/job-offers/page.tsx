"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import DashboardLayout from "../../../components/DashboardLayout";

import {
  type CaregiverJobOffer,
  getOfferSecondsRemaining,
  loadMyCaregiverJobOffers,
  respondToCaregiverJobOffer,
} from "../../../lib/caregiverOfferPersistence";

/*
 * ============================================================
 * CAREGIVER JOB OFFERS
 * ============================================================
 *
 * Canonical Carerity workflow:
 *
 * WAVE 1
 * - #1 and #2 are normally invited together.
 * - Caregivers choose Show Interest or Decline.
 * - Showing interest does NOT confirm the booking.
 * - If both show interest early, both can be presented to the
 *   customer immediately.
 * - If only one shows interest, Carerity waits until the
 *   30-minute Wave 1 deadline before presenting the sole match.
 *
 * WAVE 2
 * - If required, #3 and #4 are invited together.
 * - Wave 2 has its own 30-minute response window.
 * - Same Show Interest / Decline rules apply.
 *
 * CUSTOMER
 * - Customer chooses between two interested caregivers when
 *   two are presented.
 * - If only one caregiver is presented, the customer can select
 *   or decline that caregiver.
 *
 * Showing interest never means "first acceptance wins".
 *
 * The database remains authoritative.
 * ============================================================
 */

export default function CaregiverJobOffersPage() {
  const [
    offers,
    setOffers,
  ] =
    useState<
      CaregiverJobOffer[]
    >([]);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  const [
    actionOfferId,
    setActionOfferId,
  ] =
    useState("");

  const [
    now,
    setNow,
  ] =
    useState(
      Date.now()
    );

  /*
   * ============================================================
   * LOAD OFFERS
   * ============================================================
   */

  const loadOffers =
    useCallback(
      async () => {
        const result =
          await loadMyCaregiverJobOffers();

        if (
          !result.success
        ) {
          setOffers(
            []
          );

          setErrorMessage(
            result.error ||
              "Unable to load your care opportunities."
          );

          setIsLoading(
            false
          );

          return;
        }

        setOffers(
          result.offers
        );

        setErrorMessage(
          ""
        );

        setIsLoading(
          false
        );
      },
      []
    );

  /*
   * ============================================================
   * INITIAL LOAD
   * ============================================================
   */

  useEffect(() => {
    void loadOffers();
  }, [
    loadOffers,
  ]);

  /*
   * ============================================================
   * COUNTDOWN + POLLING
   * ============================================================
   *
   * 1 second:
   * - updates countdown display.
   *
   * 15 seconds:
   * - refreshes database state.
   *
   * The browser countdown is presentation only.
   * Database/RPC validation remains authoritative.
   * ============================================================
   */

  useEffect(() => {
    const clock =
      window.setInterval(
        () => {
          setNow(
            Date.now()
          );
        },
        1000
      );

    const refresh =
      window.setInterval(
        () => {
          void loadOffers();
        },
        15_000
      );

    return () => {
      window.clearInterval(
        clock
      );

      window.clearInterval(
        refresh
      );
    };
  }, [
    loadOffers,
  ]);

  /*
   * ============================================================
   * OPEN INVITATIONS
   * ============================================================
   */

  const pendingOffers =
    useMemo(
      () =>
        offers.filter(
          (
            offer
          ) =>
            offer.status ===
              "pending" &&
            getOfferSecondsRemaining(
              offer,
              now
            ) >
              0
        ),
      [
        offers,
        now,
      ]
    );

  /*
   * ============================================================
   * HISTORY
   * ============================================================
   */

  const historyOffers =
    useMemo(
      () =>
        offers.filter(
          (
            offer
          ) =>
            !pendingOffers.some(
              (
                pending
              ) =>
                pending.id ===
                offer.id
            )
        ),
      [
        offers,
        pendingOffers,
      ]
    );

  /*
   * ============================================================
   * CAREGIVER RESPONSE
   * ============================================================
   */

  async function handleResponse(
    offer:
      CaregiverJobOffer,

    response:
      | "interest"
      | "decline"
  ) {
    if (
      actionOfferId
    ) {
      return;
    }

    /*
     * Browser-side expiry guard.
     *
     * The database/RPC must still validate the true deadline.
     */
    if (
      getOfferSecondsRemaining(
        offer,
        Date.now()
      ) <=
      0
    ) {
      setErrorMessage(
        "This invitation's response window has closed."
      );

      await loadOffers();

      return;
    }

    setActionOfferId(
      offer.id
    );

    setErrorMessage(
      ""
    );

    setSuccessMessage(
      ""
    );

    try {
      const result =
        await respondToCaregiverJobOffer(
          offer.id,
          response
        );

      if (
        !result.success
      ) {
        setErrorMessage(
          result.error ||
            "Unable to update this care opportunity."
        );

        /*
         * Reload because the most likely reason for failure is
         * that the opportunity changed or expired.
         */
        await loadOffers();

        return;
      }

      if (
        response ===
        "interest"
      ) {
        setSuccessMessage(
          "Interest received. You are available for this care opportunity. This is not yet a confirmed booking — Carerity will update you if the customer selects you."
        );
      } else {
        setSuccessMessage(
          "You declined this care opportunity. You remain available for future suitable matches."
        );
      }

      await loadOffers();
    } catch (
      error
    ) {
      console.error(
        "Unable to respond to caregiver opportunity:",
        error
      );

      setErrorMessage(
        "We couldn't save your response. Please try again."
      );
    } finally {
      setActionOfferId(
        ""
      );
    }
  }

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <DashboardLayout
      activeItem="Job Offers"
      role="caregiver"
      notificationCount={
        pendingOffers.length
      }
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <p className="text-sm font-bold text-emerald-700">
            Caregiver Workspace
          </p>

          <h1 className="mt-1 text-3xl font-bold text-gray-950 sm:text-4xl">
            Care Opportunities
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500 sm:text-base">
            Review suitable care
            opportunities and tell
            Carerity whether you are
            interested.
          </p>
        </header>

        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="font-bold text-emerald-900">
            You may be one of the
            strongest suitable fits
          </p>

          <p className="mt-1 text-sm leading-relaxed text-emerald-800">
            When Carerity sends you an
            invitation, our matching
            process has identified you
            as a suitable caregiver for
            that visit. Review the care
            details and choose{" "}
            <strong>
              Show Interest
            </strong>{" "}
            or{" "}
            <strong>
              Decline
            </strong>
            . Showing interest tells us
            you are available and willing
            to provide the care. It does
            not by itself confirm the
            booking.
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
          >
            {
              errorMessage
            }
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
          >
            {
              successMessage
            }
          </div>
        )}

        {isLoading ? (
          <JobOffersSkeleton />
        ) : (
          <>
            <section>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    New invitations
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Respond before the
                    interest window
                    closes.
                  </p>
                </div>

                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">
                  {
                    pendingOffers.length
                  }{" "}
                  open
                </span>
              </div>

              {pendingOffers.length ===
              0 ? (
                <EmptyOffers />
              ) : (
                <div className="mt-4 space-y-4">
                  {pendingOffers.map(
                    (
                      offer
                    ) => (
                      <PendingOfferCard
                        key={
                          offer.id
                        }
                        offer={
                          offer
                        }
                        secondsRemaining={
                          getOfferSecondsRemaining(
                            offer,
                            now
                          )
                        }
                        busy={
                          actionOfferId ===
                          offer.id
                        }
                        onInterest={() =>
                          handleResponse(
                            offer,
                            "interest"
                          )
                        }
                        onDecline={() =>
                          handleResponse(
                            offer,
                            "decline"
                          )
                        }
                      />
                    )
                  )}
                </div>
              )}
            </section>

            <section className="mt-8">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Opportunity history
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Previous invitations
                    and their current
                    status.
                  </p>
                </div>

                {historyOffers.length >
                  0 && (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-bold text-gray-600">
                    {
                      historyOffers.length
                    }
                  </span>
                )}
              </div>

              {historyOffers.length ===
              0 ? (
                <div className="mt-4 rounded-3xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
                  No previous care
                  opportunities yet.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {historyOffers.map(
                    (
                      offer
                    ) => (
                      <HistoryOfferCard
                        key={
                          offer.id
                        }
                        offer={
                          offer
                        }
                        now={
                          now
                        }
                      />
                    )
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

/*
 * ============================================================
 * OPEN OFFER CARD
 * ============================================================
 */

function PendingOfferCard({
  offer,
  secondsRemaining,
  busy,
  onInterest,
  onDecline,
}: {
  offer:
    CaregiverJobOffer;

  secondsRemaining:
    number;

  busy:
    boolean;

  onInterest:
    () => void;

  onDecline:
    () => void;
}) {
  const finalFive =
    secondsRemaining <=
      300 &&
    secondsRemaining >
      0;

  const invitationLabel =
    offer.wave ===
      1
      ? "Priority match"
      : offer.wave ===
          2
        ? "Wave 2 match"
        : "Care match";

  return (
    <article className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
      <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                Care invitation
              </span>

              <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
                {
                  invitationLabel
                }
              </span>
            </div>

            <h3 className="mt-3 text-2xl font-bold text-gray-950">
              You&apos;ve been matched
              to a care opportunity
            </h3>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
              Review the visit
              information below and let
              us know whether you are
              available and interested.
            </p>
          </div>

          <div
            className={`rounded-2xl border px-4 py-3 text-center ${
              finalFive
                ? "border-red-200 bg-red-50"
                : "border-emerald-200 bg-emerald-50"
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
              {finalFive
                ? "5 minutes or less"
                : "Interest window"}
            </p>

            <p
              className={`mt-1 text-2xl font-black tabular-nums ${
                finalFive
                  ? "text-red-700"
                  : "text-emerald-700"
              }`}
            >
              {
                formatOfferCountdown(
                  secondsRemaining
                )
              }
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <OfferDetail
            label="Schedule"
            value={
              formatSchedule(
                offer
              )
            }
          />

          <OfferDetail
            label="Care type"
            value={
              formatCareType(
                offer
              )
            }
          />

          <OfferDetail
            label="Location"
            value={
              formatLocation(
                offer
              )
            }
          />

          <OfferDetail
            label="Distance"
            value={
              formatDistance(
                offer.distance_km
              )
            }
          />
        </div>

        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-bold text-gray-900">
            What happens if you show
            interest?
          </p>

          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            Carerity records that you
            are available and willing to
            provide this care. Depending
            on the number of interested
            caregivers, the customer may
            be shown you as their match
            or may choose between two
            interested caregivers.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={
              onDecline
            }
            disabled={
              busy
            }
            className="min-h-[52px] rounded-xl border border-gray-300 bg-white px-5 py-3 font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy
              ? "Saving..."
              : "Decline"}
          </button>

          <button
            type="button"
            onClick={
              onInterest
            }
            disabled={
              busy
            }
            className="min-h-[52px] rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            {busy
              ? "Saving..."
              : "Show Interest"}
          </button>
        </div>
      </div>
    </article>
  );
}

/*
 * ============================================================
 * HISTORY CARD
 * ============================================================
 */

function HistoryOfferCard({
  offer,
  now,
}: {
  offer:
    CaregiverJobOffer;

  now:
    number;
}) {
  const locallyExpiredPending =
    offer.status ===
      "pending" &&
    getOfferSecondsRemaining(
      offer,
      now
    ) <=
      0;

  const presentation =
    locallyExpiredPending
      ? {
          label:
            "Response window closed",

          classes:
            "bg-amber-100 text-amber-700",
        }
      : getStatusPresentation(
          offer.status
        );

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-gray-900">
              Care opportunity
            </p>

            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${presentation.classes}`}
            >
              {
                presentation.label
              }
            </span>
          </div>

          <p className="mt-1 text-xs text-gray-500">
            {formatSchedule(
              offer
            )}

            {" · "}

            {formatLocation(
              offer
            )}
          </p>

          {offer.status ===
            "interested" && (
            <p className="mt-2 text-xs font-medium text-emerald-700">
              Your interest has been
              recorded. This is not a
              confirmed booking yet.
            </p>
          )}

          {offer.status ===
            "selected" && (
            <p className="mt-2 text-xs font-bold text-emerald-800">
              The customer selected you
              for this care request.
            </p>
          )}

          {offer.status ===
            "not_selected" && (
            <p className="mt-2 text-xs text-gray-500">
              Another interested
              caregiver was selected.
            </p>
          )}
        </div>

        {typeof offer.distance_km ===
          "number" && (
          <p className="text-xs font-semibold text-gray-500">
            {
              formatDistance(
                offer.distance_km
              )
            }
          </p>
        )}
      </div>
    </article>
  );
}

/*
 * ============================================================
 * EMPTY STATE
 * ============================================================
 */

function EmptyOffers() {
  return (
    <div className="mt-4 rounded-3xl border border-dashed border-emerald-300 bg-emerald-50/50 p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-xl">
        ✓
      </div>

      <h3 className="mt-4 text-xl font-bold text-gray-900">
        No open invitations right now
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-600">
        When Carerity identifies you as
        a suitable fit for a new care
        request, the invitation will
        appear here.
      </p>
    </div>
  );
}

/*
 * ============================================================
 * DETAIL TILE
 * ============================================================
 */

function OfferDetail({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
        {
          label
        }
      </p>

      <p className="mt-1 text-sm font-bold text-gray-900">
        {
          value
        }
      </p>
    </div>
  );
}

/*
 * ============================================================
 * LOADING
 * ============================================================
 */

function JobOffersSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-5 w-40 rounded bg-gray-200" />

      <div className="mt-4 h-72 rounded-3xl bg-gray-200" />

      <div className="mt-8 h-5 w-32 rounded bg-gray-200" />

      <div className="mt-4 h-24 rounded-2xl bg-gray-100" />
    </div>
  );
}

/*
 * ============================================================
 * COUNTDOWN
 * ============================================================
 *
 * Deliberately kept locally.
 *
 * The persistence layer should handle persistence/RPC logic,
 * not UI formatting.
 * ============================================================
 */

function formatOfferCountdown(
  seconds:
    number
) {
  const safe =
    Math.max(
      0,
      Math.floor(
        seconds
      )
    );

  const minutes =
    Math.floor(
      safe /
      60
    );

  const remainingSeconds =
    safe %
    60;

  return `${minutes}:${String(
    remainingSeconds
  ).padStart(
    2,
    "0"
  )}`;
}

/*
 * ============================================================
 * FORMATTERS
 * ============================================================
 */

function formatLocation(
  offer:
    CaregiverJobOffer
) {
  return (
    [
      offer.care_city,
      offer.care_province,
    ]
      .filter(
        (
          value
        ) =>
          Boolean(
            value
          )
      )
      .join(
        ", "
      ) ||
    "Care location"
  );
}

function formatCareType(
  offer:
    CaregiverJobOffer
) {
  const scheduleType =
    offer.schedule_type?.trim();

  if (
    scheduleType
  ) {
    return scheduleType;
  }

  return "Care visit";
}

function formatDistance(
  value:
    number |
    null |
    undefined
) {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value
    )
  ) {
    return "Not available";
  }

  return `${value.toFixed(
    1
  )} km`;
}

function formatSchedule(
  offer:
    CaregiverJobOffer
) {
  const time =
    offer.start_time &&
    offer.end_time
      ? `${formatClockTime(
          offer.start_time
        )} – ${formatClockTime(
          offer.end_time
        )}`
      : "";

  const scheduleType =
    (
      offer.schedule_type ||
      ""
    )
      .trim()
      .toLowerCase();

  const isRecurring =
    scheduleType.includes(
      "recurring"
    );

  if (
    isRecurring
  ) {
    const days =
      offer.recurring_days &&
      offer.recurring_days.length >
        0
        ? offer.recurring_days.join(
            ", "
          )
        : "Recurring";

    return [
      days,
      time,
    ]
      .filter(
        Boolean
      )
      .join(
        " · "
      );
  }

  return [
    formatCareDate(
      offer.care_date
    ),
    time,
  ]
    .filter(
      Boolean
    )
    .join(
      " · "
    ) ||
    "Schedule pending";
}

function formatCareDate(
  value:
    string |
    null |
    undefined
) {
  if (
    !value
  ) {
    return "";
  }

  const date =
    new Date(
      `${value}T00:00:00`
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
}

function formatClockTime(
  value:
    string
) {
  const match =
    value.match(
      /^(\d{1,2}):(\d{2})/
    );

  if (
    !match
  ) {
    return value;
  }

  const hours =
    Number(
      match[1]
    );

  const minutes =
    Number(
      match[2]
    );

  if (
    !Number.isFinite(
      hours
    ) ||
    !Number.isFinite(
      minutes
    )
  ) {
    return value;
  }

  const suffix =
    hours >=
      12
      ? "PM"
      : "AM";

  const displayHours =
    hours %
      12 ||
    12;

  return `${displayHours}:${String(
    minutes
  ).padStart(
    2,
    "0"
  )} ${suffix}`;
}

/*
 * ============================================================
 * STATUS PRESENTATION
 * ============================================================
 */

function getStatusPresentation(
  status:
    CaregiverJobOffer["status"]
) {
  switch (
    status
  ) {
    case "interested":
      return {
        label:
          "Interest submitted",

        classes:
          "bg-emerald-100 text-emerald-700",
      };

    case "declined":
      return {
        label:
          "Declined",

        classes:
          "bg-gray-100 text-gray-600",
      };

    case "expired":
      return {
        label:
          "Expired",

        classes:
          "bg-amber-100 text-amber-700",
      };

    case "presented":
      return {
        label:
          "Presented to customer",

        classes:
          "bg-blue-100 text-blue-700",
      };

    case "selected":
      return {
        label:
          "Selected",

        classes:
          "bg-emerald-100 text-emerald-800",
      };

    case "not_selected":
      return {
        label:
          "Another caregiver selected",

        classes:
          "bg-gray-100 text-gray-600",
      };

    case "withdrawn":
      return {
        label:
          "No longer available",

        classes:
          "bg-gray-100 text-gray-600",
      };

    case "queued":
      return {
        label:
          "Standby",

        classes:
          "bg-purple-100 text-purple-700",
      };

    case "pending":
      return {
        label:
          "Open",

        classes:
          "bg-emerald-100 text-emerald-700",
      };

    default:
      return {
        label:
          "Updated",

        classes:
          "bg-gray-100 text-gray-600",
      };
  }
}
