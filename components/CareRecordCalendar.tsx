"use client";

import { useMemo, useState } from "react";
import { CareRecord } from "../lib/careRecords";

type Props = {
  records: CareRecord[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
};

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CareRecordCalendar({
  records,
  selectedDate,
  onSelectDate,
}: Props) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial = selectedDate
      ? new Date(`${selectedDate}T00:00:00`)
      : new Date();

    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });

  const recordDates = useMemo(
    () => new Set(records.map((record) => record.visitDate)),
    [records]
  );

  const days = useMemo(() => getMonthGrid(visibleMonth), [visibleMonth]);

  function moveMonth(direction: "previous" | "next") {
    setVisibleMonth((current) => {
      const next = new Date(current);
      next.setMonth(current.getMonth() + (direction === "next" ? 1 : -1));
      return next;
    });
  }

  return (
    <section className="rounded-3xl border border-purple-300 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => moveMonth("previous")}
          className="h-9 w-9 rounded-xl border border-purple-200 text-purple-700 hover:bg-purple-50"
        >
          ←
        </button>

        <div className="text-center">
          <h2 className="font-bold">
            {visibleMonth.toLocaleDateString("en-CA", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <p className="text-xs text-gray-500">Select a date to filter records</p>
        </div>

        <button
          type="button"
          onClick={() => moveMonth("next")}
          className="h-9 w-9 rounded-xl border border-purple-200 text-purple-700 hover:bg-purple-50"
        >
          →
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center">
        {weekDays.map((day) => (
          <div key={day} className="py-1 text-[11px] font-bold text-gray-500">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date) => {
          const value = toDateInputValue(date);
          const hasRecord = recordDates.has(value);
          const selected = selectedDate === value;
          const today = value === toDateInputValue(new Date());
          const currentMonth = date.getMonth() === visibleMonth.getMonth();

          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelectDate(selected ? "" : value)}
              className={`relative min-h-11 rounded-xl border text-xs ${
                selected
                  ? "border-purple-600 bg-purple-600 text-white"
                  : currentMonth
                    ? "border-purple-100 bg-white hover:border-purple-300 hover:bg-purple-50"
                    : "border-gray-100 bg-gray-50 text-gray-300"
              }`}
            >
              <span className={today ? "font-black underline" : "font-semibold"}>
                {date.getDate()}
              </span>

              {hasRecord && (
                <span
                  className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                    selected ? "bg-white" : "bg-blue-500"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-purple-50 px-3 py-2">
        <p className="text-xs text-purple-800">
          <strong>Selected date:</strong>{" "}
          {selectedDate ? formatDate(selectedDate) : "All dates"}
        </p>

        {selectedDate && (
          <button
            type="button"
            onClick={() => onSelectDate("")}
            className="text-xs font-bold text-purple-700 hover:underline"
          >
            Clear
          </button>
        )}
      </div>
    </section>
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

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

