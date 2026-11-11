"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import DashboardLayout from "../../../components/DashboardLayout";

import {
  CustomerVisitHistoryItem,
  loadMyCustomerVisitHistory,
} from "../../../lib/customerVisitHistoryPersistence";

export default function MyCarePage() {
  const [
    visits,
    setVisits,
  ] =
    useState<CustomerVisitHistoryItem[]>(
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
    calendarMonth,
    setCalendarMonth,
  ] =
    useState(() => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), 1);
    });

  useEffect(
    () => {
      let mounted =
        true;

      async function load() {
        const result =
          await loadMyCustomerVisitHistory();

        if (
          !mounted
        ) {
          return;
        }

        if (
          result.success
        ) {
          setVisits(
            result.visits
          );

          setError(
            ""
          );
        } else {
          setError(
            result.error
          );
        }

        setIsLoading(
          false
        );
      }

      load();

      return () => {
        mounted =
          false;
      };
    },
    []
  );

  const currentVisit =
    useMemo(
      () =>
        visits.find(
          (
            visit
          ) =>
            visit.status ===
            "in_progress"
        ) ||
        visits.find(
          (
            visit
          ) =>
            visit.status ===
              "scheduled" &&
            isFutureOrCurrent(
              visit.endDatetime
            )
        ) ||
        null,
      [
        visits,
      ]
    );

  const upcomingVisits =
    useMemo(
      () =>
        visits.filter(
          (
            visit
          ) =>
            (
              visit.status ===
                "scheduled" &&
              isFutureOrCurrent(
                visit.endDatetime
              )
            ) ||
            visit.status ===
              "in_progress"
        ),
      [
        visits,
      ]
    );

  const completedVisits =
    useMemo(
      () =>
        visits.filter(
          (
            visit
          ) =>
            visit.status ===
            "completed"
        ),
      [
        visits,
      ]
    );

  return (
    <DashboardLayout
      activeItem="My Care"
      role="customer"
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <p className="text-sm font-semibold text-purple-600">
            Family Care Portal
          </p>

          <h1 className="mt-1 text-3xl font-bold md:text-4xl">
            My Care
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Your current care, upcoming visits and completed care records.
          </p>
        </header>

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

        {isLoading ? (
          <MyCareSkeleton />
        ) : (
          <>
            <section className="mb-7">
              <SectionHeader
                eyebrow="Current Care"
                title={
                  currentVisit
                    ? currentVisit.status ===
                        "in_progress"
                      ? "Care in progress"
                      : "Next scheduled visit"
                    : "No active care visit"
                }
                detail={
                  currentVisit
                    ? "Your current or next visit appears here."
                    : "Book care when you need another visit."
                }
              />

              <div className="mt-4">
                {currentVisit ? (
                  <CurrentVisitCard
                    visit={
                      currentVisit
                    }
                  />
                ) : (
                  <div className="rounded-3xl border border-dashed border-purple-300 bg-purple-50/40 p-6">
                    <h3 className="text-xl font-bold text-gray-900">
                      You&apos;re all caught up
                    </h3>

                    <p className="mt-2 text-sm text-gray-600">
                      There is no active or upcoming visit right now.
                    </p>

                    <Link
                      href="/find-care"
                      className="mt-5 inline-flex rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white"
                    >
                      Book New Care
                    </Link>
                  </div>
                )}
              </div>
            </section>

            <section className="mb-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <SectionHeader
                  eyebrow="Schedule"
                  title="Your care calendar"
                  detail={`${upcomingVisits.length} upcoming visit${
                    upcomingVisits.length === 1 ? "" : "s"
                  } in your care schedule.`}
                />

                <Link
                  href="/find-care"
                  className="rounded-xl bg-purple-600 px-5 py-2.5 text-center text-sm font-bold text-white"
                >
                  Book more care
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <VisitCalendar
                  visits={upcomingVisits}
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                />

                <div className="space-y-3">
                  {upcomingVisits.length > 0 ? (
                    upcomingVisits.map((visit, index) => (
                      <UpcomingVisitRow
                        key={visit.id}
                        visit={visit}
                        label={index === 0 ? "Next visit" : `Upcoming visit ${index + 1}`}
                      />
                    ))
                  ) : (
                    <div className="rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
                      New confirmed visits will appear here automatically.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="mb-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <SectionHeader
                  eyebrow="History"
                  title="Completed care"
                  detail="Completed visits stay here as part of your care history."
                />

                {completedVisits.length >
                  0 && (
                  <Link
                    href="/dashboard/care-record"
                    className="text-sm font-bold text-purple-700 hover:underline"
                  >
                    View all care records →
                  </Link>
                )}
              </div>

              <div className="mt-4">
                {completedVisits.length >
                0 ? (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {completedVisits
                      .slice(
                        0,
                        4
                      )
                      .map(
                        (
                          visit
                        ) => (
                          <CompletedVisitCard
                            key={
                              visit.id
                            }
                            visit={
                              visit
                            }
                          />
                        )
                      )}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
                    Completed visits will appear here automatically.
                  </div>
                )}
              </div>
            </section>

            <section>
              <SectionHeader
                eyebrow="Manage"
                title="Care tools"
                detail="Other care-related actions remain available here."
              />

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <CareTool
                  href="/dashboard/caregivers"
                  title="My Caregiver"
                  detail="View your assigned caregiver and relevant profile."
                />

                <CareTool
                  href="/dashboard/care-record"
                  title="Care Records"
                  detail="Review your completed visit history."
                />

                <CareTool
                  href="/dashboard/family"
                  title="Family Access"
                  detail="Manage family members and viewing permissions."
                />
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function CurrentVisitCard({
  visit,
}: {
  visit:
    CustomerVisitHistoryItem;
}) {
  const isLive =
    visit.status ===
    "in_progress";

  return (
    <article
      className={`rounded-3xl border bg-white p-5 shadow-sm sm:p-6 ${
        isLive
          ? "border-emerald-300"
          : "border-purple-300"
      }`}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                isLive
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-purple-100 text-purple-700"
              }`}
            >
              {isLive
                ? "In Progress"
                : "Scheduled"}
            </span>

            {visit.publicId && (
              <span className="text-xs text-gray-400">
                {
                  visit.publicId
                }
              </span>
            )}
          </div>

          <h2 className="mt-3 text-2xl font-bold text-gray-900">
            Care for{" "}
            {
              visit.recipientName
            }
          </h2>

          <p className="mt-2 font-semibold text-gray-800">
            {
              formatVisitWindow(
                visit.startDatetime,
                visit.endDatetime
              )
            }
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Caregiver:{" "}
            <strong className="text-gray-800">
              {
                visit.caregiverName
              }
            </strong>
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto">
          <Link
            href={`/dashboard/live-visit?visit=${encodeURIComponent(
              visit.id
            )}`}
            className={`rounded-xl px-6 py-3 text-center font-semibold text-white ${
              isLive
                ? "bg-emerald-600"
                : "bg-purple-600"
            }`}
          >
            {isLive
              ? "Open Live Visit"
              : "View Visit"}
          </Link>

          <Link
            href="/dashboard/messages"
            className="rounded-xl border border-purple-300 bg-white px-6 py-3 text-center font-semibold text-purple-700"
          >
            Message Caregiver
          </Link>
        </div>
      </div>
    </article>
  );
}

function UpcomingVisitRow({
  visit,
  label,
}: {
  visit: CustomerVisitHistoryItem;
  label: string;
}) {
  const isLive = visit.status === "in_progress";

  return (
    <article className="rounded-2xl border border-purple-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
              isLive
                ? "bg-emerald-100 text-emerald-700"
                : "bg-purple-100 text-purple-700"
            }`}>
              {isLive ? "In progress" : label}
            </span>

            {visit.paymentStatus === "paid" && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                Paid
                {visit.amountPaid !== null
                  ? ` · $${visit.amountPaid.toFixed(2)}`
                  : ""}
              </span>
            )}
          </div>

          <h3 className="mt-2 text-lg font-bold text-gray-900">
            Care for {visit.recipientName}
          </h3>

          <p className="mt-1 text-sm font-semibold text-gray-700">
            {formatVisitWindow(
              visit.startDatetime,
              visit.endDatetime
            )}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {visit.caregiverName}
            {visit.city
              ? ` · ${[visit.city, visit.province].filter(Boolean).join(", ")}`
              : ""}
          </p>
        </div>

        <Link
          href={`/dashboard/live-visit?visit=${encodeURIComponent(
            visit.id
          )}`}
          className="shrink-0 rounded-xl border border-purple-200 px-4 py-2.5 text-center text-sm font-bold text-purple-700 hover:bg-purple-50"
        >
          View visit
        </Link>
      </div>
    </article>
  );
}

function VisitCalendar({
  visits,
  month,
  onMonthChange,
}: {
  visits: CustomerVisitHistoryItem[];
  month: Date;
  onMonthChange: (month: Date) => void;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const leading = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

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
    <div className="rounded-3xl border border-purple-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() =>
            onMonthChange(
              new Date(year, monthIndex - 1, 1)
            )
          }
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-100 text-purple-700"
          aria-label="Previous month"
        >
          ‹
        </button>

        <h3 className="font-black text-gray-950">
          {new Intl.DateTimeFormat("en-CA", {
            month: "long",
            year: "numeric",
          }).format(month)}
        </h3>

        <button
          type="button"
          onClick={() =>
            onMonthChange(
              new Date(year, monthIndex + 1, 1)
            )
          }
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-100 text-purple-700"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="py-1 text-[10px] font-black uppercase tracking-wide text-gray-400"
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
                    ? "bg-purple-600 font-black text-white"
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

function CompletedVisitCard({
  visit,
}: {
  visit:
    CustomerVisitHistoryItem;
}) {
  return (
    <article className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-purple-700">
            Completed Visit
          </p>

          <h3 className="mt-2 text-xl font-bold text-gray-900">
            {
              visit.recipientName
            }
          </h3>
        </div>

        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
          Completed
        </span>
      </div>

      <p className="mt-4 text-sm font-semibold text-gray-800">
        {
          formatVisitWindow(
            visit.startDatetime,
            visit.endDatetime
          )
        }
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <InfoBox
          label="Caregiver"
          value={
            visit.caregiverName
          }
        />

        <InfoBox
          label="Payment"
          value={
            visit.paymentStatus ===
            "paid"
              ? visit.amountPaid !==
                null
                ? `Paid · $${visit.amountPaid.toFixed(
                    2
                  )}`
                : "Paid"
              : visit.paymentStatus ||
                "Not available"
          }
        />
      </div>

      <Link
        href={`/dashboard/live-visit?visit=${encodeURIComponent(
          visit.id
        )}`}
        className="mt-5 block rounded-xl bg-purple-600 px-5 py-3 text-center font-semibold text-white"
      >
        View Care Record
      </Link>
    </article>
  );
}

function CareTool({
  href,
  title,
  detail,
}: {
  href:
    string;

  title:
    string;

  detail:
    string;
}) {
  return (
    <Link
      href={
        href
      }
      className="rounded-3xl border border-purple-200 bg-white p-5 shadow-sm transition hover:border-purple-400"
    >
      <h3 className="text-lg font-bold text-gray-900">
        {
          title
        }
      </h3>

      <p className="mt-2 text-sm text-gray-600">
        {
          detail
        }
      </p>

      <p className="mt-4 text-sm font-bold text-purple-700">
        Open →
      </p>
    </Link>
  );
}

function SectionHeader({
  eyebrow,
  title,
  detail,
}: {
  eyebrow:
    string;

  title:
    string;

  detail:
    string;
}) {
  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-purple-700">
        {
          eyebrow
        }
      </p>

      <h2 className="mt-1 text-2xl font-bold text-gray-900">
        {
          title
        }
      </h2>

      <p className="mt-1 text-sm text-gray-500">
        {
          detail
        }
      </p>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="rounded-2xl bg-gray-50 p-3">
      <p className="text-xs text-gray-400">
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

function MyCareSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-40 rounded-3xl bg-gray-200" />
      <div className="mt-7 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-3xl bg-gray-200" />
        <div className="h-64 rounded-3xl bg-gray-200" />
      </div>
    </div>
  );
}

function isFutureOrCurrent(
  value:
    string | null
) {
  if (
    !value
  ) {
    return false;
  }

  const timestamp =
    new Date(
      value
    ).getTime();

  return (
    !Number.isNaN(
      timestamp
    ) &&
    timestamp >=
      Date.now()
  );
}

function formatVisitWindow(
  startValue:
    string | null,
  endValue:
    string | null
) {
  if (
    !startValue ||
    !endValue
  ) {
    return "Scheduled care";
  }

  const start =
    new Date(
      startValue
    );

  const end =
    new Date(
      endValue
    );

  if (
    Number.isNaN(
      start.getTime()
    ) ||
    Number.isNaN(
      end.getTime()
    )
  ) {
    return "Scheduled care";
  }

  const date =
    new Intl.DateTimeFormat(
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
      start
    );

  const time =
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

  return `${date} · ${time.format(
    start
  )} – ${time.format(
    end
  )}`;
}
