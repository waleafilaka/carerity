"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProgressHeader from "../../../components/ui/ProgressHeader";
import {
  BookingDraft,
  RECURRING_DAY_NAMES,
  RecurringDayName,
  RecurringDaySchedule,
  addHoursToTime,
  calculateDurationHours,
  getBookingDraft,
  getDayNameFromDate,
  saveBookingDraft,
  toDateInputValue,
} from "../../../lib/bookingDraft";

const HOURLY_RATE = 38;
const MINIMUM_LEAD_TIME_HOURS = 2;
const ALLOWED_DURATIONS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 20, 24];
const QUICK_DURATIONS = [4, 8, 12, 24];

export default function DateTimePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editMode = searchParams.get("mode") === "edit";

  const [draft, setDraft] = useState<BookingDraft>({});
  const [careDate, setCareDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [recurringSchedules, setRecurringSchedules] = useState<
    RecurringDaySchedule[]
  >([]);
  const [showErrors, setShowErrors] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const today = useMemo(() => toDateInputValue(new Date()), []);
  const isRecurring = draft.scheduleType === "Recurring Care";

  useEffect(() => {
    const saved = getBookingDraft();
    setDraft(saved);

    if (saved.scheduleType === "Recurring Care") {
      const selectedDays = saved.recurringDays || [];
      const fallbackStart = saved.startTime || getDefaultStartTime();
      const fallbackDuration =
        saved.durationHours && ALLOWED_DURATIONS.includes(saved.durationHours)
          ? saved.durationHours
          : 8;

      const schedules = selectedDays.map((day) => {
        const existing = saved.recurringDaySchedules?.find(
          (item) => item.day === day
        );

        return (
          existing || {
            day,
            startTime: fallbackStart,
            endTime: addHoursToTime(fallbackStart, fallbackDuration),
            durationHours: fallbackDuration,
          }
        );
      });

      setRecurringSchedules(sortSchedules(schedules));
    } else {
      const savedDate = saved.careDate && saved.careDate >= today
        ? saved.careDate
        : today;
      const savedStart = saved.startTime || getDefaultStartTime();
      const duration =
        saved.durationHours && ALLOWED_DURATIONS.includes(saved.durationHours)
          ? saved.durationHours
          : 8;

      setCareDate(savedDate);
      setStartTime(savedStart);
      setEndTime(saved.endTime || addHoursToTime(savedStart, duration));
    }

    setIsLoaded(true);
  }, [today]);

  const oneTimeDuration = calculateDurationHours(startTime, endTime);
  const oneTimeStartDateTime = getDateTime(careDate, startTime);
  const isPastDate = Boolean(careDate) && careDate < today;
  const isTooSoon =
    Boolean(oneTimeStartDateTime) &&
    oneTimeStartDateTime! < getMinimumAllowedStartDateTime();
  const oneTimeDurationValid =
    oneTimeDuration !== null && ALLOWED_DURATIONS.includes(oneTimeDuration);

  const firstRecurringDay = getDayNameFromDate(
    draft.recurringStartDate || draft.careDate || ""
  );
  const firstRecurringSchedule = recurringSchedules.find(
    (schedule) => schedule.day === firstRecurringDay
  );
  const firstRecurringStart = getDateTime(
    draft.recurringStartDate || draft.careDate || "",
    firstRecurringSchedule?.startTime || ""
  );
  const recurringTooSoon =
    Boolean(firstRecurringStart) &&
    firstRecurringStart! < getMinimumAllowedStartDateTime();

  const recurringSchedulesValid =
    recurringSchedules.length > 0 &&
    recurringSchedules.every((schedule) => {
      const duration = calculateDurationHours(
        schedule.startTime,
        schedule.endTime
      );
      return duration !== null && ALLOWED_DURATIONS.includes(duration);
    });

  const canContinue =
    isLoaded &&
    (isRecurring
      ? recurringSchedulesValid && !recurringTooSoon
      : Boolean(careDate) &&
        Boolean(startTime) &&
        Boolean(endTime) &&
        !isPastDate &&
        !isTooSoon &&
        oneTimeDurationValid);

  function updateRecurringSchedule(
    day: RecurringDayName,
    update: Partial<RecurringDaySchedule>
  ) {
    setRecurringSchedules((current) =>
      current.map((schedule) => {
        if (schedule.day !== day) return schedule;

        const next = { ...schedule, ...update };
        const duration = calculateDurationHours(next.startTime, next.endTime);

        return {
          ...next,
          durationHours: duration ?? next.durationHours,
        };
      })
    );
  }

  function handleRecurringStartChange(day: RecurringDayName, value: string) {
    const current = recurringSchedules.find((item) => item.day === day);
    if (!current) return;

    updateRecurringSchedule(day, {
      startTime: value,
      endTime: addHoursToTime(value, current.durationHours || 8),
    });
  }

  function setRecurringDuration(day: RecurringDayName, duration: number) {
    const current = recurringSchedules.find((item) => item.day === day);
    if (!current) return;

    updateRecurringSchedule(day, {
      endTime: addHoursToTime(current.startTime, duration),
      durationHours: duration,
    });
  }

  function handleContinue() {
    setShowErrors(true);
    if (!canContinue) return;

    if (isRecurring) {
      const first =
        recurringSchedules.find((item) => item.day === firstRecurringDay) ||
        recurringSchedules[0];
      const estimatedSubtotal = first.durationHours * HOURLY_RATE;

      saveBookingDraft({
        recurringDaySchedules: recurringSchedules,
        recurringDays: recurringSchedules.map((item) => item.day),
        startTime: first.startTime,
        endTime: first.endTime,
        durationHours: first.durationHours,
        hourlyRate: HOURLY_RATE,
        estimatedSubtotal,
        estimatedTotal: estimatedSubtotal,
        lastRecurringUpdate: editMode ? new Date().toISOString() : undefined,
      });

      router.push(editMode ? "/dashboard/recurring-care" : "/find-care/review");
      return;
    }

    const duration = oneTimeDuration as number;
    const estimatedSubtotal = duration * HOURLY_RATE;

    saveBookingDraft({
      careDate,
      startTime,
      endTime,
      durationHours: duration,
      hourlyRate: HOURLY_RATE,
      estimatedSubtotal,
      estimatedTotal: estimatedSubtotal,
    });

    router.push("/find-care/review");
  }

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-5">
        <section className="mx-auto h-96 w-full max-w-xl animate-pulse rounded-3xl bg-gray-200" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-5 text-gray-900 sm:px-6">
      <section className="mx-auto w-full max-w-2xl rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <ProgressHeader
          backHref={
            isRecurring
              ? `/find-care/recurring${editMode ? "?mode=edit" : ""}`
              : "/find-care/schedule"
          }
          stage="3 of 4"
          progress="w-[75%]"
          title={isRecurring ? "Set a time for each day" : "Choose care time"}
          subtitle={
            isRecurring
              ? "Each recurring day can have a different start and end time."
              : "Select the date, start time and visit length."
          }
        />

        {isRecurring ? (
          <div className="space-y-4">
            {recurringSchedules.map((schedule) => {
              const duration = calculateDurationHours(
                schedule.startTime,
                schedule.endTime
              );
              const durationValid =
                duration !== null && ALLOWED_DURATIONS.includes(duration);
              const isFirst = schedule.day === firstRecurringDay;

              return (
                <section
                  key={schedule.day}
                  className={`rounded-2xl border p-4 ${
                    isFirst
                      ? "border-purple-300 bg-purple-50/50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{schedule.day}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {isFirst
                          ? `First visit: ${formatDate(
                              draft.recurringStartDate || draft.careDate || ""
                            )}`
                          : "Recurring visit"}
                      </p>
                    </div>
                    {isFirst && (
                      <span className="rounded-full bg-purple-100 px-3 py-1 text-[11px] font-bold text-purple-700">
                        First day
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <TimeField
                      label="Start time"
                      value={schedule.startTime}
                      error={showErrors && isFirst && recurringTooSoon}
                      onChange={(value) =>
                        handleRecurringStartChange(schedule.day, value)
                      }
                    />
                    <TimeField
                      label="End time"
                      value={schedule.endTime}
                      error={showErrors && !durationValid}
                      onChange={(value) =>
                        updateRecurringSchedule(schedule.day, { endTime: value })
                      }
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {QUICK_DURATIONS.map((hours) => (
                      <button
                        key={hours}
                        type="button"
                        onClick={() => setRecurringDuration(schedule.day, hours)}
                        className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                          duration === hours
                            ? "border-purple-600 bg-purple-600 text-white"
                            : "border-purple-200 bg-white text-purple-700 hover:bg-purple-50"
                        }`}
                      >
                        {hours} hrs
                      </button>
                    ))}

                    <select
                      value={
                        duration &&
                        !QUICK_DURATIONS.includes(duration) &&
                        ALLOWED_DURATIONS.includes(duration)
                          ? String(duration)
                          : ""
                      }
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        if (ALLOWED_DURATIONS.includes(value)) {
                          setRecurringDuration(schedule.day, value);
                        }
                      }}
                      className="rounded-xl border border-purple-200 bg-white px-3 py-2 text-xs font-bold text-purple-700"
                    >
                      <option value="">Other</option>
                      {ALLOWED_DURATIONS.filter(
                        (hours) => !QUICK_DURATIONS.includes(hours)
                      ).map((hours) => (
                        <option key={hours} value={hours}>
                          {hours} hours
                        </option>
                      ))}
                    </select>
                  </div>

                  <p
                    className={`mt-3 text-xs ${
                      durationValid ? "text-gray-500" : "text-red-600"
                    }`}
                  >
                    {durationValid
                      ? `${duration} hours`
                      : "Choose a supported duration: 4–12, 16, 20 or 24 hours."}
                  </p>

                  {showErrors && isFirst && recurringTooSoon && (
                    <p className="mt-2 text-sm text-red-600">
                      The first visit must begin at least two hours from now.
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-bold">Date</span>
              <input
                type="date"
                min={today}
                value={careDate}
                onChange={(event) => setCareDate(event.target.value)}
                className={`mt-2 w-full rounded-xl border p-3 outline-none focus:ring-2 focus:ring-purple-200 ${
                  isPastDate ? "border-red-500" : "border-purple-300"
                }`}
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TimeField
                label="Start time"
                value={startTime}
                error={isTooSoon}
                onChange={(value) => {
                  setStartTime(value);
                  const duration =
                    oneTimeDuration && ALLOWED_DURATIONS.includes(oneTimeDuration)
                      ? oneTimeDuration
                      : 8;
                  setEndTime(addHoursToTime(value, duration));
                }}
              />
              <TimeField
                label="End time"
                value={endTime}
                error={Boolean(oneTimeDuration) && !oneTimeDurationValid}
                onChange={setEndTime}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {ALLOWED_DURATIONS.map((hours) => (
                <button
                  key={hours}
                  type="button"
                  onClick={() => setEndTime(addHoursToTime(startTime, hours))}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                    oneTimeDuration === hours
                      ? "border-purple-600 bg-purple-600 text-white"
                      : "border-purple-200 bg-purple-50 text-purple-700"
                  }`}
                >
                  {hours} hrs
                </button>
              ))}
            </div>
          </div>
        )}

        {showErrors && !canContinue && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Review the highlighted dates and times before continuing.
          </div>
        )}

        <button
          type="button"
          onClick={handleContinue}
          className={`mt-5 w-full rounded-xl py-3.5 font-semibold transition ${
            canContinue
              ? "bg-purple-600 text-white hover:bg-purple-700"
              : "bg-gray-300 text-gray-600"
          }`}
        >
          {editMode ? "Save Future Schedule" : "Review & Continue"}
        </button>
      </section>
    </main>
  );
}

function TimeField({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value: string;
  error: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-2 w-full rounded-xl border p-3 outline-none focus:ring-2 focus:ring-purple-200 ${
          error ? "border-red-500" : "border-purple-300"
        }`}
      />
    </label>
  );
}

function getMinimumAllowedStartDateTime() {
  const date = new Date();
  date.setHours(date.getHours() + MINIMUM_LEAD_TIME_HOURS);
  date.setSeconds(0, 0);
  return date;
}

function getDefaultStartTime() {
  const date = getMinimumAllowedStartDateTime();
  if (date.getMinutes() > 0) {
    date.setHours(date.getHours() + 1);
    date.setMinutes(0);
  }
  return date.toTimeString().slice(0, 5);
}

function getDateTime(dateValue: string, timeValue: string) {
  if (!dateValue || !timeValue) return null;
  const date = new Date(`${dateValue}T${timeValue}:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string) {
  if (!value) return "Not selected";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function sortSchedules(schedules: RecurringDaySchedule[]) {
  return [...schedules].sort(
    (a, b) => RECURRING_DAY_NAMES.indexOf(a.day) - RECURRING_DAY_NAMES.indexOf(b.day)
  );
}

