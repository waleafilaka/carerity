"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import RecurringCareCalendar from "../../../components/RecurringCareCalendar";
import {
  BookingDraft,
  RecurringDaySchedule,
  getBookingDraft,
  getNextRecurringVisits,
  getRecurringScheduleForDate,
  saveBookingDraft,
  toDateInputValue,
} from "../../../lib/bookingDraft";

type ModalType = "skip" | "pause" | "resume" | "cancel" | null;

export default function RecurringCareManagementPage() {
  const [booking, setBooking] = useState<BookingDraft>({});
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const draft = getBookingDraft();

    setBooking({
      ...draft,
      scheduleType: "Recurring Care",
      recurringStatus: draft.recurringStatus || "Active",
      recurringFrequency: draft.recurringFrequency || "Weekly",
      recurringDays: draft.recurringDays || [],
      recurringDaySchedules: draft.recurringDaySchedules || [],
      recurringStartDate: draft.recurringStartDate || draft.careDate || "",
      recurringEndDate: draft.recurringEndDate || "",
      preferSameCaregiver: draft.preferSameCaregiver ?? true,
      skippedVisitDates: draft.skippedVisitDates || [],
    });
  }, []);

  const nextVisits = useMemo(
    () => getNextRecurringVisits(booking, 5),
    [booking]
  );

  const nextVisit = nextVisits[0] || "";
  const ongoingVisit = getOngoingVisit(booking);
  const recurringStatus = booking.recurringStatus || "Active";
  const isPaused = recurringStatus === "Paused";
  const isCancelled = recurringStatus === "Cancelled";

  function updateBooking(update: Partial<BookingDraft>, message: string) {
    const updated = saveBookingDraft({
      ...update,
      lastRecurringUpdate: new Date().toISOString(),
    });

    setBooking(updated);
    setNotice(message);
    setActiveModal(null);
    window.setTimeout(() => setNotice(""), 4000);
  }

  function handleSkipNextVisit() {
    if (!nextVisit) return;

    updateBooking(
      {
        skippedVisitDates: Array.from(
          new Set([...(booking.skippedVisitDates || []), nextVisit])
        ),
      },
      `Next visit on ${formatShortDate(nextVisit)} has been skipped.`
    );
  }

  const modalContent = getModalContent(
    activeModal,
    nextVisit,
    handleSkipNextVisit,
    () =>
      updateBooking(
        { recurringStatus: "Paused" },
        "Recurring care has been paused."
      ),
    () =>
      updateBooking(
        { recurringStatus: "Active" },
        "Recurring care has been resumed."
      ),
    () =>
      updateBooking(
        { recurringStatus: "Cancelled" },
        "Recurring care has been cancelled."
      )
  );

  return (
    <DashboardLayout activeItem="Recurring Care" role="customer">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-purple-600">
              Customer Dashboard
            </p>
            <h1 className="mt-1 text-3xl font-bold md:text-4xl">
              Care Schedule
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              View and manage recurring care.
            </p>
          </div>

          <a
            href="/dashboard"
            className="rounded-xl border border-purple-300 px-5 py-3 text-center font-semibold text-purple-700 hover:bg-purple-50"
          >
            Back to Dashboard
          </a>
        </header>

        {notice && (
          <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
            ✓ {notice}
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
            <CurrentStatusBar
              booking={booking}
              ongoingVisit={ongoingVisit}
              nextVisit={nextVisit}
            />

            <RecurringCareCalendar booking={booking} />

            <ScheduleSummary booking={booking} status={recurringStatus} />

            <section className="rounded-3xl border border-purple-300 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">Manage Schedule</h2>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setActiveModal("skip")}
                  disabled={!nextVisit || isCancelled}
                  className="rounded-xl border border-purple-300 py-3 font-semibold text-purple-700 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Skip Next Visit
                </button>

                {isPaused ? (
                  <button
                    type="button"
                    onClick={() => setActiveModal("resume")}
                    disabled={isCancelled}
                    className="rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Resume Schedule
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveModal("pause")}
                    disabled={isCancelled}
                    className="rounded-xl bg-amber-500 py-3 font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    Pause Schedule
                  </button>
                )}

                <a
                  href="/find-care/recurring?mode=edit"
                  className={`rounded-xl py-3 text-center font-semibold ${
                    isCancelled
                      ? "pointer-events-none bg-gray-100 text-gray-400"
                      : "bg-purple-600 text-white hover:bg-purple-700"
                  }`}
                >
                  Edit Future Schedule
                </a>

                <button
                  type="button"
                  onClick={() => setActiveModal("cancel")}
                  disabled={isCancelled}
                  className="rounded-xl border border-red-200 py-3 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Cancel Schedule
                </button>
              </div>

              <p className="mt-4 text-xs leading-relaxed text-gray-500">
                Changes apply only to future recurring visits.
              </p>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-purple-300 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">Assigned Caregiver</h2>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-3xl">
                  👩🏽
                </div>
                <div>
                  <p className="text-lg font-bold">
                    {booking.assignedCaregiverName || "Not assigned"}
                  </p>
                  <p className="text-sm text-purple-600">Qualified caregiver</p>
                  <p className="mt-1 text-xs font-semibold text-green-600">
                    Preferred where available
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-purple-300 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">Schedule Health</h2>
              <div className="space-y-3 text-sm">
                <HealthRow label="Status" value={recurringStatus} />
                <HealthRow
                  label="Skipped visits"
                  value={String(booking.skippedVisitDates?.length || 0)}
                />
                <HealthRow
                  label="Last updated"
                  value={
                    booking.lastRecurringUpdate
                      ? formatShortDate(booking.lastRecurringUpdate.slice(0, 10))
                      : "Not updated"
                  }
                />
              </div>
            </section>

            <section className="rounded-3xl border border-purple-300 bg-purple-50 p-5">
              <h2 className="mb-2 text-lg font-bold">Important</h2>
              <p className="text-sm leading-relaxed text-gray-600">
                Schedule changes do not alter a visit already in progress.
              </p>
            </section>

            <section className="rounded-3xl border border-purple-300 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">Support</h2>
              <p className="mb-4 text-sm leading-relaxed text-gray-600">
                Need help with your recurring care plan?
              </p>
              <a
                href="/dashboard/account"
                className="block w-full rounded-xl bg-purple-600 py-3 text-center font-semibold text-white hover:bg-purple-700"
              >
                Contact Support
              </a>
            </section>
          </aside>
        </div>

        {modalContent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <button
              type="button"
              aria-label="Close modal"
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-black/30"
            />
            <div className="relative w-full max-w-md rounded-3xl border border-purple-200 bg-white p-5 shadow-2xl">
              <h2 className="text-2xl font-bold">{modalContent.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                {modalContent.body}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-xl border border-gray-200 py-3 font-semibold text-gray-700"
                >
                  Keep Current
                </button>
                <button
                  type="button"
                  onClick={modalContent.onConfirm}
                  className={`rounded-xl py-3 font-semibold ${modalContent.confirmClass}`}
                >
                  {modalContent.confirmText}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function CurrentStatusBar({
  booking,
  ongoingVisit,
  nextVisit,
}: {
  booking: BookingDraft;
  ongoingVisit: string;
  nextVisit: string;
}) {
  const value = ongoingVisit || nextVisit;
  const schedule = value ? getRecurringScheduleForDate(booking, value) : undefined;

  return (
    <section
      className={`rounded-3xl border p-4 shadow-sm ${
        ongoingVisit
          ? "border-green-300 bg-green-50"
          : "border-purple-300 bg-purple-50"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {ongoingVisit && (
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
            </span>
          )}
          <div>
            <p
              className={`text-xs font-bold uppercase tracking-wide ${
                ongoingVisit ? "text-green-700" : "text-purple-700"
              }`}
            >
              {ongoingVisit ? "Ongoing now" : "Next up"}
            </p>
            <p className="mt-1 font-bold text-gray-900">
              {value
                ? formatDate(value)
                : booking.recurringStatus === "Paused"
                ? "Schedule is paused"
                : "No upcoming visit"}
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <p className="font-semibold text-gray-900">
            {schedule ? formatSchedule(schedule) : "Time not selected"}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {booking.assignedCaregiverName || "Caregiver not assigned"}
          </p>
        </div>
      </div>
    </section>
  );
}

function ScheduleSummary({
  booking,
  status,
}: {
  booking: BookingDraft;
  status: string;
}) {
  const schedules = booking.recurringDaySchedules || [];

  return (
    <section className="rounded-3xl border border-purple-300 bg-gradient-to-br from-purple-50 to-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-purple-700">Recurring Schedule</p>
          <h2 className="mt-1 text-2xl font-bold md:text-3xl">
            {booking.recurringFrequency || "Weekly"} care
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Preferred caregiver:{" "}
            <span className="font-semibold text-gray-900">
              {booking.preferSameCaregiver
                ? booking.assignedCaregiverName || "Same caregiver preferred"
                : "Flexible caregiver assignment"}
            </span>
          </p>
        </div>
        <span className="self-start rounded-full border border-purple-200 bg-white px-3 py-1 text-xs font-bold text-purple-700">
          {status}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Frequency"
          value={booking.recurringFrequency || "Weekly"}
        />
        <SummaryCard
          label="Starts"
          value={formatDate(booking.recurringStartDate || booking.careDate || "")}
        />
        <SummaryCard
          label="Ends"
          value={
            booking.recurringEndDate
              ? formatDate(booking.recurringEndDate)
              : "Until cancelled"
          }
        />
      </div>

      <div className="mt-5 rounded-2xl border border-purple-200 bg-white p-4">
        <p className="mb-3 text-sm font-bold">Days and times</p>
        {schedules.length > 0 ? (
          <div className="space-y-2">
            {schedules.map((schedule) => (
              <div
                key={schedule.day}
                className="flex items-center justify-between gap-4 rounded-xl bg-purple-50 px-3 py-2.5"
              >
                <span className="text-sm font-bold text-purple-800">
                  {schedule.day}
                </span>
                <span className="text-sm font-semibold text-gray-700">
                  {formatSchedule(schedule)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No day-specific times have been saved.
          </p>
        )}
      </div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-purple-200 bg-white p-3">
      <p className="mb-1 text-xs text-gray-500">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-600">{label}</span>
      <strong className="text-right">{value}</strong>
    </div>
  );
}

function getModalContent(
  type: ModalType,
  nextVisit: string,
  skip: () => void,
  pause: () => void,
  resume: () => void,
  cancel: () => void
) {
  if (type === "skip") {
    return {
      title: "Skip next visit?",
      body: nextVisit
        ? `${formatShortDate(nextVisit)} will be skipped. Future visits stay the same.`
        : "Skip the next scheduled visit?",
      confirmText: "Skip Next Visit",
      confirmClass: "bg-purple-600 text-white hover:bg-purple-700",
      onConfirm: skip,
    };
  }

  if (type === "pause") {
    return {
      title: "Pause recurring care?",
      body: "Future visits will pause until you resume.",
      confirmText: "Pause Schedule",
      confirmClass: "bg-amber-500 text-white hover:bg-amber-600",
      onConfirm: pause,
    };
  }

  if (type === "resume") {
    return {
      title: "Resume recurring care?",
      body: "Future visits will continue.",
      confirmText: "Resume Schedule",
      confirmClass: "bg-green-600 text-white hover:bg-green-700",
      onConfirm: resume,
    };
  }

  if (type === "cancel") {
    return {
      title: "Cancel recurring care?",
      body: "Future recurring visits will be cancelled.",
      confirmText: "Cancel Schedule",
      confirmClass: "bg-red-600 text-white hover:bg-red-700",
      onConfirm: cancel,
    };
  }

  return null;
}

function getOngoingVisit(booking: BookingDraft) {
  if (booking.recurringStatus !== "Active") return "";

  const today = toDateInputValue(new Date());
  return booking.inProgressVisitDate === today ? today : "";
}

function formatSchedule(schedule: RecurringDaySchedule) {
  return `${formatTime(schedule.startTime)} – ${formatTime(schedule.endTime)}`;
}

function formatTime(value: string) {
  const [hours, minutes = "00"] = value.split(":");
  const hour = Number(hours);
  return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? "PM" : "AM"}`;
}

function formatDate(value: string) {
  if (!value) return "Not selected";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(value: string) {
  if (!value) return "Not selected";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
