"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageCard from "../../../components/ui/PageCard";
import ProgressHeader from "../../../components/ui/ProgressHeader";
import SelectionCard from "../../../components/ui/SelectionCard";
import { getBookingDraft, saveBookingDraft } from "../../../lib/bookingDraft";

const languages = [
  "English",
  "French",
  "Arabic",
  "Cantonese",
  "Farsi",
  "Filipino / Tagalog",
  "Greek",
  "Hindi",
  "Italian",
  "Mandarin",
  "Portuguese",
  "Punjabi",
  "Russian",
  "Spanish",
  "Tamil",
  "Ukrainian",
  "Urdu",
  "Yoruba",
  "Other",
];

export default function CareContextPage() {
  const router = useRouter();

  const [selectedContext, setSelectedContext] = useState<string[]>([]);
  const [otherContext, setOtherContext] = useState("");
  const [primaryLanguage, setPrimaryLanguage] = useState("");
  const [secondaryLanguage, setSecondaryLanguage] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  const careContext = [
    "Memory concerns",
    "Alzheimer’s or other dementia",
    "Parkinson’s",
    "Stroke recovery",
    "Diabetes support",
    "Mobility or transfer support",
    "Fall risk",
    "Other",
  ];

  useEffect(() => {
    const draft = getBookingDraft();

    setSelectedContext(draft.selectedContext || []);
    setOtherContext(draft.otherContext || "");
    setPrimaryLanguage(draft.primaryLanguage || "");
    setSecondaryLanguage(draft.secondaryLanguage || "");
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    saveBookingDraft({
      selectedContext,
      otherContext,
      primaryLanguage,
      secondaryLanguage,
    });
  }, [
    selectedContext,
    otherContext,
    primaryLanguage,
    secondaryLanguage,
    isLoaded,
  ]);

  function toggleContext(item: string) {
    if (selectedContext.includes(item)) {
      setSelectedContext(
        selectedContext.filter((context) => context !== item)
      );
    } else {
      setSelectedContext([...selectedContext, item]);
    }
  }

  function handlePrimaryLanguageChange(value: string) {
    setPrimaryLanguage(value);

    if (secondaryLanguage === value) {
      setSecondaryLanguage("");
    }
  }

  function handleContinue() {
    if (!primaryLanguage) return;

    saveBookingDraft({
      selectedContext,
      otherContext,
      primaryLanguage,
      secondaryLanguage,
    });

    router.push("/find-care/schedule");
  }

  const showOtherContextBox = selectedContext.includes("Other");

  return (
    <PageCard maxWidth="max-w-2xl">
      <ProgressHeader
        backHref="/find-care/needs"
        stage="2 of 4"
        progress="w-[48%]"
        title="Help us better understand your needs"
        subtitle="Optional details help us prepare the right caregiver."
      />

      <p className="text-sm text-gray-600 text-center -mt-3 mb-5">
        Select anything that may support the care visit.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {careContext.map((item) => (
          <SelectionCard
            key={item}
            title={item}
            selected={selectedContext.includes(item)}
            onClick={() => toggleContext(item)}
          />
        ))}
      </div>

      {showOtherContextBox && (
        <textarea
          value={otherContext}
          onChange={(e) => setOtherContext(e.target.value)}
          placeholder={`Tell us anything else that may help us find the right caregiver.

Example: Mom has memory concerns and enjoys short walks.`}
          className="w-full min-h-28 border border-purple-300 rounded-xl p-4 mb-6 outline-none focus:ring-2 focus:ring-purple-200 text-sm"
        />
      )}

<div className="border-t border-gray-200 pt-8 mt-4">
  <div className="text-center mb-6">
    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
      Languages spoken
    </h2>

    <p className="text-base text-gray-600 mt-2 max-w-xl mx-auto">
      Tell us the main languages the person receiving care speaks.
    </p>
  </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="primaryLanguage"
              className="block text-sm font-bold text-gray-900 mb-2"
            >
              Primary language
              <span className="text-red-500"> *</span>
            </label>

            <select
              id="primaryLanguage"
              value={primaryLanguage}
              onChange={(e) => handlePrimaryLanguageChange(e.target.value)}
              className="w-full border border-purple-300 rounded-xl p-3 bg-white outline-none focus:ring-2 focus:ring-purple-200"
            >
              <option value="">Select primary language</option>

              {languages.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="secondaryLanguage"
              className="block text-sm font-bold text-gray-900 mb-2"
            >
              Secondary language
              <span className="font-normal text-gray-500"> (optional)</span>
            </label>

            <select
              id="secondaryLanguage"
              value={secondaryLanguage}
              onChange={(e) => setSecondaryLanguage(e.target.value)}
              className="w-full border border-purple-300 rounded-xl p-3 bg-white outline-none focus:ring-2 focus:ring-purple-200"
            >
              <option value="">No secondary language</option>

              {languages
                .filter((language) => language !== primaryLanguage)
                .map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 mt-4 mb-6">
          <p className="text-sm text-gray-700 leading-relaxed">
            We use language information to support caregiver matching. Where
            available, we will prioritize a caregiver who speaks the primary
            language selected. Language matching is not guaranteed and does not
            override care needs, caregiver qualifications, availability, or
            safety requirements.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleContinue}
        disabled={!primaryLanguage}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold text-center shadow-sm transition-all active:scale-[0.98]"
      >
        Continue to Schedule
      </button>

      {!primaryLanguage && (
        <p className="text-xs text-gray-500 text-center mt-3">
          Select a primary language to continue.
        </p>
      )}
    </PageCard>
  );
}
