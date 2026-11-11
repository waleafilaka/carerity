"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProgressHeader from "../../../components/ui/ProgressHeader";
import { getBookingDraft, saveBookingDraft } from "../../../lib/bookingDraft";

type ScheduleType = "One-Time Care" | "Recurring Care";

export default function SchedulePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<ScheduleType | "">("");

  const options: Array<{
    label: ScheduleType;
    description: string;
    href: string;
  }> = [
    {
      label: "One-Time Care",
      description: "Book care for a single visit.",
      href: "/find-care/date-time",
    },
    {
      label: "Recurring Care",
      description: "Set up care that repeats weekly, biweekly, or monthly.",
      href: "/find-care/recurring",
    },
  ];

  useEffect(() => {
    const draft = getBookingDraft();
    if (draft.scheduleType) setSelected(draft.scheduleType);
  }, []);

  function handleSelect(label: ScheduleType) {
    setSelected(label);
    saveBookingDraft({ scheduleType: label });
  }

  function handleContinue() {
    if (!selected) return;

    const selectedOption = options.find(
      (option) => option.label === selected
    );

    if (!selectedOption) return;

    saveBookingDraft({ scheduleType: selected });
    router.push(selectedOption.href);
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 sm:px-6 py-5 text-gray-900">
      <section className="w-full max-w-xl bg-white border border-gray-200 rounded-3xl shadow-sm px-5 sm:px-6 py-5">
        <ProgressHeader
          backHref="/find-care/care-context"
          stage="3 of 4"
          progress="w-[60%]"
          title="Schedule your care"
          subtitle="Choose how often care is needed."
        />

        <div className="grid grid-cols-1 gap-3 mb-5">
          {options.map((option) => {
            const isSelected = selected === option.label;

            return (
              <button
                key={option.label}
                type="button"
                onClick={() => handleSelect(option.label)}
                aria-pressed={isSelected}
                className={`w-full text-left rounded-2xl border p-4 transition-all touch-manipulation active:scale-[0.98] ${
                  isSelected
                    ? "bg-purple-50 border-2 border-purple-600"
                    : "bg-white border-purple-200 hover:bg-purple-50 hover:border-purple-500"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mt-0.5 shrink-0 ${
                      isSelected
                        ? "bg-purple-600 text-white"
                        : "border border-purple-300 text-transparent"
                    }`}
                  >
                    ✓
                  </div>

                  <div>
                    <h2
                      className={`font-bold text-base ${
                        isSelected ? "text-purple-700" : "text-gray-900"
                      }`}
                    >
                      {option.label}
                    </h2>

                    <p className="text-sm text-gray-600 mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!selected}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold text-center shadow-sm transition-all active:scale-[0.98]"
        >
          Continue
        </button>

        {!selected && (
          <p className="text-xs text-gray-500 text-center mt-3">
            Select one care option to continue.
          </p>
        )}

        <p className="text-xs text-gray-500 text-center leading-relaxed mt-5">
          Carerity is not an emergency service. If there is an immediate medical
          emergency, call 911.
        </p>
      </section>
    </main>
  );
}
