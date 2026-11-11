"use client";

import { useState } from "react";

export default function ConditionsPage() {
  const [selected, setSelected] = useState<string[]>([]);

  const conditions = [
    "Dementia / Memory Concerns",
    "Diabetes",
    "Stroke Recovery",
    "Parkinson's",
    "Cancer Support",
    "Mobility Challenges",
    "Mental Health Support",
    "None of these",
    "Other",
  ];

  const toggleCondition = (condition: string) => {
    if (selected.includes(condition)) {
      setSelected(selected.filter((item) => item !== condition));
    } else {
      setSelected([...selected, condition]);
    }
  };

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <h1 className="text-4xl font-bold mb-3 text-center">
        Any health conditions?
      </h1>

      <p className="text-gray-600 text-center mb-8 max-w-md">
        Select any that apply. This helps us match the right caregiver.
      </p>

      <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-8">
        {conditions.map((condition) => (
          <button
            key={condition}
            onClick={() => toggleCondition(condition)}
            className={`border rounded-xl p-4 text-left text-sm transition ${
              selected.includes(condition)
                ? "bg-purple-100 border-purple-600 text-purple-700 font-bold"
                : "bg-white hover:bg-purple-50 hover:border-purple-600 hover:text-purple-600 font-semibold"
            }`}
          >
            {condition}
          </button>
        ))}
      </div>

      <a
        href="/find-care/schedule"
        className="bg-purple-600 text-white py-4 rounded-xl font-semibold text-center w-full max-w-md"
      >
        Continue
      </a>
    </main>
  );
}
