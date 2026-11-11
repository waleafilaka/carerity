"use client";

import {
  ReactNode,
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
} from "../../../../lib/caregiverOnboardingDraft";

import {
  loadLatestCaregiverDraft,
  signOutCarerity,
  submitCaregiverApplicationToSupabase,
} from "../../../../lib/caregiverOnboardingPersistence";

type ReviewSection = {
  key:
    CaregiverOnboardingSection;

  title:
    string;

  description:
    string;

  href:
    string;
};

const REVIEW_SECTIONS:
  ReviewSection[] = [
    {
      key:
        "profile",

      title:
        "About You",

      description:
        "Personal details, address and work eligibility.",

      href:
        "/caregiver/onboarding/profile",
    },

    {
      key:
        "experience",

      title:
        "Experience",

      description:
        "Qualifications, languages and care experience.",

      href:
        "/caregiver/onboarding/experience",
    },

    {
      key:
        "preferences",

      title:
        "Work Preferences",

      description:
        "Service radius, driving and preferred work types.",

      href:
        "/caregiver/onboarding/preferences",
    },

    {
      key:
        "availability",

      title:
        "Availability",

      description:
        "Weekly schedule and temporary time off.",

      href:
        "/caregiver/onboarding/availability",
    },

    {
      key:
        "credentials",

      title:
        "Documents & Health Requirements",

      description:
        "Identity, qualification, VSC, CV, CPR / First Aid, TB evidence and COVID-19 vaccination evidence.",

      href:
        "/caregiver/onboarding/credentials",
    },

    {
      key:
        "professional",

      title:
        "Professional Details",

      description:
        "Optional memberships and liability insurance.",

      href:
        "/caregiver/onboarding/professional",
    },

    {
      key:
        "background",

      title:
        "Background Screening",

      description:
        "Consent for screening before or around first confirmed placement.",

      href:
        "/caregiver/onboarding/background-check",
    },
  ];

export default function CaregiverReviewPage() {
  const router =
    useRouter();

  const [
    draft,
    setDraft,
  ] =
    useState<
      CaregiverOnboardingDraft
    >({});

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true
    );

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(
      false
    );

  const [
    isSigningOut,
    setIsSigningOut,
  ] =
    useState(
      false
    );

  const [
    submitError,
    setSubmitError,
  ] =
    useState("");

  useEffect(() => {
    let mounted =
      true;

    async function loadPage() {
      const result =
        await loadLatestCaregiverDraft();

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

      if (
        !result.success &&
        result.error
      ) {
        setSubmitError(
          result.error
        );
      }

      setIsLoading(
        false
      );
    }

    loadPage();

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

  const applicantName =
    [
      draft.firstName,
      draft.lastName,
    ]
      .filter(
        Boolean
      )
      .join(
        " "
      ) ||
    "Caregiver applicant";

  async function handleSubmit() {
    if (
      !progress.allComplete ||
      isSubmitting
    ) {
      return;
    }

    setSubmitError(
      ""
    );

    setIsSubmitting(
      true
    );

    try {
      const result =
        await submitCaregiverApplicationToSupabase();

      if (
        !result.authenticated
      ) {
        router.replace(
          "/caregiver/login"
        );

        return;
      }

      if (
        !result.success
      ) {
        setSubmitError(
          result.error ||
            "Unable to submit your application."
        );

        setDraft(
          result.draft
        );

        return;
      }

      setDraft(
        result.draft
      );

      router.push(
        "/caregiver/onboarding/submitted"
      );
    } catch (error) {
      console.error(
        "Unable to submit caregiver application:",
        error
      );

      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to submit your application."
      );
    } finally {
      setIsSubmitting(
        false
      );
    }
  }

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
      setSubmitError(
        result.error ||
          "Unable to sign out."
      );

      setIsSigningOut(
        false
      );

      return;
    }

    router.replace(
      "/caregiver/login"
    );

    router.refresh();
  }

  if (
    isLoading
  ) {
    return (
      <LoadingScreen />
    );
  }

  return (
    <OnboardingShell
      isSigningOut={
        isSigningOut
      }
      onSignOut={
        handleSignOut
      }
    >
      <div>
        <p className="text-sm font-bold text-emerald-700">
          Final Review
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Review your application
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Check each section before submitting your application.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-gray-600">
              Applicant
            </p>

            <p className="mt-1 font-bold text-gray-900">
              {applicantName}
            </p>
          </div>

          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
              progress.allComplete
                ? "bg-emerald-600 text-white"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {progress.allComplete
              ? "Ready to submit"
              : `${progress.completed} of ${progress.total} complete`}
          </span>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
            <span>
              Application progress
            </span>

            <span>
              {progress.percentage}%
            </span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-100">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{
                width:
                  `${progress.percentage}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {REVIEW_SECTIONS.map(
          (
            section
          ) => {
            const status =
              statusBySection[
                section.key
              ];

            const complete =
              status?.complete ??
              false;

            const missingFields =
              status
                ?.missingFields ||
              [];

            return (
              <section
                key={
                  section.key
                }
                className={`rounded-2xl border p-4 transition ${
                  complete
                    ? "border-emerald-200 bg-white"
                    : "border-red-300 bg-red-50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      complete
                        ? "bg-emerald-600 text-white"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {complete
                      ? "✓"
                      : "!"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-bold text-gray-900">
                          {
                            section.title
                          }
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {
                            section.description
                          }
                        </p>
                      </div>

                      <Link
                        href={
                          section.href
                        }
                        className={`shrink-0 text-sm font-bold hover:underline ${
                          complete
                            ? "text-emerald-700"
                            : "text-red-700"
                        }`}
                      >
                        {complete
                          ? "Edit"
                          : "Complete"}
                      </Link>
                    </div>

                    <p
                      className={`mt-3 text-xs font-bold ${
                        complete
                          ? "text-emerald-700"
                          : "text-red-700"
                      }`}
                    >
                      {complete
                        ? "Complete"
                        : "Needs attention"}
                    </p>

                    {!complete &&
                      missingFields.length >
                        0 && (
                        <div className="mt-3 rounded-xl border border-red-200 bg-white p-3">
                          <p className="text-xs font-bold text-red-900">
                            Outstanding requirements
                          </p>

                          <ul className="mt-2 space-y-1 text-xs text-red-800">
                            {missingFields.map(
                              (
                                field
                              ) => (
                                <li
                                  key={
                                    field
                                  }
                                >
                                  •{" "}
                                  {
                                    field
                                  }
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                  </div>
                </div>
              </section>
            );
          }
        )}
      </div>

      {!progress.allComplete && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-bold text-red-900">
            Complete your application
          </p>

          <p className="mt-1 text-sm leading-relaxed text-red-800">
            Open each section marked “Needs attention” and complete the highlighted requirements before submitting.
          </p>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-sm font-bold text-blue-900">
          After submission
        </p>

        <p className="mt-1 text-sm leading-relaxed text-blue-900/80">
          Carerity will review your caregiver profile and supporting documents. Submission does not automatically approve the account for care placements.
        </p>
      </div>

      {submitError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <button
        type="button"
        onClick={
          handleSubmit
        }
        disabled={
          !progress.allComplete ||
          isSubmitting
        }
        className="mt-6 min-h-[52px] w-full rounded-xl bg-emerald-600 px-4 py-3.5 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
      >
        {isSubmitting
          ? "Submitting..."
          : "Submit Application"}
      </button>

      <Link
        href="/caregiver/onboarding"
        className="mt-3 block min-h-[50px] w-full rounded-xl border border-emerald-300 bg-white px-4 py-3 text-center text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
      >
        Return to Application Progress
      </Link>
    </OnboardingShell>
  );
}

function OnboardingShell({
  children,
  isSigningOut,
  onSignOut,
}: {
  children:
    ReactNode;

  isSigningOut:
    boolean;

  onSignOut:
    () => void;
}) {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
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

          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
              Review
            </span>

            <Link
              href="/caregiver/dashboard"
              className="rounded-full border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Dashboard
            </Link>

            <button
              type="button"
              onClick={
                onSignOut
              }
              disabled={
                isSigningOut
              }
              className="rounded-full border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              {isSigningOut
                ? "Signing out..."
                : "Sign Out"}
            </button>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-2xl px-4 pb-10 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/caregiver/onboarding/background-check"
            className="text-sm font-semibold text-emerald-700 hover:underline"
          >
            ← Back
          </Link>

          <Link
            href="/caregiver/onboarding"
            className="text-sm font-semibold text-gray-600 hover:text-emerald-700 hover:underline"
          >
            Application Progress
          </Link>
        </div>

        <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          {children}
        </div>
      </section>
    </main>
  );
}

function LoadingScreen() {
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
