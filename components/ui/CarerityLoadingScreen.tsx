"use client";

import { useEffect, useState } from "react";

type CarerityLoadingScreenProps = {
  title?: string;
  messages?: string[];
  isStopping?: boolean;
  isComplete?: boolean;
};

export default function CarerityLoadingScreen({
  title = "Finding your caregiver...",
  messages = [
    "Checking nearby caregivers...",
    "Matching your care needs...",
    "Checking availability...",
    "Almost ready...",
  ],
  isStopping = false,
  isComplete = false,
}: CarerityLoadingScreenProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (
      isStopping ||
      isComplete ||
      messages.length === 0
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      setMessageIndex(
        (current) =>
          (current + 1) % messages.length
      );
    }, 1800);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    messages.length,
    isStopping,
    isComplete,
  ]);

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center text-gray-900">
      <div className="relative flex items-center justify-center mb-14">
        <div
          className={`absolute h-52 w-52 rounded-full border-[3px] transition-all ${
            isComplete
              ? "border-green-500"
              : isStopping
              ? "border-purple-600"
              : "border-purple-100 border-t-purple-600 animate-spin"
          }`}
        />

        <img
          src="/carerityspinner.png"
          alt="Carerity"
          className={`w-40 md:w-44 h-auto object-contain transition-all duration-700 ${
            isComplete
              ? "opacity-100 scale-100"
              : "opacity-30"
          }`}
        />

        {isComplete && (
          <div className="absolute -top-8 -right-4 h-10 w-10 rounded-full bg-green-500 text-white flex items-center justify-center text-xl font-bold border-2 border-white shadow-lg">
            ✓
          </div>
        )}
      </div>

      <h1 className="text-2xl font-bold mb-2">
        {isComplete
          ? "Caregiver found"
          : isStopping
          ? "Almost ready..."
          : title}
      </h1>

      <p className="text-sm text-gray-500 font-medium min-h-[24px]">
        {isComplete
          ? "Opening your request..."
          : isStopping
          ? "Finalizing..."
          : messages[messageIndex] || ""}
      </p>
    </main>
  );
}
