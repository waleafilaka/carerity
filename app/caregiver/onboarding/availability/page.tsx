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
  WeeklyAvailability,
  WeeklyAvailabilityDay,
  getAvailabilitySectionStatus,
  getCaregiverOnboardingDraft,
} from "../../../../lib/caregiverOnboardingDraft";

import {
  loadCaregiverOnboardingDraftFromSupabase,
  saveCaregiverOnboardingToSupabase,
  signOutCarerity,
} from "../../../../lib/caregiverOnboardingPersistence";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type DayName =
  (typeof DAYS)[number];

const DEFAULT_DAY:
  WeeklyAvailabilityDay =
  {
    enabled: false,
    startTime: "09:00",
    endTime: "17:00",
  };

function createInitialAvailability():
  WeeklyAvailability {
  return DAYS.reduce<
    WeeklyAvailability
  >(
    (
      result,
      day
    ) => {
      result[day] = {
        ...DEFAULT_DAY,
      };

      return result;
    },
    {}
  );
}

export default function CaregiverAvailabilityPage() {
  const router =
    useRouter();

  const [
    weeklyAvailability,
    setWeeklyAvailability,
  ] =
    useState<
      WeeklyAvailability
    >(
      createInitialAvailability
    );

  const [
    temporaryTimeOffStart,
    setTemporaryTimeOffStart,
  ] =
    useState("");

  const [
    temporaryTimeOffEnd,
    setTemporaryTimeOffEnd,
  ] =
    useState("");

  const [
    temporaryTimeOffNote,
    setTemporaryTimeOffNote,
  ] =
    useState("");

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
      const mergedAvailability =
        DAYS.reduce<
          WeeklyAvailability
        >(
          (
            result,
            day
          ) => {
            result[day] = {
              ...DEFAULT_DAY,

              ...(draft
                .weeklyAvailability?.[
                day
              ] || {}),
            };

            return result;
          },
          {}
        );

      setWeeklyAvailability(
        mergedAvailability
      );

      setTemporaryTimeOffStart(
        draft.temporaryTimeOffStart ||
          ""
      );

      setTemporaryTimeOffEnd(
        draft.temporaryTimeOffEnd ||
          ""
      );

      setTemporaryTimeOffNote(
        draft.temporaryTimeOffNote ||
          ""
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

  const effectiveDraft =
    useMemo(
      () => ({
        ...getCaregiverOnboardingDraft(),

        weeklyAvailability,

        temporaryTimeOffStart:
          temporaryTimeOffStart ||
          undefined,

        temporaryTimeOffEnd:
          temporaryTimeOffEnd ||
          undefined,

        temporaryTimeOffNote:
          temporaryTimeOffNote.trim(),
      }),
      [
        weeklyAvailability,
        temporaryTimeOffStart,
        temporaryTimeOffEnd,
        temporaryTimeOffNote,
      ]
    );

  const sectionStatus =
    useMemo(
      () =>
        getAvailabilitySectionStatus(
          effectiveDraft
        ),
      [
        effectiveDraft,
      ]
    );

  const enabledDays =
    DAYS.filter(
      (
        day
      ) =>
        weeklyAvailability[
          day
        ]?.enabled
    );

  const timeOffDatesPartiallyCompleted =
    Boolean(
      temporaryTimeOffStart
    ) !==
    Boolean(
      temporaryTimeOffEnd
    );

  const timeOffDatesReversed =
    Boolean(
      temporaryTimeOffStart &&
      temporaryTimeOffEnd
    ) &&
    temporaryTimeOffStart >
      temporaryTimeOffEnd;

  const hasInvalidEnabledDay =
    DAYS.some(
      (
        day
      ) => {
        const item =
          weeklyAvailability[
            day
          ];

        if (
          !item?.enabled
        ) {
          return false;
        }

        return (
          !item.startTime ||
          !item.endTime ||
          item.startTime >=
            item.endTime
        );
      }
    );

  const noAvailableDays =
    enabledDays.length ===
    0;

  const isValid =
    sectionStatus.complete &&
    !noAvailableDays &&
    !hasInvalidEnabledDay &&
    !timeOffDatesPartiallyCompleted &&
    !timeOffDatesReversed;

  function clearSaveNotice() {
    if (saveError) {
      setSaveError("");
    }

    if (savedMessage) {
      setSavedMessage("");
    }
  }

  function getDay(
    day: DayName
  ):
    WeeklyAvailabilityDay {
    return {
      ...DEFAULT_DAY,

      ...(weeklyAvailability[
        day
      ] || {}),
    };
  }

  function updateDay(
    day: DayName,
    update:
      Partial<WeeklyAvailabilityDay>
  ) {
    setWeeklyAvailability(
      (
        current
      ) => ({
        ...current,

        [day]: {
          ...DEFAULT_DAY,

          ...(current[
            day
          ] || {}),

          ...update,
        },
      })
    );

    clearSaveNotice();
  }

  function toggleDay(
    day: DayName
  ) {
    const current =
      getDay(day);

    updateDay(
      day,
      {
        enabled:
          !current.enabled,

        startTime:
          current.startTime ||
          "09:00",

        endTime:
          current.endTime ||
          "17:00",
      }
    );
  }

  function applyWeekdaySchedule() {
    setWeeklyAvailability(
      (
        current
      ) => {
        const next = {
          ...current,
        };

        const sourceDay =
          DAYS.find(
            (
              day
            ) =>
              day !==
                "Saturday" &&
              day !==
                "Sunday" &&
              current[
                day
              ]?.enabled
          ) ||
          "Monday";

        const source = {
          ...DEFAULT_DAY,

          ...(current[
            sourceDay
          ] || {}),

          enabled:
            true,
        };

        (
          [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
          ] as DayName[]
        ).forEach(
          (
            day
          ) => {
            next[
              day
            ] = {
              enabled:
                true,

              startTime:
                source.startTime ||
                "09:00",

              endTime:
                source.endTime ||
                "17:00",
            };
          }
        );

        return next;
      }
    );

    clearSaveNotice();
  }

  function clearAvailability() {
    setWeeklyAvailability(
      createInitialAvailability()
    );

    clearSaveNotice();
  }

  function buildUpdate() {
    return {
      weeklyAvailability,

      temporaryTimeOffStart:
        temporaryTimeOffStart ||
        undefined,

      temporaryTimeOffEnd:
        temporaryTimeOffEnd ||
        undefined,

      temporaryTimeOffNote:
        temporaryTimeOffNote.trim(),
    };
  }

  async function saveAvailability(
    requireComplete: boolean
  ) {
    if (
      isSaving
    ) {
      return false;
    }

    setSaveError("");
    setSavedMessage("");

    if (
      requireComplete
    ) {
      setShowErrors(
        true
      );

      if (!isValid) {
        return false;
      }
    }

    setIsSaving(
      true
    );

    try {
      const result =
        await saveCaregiverOnboardingToSupabase(
          "availability",
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
            "Your availability could not be saved online."
        );

        return false;
      }

      setSavedMessage(
        "Your availability has been saved."
      );

      return true;
    } catch (error) {
      console.error(
        "Unable to save caregiver availability:",
        error
      );

      setSaveError(
        error instanceof
          Error
          ? error.message
          : "Your availability could not be saved."
      );

      return false;
    } finally {
      setIsSaving(
        false
      );
    }
  }

  async function handleContinue() {
    const saved =
      await saveAvailability(
        true
      );

    if (!saved) {
      return;
    }

    router.push(
      "/caregiver/onboarding/credentials"
    );
  }

  async function handleSaveAndExit() {
    const saved =
      await saveAvailability(
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
      stepLabel="4 of 7"
      backHref="/caregiver/onboarding/preferences"
      isSigningOut={
        isSigningOut
      }
      onSignOut={
        handleSignOut
      }
    >
      <div>
        <p className="text-sm font-bold text-emerald-700">
          Weekly Schedule
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Availability
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Choose the days and times you are usually available for care opportunities.
        </p>
      </div>

      <section
        className={`mt-6 rounded-2xl border p-4 ${
          showErrors &&
          (
            noAvailableDays ||
            hasInvalidEnabledDay
          )
            ? "border-red-400 bg-red-50"
            : "border-gray-200 bg-white"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-gray-900">
              Weekly availability
              <span className="ml-1 text-red-500">
                *
              </span>
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Select at least one day with a valid start and end time.
            </p>
          </div>

          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              noAvailableDays
                ? showErrors
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-600"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {noAvailableDays
              ? "Required"
              : `${enabledDays.length} selected`}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={
              applyWeekdaySchedule
            }
            className="flex-1 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 active:scale-[0.99]"
          >
            Apply Monday–Friday
          </button>

          <button
            type="button"
            onClick={
              clearAvailability
            }
            className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 active:scale-[0.99]"
          >
            Clear Schedule
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          {noAvailableDays
            ? "No available days selected."
            : `${
                enabledDays.length
              } available ${
                enabledDays.length ===
                1
                  ? "day"
                  : "days"
              } selected.`}
        </div>

        {showErrors &&
          noAvailableDays && (
            <p className="mt-3 text-sm font-semibold text-red-600">
              Select at least one available day.
            </p>
          )}
      </section>

      <div className="mt-4 space-y-3">
        {DAYS.map(
          (
            day
          ) => {
            const item =
              getDay(day);

            const invalidTime =
              item.enabled &&
              (
                !item.startTime ||
                !item.endTime ||
                item.startTime >=
                  item.endTime
              );

            return (
              <div
                key={day}
                className={`rounded-2xl border p-4 transition ${
                  item.enabled
                    ? invalidTime &&
                      showErrors
                      ? "border-red-400 bg-red-50"
                      : "border-emerald-300 bg-emerald-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-gray-900">
                      {day}
                    </p>

                    <p className="mt-0.5 text-xs text-gray-500">
                      {item.enabled
                        ? "Available"
                        : "Unavailable"}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={
                      item.enabled
                    }
                    aria-label={`Set ${day} availability`}
                    onClick={() =>
                      toggleDay(
                        day
                      )
                    }
                    className={`relative h-8 w-14 shrink-0 touch-manipulation rounded-full transition ${
                      item.enabled
                        ? "bg-emerald-600"
                        : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all ${
                        item.enabled
                          ? "left-7"
                          : "left-1"
                      }`}
                    />
                  </button>
                </div>

                {item.enabled && (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-bold text-gray-600">
                        From
                      </span>

                      <input
                        type="time"
                        value={
                          item.startTime ||
                          "09:00"
                        }
                        onChange={(event) =>
                          updateDay(
                            day,
                            {
                              startTime:
                                event.target.value,
                            }
                          )
                        }
                        className={`mt-1 min-h-[50px] w-full rounded-xl border bg-white px-3 py-3 outline-none focus:ring-2 ${
                          invalidTime &&
                          showErrors
                            ? "border-red-400 focus:ring-red-100"
                            : "border-gray-300 focus:border-emerald-400 focus:ring-emerald-100"
                        }`}
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-bold text-gray-600">
                        To
                      </span>

                      <input
                        type="time"
                        value={
                          item.endTime ||
                          "17:00"
                        }
                        onChange={(event) =>
                          updateDay(
                            day,
                            {
                              endTime:
                                event.target.value,
                            }
                          )
                        }
                        className={`mt-1 min-h-[50px] w-full rounded-xl border bg-white px-3 py-3 outline-none focus:ring-2 ${
                          invalidTime &&
                          showErrors
                            ? "border-red-400 focus:ring-red-100"
                            : "border-gray-300 focus:border-emerald-400 focus:ring-emerald-100"
                        }`}
                      />
                    </label>

                    {invalidTime &&
                      showErrors && (
                        <p className="text-sm font-semibold text-red-600 sm:col-span-2">
                          End time must be later than start time.
                        </p>
                      )}
                  </div>
                )}
              </div>
            );
          }
        )}
      </div>

      <section
        className={`mt-6 rounded-2xl border p-4 ${
          showErrors &&
          (
            timeOffDatesPartiallyCompleted ||
            timeOffDatesReversed
          )
            ? "border-red-400 bg-red-50"
            : "border-gray-200 bg-white"
        }`}
      >
        <p className="font-bold text-gray-900">
          Temporary time off
        </p>

        <p className="mt-1 text-xs text-gray-500">
          Optional. Add a period when you will not be available.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold">
              From
            </span>

            <input
              type="date"
              value={
                temporaryTimeOffStart
              }
              onChange={(event) => {
                setTemporaryTimeOffStart(
                  event.target.value
                );

                clearSaveNotice();
              }}
              className={`mt-2 min-h-[50px] w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 ${
                showErrors &&
                (
                  timeOffDatesPartiallyCompleted ||
                  timeOffDatesReversed
                )
                  ? "border-red-400 bg-red-50 focus:ring-red-100"
                  : "border-gray-300 focus:border-emerald-400 focus:ring-emerald-100"
              }`}
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold">
              To
            </span>

            <input
              type="date"
              value={
                temporaryTimeOffEnd
              }
              min={
                temporaryTimeOffStart ||
                undefined
              }
              onChange={(event) => {
                setTemporaryTimeOffEnd(
                  event.target.value
                );

                clearSaveNotice();
              }}
              className={`mt-2 min-h-[50px] w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 ${
                showErrors &&
                (
                  timeOffDatesPartiallyCompleted ||
                  timeOffDatesReversed
                )
                  ? "border-red-400 bg-red-50 focus:ring-red-100"
                  : "border-gray-300 focus:border-emerald-400 focus:ring-emerald-100"
              }`}
            />
          </label>
        </div>

        {showErrors &&
          timeOffDatesPartiallyCompleted && (
            <p className="mt-2 text-sm font-semibold text-red-600">
              Add both time-off dates or leave both blank.
            </p>
          )}

        {showErrors &&
          timeOffDatesReversed && (
            <p className="mt-2 text-sm font-semibold text-red-600">
              The end date must be after the start date.
            </p>
          )}

        <label className="mt-4 block">
          <span className="text-sm font-bold">
            Note{" "}
            <span className="font-medium text-gray-400">
              (optional)
            </span>
          </span>

          <input
            type="text"
            value={
              temporaryTimeOffNote
            }
            onChange={(event) => {
              setTemporaryTimeOffNote(
                event.target.value
              );

              clearSaveNotice();
            }}
            placeholder="Vacation, appointment, unavailable, etc."
            className="mt-2 min-h-[50px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
      </section>

      {showErrors &&
        !isValid && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-900">
              Check your availability
            </p>

            <p className="mt-1 text-xs text-red-700">
              Outstanding requirements are highlighted in red above.
            </p>

            <ul className="mt-3 space-y-1 text-sm text-red-800">
              {noAvailableDays && (
                <li>
                  • Select at least one available day.
                </li>
              )}

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

              {hasInvalidEnabledDay && (
                <li>
                  • Check the start and end times for your selected days.
                </li>
              )}

              {timeOffDatesPartiallyCompleted && (
                <li>
                  • Complete both temporary time-off dates.
                </li>
              )}

              {timeOffDatesReversed && (
                <li>
                  • Correct the temporary time-off date range.
                </li>
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

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={
            handleSaveAndExit
          }
          disabled={
            isSaving
          }
          className="min-h-[52px] w-full touch-manipulation rounded-xl border border-emerald-300 bg-white px-4 py-3.5 font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"
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
          className="min-h-[52px] w-full touch-manipulation rounded-xl bg-emerald-600 px-4 py-3.5 font-semibold text-white transition hover:bg-emerald-700 disabled:bg-emerald-300"
        >
          {isSaving
            ? "Saving..."
            : "Continue"}
        </button>
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

  message:
    string;
}) {
  return (
    <div
      className={`mt-4 rounded-2xl border p-4 text-sm ${
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
