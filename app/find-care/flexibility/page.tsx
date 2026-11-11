"use client";

import { useState } from "react";

export default function FlexibilityPage() {
  const [selected, setSelected] = useState("");

  const options = ["Exact Time", "Within 1 Hour", "Within 2 Hours", "Flexible"];

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <h1 className="text-4xl font-bold mb-3 text-center">
        How flexible is the time?
      </h1>

      <p className="text-gray-600 text-center mb-8">
        Flexibility helps us find caregivers faster.
      </p>

      <div className="flex flex-col gap-4 w-full max-w-md mb-8">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => setSelected(option)}
            className={`rounded-xl p-4 text-left transition ${
              selected === option
                ? "bg-purple-100 border-2 border-purple-600 text-purple-700 font-bold"
                : "border hover:bg-purple-50 hover:border-purple-600"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <a
        href="/find-care/duration"
        className="bg-purple-600 text-white py-4 rounded-xl font-semibold text-center w-full max-w-md"
      >
        Continue
      </a>
    </main>
  );
}
