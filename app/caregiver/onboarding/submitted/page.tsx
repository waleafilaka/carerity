"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CaregiverOnboardingDraft,
  getCaregiverApplicationProgress,
  getCaregiverOnboardingDraft,
} from "../../../../lib/caregiverOnboardingDraft";

export default function CaregiverApplicationSubmittedPage() {
  const router = useRouter();

  const [draft, setDraft] = useState<CaregiverOnboardingDraft>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedDraft = getCaregiverOnboardingDraft();

    setDraft(savedDraft);
    setIsLoading(false);
  }, []);

  const progress = useMemo(
    () => getCaregiverApplicationProgress(draft),
    [draft]
  );

  const caregiverName =
    draft.firstName?.trim() ||
    [draft.firstName, draft.lastName].filter(Boolean).join(" ").trim() ||
    "Caregiver";

  const submittedDate = formatSubmittedDate(draft.submittedAt);

  const applicationSubmitted =
    draft.applicationStatus === "submitted" ||
    draft.applicationStatus === "under_review" ||
    draft.applicationStatus === "approved" ||
    draft.applicationStatus === "needs_attention";

  function handleWorkspace() {
    router.push("/caregiver/dashboard");
  }

  function handleReturnToApplication() {
    router.push("/caregiver/onboarding");
  }

  if (isLoading) {
    return (
      <PageShell>
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />

          <p className="mt-4 text-sm font-semibold text-gray-600">
            Loading your application...
          </p>
        </div>
      </PageShell>
    );
  }

  if (!applicationSubmitted) {
    return (
      <PageShell>
        <div className="rounded-3xl border border-amber-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl text-amber-700">
            !
          </div>

          <p className="mt-5 text-sm font-bold text-amber-700">
            Application Not Submitted
          </p>

          <h1 className="mt-1 text-3xl font-bold text-gray-900">
            Complete your application
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            Your application has not been submitted yet. Complete the remaining
            sections and return to the review page.
          </p>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-gray-700">
                Application progress
              </span>

              <span className="text-sm font-bold text-amber-700">
                {progress.percentage}%
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-amber-500 transition-all"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>

            <p className="mt-2 text-xs text-gray-500">
              {progress.completed} of {progress.total} required sections
              complete.
            </p>
          </div>

          <button
            type="button"
            onClick={handleReturnToApplication}
            className="mt-6 w-full rounded-xl bg-emerald-600 py-3.5 font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.99]"
          >
            Return to Application
          </button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl font-bold text-emerald-700">
            ✓
          </div>

          <p className="mt-5 text-sm font-bold uppercase tracking-wide text-emerald-700">
            Application Submitted
          </p>

          <h1 className="mt-1 text-3xl font-bold text-gray-900">
            Thank you, {caregiverName}
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            Your caregiver application has been received. Carerity will review
            your profile and documents.
          </p>

          {submittedDate && (
            <p className="mt-2 text-xs text-gray-400">
              Submitted {submittedDate}
            </p>
          )}
        </div>

        <div className="mt-7 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-bold text-gray-900">
            Application status
          </p>

          <div className="mt-3 divide-y divide-gray-200">
            <StatusRow
              label="Profile"
              value="Complete"
              tone="green"
            />

            <StatusRow
              label="Application"
              value={getApplicationStatusLabel(draft.applicationStatus)}
              tone={getApplicationStatusTone(draft.applicationStatus)}
            />

            <StatusRow
              label="Documents"
              value="Under review"
              tone="amber"
            />

            <StatusRow
              label="Background screening"
              value={
                draft.digitalBackgroundScreeningStatus === "completed"
                  ? "Completed"
                  : draft.digitalBackgroundScreeningConsent
                    ? "Consent received"
                    : "Not started"
              }
              tone={
                draft.digitalBackgroundScreeningStatus === "completed"
                  ? "green"
                  : draft.digitalBackgroundScreeningConsent
                    ? "blue"
                    : "gray"
              }
            />

            <StatusRow
              label="Care opportunities"
              value={
                draft.applicationStatus === "approved"
                  ? "Available"
                  : "Available after approval"
              }
              tone={
                draft.applicationStatus === "approved"
                  ? "green"
                  : "gray"
              }
            />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-bold text-blue-900">
            What happens next?
          </p>

          <div className="mt-3 space-y-3">
            <NextStep
              number="1"
              title="Application review"
              description="Carerity reviews your profile and uploaded document details."
            />

            <NextStep
              number="2"
              title="Updates if needed"
              description="Your workspace will show if any information requires attention."
            />

            <NextStep
              number="3"
              title="Care opportunities"
              description="Suitable care opportunities become available after your profile is approved."
            />
          </div>
        </div>

        {draft.applicationStatus === "needs_attention" && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-900">
              Your application needs attention
            </p>

            <p className="mt-1 text-sm leading-relaxed text-amber-800">
              Review your application workspace for information that needs to
              be updated.
            </p>

            <button
              type="button"
              onClick={handleReturnToApplication}
              className="mt-3 text-sm font-bold text-amber-900 underline"
            >
              Review application
            </button>
          </div>
        )}

        {draft.applicationStatus === "approved" && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-900">
              Your profile is approved
            </p>

            <p className="mt-1 text-sm leading-relaxed text-emerald-800">
              You can now view care opportunities that match your profile and
              availability.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={handleWorkspace}
          className="mt-6 w-full rounded-xl bg-emerald-600 py-3.5 font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.99]"
        >
          Go to Caregiver Workspace
        </button>

        <a
          href="/"
          className="mt-3 block w-full rounded-xl border border-gray-300 bg-white py-3 text-center text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
        >
          Return to Carerity Home
        </a>
      </div>
    </PageShell>
  );
}

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "amber" | "blue" | "gray" | "red";
}) {
  const toneClasses = {
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    gray: "bg-gray-200 text-gray-600",
    red: "bg-red-100 text-red-700",
  };

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm font-semibold text-gray-700">
        {label}
      </span>

      <span
        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClasses[tone]}`}
      >
        {value}
      </span>
    </div>
  );
}

function NextStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
        {number}
      </div>

      <div>
        <p className="text-sm font-bold text-blue-950">
          {title}
        </p>

        <p className="mt-1 text-xs leading-relaxed text-blue-900/75">
          {description}
        </p>
      </div>
    </div>
  );
}

function PageShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <a href="/" aria-label="Carerity home">
          <img
            src="/carerityblacklogo2.png"
            alt="Carerity"
            className="h-16 w-auto object-contain sm:h-20"
          />
        </a>

        <span className="text-sm font-semibold text-emerald-700">
          Caregiver Application
        </span>
      </nav>

      <section className="mx-auto max-w-xl px-4 py-8 sm:py-12">
        {children}
      </section>
    </main>
  );
}

function getApplicationStatusLabel(
  status?: CaregiverOnboardingDraft["applicationStatus"]
) {
  switch (status) {
    case "submitted":
      return "Submitted";

    case "under_review":
      return "Under review";

    case "approved":
      return "Approved";

    case "needs_attention":
      return "Needs attention";

    case "declined":
      return "Not approved";

    default:
      return "Draft";
  }
}

function getApplicationStatusTone(
  status?: CaregiverOnboardingDraft["applicationStatus"]
): "green" | "amber" | "blue" | "gray" | "red" {
  switch (status) {
    case "submitted":
      return "blue";

    case "under_review":
      return "amber";

    case "approved":
      return "green";

    case "needs_attention":
      return "amber";

    case "declined":
      return "red";

    default:
      return "gray";
  }
}

function formatSubmittedDate(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
