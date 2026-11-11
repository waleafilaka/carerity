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
  BackgroundScreeningStatus,
  CaregiverOnboardingDraft,
  getBackgroundSectionStatus,
} from "../../../../lib/caregiverOnboardingDraft";

import {
  loadLatestCaregiverDraft,
  saveCaregiverDraftWithCloud,
  signOutCarerity,
} from "../../../../lib/caregiverOnboardingPersistence";

export default function CaregiverBackgroundCheckPage() {
  const router =
    useRouter();

  const [
    baseDraft,
    setBaseDraft,
  ] =
    useState<
      CaregiverOnboardingDraft
    >({});

  const [
    consent,
    setConsent,
  ] =
    useState(
      false
    );

  const [
    screeningStatus,
    setScreeningStatus,
  ] =
    useState<
      BackgroundScreeningStatus
    >(
      "not_started"
    );

  const [
    showErrors,
    setShowErrors,
  ] =
    useState(
      false
    );

  const [
    pageError,
    setPageError,
  ] =
    useState("");

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true
    );

  const [
    isSaving,
    setIsSaving,
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

      const draft =
        result.draft;

      setBaseDraft(
        draft
      );

      setConsent(
        draft.digitalBackgroundScreeningConsent ??
          false
      );

      setScreeningStatus(
        draft.digitalBackgroundScreeningStatus ||
          (
            draft.digitalBackgroundScreeningConsent
              ? "consent_received"
              : "not_started"
          )
      );

      if (
        !result.success &&
        result.error
      ) {
        setPageError(
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

  const effectiveDraft =
    useMemo(
      () => ({
        ...baseDraft,

        digitalBackgroundScreeningConsent:
          consent,

        digitalBackgroundScreeningStatus:
          consent
            ? screeningStatus ===
                "not_started"
              ? "consent_received"
              : screeningStatus
            : "not_started",
      }),
      [
        baseDraft,
        consent,
        screeningStatus,
      ]
    );

  const sectionStatus =
    useMemo(
      () =>
        getBackgroundSectionStatus(
          effectiveDraft
        ),
      [
        effectiveDraft,
      ]
    );

  const isValid =
    sectionStatus.complete &&
    consent;

  function handleConsentChange(
    value:
      boolean
  ) {
    setConsent(
      value
    );

    setScreeningStatus(
      value
        ? "consent_received"
        : "not_started"
    );
  }

  async function savePage() {
    return saveCaregiverDraftWithCloud(
      "background",
      effectiveDraft
    );
  }

  async function handleContinue() {
    setShowErrors(
      true
    );

    setPageError(
      ""
    );

    if (
      !isValid ||
      isSaving
    ) {
      return;
    }

    setIsSaving(
      true
    );

    try {
      const result =
        await savePage();

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
        setPageError(
          result.error ||
            "Unable to save your screening consent."
        );

        return;
      }

      router.push(
        "/caregiver/onboarding/review"
      );
    } finally {
      setIsSaving(
        false
      );
    }
  }

  async function handleSaveAndExit() {
    if (
      isSaving
    ) {
      return;
    }

    setPageError(
      ""
    );

    setIsSaving(
      true
    );

    try {
      const result =
        await savePage();

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
        setPageError(
          result.error ||
            "Unable to save your application."
        );

        return;
      }

      router.push(
        "/caregiver/onboarding"
      );
    } finally {
      setIsSaving(
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
      setPageError(
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
      stepLabel="7 of 7"
      backHref="/caregiver/onboarding/professional"
      isSigningOut={
        isSigningOut
      }
      onSignOut={
        handleSignOut
      }
    >
      <div>
        <p className="text-sm font-bold text-emerald-700">
          Background Screening
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Screening consent
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          Background screening is completed before or around the caregiver&apos;s first confirmed placement.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <p className="font-bold text-gray-900">
            How the screening works
          </p>

          <div className="mt-4 space-y-4">
            <ProcessStep
              number="1"
              title="You provide consent"
              description="Your consent allows Carerity to arrange screening when required."
            />

            <ProcessStep
              number="2"
              title="Screening is started"
              description="This normally happens before or around your first confirmed placement."
            />

            <ProcessStep
              number="3"
              title="Your status is updated"
              description="You can follow the progress from your caregiver workspace."
            />
          </div>
        </section>

        <section
          className={`rounded-2xl border p-4 transition ${
            consent
              ? "border-emerald-400 bg-emerald-50"
              : showErrors
                ? "border-red-400 bg-red-50"
                : "border-gray-200 bg-white"
          }`}
        >
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={
                consent
              }
              onChange={(
                event
              ) =>
                handleConsentChange(
                  event.target.checked
                )
              }
              className="mt-1 h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />

            <span>
              <span className="block font-bold text-gray-900">
                I consent to background screening
                <span className="ml-1 text-red-500">
                  *
                </span>
              </span>

              <span className="mt-1 block text-sm leading-relaxed text-gray-600">
                I authorize Carerity and its screening provider to arrange background screening when required for a care placement.
              </span>
            </span>
          </label>

          {showErrors &&
            !consent && (
              <p className="mt-3 text-sm font-semibold text-red-600">
                Background screening consent is required to continue.
              </p>
            )}
        </section>

        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-bold text-blue-900">
            No screening charge today
          </p>

          <p className="mt-1 text-sm leading-relaxed text-blue-900/80">
            Providing consent does not immediately start or charge for a background check.
          </p>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-gray-900">
                Current screening status
              </p>

              <p className="mt-1 text-xs text-gray-500">
                This will update as your application progresses.
              </p>
            </div>

            <ScreeningStatusPill
              status={
                screeningStatus
              }
            />
          </div>
        </section>

        {showErrors &&
          !isValid && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-bold text-red-900">
                Complete this section
              </p>

              <p className="mt-1 text-xs text-red-700">
                The outstanding requirement is highlighted in red above.
              </p>

              <ul className="mt-3 space-y-1 text-sm text-red-800">
                {sectionStatus
                  .missingFields
                  .map(
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

        {pageError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {pageError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={
              handleSaveAndExit
            }
            disabled={
              isSaving
            }
            className="min-h-[52px] rounded-xl border border-emerald-300 bg-white px-4 py-3 font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"
          >
            {isSaving
              ? "Saving..."
              : "Save & Exit"}
          </button>

          <button
            type="button"
            onClick={
              handleContinue
            }
            disabled={
              isSaving
            }
            className="min-h-[52px] rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:bg-emerald-300"
          >
            {isSaving
              ? "Saving..."
              : "Continue to Review"}
          </button>
        </div>
      </div>
    </OnboardingShell>
  );
}

function ProcessStep({
  number,
  title,
  description,
}: {
  number:
    string;

  title:
    string;

  description:
    string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
        {number}
      </div>

      <div>
        <p className="text-sm font-bold text-gray-900">
          {title}
        </p>

        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function ScreeningStatusPill({
  status,
}: {
  status:
    BackgroundScreeningStatus;
}) {
  const presentation:
    Record<
      BackgroundScreeningStatus,
      {
        label:
          string;

        className:
          string;
      }
    > =
    {
      not_started: {
        label:
          "Not started",

        className:
          "bg-gray-100 text-gray-600",
      },

      consent_received: {
        label:
          "Consent received",

        className:
          "bg-blue-100 text-blue-700",
      },

      in_progress: {
        label:
          "In progress",

        className:
          "bg-amber-100 text-amber-700",
      },

      completed: {
        label:
          "Completed",

        className:
          "bg-emerald-100 text-emerald-700",
      },

      needs_review: {
        label:
          "Needs review",

        className:
          "bg-orange-100 text-orange-700",
      },
    };

  const item =
    presentation[
      status
    ];

  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${item.className}`}
    >
      {item.label}
    </span>
  );
}

function OnboardingShell({
  children,
  stepLabel,
  backHref,
  isSigningOut,
  onSignOut,
}: {
  children:
    ReactNode;

  stepLabel:
    string;

  backHref:
    string;

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
              {stepLabel}
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
            href={
              backHref
            }
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
