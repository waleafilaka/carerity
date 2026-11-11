"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import {
  CareRecord,
  getCompletedCareRecords,
  seedSampleCareRecords,
} from "../../../lib/careRecords";

export default function DocumentsPage() {
  const [records, setRecords] = useState<CareRecord[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    seedSampleCareRecords();
    setRecords(getCompletedCareRecords());
  }, []);

  const filteredRecords = useMemo(() => {
    const term = appliedSearch.trim().toLowerCase();

    return records.filter((record) => {
      if (fromDate && record.visitDate < fromDate) return false;
      if (toDate && record.visitDate > toDate) return false;

      if (!term) return true;

      return [
        record.publicRecordId,
        record.careRecipientName,
        record.caregiverName,
        record.visitDate,
        record.status,
        record.paymentStatus,
        record.careSummary,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [records, appliedSearch, fromDate, toDate]);

  function resetFilters() {
    setSearchInput("");
    setAppliedSearch("");
    setFromDate("");
    setToDate("");
  }

  const hasFilters = Boolean(
    searchInput || appliedSearch || fromDate || toDate
  );

  return (
    <DashboardLayout activeItem="Documents" role="customer">
      <div className="mx-auto max-w-6xl">
        <header className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-purple-600">
              Customer Dashboard
            </p>

            <h1 className="mt-1 text-3xl font-bold md:text-4xl">
              Care Records
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Review completed visits and supporting documentation.
            </p>
          </div>

          <a
            href="/dashboard/care-record"
            className="rounded-xl bg-purple-600 px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-purple-700"
          >
            Open Full Care Records
          </a>
        </header>

        <section className="mb-4 rounded-3xl border border-purple-300 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_160px_160px_auto] lg:items-end">
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">
                Search care records
              </span>

              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setAppliedSearch(searchInput);
                  }
                }}
                placeholder="Record ID, caregiver, recipient, date or status"
                className="w-full rounded-xl border border-purple-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-200"
              />
            </label>

            <DateField
              label="From"
              value={fromDate}
              max={toDate || undefined}
              onChange={setFromDate}
            />

            <DateField
              label="To"
              value={toDate}
              min={fromDate || undefined}
              onChange={setToDate}
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAppliedSearch(searchInput)}
                className="flex-1 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700"
              >
                Search
              </button>

              {hasFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-xl border border-purple-200 px-4 py-2.5 text-sm font-semibold text-purple-700 hover:bg-purple-50"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            <strong>{filteredRecords.length}</strong>{" "}
            {filteredRecords.length === 1 ? "record" : "records"} found
          </p>

          {(fromDate || toDate) && (
            <p className="text-xs text-gray-500">
              {fromDate || "Beginning"} → {toDate || "Today"}
            </p>
          )}
        </div>

        {filteredRecords.length > 0 ? (
          <div className="space-y-3">
            {filteredRecords.map((record) => (
              <article
                key={record.id}
                className="rounded-2xl border border-purple-200 bg-white p-4 shadow-sm transition hover:border-purple-400 hover:shadow-md"
              >
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(220px,1.2fr)_repeat(4,minmax(100px,0.7fr))_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-purple-600">
                        {record.publicRecordId}
                      </p>

                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                        {record.status}
                      </span>
                    </div>

                    <h2 className="mt-1 text-lg font-bold text-gray-900">
                      {formatDate(record.visitDate)}
                    </h2>

                    <p className="mt-1 text-sm text-gray-600">
                      {record.careRecipientName || "Care recipient"}
                    </p>
                  </div>

                  <HorizontalValue
                    label="Caregiver"
                    value={record.caregiverName || "Not assigned"}
                  />

                  <HorizontalValue
                    label="Hours"
                    value={`${record.durationHours || 0} hrs`}
                  />

                  <HorizontalValue
                    label="Total"
                    value={formatCurrency(record.total)}
                  />

                  <HorizontalValue
                    label="Payment"
                    value={record.paymentStatus || "Pending"}
                  />

                  <a
                    href={`/dashboard/care-record?id=${encodeURIComponent(
                      record.id
                    )}`}
                    className="rounded-xl bg-purple-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-purple-700"
                  >
                    View
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-purple-200 bg-white p-7 text-center shadow-sm">
            <h2 className="text-xl font-bold">
              No care records found
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Try another search term or a wider date range.
            </p>

            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function DateField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold">
        {label}
      </span>

      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-purple-200 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-purple-200"
      />
    </label>
  );
}

function HorizontalValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-purple-50 px-3 py-2 lg:bg-transparent lg:px-0 lg:py-0">
      <p className="text-[11px] text-gray-500">
        {label}
      </p>

      <p className="mt-0.5 truncate text-sm font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(value?: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value || 0);
}

