"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import DashboardLayout from "../../../components/DashboardLayout";

import {
  CaregiverScheduleVisit,
  loadMyCaregiverVisitSchedule,
} from "../../../lib/caregiverSchedulePersistence";

export default function CaregiverSchedulePage() {
  const [
    visits,
    setVisits,
  ] =
    useState<CaregiverScheduleVisit[]>(
      []
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    calendarMonth,
    setCalendarMonth,
  ] =
    useState(() => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), 1);
    });

  useEffect(() => {
    let mounted = true;

    async function load() {
      const result =
        await loadMyCaregiverVisitSchedule();

      if (!mounted) {
        return;
      }

      if (result.success) {
        setVisits(result.visits);
        setError("");
      } else {
        setError(result.error);
      }

      setIsLoading(false);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const upcomingVisits =
    useMemo(
      () =>
        visits.filter(
          (visit) =>
            visit.status === "in_progress" ||
            (
              visit.status === "scheduled" &&
              isFutureOrCurrent(visit.endDatetime)
            )
        ),
      [visits]
    );

  const completedVisits =
    useMemo(
      () =>
        visits.filter(
          (visit) =>
            visit.status === "completed"
        ),
      [visits]
    );

  return (
    <DashboardLayout
      activeItem="My Schedule"
      role="caregiver"
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <p className="text-sm font-semibold text-emerald-700">
            Caregiver Workspace
          </p>

          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-black text-gray-950 md:text-4xl">
                My Schedule
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Your confirmed visits and work calendar.
              </p>
            </div>

            <Link
              href="/caregiver/onboarding/availability"
              className="rounded-xl border border-emerald-200 bg-white px-5 py-2.5 text-center text-sm font-bold text-emerald-700"
            >
              Update availability
            </Link>
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <ScheduleSkeleton />
        ) : (
          <>
            <section className="mb-7 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <CaregiverCalendar
                visits={upcomingVisits}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
              />

              <div>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-700">
                      Upcoming
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-gray-950">
                      Confirmed visits
                    </h2>
                  </div>

                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                    {upcomingVisits.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {upcomingVisits.length > 0 ? (
                    upcomingVisits.map((visit, index) => (
                      <CaregiverVisitRow
                        key={visit.id}
                        visit={visit}
                        label={
                          visit.status === "in_progress"
                            ? "In progress"
                            : index === 0
                              ? "Next visit"
                              : "Upcoming"
                        }
                      />
                    ))
                  ) : (
                    <div className="rounded-3xl border border-dashed border-emerald-300 bg-emerald-50/50 p-6 text-center">
                      <h3 className="font-black text-gray-950">
                        No confirmed visits scheduled
                      </h3>

                      <p className="mt-2 text-sm text-gray-600">
                        New confirmed care visits will appear here automatically.
                      </p>

                      <Link
                        href="/caregiver/job-offers"
                        className="mt-4 inline-flex rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white"
                      >
                        View job offers
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-400">
                    History
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-gray-950">
                    Completed visits
                  </h2>
                </div>

                <span className="text-sm font-bold text-gray-500">
                  {completedVisits.length}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {completedVisits.slice(0, 6).map((visit) => (
                  <CaregiverVisitRow
                    key={visit.id}
                    visit={visit}
                    label="Completed"
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function CaregiverVisitRow({
  visit,
  label,
}: {
  visit: CaregiverScheduleVisit;
  label: string;
}) {
  const live = visit.status === "in_progress";

  return (
    <article className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
            live
              ? "bg-emerald-600 text-white"
              : visit.status === "completed"
                ? "bg-gray-100 text-gray-600"
                : "bg-emerald-100 text-emerald-800"
          }`}>
            {label}
          </span>

          <h3 className="mt-2 text-lg font-black text-gray-950">
            {visit.recipientName}
          </h3>

          <p className="mt-1 text-sm font-semibold text-gray-700">
            {formatVisitWindow(
              visit.startDatetime,
              visit.endDatetime
            )}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {[visit.city, visit.province]
              .filter(Boolean)
              .join(", ") ||
              "Care location"}
          </p>
        </div>

        <Link
          href={`/caregiver/active-visit?visit=${encodeURIComponent(
            visit.id
          )}`}
          className={`shrink-0 rounded-xl px-4 py-2.5 text-center text-sm font-bold ${
            visit.status === "completed"
              ? "border border-gray-200 text-gray-600"
              : "bg-emerald-600 text-white"
          }`}
        >
          {visit.status === "completed"
            ? "View visit"
            : live
              ? "Continue visit"
              : "Open visit"}
        </Link>
      </div>
    </article>
  );
}

function CaregiverCalendar({
  visits,
  month,
  onMonthChange,
}: {
  visits: CaregiverScheduleVisit[];
  month: Date;
  onMonthChange: (month: Date) => void;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leading = firstDay.getDay();

  const visitsByDay = new Map<number, number>();

  visits.forEach((visit) => {
    if (!visit.startDatetime) return;

    const date = new Date(visit.startDatetime);

    if (
      date.getFullYear() === year &&
      date.getMonth() === monthIndex
    ) {
      visitsByDay.set(
        date.getDate(),
        (visitsByDay.get(date.getDate()) || 0) + 1
      );
    }
  });

  const cells: Array<number | null> = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return (
    <div className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            onMonthChange(
              new Date(year, monthIndex - 1, 1)
            )
          }
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-100 text-emerald-700"
        >
          ‹
        </button>

        <h2 className="font-black text-gray-950">
          {new Intl.DateTimeFormat("en-CA", {
            month: "long",
            year: "numeric",
          }).format(month)}
        </h2>

        <button
          type="button"
          onClick={() =>
            onMonthChange(
              new Date(year, monthIndex + 1, 1)
            )
          }
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-100 text-emerald-700"
        >
          ›
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="py-1 text-[10px] font-black uppercase text-gray-400"
          >
            {day}
          </div>
        ))}

        {cells.map((day, index) => {
          const count = day ? visitsByDay.get(day) || 0 : 0;

          return (
            <div
              key={`${day || "blank"}-${index}`}
              className={`relative min-h-11 rounded-xl p-2 text-sm ${
                day
                  ? count > 0
                    ? "bg-emerald-600 font-black text-white"
                    : "bg-gray-50 text-gray-700"
                  : ""
              }`}
            >
              {day}

              {count > 0 && (
                <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div className="h-96 animate-pulse rounded-3xl bg-gray-100" />
      <div className="space-y-3">
        <div className="h-28 animate-pulse rounded-2xl bg-gray-100" />
        <div className="h-28 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    </div>
  );
}

function isFutureOrCurrent(value: string | null) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() >= Date.now();
}

function formatVisitWindow(
  startValue: string | null,
  endValue: string | null
) {
  if (!startValue) {
    return "Schedule unavailable";
  }

  const start = new Date(startValue);
  const end = endValue ? new Date(endValue) : null;

  if (Number.isNaN(start.getTime())) {
    return startValue;
  }

  const date = new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Toronto",
  }).format(start);

  const time = new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Toronto",
  });

  return end && !Number.isNaN(end.getTime())
    ? `${date} · ${time.format(start)} – ${time.format(end)}`
    : `${date} · ${time.format(start)}`;
}
