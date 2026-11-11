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
  getProfessionalSectionStatus,
} from "../../../../lib/caregiverOnboardingDraft";

import {
  loadLatestCaregiverDraft,
  saveCaregiverDraftWithCloud,
  signOutCarerity,
} from "../../../../lib/caregiverOnboardingPersistence";

export default function CaregiverProfessionalPage() {
  const router =
    useRouter();

  const [
    hscpoaMember,
    setHscpoaMember,
  ] =
    useState(
      false
    );

  const [
    hscpoaNumber,
    setHscpoaNumber,
  ] =
    useState("");

  const [
    opswaMember,
    setOpswaMember,
  ] =
    useState(
      false
    );

  const [
    opswaMemberId,
    setOpswaMemberId,
  ] =
    useState("");

  const [
    liabilityInsurance,
    setLiabilityInsurance,
  ] =
    useState(
      false
    );

  const [
    insuranceProvider,
    setInsuranceProvider,
  ] =
    useState("");

  const [
    policyNumber,
    setPolicyNumber,
  ] =
    useState("");

  const [
    insuranceExpiry,
    setInsuranceExpiry,
  ] =
    useState("");

  const [
    baseDraft,
    setBaseDraft,
  ] =
    useState<
      CaregiverOnboardingDraft
    >({});

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

      setHscpoaMember(
        draft.hscpoaMember ??
          false
      );

      setHscpoaNumber(
        draft.hscpoaNumber ||
          ""
      );

      setOpswaMember(
        draft.opswaMember ??
          false
      );

      setOpswaMemberId(
        draft.opswaMemberId ||
          ""
      );

      setLiabilityInsurance(
        draft.liabilityInsurance ??
          false
      );

      setInsuranceProvider(
        draft
          .liabilityInsuranceProvider ||
          ""
      );

      setPolicyNumber(
        draft
          .liabilityInsurancePolicyNumber ||
          ""
      );

      setInsuranceExpiry(
        draft
          .liabilityInsuranceExpiry ||
          ""
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

        hscpoaMember,

        hscpoaNumber:
          hscpoaMember
            ? hscpoaNumber.trim()
            : "",

        opswaMember,

        opswaMemberId:
          opswaMember
            ? opswaMemberId.trim()
            : "",

        liabilityInsurance,

        liabilityInsuranceProvider:
          liabilityInsurance
            ? insuranceProvider.trim()
            : "",

        liabilityInsurancePolicyNumber:
          liabilityInsurance
            ? policyNumber.trim()
            : "",

        liabilityInsuranceExpiry:
          liabilityInsurance
            ? insuranceExpiry
            : "",
      }),
      [
        baseDraft,
        hscpoaMember,
        hscpoaNumber,
        opswaMember,
        opswaMemberId,
        liabilityInsurance,
        insuranceProvider,
        policyNumber,
        insuranceExpiry,
      ]
    );

  const sectionStatus =
    useMemo(
      () =>
        getProfessionalSectionStatus(
          effectiveDraft
        ),
      [
        effectiveDraft,
      ]
    );

  const hscpoaValid =
    !hscpoaMember ||
    hscpoaNumber.trim() !==
      "";

  const opswaValid =
    !opswaMember ||
    opswaMemberId.trim() !==
      "";

  const insuranceValid =
    !liabilityInsurance ||
    (
      insuranceProvider.trim() !==
        "" &&
      policyNumber.trim() !==
        "" &&
      insuranceExpiry !==
        ""
    );

  const insuranceExpired =
    liabilityInsurance &&
    insuranceExpiry !==
      "" &&
    new Date(
      `${insuranceExpiry}T23:59:59`
    ).getTime() <
      new Date().getTime();

  const isValid =
    sectionStatus.complete &&
    hscpoaValid &&
    opswaValid &&
    insuranceValid &&
    !insuranceExpired;

  function handleHscpoaChange(
    value:
      boolean
  ) {
    setHscpoaMember(
      value
    );

    if (!value) {
      setHscpoaNumber(
        ""
      );
    }
  }

  function handleOpswaChange(
    value:
      boolean
  ) {
    setOpswaMember(
      value
    );

    if (!value) {
      setOpswaMemberId(
        ""
      );
    }
  }

  function handleInsuranceChange(
    value:
      boolean
  ) {
    setLiabilityInsurance(
      value
    );

    if (!value) {
      setInsuranceProvider(
        ""
      );

      setPolicyNumber(
        ""
      );

      setInsuranceExpiry(
        ""
      );
    }
  }

  async function savePage() {
    return saveCaregiverDraftWithCloud(
      "professional",
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
            "Unable to save your professional details."
        );

        return;
      }

      router.push(
        "/caregiver/onboarding/background-check"
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
      stepLabel="6 of 7"
      backHref="/caregiver/onboarding/credentials"
      isSigningOut={
        isSigningOut
      }
      onSignOut={
        handleSignOut
      }
    >
      <div>
        <p className="text-sm font-bold text-emerald-700">
          Professional Details
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Memberships and insurance
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Add any professional memberships or insurance you currently hold.
        </p>

        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-900">
          These details are optional. HSCPOA registration and OPSWA membership are not required licences to join Carerity.
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <ProfessionalCard
          title="HSCPOA registration"
          description="Health & Supportive Care Providers of Ontario."
          selected={
            hscpoaMember
          }
          onChange={
            handleHscpoaChange
          }
          hasError={
            showErrors &&
            !hscpoaValid
          }
        >
          {hscpoaMember && (
            <TextField
              label="HSCPOA registration number"
              value={
                hscpoaNumber
              }
              onChange={
                setHscpoaNumber
              }
              placeholder="Enter registration number"
              error={
                showErrors &&
                !hscpoaValid
                  ? "Enter your HSCPOA registration number."
                  : ""
              }
            />
          )}
        </ProfessionalCard>

        <ProfessionalCard
          title="OPSWA membership"
          description="Ontario Personal Support Workers Association."
          selected={
            opswaMember
          }
          onChange={
            handleOpswaChange
          }
          hasError={
            showErrors &&
            !opswaValid
          }
        >
          {opswaMember && (
            <TextField
              label="OPSWA member ID"
              value={
                opswaMemberId
              }
              onChange={
                setOpswaMemberId
              }
              placeholder="Enter member ID"
              error={
                showErrors &&
                !opswaValid
                  ? "Enter your OPSWA member ID."
                  : ""
              }
            />
          )}
        </ProfessionalCard>

        <ProfessionalCard
          title="Professional liability insurance"
          description="Add your policy details if you currently carry coverage."
          selected={
            liabilityInsurance
          }
          onChange={
            handleInsuranceChange
          }
          hasError={
            showErrors &&
            (
              !insuranceValid ||
              insuranceExpired
            )
          }
        >
          {liabilityInsurance && (
            <div className="space-y-4">
              <TextField
                label="Insurance provider"
                value={
                  insuranceProvider
                }
                onChange={
                  setInsuranceProvider
                }
                placeholder="Insurance company"
                error={
                  showErrors &&
                  insuranceProvider.trim() ===
                    ""
                    ? "Enter your insurance provider."
                    : ""
                }
              />

              <TextField
                label="Policy number"
                value={
                  policyNumber
                }
                onChange={
                  setPolicyNumber
                }
                placeholder="Policy number"
                error={
                  showErrors &&
                  policyNumber.trim() ===
                    ""
                    ? "Enter your policy number."
                    : ""
                }
              />

              <label className="block">
                <span className="text-sm font-bold text-gray-900">
                  Policy expiry date
                </span>

                <input
                  type="date"
                  value={
                    insuranceExpiry
                  }
                  onChange={(
                    event
                  ) =>
                    setInsuranceExpiry(
                      event.target.value
                    )
                  }
                  className={`mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 ${
                    showErrors &&
                    (
                      insuranceExpiry ===
                        "" ||
                      insuranceExpired
                    )
                      ? "border-red-400 focus:ring-red-100"
                      : "border-gray-300 focus:border-emerald-400 focus:ring-emerald-100"
                  }`}
                />

                {showErrors &&
                  insuranceExpiry ===
                    "" && (
                    <p className="mt-1 text-sm font-semibold text-red-600">
                      Enter the policy expiry date.
                    </p>
                  )}

                {insuranceExpired && (
                  <p className="mt-1 text-sm font-semibold text-red-600">
                    This policy appears to be expired.
                  </p>
                )}
              </label>
            </div>
          )}
        </ProfessionalCard>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-bold text-gray-900">
            No memberships or insurance?
          </p>

          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            Leave the options off and continue. You can add these details later from your professional profile.
          </p>
        </div>

        {showErrors &&
          !isValid && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-bold text-red-900">
                Check your professional details
              </p>

              <p className="mt-1 text-xs text-red-700">
                Any incomplete selected item is highlighted above.
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

                {insuranceExpired && (
                  <li>
                    • Add a current liability insurance policy.
                  </li>
                )}
              </ul>
            </div>
          )}

        {pageError && (
          <NoticeBox
            message={
              pageError
            }
          />
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
              : "Continue"}
          </button>
        </div>
      </div>
    </OnboardingShell>
  );
}

function ProfessionalCard({
  title,
  description,
  selected,
  onChange,
  children,
  hasError,
}: {
  title:
    string;

  description:
    string;

  selected:
    boolean;

  onChange:
    (
      value:
        boolean
    ) => void;

  children?:
    ReactNode;

  hasError:
    boolean;
}) {
  return (
    <section
      className={`rounded-2xl border p-4 transition ${
        hasError
          ? "border-red-400 bg-red-50"
          : selected
            ? "border-emerald-300 bg-emerald-50/60"
            : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <button
          type="button"
          onClick={() =>
            onChange(
              !selected
            )
          }
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs ${
              selected
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-gray-300 bg-white text-transparent"
            }`}
          >
            ✓
          </span>

          <span>
            <span className="block font-bold text-gray-900">
              {title}
            </span>

            <span className="mt-1 block text-xs leading-relaxed text-gray-500">
              {description}
            </span>
          </span>
        </button>

        <button
          type="button"
          role="switch"
          aria-checked={
            selected
          }
          aria-label={`Toggle ${title}`}
          onClick={() =>
            onChange(
              !selected
            )
          }
          className={`relative h-8 w-14 shrink-0 rounded-full transition ${
            selected
              ? "bg-emerald-600"
              : "bg-gray-300"
          }`}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all ${
              selected
                ? "left-7"
                : "left-1"
            }`}
          />
        </button>
      </div>

      {selected && (
        <div className={`mt-5 border-t pt-5 ${
          hasError
            ? "border-red-200"
            : "border-emerald-200"
        }`}>
          {children}
        </div>
      )}
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  label:
    string;

  value:
    string;

  onChange:
    (
      value:
        string
    ) => void;

  placeholder?:
    string;

  error?:
    string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-gray-900">
        {label}
      </span>

      <input
        type="text"
        value={
          value
        }
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        placeholder={
          placeholder
        }
        className={`mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 ${
          error
            ? "border-red-400 focus:ring-red-100"
            : "border-gray-300 focus:border-emerald-400 focus:ring-emerald-100"
        }`}
      />

      {error && (
        <p className="mt-1 text-sm font-semibold text-red-600">
          {error}
        </p>
      )}
    </label>
  );
}

function NoticeBox({
  message,
}: {
  message:
    string;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {message}
    </div>
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
