"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProgressHeader from "../../../components/ui/ProgressHeader";
import SelectionCard from "../../../components/ui/SelectionCard";
import {
  RECURRING_DAY_NAMES,
  RecurringDayName,
  RecurringFrequency,
  getBookingDraft,
  getDayNameFromDate,
  saveBookingDraft,
  toDateInputValue,
} from "../../../lib/bookingDraft";

const FREQUENCIES: RecurringFrequency[] = ["Weekly", "Biweekly", "Monthly"];

export default function RecurringCarePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editMode = searchParams.get("mode") === "edit";

  const [frequency, setFrequency] = useState<RecurringFrequency>("Weekly");
  const [selectedDays, setSelectedDays] = useState<RecurringDayName[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [preferredCaregiver, setPreferredCaregiver] = useState(true);
  const [showErrors, setShowErrors] = useState(false);

  const today = useMemo(() => toDateInputValue(new Date()), []);

  useEffect(() => {
    const draft = getBookingDraft();
    const initialStart =
      draft.recurringStartDate || draft.careDate || getDefaultStartDate();
    const initialDay = getDayNameFromDate(initialStart);

    setFrequency(draft.recurringFrequency || "Weekly");
    setStartDate(initialStart);
    setSelectedDays(
      sortDays(
        Array.from(
          new Set([
            ...(initialDay ? [initialDay] : []),
            ...(draft.recurringDays || []),
          ])
        )
      )
    );
    setEndDate(draft.recurringEndDate || "");
    setPreferredCaregiver(draft.preferSameCaregiver ?? true);
  }, []);

  const startDay = getDayNameFromDate(startDate);
  const isStartDateValid = Boolean(startDate) && startDate >= today;
  const isEndDateValid = !endDate || !startDate || endDate >= startDate;
  const isValid = isStartDateValid && selectedDays.length > 0 && isEndDateValid;

  function handleStartDateChange(value: string) {
    setStartDate(value);

    if (!value) {
      setSelectedDays([]);
      return;
    }

    const newStartDay = getDayNameFromDate(value);

    setSelectedDays((current) =>
      sortDays(
        Array.from(
          new Set([...(newStartDay ? [newStartDay] : []), ...current])
        )
      )
    );

    if (endDate && endDate < value) setEndDate("");
  }

  function toggleDay(day: RecurringDayName) {
    if (day === startDay) return;

    setSelectedDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : sortDays([...current, day])
    );
  }

  function handleContinue() {
    setShowErrors(true);
    if (!isValid) return;

    saveBookingDraft({
      scheduleType: "Recurring Care",
      careDate: startDate,
      recurringFrequency: frequency,
      recurringDays: selectedDays,
      recurringStartDate: startDate,
      recurringEndDate: endDate || undefined,
      preferSameCaregiver: preferredCaregiver,
      recurringStatus: "Active",
    });

    router.push(`/find-care/date-time${editMode ? "?mode=edit" : ""}`);
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-5 text-gray-900 sm:px-6">
      <section className="mx-auto w-full max-w-xl rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <ProgressHeader
          backHref={editMode ? "/dashboard/recurring-care" : "/find-care/schedule"}
          stage="3 of 4"
          progress="w-[65%]"
          title={editMode ? "Edit recurring care" : "Set up recurring care"}
          subtitle="Choose the first date before selecting the remaining recurring days."
        />

        <div className="space-y-6">
          <section>
            <p className="mb-3 text-sm font-bold">How often is care needed?</p>
            <div className="grid grid-cols-1 gap-3">
              {FREQUENCIES.map((item) => (
                <SelectionCard
                  key={item}
                  title={item}
                  description={
                    item === "Weekly"
                      ? "Care repeats every week."
                      : item === "Biweekly"
                      ? "Care repeats every two weeks."
                      : "Care repeats in the same week of each month."
                  }
                  selected={frequency === item}
                  onClick={() => setFrequency(item)}
                />
              ))}
            </div>
          </section>

          <section>
            <label className="mb-2 block text-sm font-bold">First care date</label>
            <input
              type="date"
              min={today}
              value={startDate}
              onChange={(event) => handleStartDateChange(event.target.value)}
              className={`w-full rounded-xl border p-3 outline-none focus:ring-2 focus:ring-purple-200 ${
                showErrors && !isStartDateValid
                  ? "border-red-500"
                  : "border-purple-300"
              }`}
            />

            {startDate && startDay && (
              <div className="mt-2 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2">
                <p className="text-xs text-purple-700">
                  Your first visit is <strong>{startDay}</strong>. That day is
                  selected automatically and cannot be removed.
                </p>
              </div>
            )}

            {showErrors && !isStartDateValid && (
              <p className="mt-2 text-sm text-red-600">
                Choose today or a future date.
              </p>
            )}
          </section>

          {startDate && (
            <section>
              <p className="text-sm font-bold">Recurring day(s)</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                Add any other days needed. You will set a separate start and end
                time for every selected day on the next page.
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {RECURRING_DAY_NAMES.map((day) => {
                  const selected = selectedDays.includes(day);
                  const locked = day === startDay;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      aria-pressed={selected}
                      className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                        selected
                          ? "border-purple-600 bg-purple-600 text-white"
                          : "border-purple-200 bg-white text-gray-700 hover:bg-purple-50"
                      }`}
                    >
                      {selected ? "✓ " : ""}
                      {day}
                      {locked && (
                        <span className="block text-[10px] font-medium opacity-80">
                          First visit
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <label className="mb-2 block text-sm font-bold">
              End date <span className="font-medium text-gray-400">(optional)</span>
            </label>
            <input
              type="date"
              min={startDate || today}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className={`w-full rounded-xl border p-3 outline-none focus:ring-2 focus:ring-purple-200 ${
                showErrors && !isEndDateValid
                  ? "border-red-500"
                  : "border-purple-300"
              }`}
            />
            <p className="mt-2 text-xs text-gray-500">
              Leave blank for ongoing care until cancelled.
            </p>
          </section>

          <button
            type="button"
            onClick={() => setPreferredCaregiver((current) => !current)}
            className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
              preferredCaregiver
                ? "border-purple-400 bg-purple-50"
                : "border-gray-200 bg-white"
            }`}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold ${
                preferredCaregiver
                  ? "border-purple-600 bg-purple-600 text-white"
                  : "border-gray-300 text-transparent"
              }`}
            >
              ✓
            </span>
            <span className="text-sm text-gray-700">
              <strong>Prefer the same caregiver where possible</strong>
              <br />
              Continuity is preferred but depends on caregiver availability.
            </span>
          </button>

          <section className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
            <p className="text-sm font-bold">Recurring care summary</p>
            <div className="mt-3 space-y-2 text-sm">
              <SummaryLine label="Frequency" value={frequency} />
              <SummaryLine
                label="Days"
                value={selectedDays.join(", ") || "Not selected"}
              />
              <SummaryLine label="Starts" value={startDate || "Not selected"} />
              <SummaryLine
                label="Ends"
                value={endDate || "Ongoing until cancelled"}
              />
            </div>
          </section>

          <button
            type="button"
            onClick={handleContinue}
            className={`w-full rounded-xl py-3 font-semibold transition ${
              isValid
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : "border border-purple-300 bg-purple-100 text-purple-700"
            }`}
          >
            {isValid ? "Continue to Day & Time" : "Complete recurring setup"}
          </button>
        </div>
      </section>
    </main>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <strong>{label}</strong>
      <span className="max-w-[65%] text-right">{value}</span>
    </div>
  );
}

function getDefaultStartDate() {
  const date = new Date();
  if (date.getHours() >= 21) date.setDate(date.getDate() + 1);
  return toDateInputValue(date);
}

function sortDays(days: RecurringDayName[]) {
  return [...days].sort(
    (a, b) => RECURRING_DAY_NAMES.indexOf(a) - RECURRING_DAY_NAMES.indexOf(b)
  );
}
