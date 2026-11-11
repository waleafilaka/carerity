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
  getCaregiverOnboardingDraft,
  getPreferencesSectionStatus,
} from "../../../../lib/caregiverOnboardingDraft";

import {
  loadCaregiverOnboardingDraftFromSupabase,
  saveCaregiverOnboardingToSupabase,
  signOutCarerity,
} from "../../../../lib/caregiverOnboardingPersistence";

/*
 * ============================================================
 * LEGACY COMPATIBILITY
 * ============================================================
 *
 * Caregivers NO LONGER choose their own service radius.
 *
 * Carerity will control geographic matching internally using:
 *
 * - verified caregiver coordinates
 * - verified care-location coordinates
 * - actual proximity
 * - availability
 * - care needs
 * - transport practicality
 *
 * The existing onboarding draft currently still requires
 * serviceRadiusKm >= 15 to mark Preferences complete.
 *
 * Therefore 15 is temporarily written silently to the draft
 * so existing completion logic does not break.
 *
 * IT MUST NOT BE USED AS A MATCHING LIMIT.
 *
 * We will remove this compatibility field from validation
 * when caregiverOnboardingDraft.ts is updated next.
 * ============================================================
 */

const LEGACY_COMPATIBILITY_RADIUS_KM =
  15;

export default function CaregiverPreferencesPage() {
  const router =
    useRouter();

  const [
    availableForWork,
    setAvailableForWork,
  ] =
    useState<
      boolean | undefined
    >(
      undefined
    );

  const [
    canDrive,
    setCanDrive,
  ] =
    useState<
      boolean | undefined
    >(
      undefined
    );

  const [
    ownsVehicle,
    setOwnsVehicle,
  ] =
    useState<
      boolean | undefined
    >(
      undefined
    );

  const [
    willingToTransportClient,
    setWillingToTransportClient,
  ] =
    useState<
      boolean | undefined
    >(
      undefined
    );

  const [
    acceptsLiveOut,
    setAcceptsLiveOut,
  ] =
    useState(
      false
    );

  const [
    acceptsLiveIn,
    setAcceptsLiveIn,
  ] =
    useState(
      false
    );

  const [
    acceptsOvernight,
    setAcceptsOvernight,
  ] =
    useState(
      false
    );

  const [
    showErrors,
    setShowErrors,
  ] =
    useState(
      false
    );

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

  const [
    saveError,
    setSaveError,
  ] =
    useState(
      ""
    );

  const [
    savedMessage,
    setSavedMessage,
  ] =
    useState(
      ""
    );

  /*
   * ============================================================
   * LOAD
   * ============================================================
   */

  useEffect(() => {
    let mounted =
      true;

    function applyDraft(
      draft:
        ReturnType<
          typeof getCaregiverOnboardingDraft
        >
    ) {
      setAvailableForWork(
        draft.availableForWork
      );

      setCanDrive(
        draft.canDrive
      );

      setOwnsVehicle(
        draft.ownsVehicle
      );

      setWillingToTransportClient(
        draft.willingToTransportClient
      );

      setAcceptsLiveOut(
        draft.acceptsLiveOut ??
          false
      );

      setAcceptsLiveIn(
        draft.acceptsLiveIn ??
          false
      );

      setAcceptsOvernight(
        draft.acceptsOvernight ??
          false
      );
    }

    async function loadPage() {
      applyDraft(
        getCaregiverOnboardingDraft()
      );

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
  }, [
    router,
  ]);

  /*
   * ============================================================
   * EFFECTIVE DRAFT
   * ============================================================
   */

  const effectiveDraft =
    useMemo(
      () => ({
        ...getCaregiverOnboardingDraft(),

        availableForWork,

        /*
         * Temporary compatibility only.
         *
         * Not caregiver-selected.
         * Not a matching boundary.
         */
        serviceRadiusKm:
          LEGACY_COMPATIBILITY_RADIUS_KM,

        canDrive,

        ownsVehicle:
          canDrive ===
          true
            ? ownsVehicle
            : false,

        willingToTransportClient:
          canDrive ===
          true
            ? willingToTransportClient
            : false,

        acceptsLiveOut,

        acceptsLiveIn,

        acceptsOvernight,
      }),
      [
        availableForWork,
        canDrive,
        ownsVehicle,
        willingToTransportClient,
        acceptsLiveOut,
        acceptsLiveIn,
        acceptsOvernight,
      ]
    );

  const sectionStatus =
    useMemo(
      () =>
        getPreferencesSectionStatus(
          effectiveDraft
        ),
      [
        effectiveDraft,
      ]
    );

  const hasWorkType =
    acceptsLiveOut ||
    acceptsLiveIn ||
    acceptsOvernight;

  const drivingDetailsComplete =
    canDrive ===
      false ||
    (
      canDrive ===
        true &&
      typeof ownsVehicle ===
        "boolean" &&
      typeof willingToTransportClient ===
        "boolean"
    );

  const availabilityMissing =
    availableForWork ===
    undefined;

  const drivingMissing =
    canDrive ===
    undefined;

  const vehicleMissing =
    canDrive ===
      true &&
    typeof ownsVehicle !==
      "boolean";

  const transportationMissing =
    canDrive ===
      true &&
    typeof willingToTransportClient !==
      "boolean";

  const isValid =
    sectionStatus.complete &&
    availableForWork !==
      undefined &&
    canDrive !==
      undefined &&
    drivingDetailsComplete &&
    hasWorkType;

  /*
   * ============================================================
   * HELPERS
   * ============================================================
   */

  function clearSaveNotice() {
    if (
      saveError
    ) {
      setSaveError(
        ""
      );
    }

    if (
      savedMessage
    ) {
      setSavedMessage(
        ""
      );
    }
  }

  function handleDrivingChange(
    value:
      boolean
  ) {
    setCanDrive(
      value
    );

    if (
      !value
    ) {
      setOwnsVehicle(
        false
      );

      setWillingToTransportClient(
        false
      );
    }

    clearSaveNotice();
  }

  function buildUpdate() {
    return {
      availableForWork,

      /*
       * Temporary only until the central draft
       * validation is updated.
       *
       * This is NOT a matching radius.
       */
      serviceRadiusKm:
        LEGACY_COMPATIBILITY_RADIUS_KM,

      canDrive,

      ownsVehicle:
        canDrive ===
        true
          ? Boolean(
              ownsVehicle
            )
          : false,

      willingToTransportClient:
        canDrive ===
        true
          ? Boolean(
              willingToTransportClient
            )
          : false,

      acceptsLiveOut,

      acceptsLiveIn,

      acceptsOvernight,
    };
  }

  /*
   * ============================================================
   * SAVE
   * ============================================================
   */

  async function savePreferences(
    requireComplete:
      boolean
  ) {
    if (
      isSaving
    ) {
      return false;
    }

    setSaveError(
      ""
    );

    setSavedMessage(
      ""
    );

    if (
      requireComplete
    ) {
      setShowErrors(
        true
      );

      if (
        !isValid
      ) {
        return false;
      }
    }

    setIsSaving(
      true
    );

    try {
      const result =
        await saveCaregiverOnboardingToSupabase(
          "preferences",
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
            "Your work preferences could not be saved online."
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
      await savePreferences(
        true
      );

    if (
      !saved
    ) {
      return;
    }

    router.push(
      "/caregiver/onboarding/availability"
    );
  }

  async function handleSaveAndExit() {
    const saved =
      await savePreferences(
        false
      );

    if (
      !saved
    ) {
      return;
    }

    router.push(
      "/caregiver/onboarding"
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

    setSaveError(
      ""
    );

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

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <OnboardingShell
      stepLabel="3 of 7"
      backHref="/caregiver/onboarding/experience"
      isSigningOut={
        isSigningOut
      }
      onSignOut={
        handleSignOut
      }
    >
      <div>
        <p className="text-sm font-bold text-emerald-700">
          Work Preferences
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          How would you like to work?
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          Tell us about your availability, transportation and preferred care arrangements.
        </p>
      </div>

      <div className="mt-6 space-y-6">
        {/* CURRENT AVAILABILITY */}

        <section
          className={`rounded-2xl border p-4 ${
            showErrors &&
            availabilityMissing
              ? "border-red-400 bg-red-50"
              : "border-gray-200 bg-white"
          }`}
        >
          <p className="text-sm font-bold text-gray-900">
            Are you currently available for care opportunities?

            <span className="ml-1 text-red-500">
              *
            </span>
          </p>

          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            You can change this anytime from your caregiver workspace.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <ChoiceButton
              selected={
                availableForWork ===
                true
              }
              label="Yes"
              onClick={() => {
                setAvailableForWork(
                  true
                );

                clearSaveNotice();
              }}
            />

            <ChoiceButton
              selected={
                availableForWork ===
                false
              }
              label="Not right now"
              onClick={() => {
                setAvailableForWork(
                  false
                );

                clearSaveNotice();
              }}
            />
          </div>

          {showErrors &&
            availabilityMissing && (
              <p className="mt-2 text-sm font-semibold text-red-600">
                Select your current availability.
              </p>
            )}

          {availableForWork ===
            false && (
            <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
              You can complete your profile now and turn availability on when you are ready to receive opportunities.
            </div>
          )}
        </section>

        {/* PROXIMITY EXPLANATION */}

        <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-sm font-bold text-emerald-900">
            Nearby opportunities
          </p>

          <p className="mt-1 text-sm leading-relaxed text-emerald-800">
            Carerity uses your verified location, availability and the location of each care request to identify practical nearby opportunities.
          </p>

          <p className="mt-2 text-xs leading-relaxed text-emerald-700">
            You do not need to choose a fixed service radius. Suitable opportunities will be prioritized by proximity and care requirements.
          </p>
        </section>

        {/* DRIVING */}

        <section
          className={`rounded-2xl border p-4 ${
            showErrors &&
            (
              drivingMissing ||
              vehicleMissing ||
              transportationMissing
            )
              ? "border-red-400 bg-red-50"
              : "border-gray-200 bg-white"
          }`}
        >
          <div>
            <p className="font-bold text-gray-900">
              Driving and transportation

              <span className="ml-1 text-red-500">
                *
              </span>
            </p>

            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              Transportation information helps Carerity determine which care opportunities are practical for you.
            </p>
          </div>

          <div className="mt-4">
            <p className="text-sm font-bold">
              Can you drive?
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <ChoiceButton
                selected={
                  canDrive ===
                  true
                }
                label="Yes"
                onClick={() =>
                  handleDrivingChange(
                    true
                  )
                }
              />

              <ChoiceButton
                selected={
                  canDrive ===
                  false
                }
                label="No"
                onClick={() =>
                  handleDrivingChange(
                    false
                  )
                }
              />
            </div>

            {showErrors &&
              drivingMissing && (
                <p className="mt-2 text-sm font-semibold text-red-600">
                  Select whether you can drive.
                </p>
              )}
          </div>

          {canDrive ===
            true && (
            <div className="mt-5 space-y-5 border-t border-gray-100 pt-5">
              <div
                className={`rounded-xl p-3 ${
                  showErrors &&
                  vehicleMissing
                    ? "border border-red-300 bg-red-50"
                    : ""
                }`}
              >
                <p className="text-sm font-bold">
                  Do you have access to your own vehicle?

                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </p>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <ChoiceButton
                    selected={
                      ownsVehicle ===
                      true
                    }
                    label="Yes"
                    onClick={() => {
                      setOwnsVehicle(
                        true
                      );

                      clearSaveNotice();
                    }}
                  />

                  <ChoiceButton
                    selected={
                      ownsVehicle ===
                      false
                    }
                    label="No"
                    onClick={() => {
                      setOwnsVehicle(
                        false
                      );

                      clearSaveNotice();
                    }}
                  />
                </div>

                {showErrors &&
                  vehicleMissing && (
                    <p className="mt-2 text-sm font-semibold text-red-600">
                      Select whether you have access to a vehicle.
                    </p>
                  )}
              </div>

              <div
                className={`rounded-xl p-3 ${
                  showErrors &&
                  transportationMissing
                    ? "border border-red-300 bg-red-50"
                    : ""
                }`}
              >
                <p className="text-sm font-bold">
                  Are you willing to transport a client?

                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </p>

                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  Only for suitable care requests and where transportation has been agreed.
                </p>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <ChoiceButton
                    selected={
                      willingToTransportClient ===
                      true
                    }
                    label="Yes"
                    onClick={() => {
                      setWillingToTransportClient(
                        true
                      );

                      clearSaveNotice();
                    }}
                  />

                  <ChoiceButton
                    selected={
                      willingToTransportClient ===
                      false
                    }
                    label="No"
                    onClick={() => {
                      setWillingToTransportClient(
                        false
                      );

                      clearSaveNotice();
                    }}
                  />
                </div>

                {showErrors &&
                  transportationMissing && (
                    <p className="mt-2 text-sm font-semibold text-red-600">
                      Select your transportation preference.
                    </p>
                  )}
              </div>
            </div>
          )}
        </section>

        {/* CARE ARRANGEMENT */}

        <section
          className={`rounded-2xl border p-4 ${
            showErrors &&
            !hasWorkType
              ? "border-red-400 bg-red-50"
              : "border-gray-200 bg-white"
          }`}
        >
          <div>
            <p className="text-sm font-bold text-gray-900">
              Care arrangement

              <span className="ml-1 text-red-500">
                *
              </span>
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Select every arrangement you may accept.
            </p>
          </div>

          <div className="mt-3 space-y-3">
            <ToggleCard
              title="Live-out care"
              detail="Travel to the client and leave after the scheduled visit."
              selected={
                acceptsLiveOut
              }
              onClick={() => {
                setAcceptsLiveOut(
                  (
                    current
                  ) =>
                    !current
                );

                clearSaveNotice();
              }}
            />

            <ToggleCard
              title="Live-in care"
              detail="Stay in the client’s home for an agreed period."
              selected={
                acceptsLiveIn
              }
              onClick={() => {
                setAcceptsLiveIn(
                  (
                    current
                  ) =>
                    !current
                );

                clearSaveNotice();
              }}
            />

            <ToggleCard
              title="Overnight care"
              detail="Provide care during overnight hours."
              selected={
                acceptsOvernight
              }
              onClick={() => {
                setAcceptsOvernight(
                  (
                    current
                  ) =>
                    !current
                );

                clearSaveNotice();
              }}
            />
          </div>

          {showErrors &&
            !hasWorkType && (
              <p className="mt-3 text-sm font-semibold text-red-600">
                Select at least one care arrangement.
              </p>
            )}
        </section>

        {/* VALIDATION */}

        {showErrors &&
          !isValid && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-bold text-red-900">
                Complete your work preferences
              </p>

              <p className="mt-1 text-xs text-red-700">
                Outstanding required selections are highlighted above.
              </p>

              <ul className="mt-3 space-y-1 text-sm text-red-800">
                {sectionStatus
                  .missingFields
                  .filter(
                    (
                      field
                    ) =>
                      !field
                        .toLowerCase()
                        .includes(
                          "service radius"
                        )
                  )
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

        {/* MESSAGES */}

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

        {/* ACTIONS */}

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

/*
 * ============================================================
 * UI COMPONENTS
 * ============================================================
 */

function ChoiceButton({
  selected,
  label,
  onClick,
}: {
  selected:
    boolean;

  label:
    string;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
        selected
          ? "border-emerald-500 bg-emerald-50 text-emerald-800"
          : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/40"
      }`}
    >
      {selected
        ? "✓ "
        : ""}

      {
        label
      }
    </button>
  );
}

function ToggleCard({
  title,
  detail,
  selected,
  onClick,
}: {
  title:
    string;

  detail:
    string;

  selected:
    boolean;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-emerald-400 bg-emerald-50"
          : "border-gray-200 bg-white hover:border-emerald-300"
      }`}
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
          {
            title
          }
        </span>

        <span className="mt-1 block text-xs leading-relaxed text-gray-500">
          {
            detail
          }
        </span>
      </span>
    </button>
  );
}

function NoticeBox({
  tone,
  message,
}: {
  tone:
    | "error"
    | "success";

  message:
    string;
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
      {
        message
      }
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
              {
                stepLabel
              }
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
          {
            children
          }
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
