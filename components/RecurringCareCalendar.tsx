"use client";

import { useMemo, useState } from "react";
import {
  BookingDraft,
  getNextRecurringVisits,
  getRecurringScheduleForDate,
  isRecurringDateScheduled,
  toDateInputValue,
} from "../lib/bookingDraft";

type CalendarVisitStatus =
  | "none"
  | "upcoming"
  | "inProgress"
  | "completed"
  | "skipped"
  | "cancelled";

type CalendarVisit = {
  date: string;
  status: CalendarVisitStatus;
  label: string;
};

type Props = {
  booking?: BookingDraft;
};

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function RecurringCareCalendar({ booking = {} }: Props) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const value = booking.recurringStartDate || booking.careDate;
    const date = value ? new Date(`${value}T00:00:00`) : new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  const [selectedVisit, setSelectedVisit] = useState<CalendarVisit | null>(null);

  const calendarDays = useMemo(
    () => getMonthGrid(visibleMonth),
    [visibleMonth]
  );

  const nextVisit = useMemo(
    () => getNextRecurringVisits(booking, 1)[0] || "",
    [booking]
  );

  function getVisitStatus(date: Date): CalendarVisitStatus {
    const value = toDateInputValue(date);
    const today = toDateInputValue(new Date());

    if (booking.cancelledVisitDates?.includes(value)) return "cancelled";
    if (booking.skippedVisitDates?.includes(value)) return "skipped";
    if (booking.completedVisitDates?.includes(value)) return "completed";
    if (!isRecurringDateScheduled(booking, date)) return "none";

    if (
      booking.recurringStatus === "Active" &&
      (booking.inProgressVisitDate === value || value === today)
    ) {
      return "inProgress";
    }

    return value < today ? "completed" : "upcoming";
  }

  function moveMonth(direction: "previous" | "next") {
    setVisibleMonth((current) => {
      const next = new Date(current);
      next.setMonth(current.getMonth() + (direction === "next" ? 1 : -1));
      return next;
    });
  }

  function handleDateClick(date: Date) {
    const status = getVisitStatus(date);
    if (status === "none") return;

    setSelectedVisit({
      date: toDateInputValue(date),
      status,
      label: getStatusLabel(status),
    });
  }

  return (
    <div className="rounded-3xl border border-purple-300 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => moveMonth("previous")}
          className="h-9 w-9 rounded-xl border border-purple-200 text-purple-700 hover:bg-purple-50"
          aria-label="Previous month"
        >
          ←
        </button>

        <div className="text-center">
          <h2 className="text-lg font-bold">
            {visibleMonth.toLocaleDateString("en-CA", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">Select a care day</p>
        </div>

        <button
          type="button"
          onClick={() => moveMonth("next")}
          className="h-9 w-9 rounded-xl border border-purple-200 text-purple-700 hover:bg-purple-50"
          aria-label="Next month"
        >
          →
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center">
        {WEEK_DAYS.map((day) => (
          <div key={day} className="py-1.5 text-[11px] font-bold text-gray-500">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date) => {
          const value = toDateInputValue(date);
          const status = getVisitStatus(date);
          const currentMonth = date.getMonth() === visibleMonth.getMonth();
          const clickable = status !== "none";
          const ongoing = status === "inProgress";

          return (
            <button
              key={value}
              type="button"
              disabled={!clickable}
              onClick={() => handleDateClick(date)}
              className={`relative min-h-12 rounded-xl border text-xs transition ${
                currentMonth
                  ? "border-purple-100 bg-white"
                  : "border-gray-100 bg-gray-50 text-gray-300"
              } ${
                clickable
                  ? "hover:border-purple-300 hover:bg-purple-50"
                  : "cursor-default"
              } ${ongoing ? "border-green-300 bg-green-50" : ""}`}
            >
              {ongoing && (
                <span className="pointer-events-none absolute inset-0 animate-pulse rounded-xl border-2 border-green-400" />
              )}

              <div className="relative z-10 flex min-h-12 flex-col items-center justify-center">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${getStatusClasses(
                    status
                  )}`}
                >
                  {date.getDate()}
                </span>

                {ongoing && (
                  <span className="mt-0.5 text-[8px] font-black uppercase tracking-wide text-green-700">
                    Ongoing
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Legend colour="bg-blue-500" label="Completed" />
        <Legend colour="bg-green-500" label="Ongoing" />
        <Legend colour="bg-purple-600" label="Upcoming" />
        <Legend colour="bg-orange-500" label="Skipped" />
        <Legend colour="bg-red-500" label="Cancelled" />
      </div>

      <div className="mt-4 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-purple-700">
          Next visit
        </p>
        <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bold">
            {nextVisit ? formatDate(nextVisit) : "No upcoming visit found"}
          </p>
          <p className="text-sm text-gray-600">
            {nextVisit ? formatScheduleTime(booking, nextVisit) : ""}
          </p>
        </div>
      </div>

      {selectedVisit && (
        <VisitModal
          booking={booking}
          visit={selectedVisit}
          onClose={() => setSelectedVisit(null)}
        />
      )}
    </div>
  );
}

function VisitModal({
  booking,
  visit,
  onClose,
}: {
  booking: BookingDraft;
  visit: CalendarVisit;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close visit details"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />

      <div className="relative w-full max-w-lg rounded-3xl border border-purple-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-purple-700">Visit Details</p>
            <h2 className="mt-1 text-2xl font-bold">{formatDate(visit.date)}</h2>
          </div>
          <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
            {visit.label}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DetailBox label="Time" value={formatScheduleTime(booking, visit.date)} />
          <DetailBox
            label="Caregiver"
            value={booking.assignedCaregiverName || "Not assigned"}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 py-3 font-semibold text-gray-700"
          >
            Close
          </button>
          <a
            href={
              visit.status === "completed"
                ? "/dashboard/care-record"
                : visit.status === "inProgress"
                ? "/dashboard/live-visit"
                : "/dashboard/care"
            }
            className="rounded-xl bg-purple-600 py-3 text-center font-semibold text-white hover:bg-purple-700"
          >
            View
          </a>
        </div>
      </div>
    </div>
  );
}

function getMonthGrid(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function getStatusLabel(status: CalendarVisitStatus) {
  return {
    none: "No visit",
    upcoming: "Upcoming",
    inProgress: "Ongoing",
    completed: "Completed",
    skipped: "Skipped",
    cancelled: "Cancelled",
  }[status];
}

function getStatusClasses(status: CalendarVisitStatus) {
  return {
    none: "text-gray-700 hover:bg-gray-100",
    upcoming: "bg-purple-600 text-white",
    inProgress: "bg-green-500 text-white ring-2 ring-green-100",
    completed: "bg-blue-500 text-white",
    skipped: "bg-orange-500 text-white",
    cancelled: "bg-red-500 text-white",
  }[status];
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatScheduleTime(booking: BookingDraft, dateValue: string) {
  const schedule = getRecurringScheduleForDate(booking, dateValue);
  if (!schedule) return "Time not selected";
  return `${formatTime(schedule.startTime)} – ${formatTime(schedule.endTime)}`;
}

function formatTime(value: string) {
  const [hours, minutes = "00"] = value.split(":");
  const hour = Number(hours);
  return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? "PM" : "AM"}`;
}

function Legend({ colour, label }: { colour: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700">
      <span className={`h-2 w-2 rounded-full ${colour}`} />
      {label}
    </span>
  );
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-purple-200 bg-white p-4">
      <p className="mb-1 text-xs text-gray-500">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}
