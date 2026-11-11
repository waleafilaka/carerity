"use client";

import { useEffect, useMemo, useState } from "react";
import ProgressHeader from "../../../components/ui/ProgressHeader";
import { BookingDraft, getBookingDraft } from "../../../lib/bookingDraft";

type ShiftSegment = {
  label: string;
  hours: number;
  start: string;
  end: string;
};

type ExtendedBookingDraft = BookingDraft & {
  primaryLanguage?: string;
  secondaryLanguage?: string;
  careRecipientName?: string;
  recipientName?: string;
  address?: string;
  location?: string;
  postalCode?: string;
};

const caregiverGenderPreferenceLabels: Record<string, string> = {
  no_preference: "No preference",
  female_preferred: "Female preferred (flexible)",
  female_only: "Female only",
  male_preferred: "Male preferred (flexible)",
  male_only: "Male only",
};

export default function ReviewPage() {
  const [booking, setBooking] = useState<ExtendedBookingDraft>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [acknowledgedEmergency, setAcknowledgedEmergency] = useState(false);

  useEffect(() => {
    setBooking(getBookingDraft() as ExtendedBookingDraft);
  }, []);

  const careNeeds =
    booking.selectedNeeds && booking.selectedNeeds.length > 0
      ? booking.selectedNeeds
      : ["No care needs selected"];

  const careContext = booking.selectedContext || [];

  const caregiverGenderPreferenceLabel =
    caregiverGenderPreferenceLabels[
      booking.caregiverGenderPreference || "no_preference"
    ] || "No preference";

  const scheduleType = booking.scheduleType || "Not selected";
  const startTime = booking.startTime || "09:00";
  const endTime = booking.endTime || "17:00";
  const durationHours = booking.durationHours || 8;
  const hourlyRate = booking.hourlyRate || 38;

  const estimatedSubtotal =
    booking.estimatedSubtotal ?? durationHours * hourlyRate;

  const estimatedTotal = booking.estimatedTotal ?? estimatedSubtotal;

  const isRecurring = scheduleType === "Recurring Care";
  const isExtendedCare = !isRecurring && durationHours > 12;

  const shiftSegments = useMemo(
    () =>
      isExtendedCare
        ? buildShiftSegments(startTime, durationHours)
        : [],
    [isExtendedCare, startTime, durationHours]
  );

  const backHref = isRecurring
    ? "/find-care/recurring"
    : "/find-care/date-time";

  const canContinue = agreedToTerms && acknowledgedEmergency;

  function formatTime(time: string) {
    const [hourString, minuteString = "00"] = time.split(":");
    const hour = Number(hourString);

    if (Number.isNaN(hour)) {
      return time;
    }

    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${minuteString} ${suffix}`;
  }

  function formatDate(date: string | undefined) {
    if (!date) return "Date not selected";

    return new Date(`${date}T00:00:00`).toLocaleDateString("en-CA", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(value || 0);
  }

  const headerClass =
    "bg-gradient-to-r from-violet-200/90 to-purple-200/80 px-3 py-1.5 flex items-center justify-between border-b border-violet-300";

  const headingClass =
    "text-[11px] text-violet-950 font-bold uppercase tracking-wide";

  const editClass =
    "text-[11px] font-semibold text-violet-800 hover:text-violet-950";

  const cardClass =
    "border border-violet-300 rounded-xl overflow-hidden bg-white";

  const chipClass =
    "inline-flex items-center rounded-full bg-white border border-violet-300 px-2.5 py-0.5 text-[11px] font-bold text-gray-900";

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-3 text-gray-900">
      <section className="w-full max-w-3xl bg-white border border-gray-200 rounded-3xl shadow-sm px-5 py-4">
        <ProgressHeader
          backHref={backHref}
          stage="3 of 4"
          progress="w-[75%]"
          title="Review your booking"
          subtitle="Confirm the details before continuing to secure your care request."
        />

        <div className="space-y-3">
          <div className={cardClass}>
            <div className={headerClass}>
              <p className={headingClass}>👤 Care Recipient</p>

              <a
                href="/find-care/who-needs-care?returnTo=review"
                className={editClass}
              >
                Edit
              </a>
            </div>

            <div className="p-3 bg-violet-50/25 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Detail
                label="Recipient"
                value={
                  booking.careRecipientName ||
                  booking.recipientName ||
                  "Care recipient"
                }
              />

              <Detail
                label="Location"
                value={
                  booking.address ||
                  booking.location ||
                  booking.postalCode ||
                  "Location added during booking"
                }
              />

              <Detail
                label="Primary language"
                value={booking.primaryLanguage || "Not specified"}
              />

              <Detail
                label="Secondary language"
                value={booking.secondaryLanguage || "None selected"}
              />
            </div>
          </div>

          <div className={cardClass}>
            <div className={headerClass}>
              <p className={headingClass}>🩺 Care Needed</p>

              <a
                href="/find-care/needs?returnTo=review"
                className={editClass}
              >
                Edit
              </a>
            </div>

            <div className="p-3 bg-violet-50/25">
              <div className="flex flex-wrap gap-1.5">
                {careNeeds.map((need) => (
                  <span key={need} className={chipClass}>
                    ✓ {need}
                  </span>
                ))}
              </div>

              {booking.otherNeed && (
                <p className="text-[11px] text-gray-700 mt-1.5">
                  <span className="font-semibold">Other:</span>{" "}
                  {booking.otherNeed}
                </p>
              )}

              <div className="mt-3 border-t border-violet-100 pt-3">
                <Detail
                  label="Caregiver gender preference"
                  value={caregiverGenderPreferenceLabel}
                />
              </div>
            </div>
          </div>

          {careContext.length > 0 && (
            <div className={cardClass}>
              <div className={headerClass}>
                <p className={headingClass}>📋 Care Context</p>

                <a
                  href="/find-care/care-context?returnTo=review"
                  className={editClass}
                >
                  Edit
                </a>
              </div>

              <div className="p-3 bg-violet-50/25">
                <div className="flex flex-wrap gap-1.5">
                  {careContext.map((item) => (
                    <span key={item} className={chipClass}>
                      {item}
                    </span>
                  ))}
                </div>

                {booking.otherContext && (
                  <p className="text-[11px] text-gray-700 mt-1.5">
                    <span className="font-semibold">Other:</span>{" "}
                    {booking.otherContext}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className={cardClass}>
            <div className={headerClass}>
              <p className={headingClass}>📅 Visit Details</p>

              <a
                href={
                  isRecurring
                    ? "/find-care/recurring?returnTo=review"
                    : "/find-care/date-time?returnTo=review"
                }
                className={editClass}
              >
                Edit
              </a>
            </div>

            {isRecurring ? (
              <div className="p-3 bg-violet-50/25">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Detail label="Schedule" value="Recurring Care" />

                  <Detail
                    label="Frequency"
                    value={booking.recurringFrequency || "Not selected"}
                  />

                  <Detail
                    label="Preferred days"
                    value={
                      booking.recurringDays?.length
                        ? booking.recurringDays.join(", ")
                        : "Not selected"
                    }
                  />

                  <Detail
                    label="Starts"
                    value={formatDate(booking.recurringStartDate)}
                  />

                  <Detail
                    label="Ends"
                    value={
                      booking.recurringEndDate
                        ? formatDate(booking.recurringEndDate)
                        : "Ongoing until cancelled"
                    }
                  />

                  <Detail
                    label="Same caregiver preferred"
                    value={booking.preferSameCaregiver ? "Yes" : "Flexible"}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-violet-100">
                  <div className="p-3">
                    <p className="text-[11px] text-gray-500 font-semibold mb-0.5">
                      Schedule
                    </p>

                    <p className="font-semibold text-gray-900 text-xs">
                      {scheduleType}
                    </p>
                  </div>

                  <div className="p-3">
                    <p className="text-[11px] text-gray-500 font-semibold mb-0.5">
                      Date
                    </p>

                    <p className="font-semibold text-gray-900 text-xs">
                      {formatDate(booking.careDate)}
                    </p>
                  </div>

                  <div className="p-3">
                    <p className="text-[11px] text-gray-500 font-semibold mb-0.5">
                      Time
                    </p>

                    <p className="font-semibold text-gray-900 text-xs">
                      {formatTime(startTime)} – {formatTime(endTime)}
                    </p>

                    <p className="text-[11px] text-gray-600 mt-0.5">
                      {durationHours} hours requested
                    </p>
                  </div>
                </div>

                {isExtendedCare && (
                  <div className="border-t border-violet-200 bg-purple-50 p-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-purple-900">
                          Extended care coverage
                        </p>

                        <p className="text-[11px] text-gray-700 mt-1 leading-relaxed">
                          Your {durationHours}-hour request requires more than one
                          caregiver because one caregiver may be assigned for a
                          maximum of 12 hours.
                        </p>
                      </div>

                      <span className="self-start rounded-full border border-purple-300 bg-white px-3 py-1 text-[11px] font-bold text-purple-800">
                        {shiftSegments.length} caregivers
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                      {shiftSegments.map((segment) => (
                        <div
                          key={segment.label}
                          className="rounded-xl border border-purple-200 bg-white p-3"
                        >
                          <p className="text-[11px] font-bold text-purple-800">
                            {segment.label}
                          </p>

                          <p className="text-xs font-semibold text-gray-900 mt-1">
                            {formatTime(segment.start)} –{" "}
                            {formatTime(segment.end)}
                          </p>

                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {segment.hours} hours
                          </p>
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] text-gray-600 mt-3">
                      Carerity will match caregivers for each segment and manage
                      the handover as one care request.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className={cardClass}>
            <div className={headerClass}>
              <p className={headingClass}>💳 Estimated Cost</p>
            </div>

            <div className="p-3">
              <div className="space-y-1.5 text-xs text-gray-700">
                <div className="flex justify-between gap-2">
                  <span>
                    {durationHours} hrs × {formatCurrency(hourlyRate)}/hr
                  </span>

                  <span>{formatCurrency(estimatedSubtotal)}</span>
                </div>

                <div className="flex justify-between gap-2 text-gray-600">
                  <span>Taxes & fees</span>
                  <span>Calculated at checkout</span>
                </div>

                <div className="border-t border-gray-200 pt-2 flex justify-between gap-2 font-bold text-sm text-gray-900">
                  <span>Estimated total</span>
                  <span>{formatCurrency(estimatedTotal)}+</span>
                </div>

                <p className="text-[11px] text-gray-500 pt-1 leading-relaxed">
                  Final pricing will be confirmed at checkout.
                </p>

                {isRecurring && (
                  <p className="text-[11px] text-gray-500 pt-1">
                    Recurring visits are billed according to the confirmed
                    billing arrangement for each scheduled visit.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <div className={headerClass}>
              <p className={headingClass}>✅ Confirm & Continue</p>
            </div>

            <div className="p-3 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(event) => setAgreedToTerms(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />

                <span className="text-xs text-gray-700 leading-relaxed">
                  I confirm that the booking information above is accurate and
                  agree to Carerity&apos;s Terms of Service, cancellation and
                  payment policies.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acknowledgedEmergency}
                  onChange={(event) =>
                    setAcknowledgedEmergency(event.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />

                <span className="text-xs text-gray-700 leading-relaxed">
                  I understand that Carerity is not an emergency service. For a
                  medical emergency or immediate danger, call 911.
                </span>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
            <p className="text-xs font-bold text-blue-900">
              What happens next?
            </p>

            <p className="text-[11px] text-blue-900/80 mt-1 leading-relaxed">
              Continue to payment. After payment is confirmed, Carerity will
              begin matching your care request with an appropriate caregiver.
              Extended care requests may involve more than one caregiver.
            </p>
          </div>

          {canContinue ? (
            <a
              href="/find-care/payment-method"
              className="block w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 active:scale-[0.98] transition-all text-white py-3 rounded-xl font-semibold text-center"
            >
              Continue to Payment
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="block w-full bg-purple-200 text-purple-500 py-3 rounded-xl font-semibold text-center cursor-not-allowed"
            >
              Confirm the acknowledgements to continue
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[11px] text-gray-500 font-semibold">{label}</p>
      <p className="font-bold text-gray-900 text-xs mt-0.5">{value}</p>
    </div>
  );
}

function buildShiftSegments(
  startTime: string,
  durationHours: number
): ShiftSegment[] {
  if (durationHours <= 12) {
    return [];
  }

  const firstShiftHours = 12;
  const secondShiftHours = durationHours - firstShiftHours;

  return [
    {
      label: "Caregiver 1",
      hours: firstShiftHours,
      start: startTime,
      end: addHoursToTime(startTime, firstShiftHours),
    },
    {
      label: "Caregiver 2",
      hours: secondShiftHours,
      start: addHoursToTime(startTime, firstShiftHours),
      end: addHoursToTime(startTime, durationHours),
    },
  ];
}

function addHoursToTime(
  time: string,
  hoursToAdd: number
) {
  const [hourString, minuteString = "00"] = time.split(":");

  const startMinutes =
    Number(hourString) * 60 + Number(minuteString);

  const totalMinutes =
    startMinutes + hoursToAdd * 60;

  const normalizedMinutes =
    ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);

  const hours =
    Math.floor(normalizedMinutes / 60);

  const minutes =
    normalizedMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
}
