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

export default function CustomerCareRecordsPage() {
  const [
    records,
    setRecords,
  ] =
    useState<CustomerVisitHistoryItem[]>(
      []
    );

  const [
    search,
    setSearch,
  ] =
    useState(
      ""
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
          setRecords(
            result.visits.filter(
              (
                visit
              ) =>
                visit.status ===
                "completed"
            )
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

  const filtered =
    useMemo(
      () => {
        const term =
          search
            .trim()
            .toLowerCase();

        if (
          !term
        ) {
          return records;
        }

        return records.filter(
          (
            record
          ) =>
            [
              record.publicId,
              record.recipientName,
              record.caregiverName,
              record.city,
              record.province,
              record.paymentStatus,
            ]
              .filter(
                Boolean
              )
              .join(
                " "
              )
              .toLowerCase()
              .includes(
                term
              )
        );
      },
      [
        records,
        search,
      ]
    );

  return (
    <DashboardLayout
      activeItem="My Care"
      role="customer"
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <Link
            href="/dashboard/care"
            className="text-sm font-semibold text-purple-700 hover:underline"
          >
            ← Back to My Care
          </Link>

          <p className="mt-5 text-sm font-semibold text-purple-600">
            Family Care Portal
          </p>

          <h1 className="mt-1 text-3xl font-bold md:text-4xl">
            Care Records
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Review completed visits and their care documentation.
          </p>
        </header>

        <section className="mb-5 rounded-3xl border border-purple-200 bg-white p-5 shadow-sm">
          <label
            htmlFor="care-record-search"
            className="mb-2 block text-sm font-bold text-gray-900"
          >
            Search care records
          </label>

          <input
            id="care-record-search"
            type="search"
            value={
              search
            }
            onChange={
              (
                event
              ) =>
                setSearch(
                  event.target.value
                )
            }
            placeholder="Recipient, caregiver, visit reference or location"
            className="w-full rounded-xl border border-purple-200 px-4 py-3 outline-none focus:ring-2 focus:ring-purple-200"
          />
        </section>

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
          <div className="grid animate-pulse grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="h-72 rounded-3xl bg-gray-200" />
            <div className="h-72 rounded-3xl bg-gray-200" />
          </div>
        ) : filtered.length >
          0 ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {filtered.map(
              (
                record
              ) => (
                <article
                  key={
                    record.id
                  }
                  className="rounded-3xl border border-purple-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-purple-600">
                        {record.publicId ||
                          "Completed visit"}
                      </p>

                      <h2 className="mt-1 text-xl font-bold text-gray-900">
                        {
                          formatDate(
                            record.startDatetime
                          )
                        }
                      </h2>

                      <p className="mt-1 text-sm text-gray-600">
                        {
                          record.recipientName
                        }
                      </p>
                    </div>

                    <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                      Completed
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <RecordBox
                      label="Caregiver"
                      value={
                        record.caregiverName
                      }
                    />

                    <RecordBox
                      label="Actual time"
                      value={
                        formatDuration(
                          record.clockInAt,
                          record.clockOutAt
                        )
                      }
                    />

                    <RecordBox
                      label="Total"
                      value={
                        record.amountPaid !==
                        null
                          ? `$${record.amountPaid.toFixed(
                              2
                            )}`
                          : "—"
                      }
                    />

                    <RecordBox
                      label="Payment"
                      value={
                        record.paymentStatus ===
                        "paid"
                          ? "Paid"
                          : record.paymentStatus ||
                            "Not available"
                      }
                    />
                  </div>

                  <Link
                    href={`/dashboard/live-visit?visit=${encodeURIComponent(
                      record.id
                    )}`}
                    className="mt-5 block w-full rounded-xl bg-purple-600 py-3 text-center font-semibold text-white hover:bg-purple-700"
                  >
                    View Care Record
                  </Link>
                </article>
              )
            )}
          </div>
        ) : (
          <div className="rounded-3xl border border-purple-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold">
              No care records found
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Completed visits will appear here automatically.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function RecordBox({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="rounded-2xl border border-purple-100 bg-purple-50 p-3">
      <p className="mb-1 text-xs text-gray-500">
        {
          label
        }
      </p>

      <p className="font-bold text-gray-900">
        {
          value
        }
      </p>
    </div>
  );
}

function formatDate(
  value:
    string | null
) {
  if (
    !value
  ) {
    return "Completed visit";
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
    return "Completed visit";
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

function formatDuration(
  startValue:
    string | null,
  endValue:
    string | null
) {
  if (
    !startValue ||
    !endValue
  ) {
    return "—";
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
    return "—";
  }

  const minutes =
    Math.max(
      0,
      Math.round(
        (
          end.getTime() -
          start.getTime()
        ) /
        60000
      )
    );

  const hours =
    Math.floor(
      minutes /
      60
    );

  const remainder =
    minutes %
    60;

  if (
    hours ===
    0
  ) {
    return `${remainder} min`;
  }

  if (
    remainder ===
    0
  ) {
    return `${hours} hr${
      hours ===
      1
        ? ""
        : "s"
    }`;
  }

  return `${hours} hr${
    hours ===
    1
      ? ""
      : "s"
  } ${remainder} min`;
}
