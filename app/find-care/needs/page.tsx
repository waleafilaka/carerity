"use client";

import { useEffect, useState } from "react";
import PageCard from "../../../components/ui/PageCard";
import ProgressHeader from "../../../components/ui/ProgressHeader";
import SelectionCard from "../../../components/ui/SelectionCard";
import PrimaryButton from "../../../components/ui/PrimaryButton";
import {
  getBookingDraft,
  saveBookingDraft,
  type CaregiverGenderPreference,
} from "../../../lib/bookingDraft";

const needs = [
  { title: "Personal Care", description: "Bathing, dressing and grooming" },
  { title: "Companionship & Respite", description: "Social support and family caregiver relief" },
  { title: "Meals & Light Home Support", description: "Meal prep, laundry and light cleaning" },
  { title: "Medication Reminders", description: "Medication reminders only" },
  { title: "Mobility & Appointments", description: "Walking support, transfers, appointments and outings" },
  { title: "Other", description: "Something not listed here" },
];

const genderChoices: { value: CaregiverGenderPreference; label: string; hint: string }[] = [
  { value: "no_preference", label: "No preference", hint: "Find the strongest available match" },
  { value: "female_preferred", label: "Female preferred", hint: "Prefer female, but consider other qualified caregivers" },
  { value: "male_preferred", label: "Male preferred", hint: "Prefer male, but consider other qualified caregivers" },
  { value: "female_only", label: "Female only", hint: "Show only female caregivers; availability may be limited" },
  { value: "male_only", label: "Male only", hint: "Show only male caregivers; availability may be limited" },
];

export default function NeedsPage() {
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [otherNeed, setOtherNeed] = useState("");
  const [caregiverGenderPreference, setCaregiverGenderPreference] =
    useState<CaregiverGenderPreference>("no_preference");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const draft = getBookingDraft();
    setSelectedNeeds(draft.selectedNeeds || []);
    setOtherNeed(draft.otherNeed || "");
    setCaregiverGenderPreference(draft.caregiverGenderPreference || "no_preference");
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    saveBookingDraft({ selectedNeeds, otherNeed, caregiverGenderPreference });
  }, [selectedNeeds, otherNeed, caregiverGenderPreference, isLoaded]);

  function toggleNeed(need: string) {
    setSelectedNeeds((current) => {
      if (current.includes(need)) return current.filter((item) => item !== need);
      const coreNeeds = current.filter((item) => item !== "Other");
      return need === "Other" || coreNeeds.length < 4 ? [...current, need] : current;
    });
  }

  return (
    <PageCard maxWidth="max-w-2xl">
      <ProgressHeader
        backHref="/find-care/location"
        stage="2 of 4"
        progress="w-[40%]"
        title="Tell us about your care needs"
        subtitle="Select up to 4 care needs."
      />
      <p className="text-sm text-gray-500 text-center -mt-3 mb-5">
        Choose <strong>Other</strong> if your care need isn't listed.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {needs.map((need) => (
          <SelectionCard
            key={need.title}
            title={need.title}
            description={need.description}
            selected={selectedNeeds.includes(need.title)}
            onClick={() => toggleNeed(need.title)}
          />
        ))}
      </div>
      {selectedNeeds.includes("Other") && (
        <textarea
          value={otherNeed}
          onChange={(event) => setOtherNeed(event.target.value)}
          placeholder="Please tell us what other care need you are looking for."
          className="w-full min-h-24 border border-purple-300 rounded-xl p-4 mb-5 outline-none focus:ring-2 focus:ring-purple-200 text-sm"
        />
      )}

      <fieldset className="border-t border-gray-200 pt-5 mb-6">
        <legend className="text-base font-bold text-gray-900 pt-4">
          Caregiver gender preference
        </legend>
        <p className="text-sm text-gray-600 mb-3">
          Optional. A preference helps us prioritize matches; an “only” selection limits eligibility.
        </p>
        <div className="space-y-2">
          {genderChoices.map((choice) => (
            <label
              key={choice.value}
              className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                caregiverGenderPreference === choice.value
                  ? "border-purple-600 bg-purple-50"
                  : "border-gray-200 bg-white hover:border-purple-300"
              }`}
            >
              <input
                type="radio"
                name="caregiverGenderPreference"
                value={choice.value}
                checked={caregiverGenderPreference === choice.value}
                onChange={() => setCaregiverGenderPreference(choice.value)}
                className="mt-1 accent-purple-600"
              />
              <span>
                <span className="block text-sm font-semibold text-gray-900">{choice.label}</span>
                <span className="block text-xs text-gray-600 mt-0.5">{choice.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <PrimaryButton href="/find-care/care-context">Continue</PrimaryButton>
    </PageCard>
  );
}
