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

import {
  CaregiverOnboardingDraft,
  CaregiverOnboardingSection,
  CaregiverSectionStatus,
  getAllCaregiverSectionStatuses,
  getCaregiverApplicationProgress,
} from "../../../lib/caregiverOnboardingDraft";

import {
  loadCaregiverOnboardingDraftFromSupabase,
  signOutCarerity,
} from "../../../lib/caregiverOnboardingPersistence";

type OnboardingStep = {
  key:
    | CaregiverOnboardingSection
    | "review";

  title:
    string;

  detail:
    string;

  href:
    string;
};

const ONBOARDING_STEPS:
  OnboardingStep[] = [
  {
    key:
      "profile",
    title:
      "About You",
    detail:
      "Personal details, address, sex and work eligibility.",
    href:
      "/caregiver/onboarding/profile",
  },
  {
    key:
      "experience",
    title:
      "Experience",
    detail:
      "Qualifications, languages and care experience.",
    href:
      "/caregiver/onboarding/experience",
  },
  {
    key:
      "preferences",
    title:
      "Work Preferences",
    detail:
      "Service radius, transportation and work preferences.",
    href:
      "/caregiver/onboarding/preferences",
  },
  {
    key:
      "availability",
    title:
      "Availability",
    detail:
      "Weekly availability and temporary time off.",
    href:
      "/caregiver/onboarding/availability",
  },
  {
    key:
      "credentials",
    title:
      "Documents",
    detail:
      "Identity, qualifications, screening and work eligibility documents.",
    href:
      "/caregiver/onboarding/credentials",
  },
  {
    key:
      "professional",
    title:
      "Professional Details",
    detail:
      "Optional memberships and insurance.",
    href:
      "/caregiver/onboarding/professional",
  },
  {
    key:
      "background",
    title:
      "Background Screening",
    detail:
      "Consent for screening before a confirmed placement.",
    href:
      "/caregiver/onboarding/background-check",
  },
  {
    key:
      "review",
    title:
      "Review & Submit",
    detail:
      "Check your application and submit it for review.",
    href:
      "/caregiver/onboarding/review",
  },
];

export default function CaregiverOnboardingPage() {
  const router =
    useRouter();

  const [
    draft,
    setDraft,
  ] =
    useState<
      CaregiverOnboardingDraft
    >(
      {}
    );

  const [
    caregiverNumber,
    setCaregiverNumber,
  ] =
    useState("");

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    loadError,
    setLoadError,
  ] =
    useState("");

  const [
    isSigningOut,
    setIsSigningOut,
  ] =
    useState(false);

  useEffect(() => {
    let mounted =
      true;

    async function loadApplication() {
      const result =
        await loadCaregiverOnboardingDraftFromSupabase();

      if (
        !mounted
      ) {
        return;
      }

      if (
        !result.authenticated
      ) {
        router.replace(
          "/caregiver/login"
        );

        return;
      }

      setDraft(
        result.draft
      );

      setCaregiverNumber(
        result.caregiverNumber ||
          ""
      );

      if (
        !result.success
      ) {
        setLoadError(
          result.error ||
            "Unable to load your application."
        );
      }

      setIsLoading(
        false
      );
    }

    loadApplication();

    return () => {
      mounted =
        false;
    };
  }, [
    router,
  ]);

  const statuses =
    useMemo(
      () =>
        getAllCaregiverSectionStatuses(
          draft
        ),
      [
        draft,
      ]
    );

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

  const statusBySection =
    useMemo(
      () => {
        return statuses.reduce<
          Partial<
            Record<
              CaregiverOnboardingSection,
              CaregiverSectionStatus
            >
          >
        >(
          (
            result,
            status
          ) => {
            result[
              status.section
            ] =
              status;

            return result;
          },
          {}
        );
      },
      [
        statuses,
      ]
    );

  const applicationSubmitted =
    draft.applicationStatus ===
      "submitted" ||
    draft.applicationStatus ===
      "under_review" ||
    draft.applicationStatus ===
      "approved" ||
    draft.applicationStatus ===
      "needs_attention" ||
    draft.applicationStatus ===
      "declined";

  const applicantName =
    draft.firstName?.trim() ||
    "";

  const nextStep =
    ONBOARDING_STEPS.find(
      (
        step
      ) => {
        if (
          step.key ===
          "review"
        ) {
          return (
            progress.allComplete &&
            !applicationSubmitted
          );
        }

        return !statusBySection[
          step.key
        ]?.complete;
      }
    );

  const primaryHref =
    applicationSubmitted
      ? "/caregiver/dashboard"
      : nextStep?.href ||
        "/caregiver/onboarding/review";

  const primaryLabel =
    draft.applicationStatus ===
    "approved"
      ? "Go to Caregiver Workspace"
      : applicationSubmitted
        ? "Go to Caregiver Workspace"
        : progress.completed ===
            0
          ? "Start Application"
          : progress.allComplete
            ? "Review Application"
            : "Continue Application";

  async function handleSignOut() {
    if (
      isSigningOut
    ) {
      return;
    }

    setIsSigningOut(
      true
    );

    const result =
      await signOutCarerity();

    if (
      !result.success
    ) {
      window.alert(
        result.error ||
          "Unable to sign out."
      );

      setIsSigningOut(
        false
      );

      return;
    }

    window.location.replace(
      "/"
    );
  }

  if (
    isLoading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />

          <p className="mt-4 text-sm font-semibold text-gray-500">
            Loading your application...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Carerity home"
        >
          <img
            src="/carerityblacklogo2.png"
            alt="Carerity"
            className="h-16 w-auto object-contain sm:h-20"
          />
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/caregiver/dashboard"
            className="rounded-full border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 sm:px-4 sm:text-sm"
          >
            Dashboard
          </Link>

          <button
            type="button"
            onClick={
              handleSignOut
            }
            disabled={
              isSigningOut
            }
            className="rounded-full border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60 sm:px-4 sm:text-sm"
          >
            {isSigningOut
              ? "Signing out..."
              : "Sign Out"}
          </button>
        </div>
      </nav>

      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {loadError && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {
              loadError
            }
          </div>
        )}

        <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-bold text-emerald-700">
                {applicationSubmitted
                  ? "Application Status"
                  : "Welcome to Carerity"}
              </p>

              <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
                {getApplicationHeading(
                  draft.applicationStatus,
                  applicantName
                )}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base">
                {applicationSubmitted
                  ? getApplicationMessage(
                      draft.applicationStatus
                    )
                  : "Complete each section, add your documents, then submit your application for review."}
              </p>

              {caregiverNumber && (
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                  Caregiver ID:{" "}

                  <span className="text-emerald-700">
                    {
                      caregiverNumber
                    }
                  </span>
                </p>
              )}
            </div>

            <ApplicationStatusBadge
              status={
                draft.applicationStatus ||
                "draft"
              }
            />
          </div>

          <div className="mt-7">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
              <span>
                Application progress
              </span>

              <span>
                {applicationSubmitted &&
                progress.allComplete
                  ? getProgressStatusLabel(
                      draft.applicationStatus
                    )
                  : `${progress.percentage}%`}
              </span>
            </div>

            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-emerald-100">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                style={{
                  width:
                    `${
                      applicationSubmitted &&
                      progress.allComplete
                        ? 100
                        : progress.percentage
                    }%`,
                }}
              />
            </div>

            <p className="mt-2 text-xs text-gray-500">
              {progress.completed} of{" "}
              {progress.total} required sections complete.
            </p>
          </div>

          <Link
            href={
              primaryHref
            }
            className="mt-6 block w-full rounded-xl bg-emerald-600 px-5 py-3.5 text-center font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.99] sm:inline-block sm:w-auto"
          >
            {
              primaryLabel
            }
          </Link>
        </div>

        <div className="mt-6 space-y-3">
          {ONBOARDING_STEPS.map(
            (
              step,
              index
            ) => {
              const isReview =
                step.key ===
                "review";

              const sectionStatus =
                isReview
                  ? undefined
                  : statusBySection[
                      step.key
                    ];

              const complete =
                isReview
                  ? applicationSubmitted
                  : sectionStatus?.complete ??
                    false;

              const reviewReady =
                isReview &&
                progress.allComplete &&
                !applicationSubmitted;

              const disabled =
                isReview &&
                !progress.allComplete &&
                !applicationSubmitted;

              const missingCount =
                sectionStatus?.missingFields.length ||
                0;

              const content = (
                <>
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold ${
                      complete
                        ? "bg-emerald-600 text-white"
                        : reviewReady
                          ? "bg-purple-600 text-white"
                          : disabled
                            ? "border border-gray-200 bg-gray-100 text-gray-400"
                            : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {complete
                      ? "✓"
                      : index +
                        1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p
                        className={`font-bold ${
                          disabled
                            ? "text-gray-500"
                            : "text-gray-900"
                        }`}
                      >
                        {
                          step.title
                        }
                      </p>

                      <StepStatus
                        complete={
                          complete
                        }
                        reviewReady={
                          reviewReady
                        }
                        disabled={
                          disabled
                        }
                        missingCount={
                          missingCount
                        }
                      />
                    </div>

                    <p className="mt-1 text-sm text-gray-500">
                      {
                        step.detail
                      }
                    </p>
                  </div>

                  <span
                    className={`text-lg ${
                      disabled
                        ? "text-gray-300"
                        : "text-gray-400"
                    }`}
                  >
                    →
                  </span>
                </>
              );

              if (
                disabled
              ) {
                return (
                  <div
                    key={
                      step.title
                    }
                    className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 opacity-80 sm:p-5"
                  >
                    {
                      content
                    }
                  </div>
                );
              }

              return (
                <Link
                  key={
                    step.title
                  }
                  href={
                    step.href
                  }
                  className={`flex items-center gap-4 rounded-2xl border p-4 shadow-sm transition sm:p-5 ${
                    complete
                      ? "border-emerald-200 bg-white hover:border-emerald-400"
                      : reviewReady
                        ? "border-purple-300 bg-purple-50 hover:bg-purple-100"
                        : "border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40"
                  }`}
                >
                  {
                    content
                  }
                </Link>
              );
            }
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoCard
            title="Your progress is saved"
            text="Your application is stored securely and can be continued after signing back in."
          />

          <InfoCard
            title="You stay in control"
            text="Set your availability and choose which care opportunities you accept."
          />
        </div>
      </section>
    </main>
  );
}

function StepStatus({
  complete,
  reviewReady,
  disabled,
  missingCount,
}: {
  complete:
    boolean;
  reviewReady:
    boolean;
  disabled:
    boolean;
  missingCount:
    number;
}) {
  if (
    complete
  ) {
    return (
      <span className="w-fit rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
        Complete
      </span>
    );
  }

  if (
    reviewReady
  ) {
    return (
      <span className="w-fit rounded-full bg-purple-100 px-2.5 py-1 text-[11px] font-bold text-purple-700">
        Ready
      </span>
    );
  }

  if (
    disabled
  ) {
    return (
      <span className="w-fit rounded-full bg-gray-200 px-2.5 py-1 text-[11px] font-bold text-gray-500">
        Complete prior sections
      </span>
    );
  }

  return (
    <span className="w-fit rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
      {missingCount >
      0
        ? "In progress"
        : "Not started"}
    </span>
  );
}

function ApplicationStatusBadge({
  status,
}: {
  status:
    | "draft"
    | "submitted"
    | "under_review"
    | "approved"
    | "needs_attention"
    | "declined";
}) {
  const styles = {
    draft: {
      label:
        "Draft",
      className:
        "bg-gray-100 text-gray-700",
    },

    submitted: {
      label:
        "Submitted",
      className:
        "bg-blue-100 text-blue-700",
    },

    under_review: {
      label:
        "Under review",
      className:
        "bg-amber-100 text-amber-700",
    },

    approved: {
      label:
        "Approved",
      className:
        "bg-emerald-100 text-emerald-700",
    },

    needs_attention: {
      label:
        "Needs attention",
      className:
        "bg-orange-100 text-orange-700",
    },

    declined: {
      label:
        "Not approved",
      className:
        "bg-red-100 text-red-700",
    },
  };

  const presentation =
    styles[
      status
    ];

  return (
    <span
      className={`w-fit shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${presentation.className}`}
    >
      {
        presentation.label
      }
    </span>
  );
}

function InfoCard({
  title,
  text,
}: {
  title:
    string;
  text:
    string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-bold text-gray-900">
        {
          title
        }
      </p>

      <p className="mt-1 text-sm leading-relaxed text-gray-600">
        {
          text
        }
      </p>
    </div>
  );
}

function getApplicationHeading(
  status:
    CaregiverOnboardingDraft["applicationStatus"],
  applicantName:
    string
) {
  switch (
    status
  ) {
    case "approved":
      return applicantName
        ? `${applicantName}, your profile is approved`
        : "Your caregiver profile is approved";

    case "needs_attention":
      return applicantName
        ? `${applicantName}, your application needs attention`
        : "Your application needs attention";

    case "declined":
      return applicantName
        ? `${applicantName}, your application review is complete`
        : "Your application review is complete";

    case "under_review":
      return applicantName
        ? `${applicantName}, your application is under review`
        : "Your application is under review";

    case "submitted":
      return applicantName
        ? `${applicantName}, your application has been submitted`
        : "Your application has been submitted";

    default:
      return applicantName
        ? `Continue your application, ${applicantName}`
        : "Build your caregiver profile";
  }
}

function getProgressStatusLabel(
  status:
    CaregiverOnboardingDraft["applicationStatus"]
) {
  switch (
    status
  ) {
    case "approved":
      return "Approved";

    case "under_review":
      return "Under review";

    case "needs_attention":
      return "Action needed";

    case "declined":
      return "Not approved";

    case "submitted":
      return "Submitted";

    default:
      return "In progress";
  }
}

function getApplicationMessage(
  status?:
    CaregiverOnboardingDraft["applicationStatus"]
) {
  switch (
    status
  ) {
    case "submitted":
      return "Your application has been submitted. Carerity will review your information and documents.";

    case "under_review":
      return "Your application is currently being reviewed. We’ll update your workspace when the status changes.";

    case "approved":
      return "Your caregiver profile is approved and eligible for suitable care opportunities.";

    case "needs_attention":
      return "Carerity needs additional information before completing your application review.";

    case "declined":
      return "Your application is currently not approved for care opportunities.";

    default:
      return "Complete each section, then submit your application for review.";
  }
}
