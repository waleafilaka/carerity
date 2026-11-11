"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  BookingDraft,
  getBookingDraft,
  saveBookingDraft,
} from "../../../lib/bookingDraft";

import {
  CaregiverMatchingProfile,
} from "../../../lib/matchingTypes";

import {
  MatchingPersistenceDiagnostics,
  runCaregiverMatchingForBooking,
} from "../../../lib/caregiverMatchingPersistence";

import {
  getCareContextLabel,
  getCareNeedLabel,
} from "../../../lib/careTaxonomy";

import {
  createCaregiverOfferSessionFromMatchRun,
} from "../../../lib/caregiverOfferPersistence";

type MatchingResultState =
  | {
      status:
        "idle";
    }
  | {
      status:
        "loading";
    }
  | {
      status:
        "success";

      request:
        unknown;

      caregivers:
        CaregiverMatchingProfile[];

      matchRun:
        any;

      diagnostics:
        MatchingPersistenceDiagnostics;
    }
  | {
      status:
        "error";

      error:
        string;
    };

export default function MatchingTestPage() {
  const [
    booking,
    setBooking,
  ] =
    useState<BookingDraft>(
      {}
    );

  const [
    result,
    setResult,
  ] =
    useState<MatchingResultState>({
      status:
        "idle",
    });

  const [
    outreachState,
    setOutreachState,
  ] =
    useState<
      | {
          status: "idle";
        }
      | {
          status: "starting";
        }
      | {
          status: "success";
          sessionId: string;
          firstPairDeadline: string;
          automatedDeadlineAt: string;
        }
      | {
          status: "error";
          error: string;
        }
    >({
      status: "idle",
    });

  useEffect(() => {
    setBooking(
      getBookingDraft()
    );

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

    return () => {
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

  const bookingSummary =
    useMemo(
      () => {
        const recipient =
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
          "Not set";

        const location =
          [
            booking.address,
            booking.unit,
            booking.city,
            booking.province,
            booking.postalCode,
          ]
            .filter(
              Boolean
            )
            .join(
              ", "
            ) ||
          "Not set";

        const coordinates =
          typeof booking.latitude ===
            "number" &&
          typeof booking.longitude ===
            "number"
            ? `${booking.latitude.toFixed(
                5
              )}, ${booking.longitude.toFixed(
                5
              )}`
            : "Not set";

        const needs =
          booking.selectedNeeds ||
          [];

        const context =
          booking.selectedContext ||
          [];

        const language =
          [
            booking.primaryLanguage,
            booking.secondaryLanguage,
          ]
            .filter(
              Boolean
            )
            .join(
              " + "
            ) ||
          "Not set";

        const schedule =
          [
            booking.scheduleType,
            booking.careDate ||
              booking.recurringStartDate,
            booking.startTime &&
            booking.endTime
              ? `${booking.startTime} – ${booking.endTime}`
              : undefined,
          ]
            .filter(
              Boolean
            )
            .join(
              " · "
            ) ||
          "Not set";

        return {
          recipient,
          location,
          coordinates,
          needs,
          context,
          language,
          schedule,
        };
      },
      [
        booking,
      ]
    );

  async function handleRunMatching() {
    if (
      result.status ===
      "loading"
    ) {
      return;
    }

    setResult({
      status:
        "loading",
    });

    try {
      const matchingResult =
        await runCaregiverMatchingForBooking(
          booking
        );

      if (
        !matchingResult.success
      ) {
        setResult({
          status:
            "error",

          error:
            matchingResult.error,
        });

        return;
      }

      setResult({
        status:
          "success",

        request:
          matchingResult.request,

        caregivers:
          matchingResult.caregivers,

        matchRun:
          matchingResult.matchRun,

        diagnostics:
          matchingResult.diagnostics,
      });
    } catch (
      error
    ) {
      console.error(
        "Matching test failed:",
        error
      );

      setResult({
        status:
          "error",

        error:
          error instanceof Error
            ? error.message
            : "Unable to run matching.",
      });
    }
  }

  async function handleStartLiveOutreach() {
    if (
      result.status !== "success" ||
      outreachState.status === "starting"
    ) {
      return;
    }

    if (booking.matchingSessionId) {
      setOutreachState({
        status: "error",
        error: "This booking already has an active matching session. Use the existing session instead of creating another one.",
      });
      return;
    }

    setOutreachState({
      status: "starting",
    });

    const bookingReference =
      booking.visitId ||
      booking.stripeSetupSessionId ||
      `CAR-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()}`;

    try {
      const outreachResult =
        await createCaregiverOfferSessionFromMatchRun(
          result.matchRun,
          {
            bookingReference,
            careRecipientName:
              booking.careRecipientName ||
              booking.recipientName ||
              [
                booking.firstName,
                booking.lastName,
              ]
                .filter(Boolean)
                .join(" ") ||
              undefined,
            careCity:
              booking.city,
            careProvince:
              booking.province,
            scheduleType:
              booking.scheduleType,
            careDate:
              booking.careDate ||
              booking.recurringStartDate,
            startTime:
              booking.startTime,
            endTime:
              booking.endTime,
            recurringDays:
              booking.recurringDays,
          }
        );

      if (!outreachResult.success) {
        setOutreachState({
          status: "error",
          error: outreachResult.error,
        });
        return;
      }

      const nextBooking =
        saveBookingDraft({
          matchingSessionId:
            outreachResult.offerSessionId,
          offerStatus:
            "awaiting_first_pair",
          automatedMatchingDeadlineAt:
            outreachResult.automatedDeadlineAt,
          requestStatus:
            "matching",
        });

      setBooking(nextBooking);

      setOutreachState({
        status: "success",
        sessionId:
          outreachResult.offerSessionId,
        firstPairDeadline:
          outreachResult.firstPairDeadline,
        automatedDeadlineAt:
          outreachResult.automatedDeadlineAt,
      });
    } catch (error) {
      setOutreachState({
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Unable to start caregiver outreach.",
      });
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-5 text-gray-900 sm:px-6">
      <div className="mx-auto max-w-7xl">
        {/* =====================================================
            HEADER
        ====================================================== */}

        <header className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-purple-700">
              Carerity Admin
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              Matching Test
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Test the current care request, inspect ranked caregivers, and start the controlled live interest workflow when ready.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              ← Admin
            </Link>

            <Link
              href="/dashboard/care-profile"
              className="rounded-xl border border-purple-300 bg-white px-4 py-2.5 text-sm font-semibold text-purple-700 hover:bg-purple-50"
            >
              Customer Care Profile
            </Link>
          </div>
        </header>

        {/* =====================================================
            MAIN MATCHING CONSOLE
        ====================================================== */}

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          {/* REQUEST */}

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                  Current request
                </p>

                <h2 className="mt-1 text-xl font-bold text-gray-900">
                  {bookingSummary.recipient}
                </h2>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  booking.latitude !==
                    undefined &&
                  booking.longitude !==
                    undefined
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {booking.latitude !==
                  undefined &&
                booking.longitude !==
                  undefined
                  ? "Location verified"
                  : "Location missing"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CompactDetail
                label="Care location"
                value={
                  bookingSummary.location
                }
              />

              <CompactDetail
                label="Coordinates"
                value={
                  bookingSummary.coordinates
                }
              />

              <CompactDetail
                label="Language"
                value={
                  bookingSummary.language
                }
              />

              <CompactDetail
                label="Schedule"
                value={
                  bookingSummary.schedule
                }
              />
            </div>

            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                Care needs
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                {bookingSummary
                  .needs
                  .length >
                0 ? (
                  bookingSummary.needs.map(
                    (
                      item
                    ) => (
                      <SignalChip
                        key={
                          item
                        }
                        value={
                          getCareNeedLabel(
                            item
                          )
                        }
                      />
                    )
                  )
                ) : (
                  <EmptyText>
                    None selected
                  </EmptyText>
                )}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                Care context
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                {bookingSummary
                  .context
                  .length >
                0 ? (
                  bookingSummary.context.map(
                    (
                      item
                    ) => (
                      <SignalChip
                        key={
                          item
                        }
                        value={
                          getCareContextLabel(
                            item
                          )
                        }
                        subtle
                      />
                    )
                  )
                ) : (
                  <EmptyText>
                    None selected
                  </EmptyText>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={
                handleRunMatching
              }
              disabled={
                result.status ===
                "loading"
              }
              className="mt-5 w-full rounded-xl bg-purple-600 px-5 py-3.5 font-bold text-white shadow-sm transition hover:bg-purple-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-purple-300"
            >
              {result.status ===
              "loading"
                ? "Running Matching..."
                : result.status ===
                    "success"
                  ? "Run Matching Again"
                  : "Run Matching"}
            </button>

            {result.status === "success" && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-emerald-900">
                      Live caregiver outreach
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                      Invite ranked #1 and #2 to Show Interest for the first 30-minute wave.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartLiveOutreach}
                    disabled={
                      outreachState.status === "starting" ||
                      Boolean(booking.matchingSessionId)
                    }
                    className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                  >
                    {outreachState.status === "starting"
                      ? "Starting Outreach..."
                      : booking.matchingSessionId
                        ? "Outreach Already Active"
                        : "Start Live Outreach"}
                  </button>
                </div>

                {outreachState.status === "error" && (
                  <p className="mt-3 rounded-xl border border-red-200 bg-white p-3 text-xs font-semibold text-red-700">
                    {outreachState.error}
                  </p>
                )}

                {(outreachState.status === "success" ||
                  booking.matchingSessionId) && (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3">
                    <p className="text-xs font-bold text-gray-900">
                      Matching session active
                    </p>
                    <p className="mt-1 break-all text-[11px] text-gray-500">
                      {outreachState.status === "success"
                        ? outreachState.sessionId
                        : booking.matchingSessionId}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href="/caregiver/job-offers"
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800"
                      >
                        Open Caregiver Offers
                      </Link>
                      <Link
                        href="/find-care/matching"
                        className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-800"
                      >
                        Open Customer Matching
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* IMMEDIATE RESULT */}

          <div className="min-h-[400px]">
            {result.status ===
              "idle" && (
              <ReadyPanel />
            )}

            {result.status ===
              "loading" && (
              <MatchingPanelSkeleton />
            )}

            {result.status ===
              "error" && (
              <ErrorState
                error={
                  result.error
                }
              />
            )}

            {result.status ===
              "success" && (
              <ImmediateMatchingResult
                caregivers={
                  result.caregivers
                }
                matchRun={
                  result.matchRun
                }
                diagnostics={
                  result.diagnostics
                }
              />
            )}
          </div>
        </section>

        {/* =====================================================
            RANKED RESULTS
        ====================================================== */}

        {result.status ===
          "success" && (
          <DetailedMatchingResults
            caregivers={
              result.caregivers
            }
            matchRun={
              result.matchRun
            }
          />
        )}
      </div>
    </main>
  );
}

/*
 * ============================================================
 * IMMEDIATE RESULT
 * ============================================================
 */

function ImmediateMatchingResult({
  caregivers,
  matchRun,
  diagnostics,
}: {
  caregivers:
    CaregiverMatchingProfile[];

  matchRun:
    any;

  diagnostics:
    MatchingPersistenceDiagnostics;
}) {
  const candidates =
    extractCandidateArray(
      matchRun
    );

  const outcome =
    extractOutcome(
      matchRun,
      candidates
    );

  const topCandidate =
    candidates[0];

  const evaluatedCount =
    typeof matchRun?.totalCandidates ===
      "number"
      ? matchRun.totalCandidates
      : caregivers.length;

  const eligibleCount =
    typeof matchRun?.eligibleCandidates ===
      "number"
      ? matchRun.eligibleCandidates
      : candidates.filter(
          (
            candidate:
              any
          ) =>
            candidate?.eligibility
              ?.eligible !==
            false
        ).length;

  return (
    <section className="h-full rounded-3xl border border-purple-200 bg-gradient-to-br from-purple-50 via-white to-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-purple-700">
            Matching outcome
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {
              outcome.title
            }
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-600">
            {
              outcome.detail
            }
          </p>
        </div>

        <div className="shrink-0 rounded-2xl border border-purple-200 bg-white px-4 py-3 text-center">
          <p className="text-[11px] font-semibold text-gray-500">
            Eligible
          </p>

          <p className="text-3xl font-black text-purple-700">
            {
              eligibleCount
            }
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <DiagnosticMetric
          label="Approved & matchable"
          value={
            diagnostics
              .databaseEligibleCaregivers
          }
        />

        <DiagnosticMetric
          label="Profile data loaded"
          value={
            diagnostics
              .onboardingDraftsLoaded
          }
        />

        <DiagnosticMetric
          label="Matching profiles"
          value={
            diagnostics
              .matchingProfilesBuilt
          }
        />

        <DiagnosticMetric
          label="Evaluated"
          value={
            evaluatedCount
          }
        />

        <DiagnosticMetric
          label="Eligible"
          value={
            eligibleCount
          }
        />
      </div>

      {diagnostics
        .databaseEligibleCaregivers ===
        0 && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">
            No caregiver rows reached the matching engine
          </p>

          <p className="mt-1 text-xs leading-relaxed text-amber-800">
            No approved and matching-eligible caregiver was returned to this admin matching run.
          </p>
        </div>
      )}

      {diagnostics
          .databaseEligibleCaregivers >
        0 &&
        diagnostics
          .matchingProfilesBuilt ===
          0 && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-900">
              Caregivers loaded but profiles were not built
            </p>

            <p className="mt-1 text-xs leading-relaxed text-amber-800">
              Check caregiver onboarding draft relationships and profile data.
            </p>
          </div>
        )}

      {topCandidate && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            Current best candidate
          </p>

          <CompactCandidate
            candidate={
              topCandidate
            }
          />
        </div>
      )}

      {!topCandidate &&
        caregivers.length >
          0 && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-900">
              Caregivers entered matching, but none ranked
            </p>

            <p className="mt-1 text-xs text-amber-800">
              Inspect the matching-engine eligibility rules rather than the Supabase loader.
            </p>
          </div>
        )}
    </section>
  );
}

function CompactCandidate({
  candidate,
}: {
  candidate:
    any;
}) {
  const caregiver =
    candidate.caregiver ||
    candidate.profile ||
    candidate;

  const name =
    [
      caregiver.firstName,
      caregiver.lastName,
    ]
      .filter(
        Boolean
      )
      .join(
        " "
      ) ||
    caregiver.caregiverNumber ||
    "Caregiver";

  const score =
    getCandidateScore(
      candidate
    );

  const distance =
    getCandidateDistance(
      candidate
    );

  const rank =
    typeof candidate.rank ===
      "number"
      ? candidate.rank
      : 1;

  const availability =
    caregiver.availableForWork ===
    true
      ? "Available"
      : caregiver.availableForWork ===
          false
        ? "Paused"
        : "Unknown";

  const matchedSignals =
    Array.isArray(
      candidate.signals
    )
      ? candidate.signals.filter(
          (
            signal:
              any
          ) =>
            signal?.matched ===
            true
        )
      : [];

  const languageSignals =
    matchedSignals.filter(
      (
        signal:
          any
      ) =>
        signal?.type ===
        "language"
    );

  return (
    <div className="rounded-2xl border border-purple-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-gray-900">
            {
              name
            }
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {caregiver.caregiverNumber ||
              caregiver.caregiverId ||
              "Caregiver record"}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {distance !==
              null && (
              <InfoChip
                label="Distance"
                value={`${distance.toFixed(
                  1
                )} km`}
              />
            )}

            <InfoChip
              label="Availability"
              value={
                availability
              }
            />

            {typeof caregiver.yearsExperience ===
              "number" && (
              <InfoChip
                label="Experience"
                value={`${caregiver.yearsExperience} yrs`}
              />
            )}

            <InfoChip
              label="Rank"
              value={`#${rank}`}
            />
          </div>

          {languageSignals.length >
            0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {languageSignals.map(
                (
                  signal:
                    any
                ) => (
                  <span
                    key={
                      signal.id ||
                      signal.label
                    }
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                  >
                    ✓ Matched ·{" "}
                    {
                      signal.label
                    }
                  </span>
                )
              )}
            </div>
          )}
        </div>

        <ScoreBlock
          score={
            score
          }
          compact
        />
      </div>
    </div>
  );
}

/*
 * ============================================================
 * DETAILED RESULTS
 * ============================================================
 */

function DetailedMatchingResults({
  caregivers,
  matchRun,
}: {
  caregivers:
    CaregiverMatchingProfile[];

  matchRun:
    any;
}) {
  const candidates =
    extractCandidateArray(
      matchRun
    );

  return (
    <section className="mt-5">
      {caregivers.length ===
      0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-6 text-center">
          <p className="text-lg font-bold text-gray-900">
            No ranked candidates
          </p>

          <p className="mt-1 text-sm text-gray-500">
            No eligible caregiver records were available to score.
          </p>
        </div>
      ) : candidates.length ===
        0 ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="font-bold text-amber-900">
            Eligible caregivers loaded, but the engine returned no candidates.
          </p>

          <p className="mt-1 text-sm text-amber-800">
            We will inspect the engine filtering rules next.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Ranked candidates
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Highest suitability first. No assignment is made here.
              </p>
            </div>

            <span className="text-sm font-semibold text-gray-500">
              {
                candidates.length
              }{" "}
              candidate
              {candidates.length ===
              1
                ? ""
                : "s"}
            </span>
          </div>

          <div className="space-y-3">
            {candidates.map(
              (
                candidate:
                  any,
                index:
                  number
              ) => (
                <CandidateCard
                  key={
                    getCandidateKey(
                      candidate,
                      index
                    )
                  }
                  candidate={
                    candidate
                  }
                  rank={
                    index +
                    1
                  }
                />
              )
            )}
          </div>
        </>
      )}

      <div className="mt-5">
        <RawResult
          value={
            matchRun
          }
        />
      </div>
    </section>
  );
}

/*
 * ============================================================
 * CANDIDATE
 * ============================================================
 */

function CandidateCard({
  candidate,
  rank,
}: {
  candidate:
    any;

  rank:
    number;
}) {
  const caregiver =
    candidate.caregiver ||
    candidate.profile ||
    candidate;

  const score =
    getCandidateScore(
      candidate
    );

  const distance =
    getCandidateDistance(
      candidate
    );

  const capabilityScore =
    getNumericValue(
      candidate.score
        ?.capabilityScore,
      candidate.capabilityScore,
      candidate.capabilitiesScore,
      candidate.skillScore,
      candidate.skillsScore
    );

  const contextScore =
    getNumericValue(
      candidate.score
        ?.contextScore,
      candidate.contextScore,
      candidate.careContextScore
    );

  const availabilityScore =
    getNumericValue(
      candidate.score
        ?.availabilityScore,
      candidate.availabilityScore,
      candidate.scheduleScore
    );

  const languageScore =
    getNumericValue(
      candidate.score
        ?.languageScore,
      candidate.languageScore
    );

  const proximityScore =
    getNumericValue(
      candidate.score
        ?.locationScore,
      candidate.proximityScore,
      candidate.distanceScore
    );

  const caregiverName =
    [
      caregiver.firstName,
      caregiver.lastName,
    ]
      .filter(
        Boolean
      )
      .join(
        " "
      ) ||
    caregiver.caregiverNumber ||
    caregiver.caregiverId ||
    "Caregiver";

  const capabilityMatches =
    getStringArray(
      candidate.matchedCapabilities,
      candidate.capabilityMatches,
      candidate.matchedSkills,
      Array.isArray(
        candidate.signals
      )
        ? candidate.signals.filter(
            (
              signal:
                any
            ) =>
              signal?.matched ===
                true &&
              (
                signal?.type ===
                  "care_need" ||
                signal?.type ===
                  "care_context"
              )
          )
        : []
    );

  const missingCapabilities =
    getStringArray(
      candidate.unmatchedCapabilityIds,
      candidate.missingCapabilities,
      candidate.capabilityGaps,
      candidate.missingSkills
    );

  const reasons =
    getStringArray(
      candidate.reasons,
      candidate.matchReasons,
      candidate.explanations,
      Array.isArray(
        candidate.signals
      )
        ? candidate.signals.filter(
            (
              signal:
                any
            ) =>
              signal?.matched ===
              true
          )
        : []
    );

  const warnings =
    getStringArray(
      candidate.warnings,
      candidate.cautions,
      candidate.limitations
    );

  const isFallback =
    Boolean(
      candidate.generalistFallbackUsed ||
      candidate.usedGeneralistFallback ||
      candidate.generalistFallback
    );

  return (
    <article
      className={`rounded-3xl border bg-white p-5 shadow-sm ${
        rank ===
        1
          ? "border-purple-300"
          : "border-gray-200"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                rank ===
                1
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {
                rank
              }
            </span>

            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {
                  caregiverName
                }
              </h3>

              <p className="text-xs text-gray-500">
                {caregiver.caregiverNumber ||
                  caregiver.caregiverId ||
                  "Caregiver record"}
              </p>
            </div>

            {rank ===
              1 && (
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                Top match
              </span>
            )}

            {isFallback && (
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                Generalist fit
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {distance !==
              null && (
              <InfoChip
                label="Distance"
                value={`${distance.toFixed(
                  1
                )} km`}
              />
            )}

            {caregiver.yearsExperience !==
              undefined && (
              <InfoChip
                label="Experience"
                value={`${caregiver.yearsExperience} yrs`}
              />
            )}

            {caregiver.city && (
              <InfoChip
                label="Location"
                value={
                  [
                    caregiver.city,
                    caregiver.province,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(
                      ", "
                    )
                }
              />
            )}
          </div>
        </div>

        <ScoreBlock
          score={
            score
          }
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Metric
          label="Capabilities"
          value={
            capabilityScore
          }
        />

        <Metric
          label="Context"
          value={
            contextScore
          }
        />

        <Metric
          label="Availability"
          value={
            availabilityScore
          }
        />

        <Metric
          label="Language"
          value={
            languageScore
          }
        />

        <Metric
          label="Proximity"
          value={
            proximityScore
          }
        />
      </div>

      {(capabilityMatches.length >
        0 ||
        missingCapabilities.length >
          0) && (
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <SignalList
            title="Matched capabilities"
            values={
              capabilityMatches
            }
            tone="success"
            empty="No explicit capability matches returned."
          />

          <SignalList
            title="Capability gaps"
            values={
              missingCapabilities
            }
            tone="warning"
            empty="No capability gaps returned."
          />
        </div>
      )}

      {(reasons.length >
        0 ||
        warnings.length >
          0) && (
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <SignalList
            title="Ranking reasons"
            values={
              reasons
            }
            tone="neutral"
            empty="No ranking reasons returned."
          />

          <SignalList
            title="Warnings"
            values={
              warnings
            }
            tone="warning"
            empty="No warnings returned."
          />
        </div>
      )}
    </article>
  );
}

/*
 * ============================================================
 * SMALL UI
 * ============================================================
 */

function ReadyPanel() {
  return (
    <section className="flex h-full min-h-[400px] items-center justify-center rounded-3xl border border-dashed border-purple-300 bg-purple-50/40 p-6 text-center">
      <div>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
          ⚙️
        </div>

        <h2 className="mt-4 text-xl font-bold">
          Ready to match
        </h2>

        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-600">
          Click Run Matching. The outcome and best candidate will appear here
          immediately.
        </p>
      </div>
    </section>
  );
}

function MatchingPanelSkeleton() {
  return (
    <section className="h-full min-h-[400px] animate-pulse rounded-3xl border border-purple-200 bg-white p-5">
      <div className="h-3 w-32 rounded bg-gray-200" />

      <div className="mt-4 h-8 w-64 rounded bg-gray-200" />

      <div className="mt-3 h-4 w-full rounded bg-gray-200" />

      <div className="mt-2 h-4 w-4/5 rounded bg-gray-200" />

      <div className="mt-6 grid grid-cols-3 gap-2">
        <div className="h-16 rounded-2xl bg-gray-200" />
        <div className="h-16 rounded-2xl bg-gray-200" />
        <div className="h-16 rounded-2xl bg-gray-200" />
      </div>

      <div className="mt-6 h-28 rounded-2xl bg-gray-200" />
    </section>
  );
}

function ErrorState({
  error,
}: {
  error:
    string;
}) {
  return (
    <section className="rounded-3xl border border-red-200 bg-red-50 p-6">
      <p className="text-xs font-bold uppercase tracking-wide text-red-700">
        Matching test failed
      </p>

      <h2 className="mt-2 text-xl font-bold text-red-900">
        Unable to run matching
      </h2>

      <p className="mt-2 text-sm leading-relaxed text-red-800">
        {
          error
        }
      </p>
    </section>
  );
}

function DiagnosticMetric({
  label,
  value,
}: {
  label:
    string;

  value:
    number;
}) {
  return (
    <div className="rounded-xl border border-purple-100 bg-white p-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        {
          label
        }
      </p>

      <p className="mt-1 text-xl font-black text-gray-900">
        {
          value
        }
      </p>
    </div>
  );
}

function CompactDetail({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
        {
          label
        }
      </p>

      <p className="mt-1 break-words text-xs font-semibold leading-relaxed text-gray-900">
        {
          value
        }
      </p>
    </div>
  );
}

function ScoreBlock({
  score,
  compact =
    false,
}: {
  score:
    number | null;

  compact?:
    boolean;
}) {
  const displayScore =
    score ===
    null
      ? "—"
      : score <=
          1
        ? `${Math.round(
            score *
              100
          )}%`
        : `${Math.round(
            score
          )}%`;

  return (
    <div
      className={`rounded-2xl border border-purple-200 bg-purple-50 text-center ${
        compact
          ? "min-w-24 px-4 py-3"
          : "min-w-28 px-4 py-3"
      }`}
    >
      <p className="text-[10px] font-semibold text-gray-500">
        Match score
      </p>

      <p
        className={`mt-1 font-black text-purple-700 ${
          compact
            ? "text-2xl"
            : "text-3xl"
        }`}
      >
        {
          displayScore
        }
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label:
    string;

  value:
    number | null;
}) {
  let display =
    "—";

  if (
    value !==
    null
  ) {
    display =
      value <=
      1
        ? `${Math.round(
            value *
              100
          )}%`
        : `${Math.round(
            value
          )}%`;
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
      <p className="text-[10px] font-semibold text-gray-500">
        {
          label
        }
      </p>

      <p className="mt-1 text-base font-bold text-gray-900">
        {
          display
        }
      </p>
    </div>
  );
}

function SignalChip({
  value,
  subtle =
    false,
}: {
  value:
    string;

  subtle?:
    boolean;
}) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
        subtle
          ? "border-gray-200 bg-gray-50 text-gray-700"
          : "border-purple-200 bg-purple-50 text-purple-700"
      }`}
    >
      {
        value
      }
    </span>
  );
}

function InfoChip({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700">
      <strong>
        {label}:
      </strong>{" "}
      {
        value
      }
    </span>
  );
}

function EmptyText({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <p className="text-xs text-gray-500">
      {
        children
      }
    </p>
  );
}

function SignalList({
  title,
  values,
  tone,
  empty,
}: {
  title:
    string;

  values:
    string[];

  tone:
    | "success"
    | "warning"
    | "neutral";

  empty:
    string;
}) {
  const classes =
    tone ===
    "success"
      ? "border-emerald-200 bg-emerald-50"
      : tone ===
          "warning"
        ? "border-amber-200 bg-amber-50"
        : "border-gray-200 bg-gray-50";

  return (
    <div
      className={`rounded-2xl border p-4 ${classes}`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-gray-700">
        {
          title
        }
      </p>

      {values.length >
      0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {values.map(
            (
              value
            ) => (
              <span
                key={
                  value
                }
                className="rounded-full border border-white bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm"
              >
                {
                  value
                }
              </span>
            )
          )}
        </div>
      ) : (
        <p className="mt-2 text-xs text-gray-500">
          {
            empty
          }
        </p>
      )}
    </div>
  );
}

function RawResult({
  value,
}: {
  value:
    unknown;
}) {
  return (
    <details className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <summary className="cursor-pointer text-sm font-bold text-gray-800">
        Raw matching engine output
      </summary>

      <pre className="mt-4 max-h-[500px] overflow-auto rounded-2xl bg-gray-950 p-4 text-xs leading-relaxed text-gray-100">
        {JSON.stringify(
          value,
          null,
          2
        )}
      </pre>
    </details>
  );
}

/*
 * ============================================================
 * ENGINE OUTPUT COMPATIBILITY
 * ============================================================
 */

function extractCandidateArray(
  matchRun:
    any
): any[] {
  if (
    !matchRun
  ) {
    return [];
  }

  const options = [
    matchRun.candidates,
    matchRun.matches,
    matchRun.rankedCandidates,
    matchRun.rankedMatches,
    matchRun.results,
    matchRun.eligibleCandidates,
  ];

  for (
    const option of
    options
  ) {
    if (
      Array.isArray(
        option
      )
    ) {
      return option;
    }
  }

  if (
    matchRun.bestMatch
  ) {
    return [
      matchRun.bestMatch,
    ];
  }

  return [];
}

function extractOutcome(
  matchRun:
    any,

  candidates:
    any[]
) {
  const status =
    String(
      matchRun?.outcome ||
      matchRun?.status ||
      matchRun?.resultType ||
      ""
    )
      .trim()
      .toLowerCase();

  if (
    candidates.length ===
    0
  ) {
    return {
      title:
        "No immediate match",

      detail:
        "No ranked caregiver is available from the current matching run.",
    };
  }

  if (
    status.includes(
      "partial"
    ) ||
    candidates.some(
      (
        candidate:
          any
      ) =>
        candidate?.partialFit ===
        true
    )
  ) {
    return {
      title:
        "Partial fit available",

      detail:
        "A caregiver can support the request, although some preference or specialization signals are weaker than the ideal match.",
    };
  }

  if (
    status.includes(
      "wait"
    )
  ) {
    return {
      title:
        "Waitlist / sourcing required",

      detail:
        "The current matching rules did not produce an immediate assignment-quality candidate.",
    };
  }

  return {
    title:
      candidates.length ===
        1
        ? "Match found"
        : "Matches found",

    detail:
      "Eligible caregivers have been ranked using the current Carerity matching rules.",
  };
}

function getCandidateScore(
  candidate:
    any
): number | null {
  return getNumericValue(
    candidate.score
      ?.percentage,
    candidate.percentage,
    candidate.totalScore,
    candidate.matchScore,
    candidate.finalScore,
    typeof candidate.score ===
      "number"
      ? candidate.score
      : undefined
  );
}

function getCandidateDistance(
  candidate:
    any
): number | null {
  return getNumericValue(
    candidate.distance
      ?.distanceKm,
    candidate.distanceKm,
    typeof candidate.distance ===
      "number"
      ? candidate.distance
      : undefined,
    candidate.proximityKm,
    candidate.straightLineDistanceKm
  );
}

function getNumericValue(
  ...values:
    unknown[]
): number | null {
  for (
    const value of
    values
  ) {
    if (
      typeof value ===
        "number" &&
      Number.isFinite(
        value
      )
    ) {
      return value;
    }
  }

  return null;
}

function getStringArray(
  ...values:
    unknown[]
): string[] {
  for (
    const value of
    values
  ) {
    if (
      Array.isArray(
        value
      )
    ) {
      return value
        .map(
          (
            item
          ) => {
            if (
              typeof item ===
              "string"
            ) {
              return item;
            }

            if (
              item &&
              typeof item ===
                "object"
            ) {
              const record =
                item as
                  Record<
                    string,
                    unknown
                  >;

              const candidate =
                record.label ||
                record.explanation ||
                record.name ||
                record.id ||
                record.reason;

              if (
                typeof candidate ===
                "string"
              ) {
                return candidate;
              }
            }

            return "";
          }
        )
        .filter(
          Boolean
        );
    }
  }

  return [];
}

function getCandidateKey(
  candidate:
    any,

  index:
    number
) {
  return (
    candidate?.caregiverId ||
    candidate?.caregiver?.caregiverId ||
    candidate?.profile?.caregiverId ||
    candidate?.id ||
    `candidate-${index}`
  );
}