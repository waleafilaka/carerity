"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  useSearchParams,
} from "next/navigation";

import DashboardLayout from "../../../components/DashboardLayout";

import {
  ActiveCaregiverVisit,
  addMyCaregiverVisitNote,
  clockInMyCaregiverVisit,
  completeMyCaregiverVisit,
  loadMyCaregiverVisit,
} from "../../../lib/caregiverVisitPersistence";

import {
  CareActivity,
  CareActivityKey,
  addMyCaregiverCareActivity,
  loadMyCaregiverVisitActivities,
} from "../../../lib/caregiverCareActivityPersistence";

type PendingAction =
  | "check_in"
  | "complete"
  | null;

const QUICK_ACTIVITIES: Array<{
  key: CareActivityKey;
  label: string;
  detail: string;
}> = [
  {
    key: "personal_care",
    label: "Personal care",
    detail: "Routine personal-care support",
  },
  {
    key: "meal_prepared",
    label: "Meal prepared",
    detail: "Prepared a meal",
  },
  {
    key: "meal_assistance",
    label: "Meal assistance",
    detail: "Helped during a meal",
  },
  {
    key: "medication_reminder",
    label: "Medication reminder",
    detail: "Provided a scheduled reminder",
  },
  {
    key: "mobility_assistance",
    label: "Mobility assistance",
    detail: "Supported mobility",
  },
  {
    key: "bath_given",
    label: "Bath / hygiene",
    detail: "Assisted with bathing or hygiene",
  },
  {
    key: "walk_mobility",
    label: "Walk / movement",
    detail: "Supported walking or movement",
  },
  {
    key: "vitals_checked",
    label: "Vitals checked",
    detail: "Recorded routine vitals",
  },
  {
    key: "laundry_completed",
    label: "Laundry",
    detail: "Completed laundry support",
  },
  {
    key: "groceries_errands",
    label: "Groceries / errands",
    detail: "Completed an errand",
  },
  {
    key: "client_comfortable",
    label: "Client comfortable",
    detail: "Observed client comfort",
  },
];

export default function CaregiverActiveVisitPage() {
  const searchParams =
    useSearchParams();

  const visitId =
    searchParams.get(
      "visit"
    )?.trim() ||
    "";

  const [
    visit,
    setVisit,
  ] =
    useState<ActiveCaregiverVisit | null>(
      null
    );

  const [
    activities,
    setActivities,
  ] =
    useState<CareActivity[]>(
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
    error,
    setError,
  ] =
    useState(
      ""
    );

  const [
    notice,
    setNotice,
  ] =
    useState(
      ""
    );

  const [
    noteText,
    setNoteText,
  ] =
    useState(
      ""
    );

  const [
    isSavingNote,
    setIsSavingNote,
  ] =
    useState(
      false
    );

  const [
    savingActivityKey,
    setSavingActivityKey,
  ] =
    useState<CareActivityKey | null>(
      null
    );

  const [
    pendingAction,
    setPendingAction,
  ] =
    useState<PendingAction>(
      null
    );

  const [
    isActionBusy,
    setIsActionBusy,
  ] =
    useState(
      false
    );

  const loadVisit =
    useCallback(
      async () => {
        if (
          !visitId
        ) {
          setError(
            "No visit was selected."
          );

          setIsLoading(
            false
          );

          return;
        }

        const [
          visitResult,
          activityResult,
        ] =
          await Promise.all([
            loadMyCaregiverVisit(
              visitId
            ),
            loadMyCaregiverVisitActivities(
              visitId
            ),
          ]);

        if (
          visitResult.success
        ) {
          setVisit(
            visitResult.visit
          );

          setError(
            ""
          );
        } else {
          setError(
            visitResult.error
          );
        }

        if (
          activityResult.success
        ) {
          setActivities(
            activityResult.activities
          );
        }

        setIsLoading(
          false
        );
      },
      [
        visitId,
      ]
    );

  useEffect(
    () => {
      loadVisit();
    },
    [
      loadVisit,
    ]
  );

  const locationLabel =
    useMemo(
      () =>
        [
          visit?.city,
          visit?.province,
        ]
          .filter(
            Boolean
          )
          .join(
            ", "
          ) ||
        "Care location",
      [
        visit?.city,
        visit?.province,
      ]
    );

  const clockInAvailability =
    useMemo(
      () =>
        getClockInAvailability(
          visit
        ),
      [
        visit,
      ]
    );

  async function handleCheckIn() {
    if (
      !visit
    ) {
      return;
    }

    setIsActionBusy(
      true
    );

    setError(
      ""
    );

    const result =
      await clockInMyCaregiverVisit(
        visit.id
      );

    if (
      result.success
    ) {
      setPendingAction(
        null
      );

      setNotice(
        "Checked in. This visit is now in progress."
      );

      await loadVisit();
    } else {
      setPendingAction(
        null
      );

      setError(
        result.error
      );
    }

    setIsActionBusy(
      false
    );
  }

  async function handleActivity(
    key:
      CareActivityKey
  ) {
    if (
      !visit
    ) {
      return;
    }

    setSavingActivityKey(
      key
    );

    setError(
      ""
    );

    const result =
      await addMyCaregiverCareActivity(
        visit.id,
        key
      );

    if (
      result.success
    ) {
      setActivities(
        (
          current
        ) => [
          ...current,
          result.activity,
        ]
      );

      setNotice(
        "Care update added."
      );
    } else {
      setError(
        result.error
      );
    }

    setSavingActivityKey(
      null
    );
  }

  async function handleSaveNote() {
    if (
      !visit
    ) {
      return;
    }

    setIsSavingNote(
      true
    );

    setError(
      ""
    );

    const result =
      await addMyCaregiverVisitNote(
        visit.id,
        noteText
      );

    if (
      result.success
    ) {
      setNoteText(
        ""
      );

      setNotice(
        "Additional care note saved."
      );

      await loadVisit();
    } else {
      setError(
        result.error
      );
    }

    setIsSavingNote(
      false
    );
  }

  async function handleCompleteVisit() {
    if (
      !visit
    ) {
      return;
    }

    setIsActionBusy(
      true
    );

    setError(
      ""
    );

    const result =
      await completeMyCaregiverVisit(
        visit.id
      );

    if (
      result.success
    ) {
      setPendingAction(
        null
      );

      setNotice(
        "Visit completed successfully."
      );

      await loadVisit();
    } else {
      setPendingAction(
        null
      );

      setError(
        result.error
      );
    }

    setIsActionBusy(
      false
    );
  }

  return (
    <DashboardLayout
      activeItem="Active Visit"
      role="caregiver"
      messageCount={
        0
      }
      notificationCount={
        0
      }
    >
      <div className="mx-auto max-w-6xl">
        {isLoading ? (
          <ActiveVisitSkeleton />
        ) : error && !visit ? (
          <EmptyVisitState
            error={
              error
            }
          />
        ) : visit ? (
          <>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Link
                  href="/caregiver/dashboard"
                  className="text-sm font-semibold text-emerald-700 hover:underline"
                >
                  ← Back to dashboard
                </Link>

                <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700">
                  Care Visit
                </p>

                <h1 className="mt-1 text-3xl font-bold text-gray-900 sm:text-4xl">
                  {
                    visit.recipientName
                  }
                </h1>

                <p className="mt-2 text-sm text-gray-500">
                  {
                    visit.publicId ||
                    "Carerity visit"
                  }
                </p>
              </div>

              <VisitStatusBadge
                status={
                  visit.status
                }
              />
            </div>

            {notice && (
              <div
                role="status"
                className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
              >
                ✓{" "}
                {
                  notice
                }
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
              >
                {
                  error
                }
              </div>
            )}

            <VisitSummary
              visit={
                visit
              }
              locationLabel={
                locationLabel
              }
            />

            {visit.status ===
              "scheduled" && (
              <BeforeVisitPanel
                availability={
                  clockInAvailability
                }
                onCheckIn={
                  () =>
                    setPendingAction(
                      "check_in"
                    )
                }
              />
            )}

            {visit.status ===
              "in_progress" && (
              <InProgressPanel
                visit={
                  visit
                }
                activities={
                  activities
                }
                noteText={
                  noteText
                }
                onNoteTextChange={
                  setNoteText
                }
                onActivity={
                  handleActivity
                }
                savingActivityKey={
                  savingActivityKey
                }
                onSaveNote={
                  handleSaveNote
                }
                isSavingNote={
                  isSavingNote
                }
                onComplete={
                  () =>
                    setPendingAction(
                      "complete"
                    )
                }
              />
            )}

            {visit.status ===
              "completed" && (
              <CompletedPanel
                visit={
                  visit
                }
                activities={
                  activities
                }
              />
            )}

            {visit.status ===
              "cancelled" && (
              <section className="rounded-3xl border border-red-200 bg-red-50 p-6">
                <h2 className="text-xl font-bold text-red-800">
                  Visit cancelled
                </h2>

                <p className="mt-2 text-sm text-red-700">
                  This visit can no longer be started.
                </p>
              </section>
            )}

            <SafetyReminder />
          </>
        ) : null}
      </div>

      {pendingAction && (
        <ConfirmationModal
          action={
            pendingAction
          }
          isBusy={
            isActionBusy
          }
          noteCount={
            visit?.notes.length ||
            0
          }
          activityCount={
            activities.length
          }
          onCancel={
            () =>
              setPendingAction(
                null
              )
          }
          onConfirm={
            pendingAction ===
            "check_in"
              ? handleCheckIn
              : handleCompleteVisit
          }
        />
      )}
    </DashboardLayout>
  );
}

function VisitSummary({
  visit,
  locationLabel,
}: {
  visit:
    ActiveCaregiverVisit;

  locationLabel:
    string;
}) {
  return (
    <section className="mb-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <VisitFact
          label="Date"
          value={
            formatVisitDate(
              visit.startDatetime
            )
          }
        />

        <VisitFact
          label="Time"
          value={
            formatVisitTimeRange(
              visit.startDatetime,
              visit.endDatetime
            )
          }
        />

        <VisitFact
          label="Location"
          value={
            locationLabel
          }
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/caregiver/messages"
          className="rounded-xl border border-emerald-300 px-5 py-3 text-center font-semibold text-emerald-700"
        >
          Message Client
        </Link>

        <Link
          href="/caregiver/schedule"
          className="rounded-xl border border-gray-200 px-5 py-3 text-center font-semibold text-gray-700"
        >
          View Schedule
        </Link>
      </div>
    </section>
  );
}

function BeforeVisitPanel({
  availability,
  onCheckIn,
}: {
  availability:
    ReturnType<
      typeof getClockInAvailability
    >;

  onCheckIn:
    () => void;
}) {
  return (
    <section
      className={`mb-5 rounded-3xl border p-5 shadow-sm sm:p-6 ${
        availability.allowed
          ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white"
          : availability.reason ===
              "past"
            ? "border-red-200 bg-red-50"
            : "border-amber-200 bg-amber-50"
      }`}
    >
      <p
        className={`text-xs font-extrabold uppercase tracking-[0.18em] ${
          availability.allowed
            ? "text-emerald-700"
            : availability.reason ===
                "past"
              ? "text-red-700"
              : "text-amber-700"
        }`}
      >
        Before the visit
      </p>

      <h2 className="mt-2 text-2xl font-bold text-gray-900">
        {
          availability.title
        }
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600">
        {
          availability.message
        }
      </p>

      {availability.allowed ? (
        <button
          type="button"
          onClick={
            onCheckIn
          }
          className="mt-6 w-full rounded-xl bg-emerald-600 px-6 py-4 text-base font-bold text-white shadow-sm transition hover:bg-emerald-700 sm:w-auto sm:min-w-56"
        >
          Check In
        </button>
      ) : (
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled
            className="rounded-xl bg-gray-200 px-6 py-4 font-bold text-gray-500"
          >
            Check In unavailable
          </button>

          {availability.reason ===
            "past" && (
            <Link
              href="/caregiver/support"
              className="rounded-xl border border-red-300 bg-white px-6 py-4 font-semibold text-red-700"
            >
              Contact Carerity
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

function InProgressPanel({
  visit,
  activities,
  noteText,
  onNoteTextChange,
  onActivity,
  savingActivityKey,
  onSaveNote,
  isSavingNote,
  onComplete,
}: {
  visit:
    ActiveCaregiverVisit;

  activities:
    CareActivity[];

  noteText:
    string;

  onNoteTextChange:
    (
      value:
        string
    ) => void;

  onActivity:
    (
      key:
        CareActivityKey
    ) => void;

  savingActivityKey:
    CareActivityKey | null;

  onSaveNote:
    () => void;

  isSavingNote:
    boolean;

  onComplete:
    () => void;
}) {
  const firstName =
    getFirstName(
      visit.recipientName
    );

  return (
    <>
      <section className="mb-5 overflow-hidden rounded-3xl border border-emerald-300 bg-white shadow-sm">
        <div className="bg-emerald-600 px-5 py-4 text-white sm:px-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-100">
            Visit in progress
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            Care is underway
          </h2>

          <p className="mt-1 text-sm text-emerald-50">
            Checked in{" "}
            {
              formatClockTimestamp(
                visit.clockInAt
              )
            }
          </p>
        </div>

        <div className="p-5 sm:p-6">
          <h3 className="text-xl font-bold text-gray-900">
            Quick care updates
          </h3>

          <p className="mt-1 max-w-3xl text-sm text-gray-500">
            Tap the care provided. Carerity automatically creates a
            personalized, factual update for{" "}
            <strong>
              {
                firstName
              }
            </strong>
            . You can select more than one.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_ACTIVITIES.map(
              (
                activity
              ) => (
                <button
                  key={
                    activity.key
                  }
                  type="button"
                  disabled={
                    savingActivityKey !==
                    null
                  }
                  onClick={
                    () =>
                      onActivity(
                        activity.key
                      )
                  }
                  className="rounded-2xl border border-gray-200 bg-white p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60"
                >
                  <p className="font-bold text-gray-900">
                    {savingActivityKey ===
                    activity.key
                      ? "Saving…"
                      : activity.label}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {
                      activity.detail
                    }
                  </p>
                </button>
              )
            )}
          </div>
        </div>
      </section>

      <RecordedActivities
        activities={
          activities
        }
      />

      <section className="mb-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-xl font-bold text-gray-900">
          Additional note
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          Add anything specific the family should know that is not captured
          by the quick updates above.
        </p>

        <textarea
          value={
            noteText
          }
          onChange={
            (
              event
            ) =>
              onNoteTextChange(
                event.target.value
              )
          }
          rows={
            5
          }
          maxLength={
            5000
          }
          placeholder={`Example: ${firstName} preferred to rest after lunch and remained comfortable.`}
          className="mt-4 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-400">
            {
              noteText.length
            }
            /5000
          </p>

          <button
            type="button"
            onClick={
              onSaveNote
            }
            disabled={
              isSavingNote ||
              noteText.trim().length <
                3
            }
            className="rounded-xl border border-emerald-300 bg-white px-5 py-3 font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSavingNote
              ? "Saving…"
              : "Save Additional Note"}
          </button>
        </div>
      </section>

      <SavedNotes
        notes={
          visit.notes
        }
      />

      <section className="mb-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold text-gray-900">
          Complete care
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          Complete the visit only after scheduled care is finished and the
          visit documentation is accurate.
        </p>

        <button
          type="button"
          onClick={
            onComplete
          }
          disabled={
            visit.notes.length <
              1 &&
            activities.length <
              1
          }
          className="mt-5 w-full rounded-xl bg-gray-900 px-6 py-4 font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-auto sm:min-w-56"
        >
          Complete Visit
        </button>

        {visit.notes.length <
          1 &&
          activities.length <
            1 && (
          <p className="mt-2 text-xs font-semibold text-amber-700">
            Record at least one care activity or additional note first.
          </p>
        )}
      </section>
    </>
  );
}

function RecordedActivities({
  activities,
}: {
  activities:
    CareActivity[];
}) {
  if (
    activities.length ===
    0
  ) {
    return null;
  }

  return (
    <section className="mb-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold text-gray-900">
        Care recorded
      </h2>

      <p className="mt-1 text-sm text-gray-500">
        These updates are part of the visit timeline.
      </p>

      <div className="mt-4 space-y-3">
        {activities.map(
          (
            activity
          ) => (
            <article
              key={
                activity.id
              }
              className="flex gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white font-bold text-emerald-700">
                ✓
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {
                    activity.description
                  }
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  {
                    formatClockTimestamp(
                      activity.createdAt
                    )
                  }
                </p>
              </div>
            </article>
          )
        )}
      </div>
    </section>
  );
}

function SavedNotes({
  notes,
}: {
  notes:
    ActiveCaregiverVisit["notes"];
}) {
  if (
    notes.length ===
    0
  ) {
    return null;
  }

  return (
    <section className="mb-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold text-gray-900">
        Additional notes
      </h2>

      <div className="mt-4 space-y-3">
        {notes.map(
          (
            note
          ) => (
            <article
              key={
                note.id
              }
              className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
            >
              <p className="text-sm leading-relaxed text-gray-800">
                {
                  note.noteText
                }
              </p>

              <p className="mt-2 text-xs text-gray-400">
                {
                  formatClockTimestamp(
                    note.createdAt
                  )
                }
              </p>
            </article>
          )
        )}
      </div>
    </section>
  );
}

function CompletedPanel({
  visit,
  activities,
}: {
  visit:
    ActiveCaregiverVisit;

  activities:
    CareActivity[];
}) {
  return (
    <>
      <section className="mb-5 rounded-3xl border border-blue-200 bg-blue-50 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl text-blue-700">
          ✓
        </div>

        <h2 className="mt-4 text-2xl font-bold text-gray-900">
          Visit completed
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          Clocked out{" "}
          {
            formatClockTimestamp(
              visit.clockOutAt
            )
          }
          . The visit is now part of the care history.
        </p>
      </section>

      <RecordedActivities
        activities={
          activities
        }
      />

      <SavedNotes
        notes={
          visit.notes
        }
      />

      <Link
        href="/caregiver/dashboard"
        className="inline-flex rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white"
      >
        Return to Dashboard
      </Link>
    </>
  );
}

function SafetyReminder() {
  return (
    <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
      <h2 className="font-bold text-gray-900">
        Safety reminder
      </h2>

      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        For a medical emergency or immediate danger, call 911 first. Notify
        Carerity when it is safe to do so.
      </p>
    </section>
  );
}

function ConfirmationModal({
  action,
  isBusy,
  noteCount,
  activityCount,
  onCancel,
  onConfirm,
}: {
  action:
    Exclude<
      PendingAction,
      null
    >;

  isBusy:
    boolean;

  noteCount:
    number;

  activityCount:
    number;

  onCancel:
    () => void;

  onConfirm:
    () => void;
}) {
  const isCheckIn =
    action ===
    "check_in";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close confirmation"
        onClick={
          onCancel
        }
        className="absolute inset-0 bg-black/30"
      />

      <div className="relative w-full max-w-md rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-900">
          {isCheckIn
            ? "Check in to this visit?"
            : "Complete this visit?"}
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          {isCheckIn
            ? "This starts the live care visit and records your check-in time."
            : `This records your clock-out time and completes the visit. ${activityCount} care update${
                activityCount ===
                1
                  ? ""
                  : "s"
              } and ${noteCount} additional note${
                noteCount ===
                1
                  ? ""
                  : "s"
              } are saved.`}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={
              onCancel
            }
            disabled={
              isBusy
            }
            className="rounded-xl border border-gray-200 py-3 font-semibold text-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={
              onConfirm
            }
            disabled={
              isBusy
            }
            className="rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isBusy
              ? "Saving…"
              : isCheckIn
                ? "Check In"
                : "Complete Visit"}
          </button>
        </div>
      </div>
    </div>
  );
}

function VisitStatusBadge({
  status,
}: {
  status:
    ActiveCaregiverVisit["status"];
}) {
  const styles =
    status ===
    "in_progress"
      ? "border-emerald-300 bg-emerald-100 text-emerald-800"
      : status ===
          "completed"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : status ===
            "cancelled"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-gray-200 bg-white text-gray-700";

  return (
    <span
      className={`self-start rounded-full border px-4 py-2 text-sm font-bold ${styles}`}
    >
      {
        friendlyStatus(
          status
        )
      }
    </span>
  );
}

function VisitFact({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="rounded-2xl bg-gray-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
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

function EmptyVisitState({
  error,
}: {
  error:
    string;
}) {
  return (
    <section className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900">
        We couldn&apos;t open this visit
      </h1>

      <p className="mt-2 text-sm text-red-700">
        {
          error
        }
      </p>

      <Link
        href="/caregiver/dashboard"
        className="mt-5 inline-flex rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white"
      >
        Return to Dashboard
      </Link>
    </section>
  );
}

function ActiveVisitSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-72 rounded bg-gray-200" />
      <div className="mt-5 h-44 rounded-3xl bg-gray-200" />
      <div className="mt-5 h-72 rounded-3xl bg-gray-200" />
    </div>
  );
}

function friendlyStatus(
  status:
    ActiveCaregiverVisit["status"]
) {
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

  if (
    status ===
    "cancelled"
  ) {
    return "Cancelled";
  }

  return "Scheduled";
}

function getClockInAvailability(
  visit:
    ActiveCaregiverVisit | null
) {
  if (
    !visit ||
    !visit.startDatetime ||
    !visit.endDatetime
  ) {
    return {
      allowed: false,
      reason: "invalid" as const,
      title: "Visit time unavailable",
      message:
        "The scheduled visit time could not be verified. Contact Carerity before starting care.",
    };
  }

  const now =
    new Date();

  const start =
    new Date(
      visit.startDatetime
    );

  const end =
    new Date(
      visit.endDatetime
    );

  if (
    Number.isNaN(
      start.getTime()
    ) ||
    Number.isNaN(
      end.getTime()
    )
  ) {
    return {
      allowed: false,
      reason: "invalid" as const,
      title: "Visit time unavailable",
      message:
        "The scheduled visit time could not be verified. Contact Carerity before starting care.",
    };
  }

  const earliest =
    new Date(
      start.getTime() -
      30 *
        60 *
        1000
    );

  if (
    now >
    end
  ) {
    return {
      allowed: false,
      reason: "past" as const,
      title: "This visit window has passed",
      message:
        "You can review the visit, but you cannot check in after the scheduled visit has ended. Contact Carerity if this visit needs to be corrected or rescheduled.",
    };
  }

  if (
    now <
    earliest
  ) {
    return {
      allowed: false,
      reason: "early" as const,
      title: "Check-in is not open yet",
      message: `Check-in opens 30 minutes before the scheduled start at ${formatClockTimestamp(
        earliest.toISOString()
      )}.`,
    };
  }

  return {
    allowed: true,
    reason: "open" as const,
    title: "Ready to provide care?",
    message:
      "Check in when you have arrived and are ready to begin the scheduled care visit. The family will be able to see that care is in progress.",
  };
}

function formatVisitDate(
  value:
    string | null
) {
  if (
    !value
  ) {
    return "Date scheduled";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Date scheduled";
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

function formatVisitTimeRange(
  startValue:
    string | null,
  endValue:
    string | null
) {
  if (
    !startValue ||
    !endValue
  ) {
    return "Time scheduled";
  }

  const start =
    new Date(
      startValue
    );

  const end =
    new Date(
      endValue
    );

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

function formatClockTimestamp(
  value:
    string | null
) {
  if (
    !value
  ) {
    return "";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      month:
        "short",
      day:
        "numeric",
      hour:
        "numeric",
      minute:
        "2-digit",
      timeZone:
        "America/Toronto",
    }
  ).format(
    date
  );
}

function getFirstName(
  fullName:
    string
) {
  return (
    fullName
      .trim()
      .split(
        /\s+/
      )[0] ||
    "the client"
  );
}
