"use client";

import {
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  CaregiverLanguage,
  FluencyLevel,
  getCaregiverOnboardingDraft,
  getExperienceSectionStatus,
} from "../../../../lib/caregiverOnboardingDraft";

import {
  loadCaregiverOnboardingDraftFromSupabase,
  saveCaregiverOnboardingToSupabase,
  signOutCarerity,
} from "../../../../lib/caregiverOnboardingPersistence";

const QUALIFICATIONS = [
  {
    value: "PSW",
    label:
      "Personal Support Worker (PSW)",
  },
  {
    value: "DSW",
    label:
      "Developmental Services Worker (DSW)",
  },
  {
    value: "HCA",
    label:
      "Health Care Aide",
  },
  {
    value: "RPN",
    label:
      "Registered Practical Nurse (RPN)",
  },
  {
    value: "RN",
    label:
      "Registered Nurse (RN)",
  },
  {
    value: "Nursing Student",
    label:
      "Nursing student",
  },
  {
    value: "Other",
    label:
      "Other relevant qualification",
  },
];

const EXPERIENCE_CATEGORIES = [
  "Personal care",
  "Companionship",
  "Memory care / dementia",
  "Mobility support",
  "Meal support",
  "Medication reminders",
  "Hospital discharge support",
  "Post-surgery support",
  "Palliative support",
  "Appointment accompaniment",
  "Developmental support",
  "Respite care",
];

const LANGUAGE_OPTIONS = [
  "English",
  "French",
  "Arabic",
  "Cantonese",
  "Farsi",
  "Filipino / Tagalog",
  "Greek",
  "Hindi",
  "Italian",
  "Mandarin",
  "Portuguese",
  "Punjabi",
  "Russian",
  "Spanish",
  "Tamil",
  "Ukrainian",
  "Urdu",
  "Yoruba",
];

const FLUENCY_OPTIONS:
  FluencyLevel[] = [
    "Basic",
    "Conversational",
    "Fluent",
    "Native / Bilingual",
  ];

export default function CaregiverExperiencePage() {
  const router =
    useRouter();

  const [
    qualificationTypes,
    setQualificationTypes,
  ] =
    useState<string[]>(
      []
    );

  const [
    qualificationOther,
    setQualificationOther,
  ] =
    useState("");

  const [
    yearsExperience,
    setYearsExperience,
  ] =
    useState("1");

  const [
    experienceCategories,
    setExperienceCategories,
  ] =
    useState<string[]>(
      []
    );

  const [
    otherExperienceCategory,
    setOtherExperienceCategory,
  ] =
    useState("");

  const [
    languages,
    setLanguages,
  ] =
    useState<
      CaregiverLanguage[]
    >([]);

  const [
    showErrors,
    setShowErrors,
  ] =
    useState(false);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [
    isSigningOut,
    setIsSigningOut,
  ] =
    useState(false);

  const [
    saveError,
    setSaveError,
  ] =
    useState("");

  const [
    savedMessage,
    setSavedMessage,
  ] =
    useState("");

  useEffect(() => {
    let mounted =
      true;

    function applyDraft(
      draft: ReturnType<
        typeof getCaregiverOnboardingDraft
      >
    ) {
      const savedQualifications =
        draft.qualificationTypes &&
        draft.qualificationTypes
          .length >
          0
          ? draft.qualificationTypes
          : draft.qualificationType
            ? [
                draft.qualificationType,
              ]
            : [];

      setQualificationTypes(
        savedQualifications
      );

      setQualificationOther(
        draft.qualificationOther ||
          ""
      );

      setYearsExperience(
        String(
          draft.yearsExperience ??
            1
        )
      );

      setExperienceCategories(
        draft.experienceCategories ||
          []
      );

      setOtherExperienceCategory(
        draft.otherExperienceCategory ||
          ""
      );

      setLanguages(
        draft.languages ||
          []
      );
    }

    async function loadPage() {
      applyDraft(
        getCaregiverOnboardingDraft()
      );

      const result =
        await loadCaregiverOnboardingDraftFromSupabase();

      if (!mounted) {
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

      if (
        result.success
      ) {
        applyDraft(
          result.draft
        );
      } else if (
        result.error
      ) {
        setSaveError(
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
  }, [router]);

  const numericYears =
    Number(
      yearsExperience
    );

  const effectiveDraft =
    useMemo(
      () => ({
        ...getCaregiverOnboardingDraft(),

        qualificationType:
          qualificationTypes[0],

        qualificationTypes,

        qualificationOther:
          qualificationOther.trim(),

        yearsExperience:
          numericYears,

        experienceCategories,

        otherExperienceCategory:
          otherExperienceCategory.trim(),

        languages,
      }),
      [
        qualificationTypes,
        qualificationOther,
        numericYears,
        experienceCategories,
        otherExperienceCategory,
        languages,
      ]
    );

  const sectionStatus =
    useMemo(
      () =>
        getExperienceSectionStatus(
          effectiveDraft
        ),
      [
        effectiveDraft,
      ]
    );

  const isYearsValid =
    yearsExperience.trim() !==
      "" &&
    Number.isFinite(
      numericYears
    ) &&
    numericYears >=
      0 &&
    numericYears <=
      60;

  const needsOtherQualification =
    qualificationTypes.includes(
      "Other"
    );

  const isOtherQualificationValid =
    !needsOtherQualification ||
    qualificationOther.trim() !==
      "";

  const qualificationsMissing =
    qualificationTypes.length ===
    0;

  const experienceMissing =
    experienceCategories.length ===
    0;

  const languagesMissing =
    languages.length ===
    0;

  const isValid =
    sectionStatus.complete &&
    isYearsValid &&
    isOtherQualificationValid;

  function clearSaveNotice() {
    if (saveError) {
      setSaveError("");
    }

    if (savedMessage) {
      setSavedMessage("");
    }
  }

  function toggleQualification(
    value: string
  ) {
    setQualificationTypes(
      (current) =>
        current.includes(
          value
        )
          ? current.filter(
              (item) =>
                item !==
                value
            )
          : [
              ...current,
              value,
            ]
    );

    clearSaveNotice();
  }

  function toggleExperienceCategory(
    category: string
  ) {
    setExperienceCategories(
      (current) =>
        current.includes(
          category
        )
          ? current.filter(
              (item) =>
                item !==
                category
            )
          : [
              ...current,
              category,
            ]
    );

    clearSaveNotice();
  }

  function toggleLanguage(
    language: string
  ) {
    setLanguages(
      (current) => {
        const exists =
          current.some(
            (item) =>
              item.language ===
              language
          );

        if (exists) {
          return current.filter(
            (item) =>
              item.language !==
              language
          );
        }

        return [
          ...current,
          {
            language,
            fluency:
              "Conversational",
          },
        ];
      }
    );

    clearSaveNotice();
  }

  function updateLanguageFluency(
    language: string,
    fluency: FluencyLevel
  ) {
    setLanguages(
      (current) =>
        current.map(
          (item) =>
            item.language ===
            language
              ? {
                  ...item,
                  fluency,
                }
              : item
        )
    );

    clearSaveNotice();
  }

  function buildUpdate() {
    return {
      qualificationType:
        qualificationTypes[0],

      qualificationTypes,

      qualificationOther:
        qualificationOther.trim(),

      yearsExperience:
        numericYears,

      experienceCategories,

      otherExperienceCategory:
        otherExperienceCategory.trim(),

      languages,
    };
  }

  async function saveExperience(
    requireComplete: boolean
  ) {
    if (isSaving) {
      return false;
    }

    setSaveError("");
    setSavedMessage("");

    if (requireComplete) {
      setShowErrors(true);

      if (!isValid) {
        return false;
      }
    }

    setIsSaving(true);

    try {
      const result =
        await saveCaregiverOnboardingToSupabase(
          "experience",
          buildUpdate()
        );

      if (
        !result.authenticated
      ) {
        router.replace(
          "/caregiver/login"
        );

        return false;
      }

      if (
        !result.success
      ) {
        setSaveError(
          result.error ||
            "Your experience could not be saved online."
        );

        return false;
      }

      setSavedMessage(
        "Your progress has been saved."
      );

      return true;
    } finally {
      setIsSaving(
        false
      );
    }
  }

  async function handleContinue() {
    const saved =
      await saveExperience(
        true
      );

    if (!saved) {
      return;
    }

    router.push(
      "/caregiver/onboarding/preferences"
    );
  }

  async function handleSaveAndExit() {
    const saved =
      await saveExperience(
        false
      );

    if (!saved) {
      return;
    }

    router.push(
      "/caregiver/onboarding"
    );
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

    setSaveError("");

    const result =
      await signOutCarerity();

    if (
      !result.success
    ) {
      setSaveError(
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
      stepLabel="2 of 7"
      backHref="/caregiver/onboarding/profile"
      isSigningOut={
        isSigningOut
      }
      onSignOut={
        handleSignOut
      }
    >
      <div>
        <p className="text-sm font-bold text-emerald-700">
          Skills & Experience
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Your care experience
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Tell us about your qualifications, experience and languages.
        </p>
      </div>

      <div className="mt-6 space-y-6">
        <section
          className={`rounded-2xl border p-4 ${
            showErrors &&
            (
              qualificationsMissing ||
              !isOtherQualificationValid
            )
              ? "border-red-400 bg-red-50"
              : "border-gray-200 bg-white"
          }`}
        >
          <div>
            <p className="text-sm font-bold text-gray-900">
              Qualifications
              <span className="ml-1 text-red-500">
                *
              </span>
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Select every qualification that applies.
            </p>
          </div>

          <div className="mt-3 space-y-2">
            {QUALIFICATIONS.map(
              (
                qualification
              ) => {
                const selected =
                  qualificationTypes.includes(
                    qualification.value
                  );

                return (
                  <button
                    key={
                      qualification.value
                    }
                    type="button"
                    onClick={() =>
                      toggleQualification(
                        qualification.value
                      )
                    }
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      selected
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/40"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs ${
                        selected
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-gray-300 bg-white text-transparent"
                      }`}
                    >
                      ✓
                    </span>

                    {
                      qualification.label
                    }
                  </button>
                );
              }
            )}
          </div>

          {needsOtherQualification && (
            <label className="mt-3 block">
              <span className="text-sm font-bold">
                Other qualification
                <span className="ml-1 text-red-500">
                  *
                </span>
              </span>

              <input
                type="text"
                value={
                  qualificationOther
                }
                onChange={(event) => {
                  setQualificationOther(
                    event.target.value
                  );

                  clearSaveNotice();
                }}
                placeholder="Enter your qualification"
                className={`mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 ${
                  showErrors &&
                  !isOtherQualificationValid
                    ? "border-red-400 bg-red-50 focus:ring-red-100"
                    : "border-gray-300 focus:border-emerald-400 focus:ring-emerald-100"
                }`}
              />

              {showErrors &&
                !isOtherQualificationValid && (
                  <p className="mt-1 text-sm font-semibold text-red-600">
                    Enter your other qualification.
                  </p>
                )}
            </label>
          )}

          {showErrors &&
            qualificationsMissing && (
              <p className="mt-3 text-sm font-semibold text-red-600">
                Select at least one qualification.
              </p>
            )}
        </section>

        <section
          className={`rounded-2xl border p-4 ${
            showErrors &&
            !isYearsValid
              ? "border-red-400 bg-red-50"
              : "border-gray-200 bg-white"
          }`}
        >
          <label className="block">
            <span className="text-sm font-bold text-gray-900">
              Years of care experience
              <span className="ml-1 text-red-500">
                *
              </span>
            </span>

            <input
              type="number"
              min="0"
              max="60"
              step="1"
              value={
                yearsExperience
              }
              onChange={(event) => {
                setYearsExperience(
                  event.target.value
                );

                clearSaveNotice();
              }}
              className={`mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 ${
                showErrors &&
                !isYearsValid
                  ? "border-red-400 bg-red-50 focus:ring-red-100"
                  : "border-gray-300 focus:border-emerald-400 focus:ring-emerald-100"
              }`}
            />
          </label>

          {showErrors &&
            !isYearsValid && (
              <p className="mt-1 text-sm font-semibold text-red-600">
                Enter a valid number of years between 0 and 60.
              </p>
            )}
        </section>

        <section
          className={`rounded-2xl border p-4 ${
            showErrors &&
            experienceMissing
              ? "border-red-400 bg-red-50"
              : "border-gray-200 bg-white"
          }`}
        >
          <div>
            <p className="text-sm font-bold text-gray-900">
              Care experience
              <span className="ml-1 text-red-500">
                *
              </span>
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Select the types of care you have experience providing.
            </p>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {EXPERIENCE_CATEGORIES.map(
              (
                category
              ) => {
                const selected =
                  experienceCategories.includes(
                    category
                  );

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() =>
                      toggleExperienceCategory(
                        category
                      )
                    }
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      selected
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300"
                    }`}
                  >
                    {selected
                      ? "✓ "
                      : ""}
                    {category}
                  </button>
                );
              }
            )}
          </div>

          <label className="mt-3 block">
            <span className="text-sm font-bold">
              Other experience{" "}
              <span className="font-medium text-gray-400">
                (optional)
              </span>
            </span>

            <input
              type="text"
              value={
                otherExperienceCategory
              }
              onChange={(event) => {
                setOtherExperienceCategory(
                  event.target.value
                );

                clearSaveNotice();
              }}
              placeholder="Add another care experience"
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          {showErrors &&
            experienceMissing && (
              <p className="mt-3 text-sm font-semibold text-red-600">
                Select at least one care experience.
              </p>
            )}
        </section>

        <section
          className={`rounded-2xl border p-4 ${
            showErrors &&
            languagesMissing
              ? "border-red-400 bg-red-50"
              : "border-gray-200 bg-white"
          }`}
        >
          <div>
            <p className="text-sm font-bold text-gray-900">
              Languages
              <span className="ml-1 text-red-500">
                *
              </span>
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Select the languages you can use with clients.
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {LANGUAGE_OPTIONS.map(
              (
                language
              ) => {
                const selected =
                  languages.some(
                    (item) =>
                      item.language ===
                      language
                  );

                return (
                  <button
                    key={language}
                    type="button"
                    onClick={() =>
                      toggleLanguage(
                        language
                      )
                    }
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                      selected
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300"
                    }`}
                  >
                    {selected
                      ? "✓ "
                      : ""}
                    {language}
                  </button>
                );
              }
            )}
          </div>

          {languages.length >
            0 && (
            <div className="mt-4 space-y-3">
              {languages.map(
                (
                  language
                ) => (
                  <div
                    key={
                      language.language
                    }
                    className="grid grid-cols-1 items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:grid-cols-2"
                  >
                    <p className="font-semibold text-gray-900">
                      {
                        language.language
                      }
                    </p>

                    <label>
                      <span className="sr-only">
                        {
                          language.language
                        }{" "}
                        fluency
                      </span>

                      <select
                        value={
                          language.fluency
                        }
                        onChange={(event) =>
                          updateLanguageFluency(
                            language.language,
                            event
                              .target
                              .value as FluencyLevel
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
                      >
                        {FLUENCY_OPTIONS.map(
                          (
                            fluency
                          ) => (
                            <option
                              key={
                                fluency
                              }
                              value={
                                fluency
                              }
                            >
                              {
                                fluency
                              }
                            </option>
                          )
                        )}
                      </select>
                    </label>
                  </div>
                )
              )}
            </div>
          )}

          {showErrors &&
            languagesMissing && (
              <p className="mt-3 text-sm font-semibold text-red-600">
                Select at least one language.
              </p>
            )}
        </section>

        {showErrors &&
          !isValid && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-bold text-red-900">
                Complete your experience
              </p>

              <p className="mt-1 text-xs text-red-700">
                Outstanding required sections are highlighted in red above.
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

        {saveError && (
          <NoticeBox
            tone="error"
            message={
              saveError
            }
          />
        )}

        {savedMessage && (
          <NoticeBox
            tone="success"
            message={`✓ ${savedMessage}`}
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
            className="min-h-[52px] w-full rounded-xl border border-emerald-300 bg-white px-4 py-3.5 font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"
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
            className="min-h-[52px] w-full rounded-xl bg-emerald-600 px-4 py-3.5 font-semibold text-white transition hover:bg-emerald-700 disabled:bg-emerald-300"
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

function NoticeBox({
  tone,
  message,
}: {
  tone:
    | "error"
    | "success";
  message: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 text-sm ${
        tone ===
        "success"
          ? "border-emerald-200 bg-emerald-50 font-semibold text-emerald-800"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
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
  children: ReactNode;
  stepLabel: string;
  backHref: string;
  isSigningOut: boolean;
  onSignOut: () => void;
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
