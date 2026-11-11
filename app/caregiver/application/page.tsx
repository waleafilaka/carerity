"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import CaregiverAvatar from "../../../components/caregiver/CaregiverAvatar";

import type {
  CaregiverOnboardingDraft,
  CaregiverOnboardingSection,
} from "../../../lib/caregiverOnboardingDraft";

import {
  loadLatestCaregiverDraft,
} from "../../../lib/caregiverOnboardingPersistence";

type TabKey =
  | CaregiverOnboardingSection
  | "summary";

const TABS: Array<{
  key: TabKey;
  label: string;
}> = [
  { key: "summary", label: "Summary" },
  { key: "profile", label: "About You" },
  { key: "experience", label: "Experience" },
  { key: "preferences", label: "Work Preferences" },
  { key: "availability", label: "Availability" },
  { key: "credentials", label: "Documents" },
  { key: "professional", label: "Professional" },
  { key: "background", label: "Background" },
];

const EDIT_ACTIONS: Partial<
  Record<
    TabKey,
    {
      href: string;
      label: string;
      detail: string;
    }
  >
> = {
  profile: {
    href: "/caregiver/onboarding/profile",
    label: "Manage profile",
    detail:
      "Update your photo, address and emergency contact.",
  },
  experience: {
    href: "/caregiver/onboarding/experience",
    label: "Edit experience",
    detail:
      "Update qualifications, languages and care experience.",
  },
  preferences: {
    href: "/caregiver/onboarding/preferences",
    label: "Edit work preferences",
    detail:
      "Pause or resume new opportunities and update transportation or care-arrangement preferences.",
  },
  availability: {
    href: "/caregiver/onboarding/availability",
    label: "Update availability",
    detail:
      "Change your weekly schedule or add temporary time off.",
  },
  credentials: {
    href: "/caregiver/onboarding/credentials",
    label: "Manage documents",
    detail:
      "View, replace or add current caregiver documents.",
  },
  professional: {
    href: "/caregiver/onboarding/professional",
    label: "Update professional details",
    detail:
      "Maintain memberships and liability-insurance information.",
  },
};

export default function CaregiverApplicationPage() {
  const router = useRouter();

  const [
    draft,
    setDraft,
  ] =
    useState<CaregiverOnboardingDraft>({});

  const [
    caregiverNumber,
    setCaregiverNumber,
  ] =
    useState("");

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<TabKey>("summary");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  useEffect(() => {
    let mounted = true;

    async function loadApplication() {
      const result =
        await loadLatestCaregiverDraft();

      if (!mounted) {
        return;
      }

      if (!result.authenticated) {
        router.replace(
          "/caregiver/login"
        );
        return;
      }

      setDraft(
        result.draft
      );

      setCaregiverNumber(
        result.caregiverNumber ||
          ""
      );

      setError(
        result.success
          ? ""
          : result.error ||
              "Unable to load your application."
      );

      setLoading(false);
    }

    void loadApplication();

    return () => {
      mounted = false;
    };
  }, [router]);

  const fullName =
    useMemo(
      () =>
        [
          draft.firstName,
          draft.lastName,
        ]
          .filter(Boolean)
          .join(" "),
      [
        draft.firstName,
        draft.lastName,
      ]
    );

  const status =
    draft.applicationStatus ||
    "draft";

  const isApproved =
    status ===
    "approved";

  const canEditApplication =
    status ===
      "draft" ||
    status ===
      "needs_attention";

  const activeAction =
    EDIT_ACTIONS[
      activeTab
    ];

  const canUseProfileMaintenance =
    isApproved &&
    Boolean(
      activeAction
    );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
          <p className="mt-4 text-sm font-semibold text-gray-500">
            Loading application...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <CaregiverAvatar
              photo={
                draft.profilePhoto
              }
              firstName={
                draft.firstName
              }
              lastName={
                draft.lastName
              }
              size="large"
            />

            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-700">
                Caregiver Profile & Application
              </p>

              <h1 className="mt-1 truncate text-3xl font-bold">
                {fullName ||
                  "My Application"}
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Review your application and keep your working profile current.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canEditApplication && (
              <Link
                href="/caregiver/onboarding"
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                {status ===
                "needs_attention"
                  ? "Update Application"
                  : "Continue Application"}
              </Link>
            )}

            <Link
              href="/caregiver/dashboard"
              className="rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {error}
          </div>
        )}

        <section className="mb-6 rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Application status
              </p>

              <p className="mt-1 text-xl font-bold">
                {formatStatus(
                  status
                )}
              </p>

              {caregiverNumber && (
                <p className="mt-1 text-sm text-gray-500">
                  Caregiver ID:{" "}
                  {caregiverNumber}
                </p>
              )}
            </div>

            <span
              className={
                statusBadgeClass(
                  status
                )
              }
            >
              {formatStatus(
                status
              )}
            </span>
          </div>

          {isApproved && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-bold text-emerald-900">
                Your approval remains active while you maintain your profile.
              </p>

              <p className="mt-1 text-sm leading-relaxed text-emerald-800">
                You can update operational profile information such as availability, address, experience, preferences, documents and professional details. Verified identity and background-screening information remain controlled.
              </p>
            </div>
          )}

          {status ===
            "submitted" && (
            <ReadOnlyNotice>
              Your application has been submitted and is waiting for review.
            </ReadOnlyNotice>
          )}

          {status ===
            "under_review" && (
            <ReadOnlyNotice>
              Your application is currently being reviewed by Carerity.
            </ReadOnlyNotice>
          )}

          {status ===
            "declined" && (
            <ReadOnlyNotice>
              This application is not currently editable.
            </ReadOnlyNotice>
          )}

          {status ===
            "needs_attention" && (
            <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
              Carerity requested updates to this application. Use Update Application to make the required changes.
            </div>
          )}
        </section>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
          {TABS.map(
            (
              tab
            ) => (
              <button
                key={
                  tab.key
                }
                type="button"
                onClick={() =>
                  setActiveTab(
                    tab.key
                  )
                }
                className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                  activeTab ===
                  tab.key
                    ? "bg-emerald-600 text-white"
                    : "border border-gray-200 bg-white text-gray-700 hover:border-emerald-300"
                }`}
              >
                {tab.label}
              </button>
            )
          )}
        </div>

        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          {canUseProfileMaintenance &&
            activeAction && (
              <EditAction
                href={
                  activeAction.href
                }
                label={
                  activeAction.label
                }
                detail={
                  activeAction.detail
                }
              />
            )}

          {activeTab ===
            "summary" && (
            <SummaryTab
              draft={
                draft
              }
            />
          )}

          {activeTab ===
            "profile" && (
            <ProfileTab
              draft={
                draft
              }
            />
          )}

          {activeTab ===
            "experience" && (
            <ExperienceTab
              draft={
                draft
              }
            />
          )}

          {activeTab ===
            "preferences" && (
            <PreferencesTab
              draft={
                draft
              }
            />
          )}

          {activeTab ===
            "availability" && (
            <AvailabilityTab
              draft={
                draft
              }
            />
          )}

          {activeTab ===
            "credentials" && (
            <CredentialsTab
              draft={
                draft
              }
            />
          )}

          {activeTab ===
            "professional" && (
            <ProfessionalTab
              draft={
                draft
              }
            />
          )}

          {activeTab ===
            "background" && (
            <BackgroundTab
              draft={
                draft
              }
            />
          )}
        </section>
      </div>
    </main>
  );
}

function EditAction({
  href,
  label,
  detail,
}: {
  href: string;
  label: string;
  detail: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-bold text-emerald-900">
          Keep this information current
        </p>
        <p className="mt-1 text-sm text-emerald-800">
          {detail}
        </p>
      </div>

      <Link
        href={href}
        className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
      >
        {label}
      </Link>
    </div>
  );
}

function ReadOnlyNotice({
  children,
}: {
  children:
    ReactNode;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
      {children}
    </div>
  );
}

function SummaryTab({
  draft,
}: {
  draft:
    CaregiverOnboardingDraft;
}) {
  return (
    <div>
      <div className="mb-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-bold text-gray-900">
          Profile availability
        </p>

        <p className="mt-1 text-sm text-gray-600">
          {draft.availableForWork ===
          true
            ? "You are currently available for new care opportunities."
            : draft.availableForWork ===
                false
              ? "New care opportunities are currently paused."
              : "Your current availability preference has not been set."}
        </p>

        <Link
          href="/caregiver/onboarding/preferences"
          className="mt-3 inline-flex text-sm font-bold text-emerald-700 hover:underline"
        >
          {draft.availableForWork ===
          true
            ? "Pause or update availability for work"
            : "Resume or update availability for work"}
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Detail label="Name" value={[draft.firstName, draft.lastName].filter(Boolean).join(" ")} />
        <Detail label="Email" value={draft.email} />
        <Detail label="Phone" value={draft.phone} />
        <Detail label="City" value={draft.city} />
        <Detail label="Years experience" value={numberValue(draft.yearsExperience)} />
        <Detail label="Available for work" value={yesNo(draft.availableForWork)} />
      </div>
    </div>
  );
}

function ProfileTab({ draft }: { draft: CaregiverOnboardingDraft }) {
  return (
    <Grid>
      <Detail label="First name" value={draft.firstName} />
      <Detail label="Last name" value={draft.lastName} />
      <Detail label="Date of birth" value={draft.dateOfBirth} />
      <Detail label="Sex" value={formatSex(draft.sex)} />
      <Detail label="Address" value={[draft.address, draft.unit].filter(Boolean).join(", ")} />
      <Detail label="City" value={draft.city} />
      <Detail label="Province" value={draft.province} />
      <Detail label="Postal code" value={draft.postalCode} />
      <Detail label="Authorized to work in Canada" value={yesNo(draft.authorizedToWorkInCanada)} />
    </Grid>
  );
}

function ExperienceTab({ draft }: { draft: CaregiverOnboardingDraft }) {
  const qualifications =
    draft.qualificationTypes ||
    (draft.qualificationType
      ? [draft.qualificationType]
      : []);

  return (
    <Grid>
      <Detail label="Qualifications" value={qualifications.join(", ")} />
      <Detail label="Other qualification" value={draft.qualificationOther} />
      <Detail label="Years of experience" value={numberValue(draft.yearsExperience)} />
      <Detail label="Experience areas" value={(draft.experienceCategories || []).join(", ")} />
      <Detail label="Languages" value={(draft.languages || []).map((item) => `${item.language} (${item.fluency})`).join(", ")} />
    </Grid>
  );
}

function PreferencesTab({ draft }: { draft: CaregiverOnboardingDraft }) {
  return (
    <Grid>
      <Detail label="Available for work" value={yesNo(draft.availableForWork)} />
      <Detail label="Can drive" value={yesNo(draft.canDrive)} />
      <Detail label="Owns vehicle" value={yesNo(draft.ownsVehicle)} />
      <Detail label="Willing to transport client" value={yesNo(draft.willingToTransportClient)} />
      <Detail label="Live-out" value={yesNo(draft.acceptsLiveOut)} />
      <Detail label="Live-in" value={yesNo(draft.acceptsLiveIn)} />
      <Detail label="Overnight" value={yesNo(draft.acceptsOvernight)} />
    </Grid>
  );
}

function AvailabilityTab({ draft }: { draft: CaregiverOnboardingDraft }) {
  const entries =
    Object.entries(
      draft.weeklyAvailability ||
      {}
    );

  return (
    <div className="space-y-3">
      {entries.length === 0 ? (
        <Empty />
      ) : (
        entries.map(([day, value]) => (
          <div key={day} className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
            <span className="font-bold">{day}</span>
            <span className="text-sm text-gray-600">
              {value?.enabled
                ? `${value.startTime || "—"} – ${value.endTime || "—"}`
                : "Unavailable"}
            </span>
          </div>
        ))
      )}

      <Detail label="Temporary time off" value={[draft.temporaryTimeOffStart, draft.temporaryTimeOffEnd].filter(Boolean).join(" to ")} />
      <Detail label="Time-off note" value={draft.temporaryTimeOffNote} />
    </div>
  );
}

function CredentialsTab({ draft }: { draft: CaregiverOnboardingDraft }) {
  const qualifications =
    draft.qualificationDocuments ||
    (draft.qualification
      ? [draft.qualification]
      : []);

  const docs = [
    ["Government ID", draft.governmentId],
    ["Work eligibility", draft.workEligibility],
    ["Vulnerable Sector Check", draft.vulnerableSectorCheck],
    ["Resume / CV", draft.resume],
    ["CPR / First Aid", draft.cprFirstAid],
    ["TB evidence", draft.tbEvidence],
    ["COVID-19 vaccination", draft.covid19VaccinationEvidence],
  ] as const;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold">Qualification documents</p>
            <p className="mt-1 text-xs text-gray-500">
              {qualifications.length > 0
                ? `${qualifications.length} document${qualifications.length === 1 ? "" : "s"} stored`
                : "No qualification document stored"}
            </p>
          </div>

          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
            {qualifications.length > 0 ? "added" : "not_added"}
          </span>
        </div>
      </div>

      {docs.map(([label, record]) => (
        <div key={label} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-4">
          <div>
            <p className="font-bold">{label}</p>
            <p className="mt-1 text-xs text-gray-500">
              {record?.fileName || "No filename stored"}
            </p>
          </div>

          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
            {record?.status || "not_added"}
          </span>
        </div>
      ))}
    </div>
  );
}

function ProfessionalTab({ draft }: { draft: CaregiverOnboardingDraft }) {
  return (
    <Grid>
      <Detail label="HSCPOA member" value={yesNo(draft.hscpoaMember)} />
      <Detail label="HSCPOA number" value={draft.hscpoaNumber} />
      <Detail label="OPSWA member" value={yesNo(draft.opswaMember)} />
      <Detail label="OPSWA member ID" value={draft.opswaMemberId} />
      <Detail label="Liability insurance" value={yesNo(draft.liabilityInsurance)} />
      <Detail label="Insurance provider" value={draft.liabilityInsuranceProvider} />
      <Detail label="Policy number" value={draft.liabilityInsurancePolicyNumber} />
      <Detail label="Policy expiry" value={draft.liabilityInsuranceExpiry} />
    </Grid>
  );
}

function BackgroundTab({ draft }: { draft: CaregiverOnboardingDraft }) {
  return (
    <div>
      <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-bold text-blue-900">
          Carerity-managed information
        </p>
        <p className="mt-1 text-sm leading-relaxed text-blue-800">
          Background-screening status and completed review information cannot be edited from your caregiver profile.
        </p>
      </div>

      <Grid>
        <Detail label="Background screening consent" value={yesNo(draft.digitalBackgroundScreeningConsent)} />
        <Detail label="Background screening status" value={draft.digitalBackgroundScreeningStatus} />
        <Detail label="Submitted at" value={draft.submittedAt} />
        <Detail label="Last updated" value={draft.lastUpdatedAt} />
      </Grid>
    </div>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {children}
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  const cleanValue =
    typeof value === "string"
      ? value.trim()
      : "";

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-gray-900">
        {cleanValue || "—"}
      </p>
    </div>
  );
}

function Empty() {
  return (
    <p className="text-sm text-gray-500">
      No information stored.
    </p>
  );
}

function yesNo(
  value?: boolean
) {
  return value === true
    ? "Yes"
    : value === false
      ? "No"
      : "—";
}

function numberValue(
  value?: number
) {
  return typeof value === "number"
    ? String(value)
    : "—";
}

function formatSex(
  value?:
    CaregiverOnboardingDraft["sex"]
) {
  switch (value) {
    case "male":
      return "Male";
    case "female":
      return "Female";
    case "prefer_not_to_say":
      return "Prefer not to say";
    default:
      return "—";
  }
}

function formatStatus(
  status?:
    CaregiverOnboardingDraft["applicationStatus"]
) {
  switch (status) {
    case "under_review":
      return "Under review";
    case "needs_attention":
      return "Needs attention";
    case "approved":
      return "Approved";
    case "submitted":
      return "Submitted";
    case "declined":
      return "Not approved";
    default:
      return "Draft";
  }
}

function statusBadgeClass(
  status?:
    CaregiverOnboardingDraft["applicationStatus"]
) {
  const base =
    "rounded-full px-3 py-1.5 text-xs font-bold";

  if (status === "approved") {
    return `${base} bg-emerald-100 text-emerald-700`;
  }

  if (status === "submitted") {
    return `${base} bg-blue-100 text-blue-700`;
  }

  if (status === "under_review") {
    return `${base} bg-amber-100 text-amber-700`;
  }

  if (status === "needs_attention") {
    return `${base} bg-orange-100 text-orange-700`;
  }

  if (status === "declined") {
    return `${base} bg-red-100 text-red-700`;
  }

  return `${base} bg-gray-100 text-gray-700`;
}

