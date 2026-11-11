"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import DashboardLayout from "../../../components/DashboardLayout";

import CaregiverAvatar from "../../../components/caregiver/CaregiverAvatar";

import {
  CaregiverApplicationStatus,
  CaregiverOnboardingDraft,
  getCaregiverApplicationProgress,
  getCaregiverOnboardingDraft,
} from "../../../lib/caregiverOnboardingDraft";

import {
  loadCaregiverOnboardingDraftFromSupabase,
} from "../../../lib/caregiverOnboardingPersistence";

import {
  CaregiverScheduleVisit,
  loadMyCaregiverVisitSchedule,
} from "../../../lib/caregiverSchedulePersistence";

type DashboardVisit = {
  id: string;
  clientName: string;
  date: string;
  time: string;
  location: string;

  status:
    | "Upcoming"
    | "In Progress"
    | "Completed";
};

export default function CaregiverDashboardPage() {
  const [
    draft,
    setDraft,
  ] =
    useState<CaregiverOnboardingDraft>(
      () =>
        getCaregiverOnboardingDraft()
    );

  const [
    caregiverSchedule,
    setCaregiverSchedule,
  ] =
    useState<CaregiverScheduleVisit[]>(
      []
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true
    );

  const [
    loadError,
    setLoadError,
  ] =
    useState(
      ""
    );

  /*
   * ============================================================
   * LOAD CAREGIVER WORKSPACE
   * ============================================================
   */

  useEffect(() => {
    let mounted =
      true;

    function refreshLocalDraft() {
      if (
        !mounted
      ) {
        return;
      }

      setDraft(
        getCaregiverOnboardingDraft()
      );
    }

    async function loadDashboardData() {
      /*
       * Show cached caregiver information immediately.
       *
       * DashboardLayout remains the main authentication gate.
       */

      refreshLocalDraft();

      try {
        const [
          result,
          visitResult,
        ] =
          await Promise.all([
            loadCaregiverOnboardingDraftFromSupabase(),
            loadMyCaregiverVisitSchedule(),
          ]);

        if (
          !mounted
        ) {
          return;
        }

        if (
          visitResult.success
        ) {
          setCaregiverSchedule(
            visitResult.visits
          );
        } else if (
          visitResult.error
        ) {
          console.error(
            "Unable to load caregiver visit:",
            visitResult.error
          );
        }

        if (
          result.success
        ) {
          setDraft(
            result.draft
          );

          setLoadError(
            ""
          );
        } else if (
          result.authenticated !==
            false &&
          result.error
        ) {
          setLoadError(
            result.error
          );
        }
      } catch (
        error
      ) {
        console.error(
          "Unable to load caregiver dashboard data:",
          error
        );

        if (
          mounted
        ) {
          setLoadError(
            "We couldn't refresh your application information. Your saved information on this device is still available."
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

    loadDashboardData();

    window.addEventListener(
      "carerityCaregiverDraftUpdated",
      refreshLocalDraft
    );

    window.addEventListener(
      "carerityCaregiverDraftCleared",
      refreshLocalDraft
    );

    window.addEventListener(
      "storage",
      refreshLocalDraft
    );

    return () => {
      mounted =
        false;

      window.removeEventListener(
        "carerityCaregiverDraftUpdated",
        refreshLocalDraft
      );

      window.removeEventListener(
        "carerityCaregiverDraftCleared",
        refreshLocalDraft
      );

      window.removeEventListener(
        "storage",
        refreshLocalDraft
      );
    };
  }, []);

  const applicationStatus =
    draft.applicationStatus ||
    "draft";

  const isApproved =
    applicationStatus ===
    "approved";

  const progress =
    useMemo(
      () =>
        getCaregiverApplicationProgress(
          draft
        ),
      [
        draft,
      ]
    );

  const firstName =
    getCaregiverFirstName(
      draft
    );

  const canonicalVisit =
    caregiverSchedule.find(
      (
        visit
      ) =>
        visit.status ===
        "in_progress"
    ) ||
    caregiverSchedule.find(
      (
        visit
      ) =>
        visit.status ===
          "scheduled" &&
        isFutureOrCurrent(
          visit.endDatetime
        )
    ) ||
    null;

  const upcomingSchedule =
    caregiverSchedule.filter(
      (
        visit
      ) =>
        (
          visit.status ===
            "scheduled" &&
          isFutureOrCurrent(
            visit.endDatetime
          )
        ) ||
        visit.status ===
          "in_progress"
    );

  const visits:
    DashboardVisit[] =
    isApproved
      ? upcomingSchedule
          .filter(
            (
              visit
            ) =>
              visit.id !==
              canonicalVisit?.id
          )
          .slice(
            0,
            4
          )
          .map(
            (
              visit
            ) => ({
              id:
                visit.id,

              clientName:
                visit.recipientName,

              date:
                formatDashboardVisitDate(
                  visit.startDatetime ||
                  ""
                ),

              time:
                formatDashboardVisitTime(
                  visit.startDatetime ||
                  "",
                  visit.endDatetime ||
                  ""
                ),

              location:
                [
                  visit.city,
                  visit.province,
                ]
                  .filter(
                    Boolean
                  )
                  .join(
                    ", "
                  ) ||
                "Care location",

              status:
                mapCaregiverVisitStatus(
                  visit.status
                ),
            })
          )
      : [];

  const messageCount =
    isApproved
      ? 2
      : 0;

  const notificationCount =
    applicationStatus ===
    "needs_attention"
      ? 1
      : 0;

  return (
    <DashboardLayout
      activeItem="Home"
      role="caregiver"
      messageCount={
        messageCount
      }
      notificationCount={
        notificationCount
      }
    >
      {isLoading ? (
        <CaregiverDashboardSkeleton />
      ) : (
        <div className="mx-auto max-w-6xl">
          {loadError && (
            <div
              role="alert"
              className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
            >
              {
                loadError
              }
            </div>
          )}

          {/* CAREGIVER IDENTITY */}

          <section className="mb-6">
            <div className="flex items-center gap-4">
              <CaregiverAvatar
                photo={
                  draft.profilePhoto
                }
                firstName={
                  draft.firstName
                }
                lastName={
                  draft.lastName
                }
                size="large"
              />

              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-600">
                  Caregiver Workspace
                </p>

                <h1 className="mt-1 truncate text-3xl font-bold sm:text-4xl">
                  Hi{" "}
                  {firstName ||
                    "there"}
                  !
                </h1>

                <p className="mt-2 text-sm text-gray-500 sm:text-base">
                  Here&apos;s what&apos;s happening today.
                </p>
              </div>
            </div>
          </section>

          {/* ==================================================
              NEXT VISIT - PRIMARY CAREGIVER AGENDA
          ================================================== */}

          {isApproved && canonicalVisit && (
            <section className="mb-6">
              <div className="rounded-3xl border border-emerald-300 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700">
                        {canonicalVisit.status === "in_progress"
                          ? "Active Visit"
                          : "Next Visit"}
                      </span>

                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                        canonicalVisit.status === "in_progress"
                          ? "bg-emerald-600 text-white"
                          : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {mapCaregiverVisitStatus(
                          canonicalVisit.status
                        )}
                      </span>
                    </div>

                    <h2 className="mt-3 text-3xl font-bold text-gray-900">
                      {canonicalVisit.recipientName}
                    </h2>

                    <p className="mt-2 text-base font-semibold text-gray-900">
                      {formatDashboardVisitDate(
                        canonicalVisit.startDatetime ||
                          ""
                      )}{" "}
                      ·{" "}
                      {formatDashboardVisitTime(
                        canonicalVisit.startDatetime ||
                          "",
                        canonicalVisit.endDatetime ||
                          ""
                      )}
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                      {[
                        canonicalVisit.city,
                        canonicalVisit.province,
                      ]
                        .filter(Boolean)
                        .join(", ") ||
                        "Care location"}
                    </p>

                    {canonicalVisit.publicId && (
                      <p className="mt-2 text-xs text-gray-400">
                        Visit reference:{" "}
                        {canonicalVisit.publicId}
                      </p>
                    )}
                  </div>

                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                    <Link
                      href="/caregiver/messages"
                      className="rounded-xl border border-emerald-300 px-5 py-3 text-center font-semibold text-emerald-700"
                    >
                      Message Client
                    </Link>

                    <Link
                      href={`/caregiver/active-visit?visit=${encodeURIComponent(
                        canonicalVisit.id
                      )}`}
                      className="rounded-xl bg-emerald-600 px-6 py-3 text-center font-semibold text-white transition hover:bg-emerald-700"
                    >
                      {canonicalVisit.status === "in_progress"
                        ? "Continue Visit"
                        : "Open Visit"}
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* APPLICATION STATUS */}

          <ApplicationHero
            status={
              applicationStatus
            }
            firstName={
              firstName
            }
            progress={
              progress.percentage
            }
          />

          {/* QUICK ACTIONS */}

          <section className="mb-6 mt-6">
            <SectionHeading
              title="Quick actions"
              subtitle={
                isApproved
                  ? "Manage your work and availability."
                  : "Complete and manage your caregiver profile."
              }
            />

            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <QuickAction
                href={
                  isApproved
                    ? "/caregiver/schedule"
                    : "/caregiver/onboarding/availability"
                }
                icon="📅"
                title="My Schedule"
                detail="Visits and availability"
              />

              <QuickAction
                href={
                  isApproved
                    ? "/caregiver/messages"
                    : "/caregiver/dashboard"
                }
                icon="💬"
                title="Messages"
                detail={
                  isApproved
                    ? "View conversations"
                    : "Available after approval"
                }
                locked={
                  !isApproved
                }
              />

              <QuickAction
                href="/caregiver/documents"
                icon="📄"
                title="Documents"
                detail="View your credentials"
              />

              <QuickAction
                href="/caregiver/onboarding/profile"
                icon="👤"
                title="Profile"
                detail="Photo and personal details"
              />
            </div>
          </section>

          {isApproved ? (
            <ApprovedDashboard
              visits={
                visits
              }
              hasPrimaryVisit={
                Boolean(
                  canonicalVisit
                )
              }
              upcomingCount={
                upcomingSchedule.length
              }
            />
          ) : (
            <ApplicationDashboard
              draft={
                draft
              }
              progress={
                progress
              }
            />
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

/*
 * ============================================================
 * APPLICATION HERO
 * ============================================================
 */

function ApplicationHero({
  status,
  firstName,
  progress,
}: {
  status:
    CaregiverApplicationStatus;

  firstName:
    string;

  progress:
    number;
}) {
  const presentation =
    getApplicationPresentation(
      status
    );

  return (
    <section
      className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${presentation.panelClass}`}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p
            className={`text-sm font-bold ${presentation.textClass}`}
          >
            {getTimeGreeting()}

            {firstName
              ? ` ${firstName}`
              : ""}
          </p>

          <h2 className="mt-1 text-2xl font-bold text-gray-900">
            {
              presentation.title
            }
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
            {
              presentation.message
            }
          </p>
        </div>

        <div className="w-full rounded-2xl border border-white/80 bg-white p-4 lg:max-w-xs">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-gray-600">
              Application
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${presentation.badgeClass}`}
            >
              {
                presentation.label
              }
            </span>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{
                width:
                  status ===
                  "approved"
                    ? "100%"
                    : `${progress}%`,
              }}
            />
          </div>

          <p className="mt-2 text-xs text-gray-500">
            {status ===
            "approved"
              ? "Profile approved"
              : `${progress}% complete`}
          </p>

          {presentation.action && (
            <Link
              href={
                presentation
                  .action
                  .href
              }
              className="mt-4 block rounded-xl bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              {
                presentation
                  .action
                  .label
              }
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

/*
 * ============================================================
 * APPROVED DASHBOARD
 * ============================================================
 */

function ApprovedDashboard({
  visits,
  hasPrimaryVisit,
  upcomingCount,
}: {
  visits:
    DashboardVisit[];

  hasPrimaryVisit:
    boolean;

  upcomingCount:
    number;
}) {
  return (
    <>
      <section className="mb-6">
        <SectionHeading
          title={
            hasPrimaryVisit
              ? "More on your schedule"
              : "Today's schedule"
          }
          subtitle={
            hasPrimaryVisit
              ? "Additional care visits will appear here."
              : "Your upcoming care visits."
          }
        />

        <div className="mt-4">
          {visits.length >
          0 ? (
            <div className="space-y-3">
              {visits.map(
                (
                  visit
                ) => (
                  <VisitCard
                    key={
                      visit.id
                    }
                    visit={
                      visit
                    }
                  />
                )
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-emerald-300 bg-emerald-50/50 p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl">
                ✓
              </div>

              <h3 className="mt-4 text-xl font-bold">
                {hasPrimaryVisit
                  ? "No additional visits"
                  : "No visit scheduled today"}
              </h3>

              <p className="mt-2 text-sm text-gray-600">
                {hasPrimaryVisit
                  ? "Your next visit is shown at the top of your dashboard."
                  : "New opportunities will appear in Job Offers."}
              </p>

              <Link
                href="/caregiver/job-offers"
                className="mt-5 inline-block rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white"
              >
                View Job Offers
              </Link>
            </div>
          )}
        </div>

        <Link
          href="/caregiver/schedule"
          className="mt-4 inline-flex text-sm font-bold text-emerald-700 hover:underline"
        >
          Open full schedule →
        </Link>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <SectionHeading
            title="Work overview"
            subtitle="Your current caregiver activity."
          />

          <div className="mt-4 space-y-3">
            <DetailRow
              label="Upcoming confirmed visits"
              value={String(
                upcomingCount
              )}
            />

            <DetailRow
              label="Available job offers"
              value="3"
            />

            <DetailRow
              label="Unread messages"
              value="2"
            />

            <DetailRow
              label="Weekly earnings"
              value="$0.00"
            />
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <SectionHeading
            title="Recent activity"
            subtitle="Updates from your workspace."
          />

          <div className="mt-4 space-y-3">
            <ActivityItem
              icon="✓"
              title="Profile approved"
              detail="Your caregiver workspace is active."
            />

            <ActivityItem
              icon="📅"
              title="Availability saved"
              detail="Matching uses your current schedule."
            />

            <ActivityItem
              icon="📄"
              title="Documents available"
              detail="Review your credential status anytime."
            />
          </div>
        </section>
      </div>
    </>
  );
}

/*
 * ============================================================
 * APPLICATION DASHBOARD
 * ============================================================
 */

function ApplicationDashboard({
  draft,
  progress,
}: {
  draft:
    CaregiverOnboardingDraft;

  progress:
    ReturnType<
      typeof getCaregiverApplicationProgress
    >;
}) {
  const incompleteSections =
    progress.sections.filter(
      (
        section
      ) =>
        !section.complete
    );

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <SectionHeading
          title="Application progress"
          subtitle="Complete the remaining sections."
        />

        <div className="mt-4 space-y-3">
          {progress.sections.map(
            (
              section
            ) => (
              <div
                key={
                  section.section
                }
                className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 p-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                      section.complete
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {section.complete
                      ? "✓"
                      : "!"}
                  </span>

                  <span className="text-sm font-semibold text-gray-900">
                    {formatSectionName(
                      section.section
                    )}
                  </span>
                </div>

                <span
                  className={`text-xs font-bold ${
                    section.complete
                      ? "text-emerald-700"
                      : "text-red-600"
                  }`}
                >
                  {section.complete
                    ? "Complete"
                    : "Required"}
                </span>
              </div>
            )
          )}
        </div>

        <Link
          href="/caregiver/onboarding"
          className="mt-5 block rounded-xl bg-emerald-600 px-5 py-3 text-center font-semibold text-white transition hover:bg-emerald-700"
        >
          {draft.applicationStatus ===
          "needs_attention"
            ? "Update Application"
            : incompleteSections.length >
                0
              ? "Continue Application"
              : "View Application"}
        </Link>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <SectionHeading
          title="What happens next"
          subtitle="Your path to receiving care opportunities."
        />

        <div className="mt-5 space-y-5">
          <ProcessStep
            number="1"
            title="Complete your profile"
            detail="Add your experience, availability and documents."
            complete={
              progress.allComplete
            }
          />

          <ProcessStep
            number="2"
            title="Application review"
            detail="Carerity reviews the information you submitted."
            complete={
              draft.applicationStatus ===
                "under_review" ||
              draft.applicationStatus ===
                "approved"
            }
          />

          <ProcessStep
            number="3"
            title="Profile approval"
            detail="Approved caregivers can view suitable job offers."
            complete={
              draft.applicationStatus ===
              "approved"
            }
          />
        </div>
      </section>
    </div>
  );
}

/*
 * ============================================================
 * LOADING
 * ============================================================
 */

function CaregiverDashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-2xl bg-gray-200" />

        <div>
          <div className="h-4 w-36 rounded bg-gray-200" />

          <div className="mt-3 h-10 w-64 rounded bg-gray-200" />

          <div className="mt-3 h-4 w-72 rounded bg-gray-200" />
        </div>
      </div>

      <div className="mt-6 h-52 rounded-3xl bg-gray-200" />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map(
          (
            item
          ) => (
            <div
              key={
                item
              }
              className="h-28 rounded-2xl bg-gray-200"
            />
          )
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="h-80 rounded-3xl bg-gray-200" />

        <div className="h-80 rounded-3xl bg-gray-200" />
      </div>
    </div>
  );
}

/*
 * ============================================================
 * QUICK ACTION
 * ============================================================
 */

function QuickAction({
  href,
  icon,
  title,
  detail,
  locked =
    false,
}: {
  href:
    string;

  icon:
    string;

  title:
    string;

  detail:
    string;

  locked?:
    boolean;
}) {
  return (
    <Link
      href={
        href
      }
      className={`relative rounded-2xl border bg-white p-4 shadow-sm transition ${
        locked
          ? "border-gray-200 text-gray-400"
          : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50"
      }`}
    >
      {locked && (
        <span className="absolute right-3 top-3 text-xs">
          🔒
        </span>
      )}

      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${
          locked
            ? "bg-gray-100"
            : "bg-emerald-100 text-emerald-700"
        }`}
      >
        {
          icon
        }
      </div>

      <p
        className={`mt-3 font-bold ${
          locked
            ? "text-gray-500"
            : "text-gray-900"
        }`}
      >
        {
          title
        }
      </p>

      <p className="mt-1 text-xs leading-relaxed text-gray-500">
        {
          detail
        }
      </p>
    </Link>
  );
}

/*
 * ============================================================
 * VISIT CARD
 * ============================================================
 */

function VisitCard({
  visit,
}: {
  visit:
    DashboardVisit;
}) {
  return (
    <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
            {
              visit.status
            }
          </span>

          <h3 className="mt-3 text-xl font-bold">
            {
              visit.clientName
            }
          </h3>

          <p className="mt-2 text-sm font-semibold text-gray-900">
            {visit.date} ·{" "}
            {visit.time}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            {
              visit.location
            }
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/caregiver/messages"
            className="rounded-xl border border-emerald-300 px-5 py-3 text-center font-semibold text-emerald-700"
          >
            Message Client
          </Link>

          <Link
            href={`/caregiver/active-visit?visit=${encodeURIComponent(
              visit.id
            )}`}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-center font-semibold text-white"
          >
            Open Visit
          </Link>
        </div>
      </div>
    </div>
  );
}

/*
 * ============================================================
 * SMALL UI
 * ============================================================
 */

function mapCaregiverVisitStatus(
  status:
    CaregiverScheduleVisit["status"]
): DashboardVisit["status"] {
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

  return "Upcoming";
}

function isFutureOrCurrent(
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

function formatDashboardVisitDate(
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
    return "Scheduled";
  }

  const today =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        year:
          "numeric",
        month:
          "2-digit",
        day:
          "2-digit",
        timeZone:
          "America/Toronto",
      }
    ).format(
      new Date()
    );

  const visitDay =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        year:
          "numeric",
        month:
          "2-digit",
        day:
          "2-digit",
        timeZone:
          "America/Toronto",
      }
    ).format(
      date
    );

  if (
    today ===
    visitDay
  ) {
    return "Today";
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
      timeZone:
        "America/Toronto",
    }
  ).format(
    date
  );
}

function formatDashboardVisitTime(
  startValue:
    string,
  endValue:
    string
) {
  const start =
    new Date(
      startValue
    );

  const end =
    new Date(
      endValue
    );

  if (
    Number.isNaN(
      start.getTime()
    ) ||
    Number.isNaN(
      end.getTime()
    )
  ) {
    return "Time scheduled";
  }

  const formatter =
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

  return `${formatter.format(
    start
  )} – ${formatter.format(
    end
  )}`;
}

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

function DetailRow({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-gray-500">
        {
          label
        }
      </span>

      <span className="text-right text-sm font-semibold text-gray-900">
        {
          value
        }
      </span>
    </div>
  );
}

function ActivityItem({
  icon,
  title,
  detail,
}: {
  icon:
    string;

  title:
    string;

  detail:
    string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-gray-100 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
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

function ProcessStep({
  number,
  title,
  detail,
  complete,
}: {
  number:
    string;

  title:
    string;

  detail:
    string;

  complete:
    boolean;
}) {
  return (
    <div className="flex gap-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          complete
            ? "bg-emerald-600 text-white"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        {complete
          ? "✓"
          : number}
      </div>

      <div>
        <p className="text-sm font-bold text-gray-900">
          {
            title
          }
        </p>

        <p className="mt-1 text-xs leading-relaxed text-gray-500">
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
 * APPLICATION PRESENTATION
 * ============================================================
 */

function getApplicationPresentation(
  status:
    CaregiverApplicationStatus
) {
  switch (
    status
  ) {
    case "submitted":
      return {
        label:
          "Submitted",

        title:
          "Your application was received",

        message:
          "Carerity will review your profile and documents.",

        panelClass:
          "border-blue-200 bg-gradient-to-br from-blue-50 to-white",

        badgeClass:
          "bg-blue-100 text-blue-700",

        textClass:
          "text-blue-700",

        action: {
          href:
            "/caregiver/onboarding",

          label:
            "View Application",
        },
      };

    case "under_review":
      return {
        label:
          "Under review",

        title:
          "Your application is under review",

        message:
          "We’ll update your workspace when your status changes.",

        panelClass:
          "border-amber-200 bg-gradient-to-br from-amber-50 to-white",

        badgeClass:
          "bg-amber-100 text-amber-700",

        textClass:
          "text-amber-700",

        action: {
          href:
            "/caregiver/onboarding",

          label:
            "View Status",
        },
      };

    case "approved":
      return {
        label:
          "Approved",

        title:
          "Your caregiver workspace is active",

        message:
          "You can now view suitable opportunities and manage visits.",

        panelClass:
          "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white",

        badgeClass:
          "bg-emerald-100 text-emerald-700",

        textClass:
          "text-emerald-700",

        action:
          null,
      };

    case "needs_attention":
      return {
        label:
          "Action needed",

        title:
          "Your application needs an update",

        message:
          "Review the requested information before Carerity can continue.",

        panelClass:
          "border-orange-200 bg-gradient-to-br from-orange-50 to-white",

        badgeClass:
          "bg-orange-100 text-orange-700",

        textClass:
          "text-orange-700",

        action: {
          href:
            "/caregiver/onboarding",

          label:
            "Update Application",
        },
      };

    case "declined":
      return {
        label:
          "Not approved",

        title:
          "Your application status has changed",

        message:
          "Open your application for more information or contact support.",

        panelClass:
          "border-red-200 bg-gradient-to-br from-red-50 to-white",

        badgeClass:
          "bg-red-100 text-red-700",

        textClass:
          "text-red-700",

        action: {
          href:
            "/caregiver/onboarding",

          label:
            "View Status",
        },
      };

    default:
      return {
        label:
          "Draft",

        title:
          "Complete your caregiver application",

        message:
          "Finish your profile and submit it for verification.",

        panelClass:
          "border-gray-200 bg-gradient-to-br from-gray-50 to-white",

        badgeClass:
          "bg-gray-200 text-gray-700",

        textClass:
          "text-emerald-700",

        action: {
          href:
            "/caregiver/onboarding",

          label:
            "Continue Application",
        },
      };
  }
}

/*
 * ============================================================
 * DATA HELPERS
 * ============================================================
 */

function getCaregiverFirstName(
  draft:
    CaregiverOnboardingDraft
) {
  if (
    draft.firstName?.trim()
  ) {
    return formatName(
      draft.firstName
    );
  }

  const emailName =
    draft.email
      ?.split(
        "@"
      )[0]
      ?.split(
        /[._-]/
      )[0] ||
    "";

  return formatName(
    emailName
  );
}

function formatSectionName(
  value:
    string
) {
  const names:
    Record<
      string,
      string
    > = {
    profile:
      "About You",

    experience:
      "Experience",

    preferences:
      "Work Preferences",

    availability:
      "Availability",

    credentials:
      "Documents",

    professional:
      "Professional Details",

    background:
      "Background Screening",
  };

  return (
    names[
      value
    ] ||
    value
  );
}

function getTimeGreeting() {
  const hour =
    new Date()
      .getHours();

  if (
    hour <
    12
  ) {
    return "Good morning,";
  }

  if (
    hour <
    17
  ) {
    return "Good afternoon,";
  }

  return "Good evening,";
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
