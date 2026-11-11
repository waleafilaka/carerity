"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import DashboardLayout
  from "../../../components/DashboardLayout";

import { customerSupabase } from "../../../lib/supabaseClient";

import {
  getBookingDraft,
  saveBookingDraft,
} from "../../../lib/bookingDraft";

import {
  BookingFinalizationResult,
  CustomerMatchSessionStatus,
  CustomerMatchStatus,
  CustomerPresentedCaregiver,
  declinePresentedCaregivers,
  finalizeSelectedCaregiverBooking,
  getMinutesRemaining,
  loadCustomerMatchStatus,
  recoverMyLatestMatchingSession,
  selectPresentedCaregiver,
} from "../../../lib/customerMatchingPersistence";

type PresentedCaregiverProfile = {
  caregiverId: string;
  caregiverNumber: string | null;
  fullName: string;
  firstName: string;
  yearsExperience: number | null;
  qualifications: string[];
  experienceAreas: string[];
  languages: Array<{ language: string; fluency: string }>;
  city: string | null;
  province: string | null;
  photoUrl: string | null;
  verified: boolean;
  canDrive?: boolean;
  ownsVehicle?: boolean;
  willingToTransportClient?: boolean;
  acceptsOvernight?: boolean;
};

export default function CustomerMatchingPage() {
  const router =
    useRouter();

  const [
    sessionId,
    setSessionId,
  ] =
    useState("");

  const [
    match,
    setMatch,
  ] =
    useState<CustomerMatchStatus | null>(
      null
    );

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

  const [
    busyCaregiverId,
    setBusyCaregiverId,
  ] =
    useState("");

  const [
    declining,
    setDeclining,
  ] =
    useState(false);

  const [
    confirmingBooking,
    setConfirmingBooking,
  ] =
    useState(false);

  const [
    bookingConfirmed,
    setBookingConfirmed,
  ] =
    useState<BookingFinalizationResult | null>(
      null
    );

  const [
    paymentSucceededButNotPersisted,
    setPaymentSucceededButNotPersisted,
  ] =
    useState(false);

  const [
    now,
    setNow,
  ] =
    useState(
      Date.now()
    );

  const [
    caregiverProfiles,
    setCaregiverProfiles,
  ] =
    useState<Record<string, PresentedCaregiverProfile>>({});

  /*
   * ============================================================
   * SESSION BOOTSTRAP
   * ============================================================
   *
   * 1. Prefer the browser draft when present.
   * 2. If missing, recover the signed-in customer's latest
   *    active matching session from Supabase.
   *
   * This makes the matching state survive localhost port changes,
   * cleared draft state, and future device/session recovery work.
   */
  useEffect(() => {
    let active =
      true;

    async function resolveSession() {
      const draft =
        getBookingDraft();

      const draftSessionId =
        draft.matchingSessionId ||
        "";

      if (
        draftSessionId
      ) {
        if (
          active
        ) {
          setSessionId(
            draftSessionId
          );
        }

        return;
      }

      const recovered =
        await recoverMyLatestMatchingSession();

      if (
        !active
      ) {
        return;
      }

      if (
        !recovered.success
      ) {
        setError(
          "We could not find an active caregiver search for this booking."
        );

        setLoading(
          false
        );

        return;
      }

      saveBookingDraft({
        matchingSessionId:
          recovered.sessionId,

        offerStatus:
          mapStatus(
            recovered.status
          ),
      });

      setSessionId(
        recovered.sessionId
      );
    }

    void resolveSession();

    return () => {
      active =
        false;
    };
  }, []);

  const refresh =
    useCallback(
      async () => {
        if (!sessionId) {
          return;
        }

        const result =
          await loadCustomerMatchStatus(
            sessionId
          );

        if (
          !result.success
        ) {
          setError(
            result.error
          );

          setLoading(
            false
          );

          return;
        }

        setMatch(
          result.match
        );

        setError("");

        setLoading(
          false
        );

        saveBookingDraft({
          matchingSessionId:
            result.match.sessionId,

          offerStatus:
            mapStatus(
              result.match.status
            ),

          presentedCaregiverIds:
            result.match
              .presentedCaregivers
              .map(
                (
                  caregiver
                ) =>
                  caregiver
                    .caregiver_id
              ),

          selectedCaregiverId:
            result.match
              .selectedCaregiverId ||
            undefined,

          assignedCaregiverId:
            result.match
              .selectedCaregiverId ||
            undefined,
        });
      },
      [
        sessionId,
      ]
    );

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    void refresh();

    const poll =
      window.setInterval(
        () =>
          void refresh(),
        10000
      );

    const clock =
      window.setInterval(
        () =>
          setNow(
            Date.now()
          ),
        30000
      );

    return () => {
      window.clearInterval(
        poll
      );

      window.clearInterval(
        clock
      );
    };
  }, [
    refresh,
    sessionId,
  ]);

  const caregivers =
    useMemo(
      () =>
        match
          ?.presentedCaregivers
          .filter(
            (
              caregiver
            ) =>
              caregiver.status ===
                "presented" ||
              caregiver.status ===
                "selected"
          ) ||
        [],
      [
        match,
      ]
    );

  useEffect(() => {
    let active = true;

    async function loadProfiles() {
      if (!sessionId || caregivers.length === 0) {
        if (active) {
          setCaregiverProfiles({});
        }
        return;
      }

      const {
        data: { session },
      } = await customerSupabase.auth.getSession();

      if (!session?.access_token) {
        return;
      }

      const entries = await Promise.all(
        caregivers.map(async (caregiver) => {
          try {
            const response = await fetch(
              `/api/matching/caregiver-profile?session_id=${encodeURIComponent(
                sessionId
              )}&caregiver_id=${encodeURIComponent(caregiver.caregiver_id)}`,
              {
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
              }
            );

            if (!response.ok) {
              console.error(
                "Caregiver profile API returned",
                response.status,
                "for",
                caregiver.caregiver_id
              );
              return null;
            }

            const payload = await response.json();

            if (!payload?.success || !payload?.caregiver) {
              return null;
            }

            return [
              caregiver.caregiver_id,
              payload.caregiver as PresentedCaregiverProfile,
            ] as const;
          } catch (error) {
            console.error(
              "Unable to load customer-facing caregiver profile:",
              error
            );
            return null;
          }
        })
      );

      if (!active) {
        return;
      }

      const next: Record<string, PresentedCaregiverProfile> = {};

      entries.forEach((entry) => {
        if (entry) {
          next[entry[0]] = entry[1];
        }
      });

      setCaregiverProfiles(next);
    }

    void loadProfiles();

    return () => {
      active = false;
    };
  }, [sessionId, caregivers]);


  async function confirmSelectedBooking() {
    if (
      confirmingBooking ||
      !sessionId
    ) {
      return;
    }

    setConfirmingBooking(
      true
    );

    setError("");

    setPaymentSucceededButNotPersisted(
      false
    );

    try {
      const finalization =
        await finalizeSelectedCaregiverBooking(
          sessionId
        );

      if (
        !finalization.success
      ) {
        if (
          finalization.paymentSucceeded
        ) {
          setPaymentSucceededButNotPersisted(
            true
          );
        }

        setError(
          finalization.error
        );

        return;
      }

      setBookingConfirmed(
        finalization.result
      );

      saveBookingDraft({
        matchingSessionId:
          sessionId,

        selectedCaregiverId:
          match
            ?.selectedCaregiverId ||
          undefined,

        assignedCaregiverId:
          match
            ?.selectedCaregiverId ||
          undefined,

        requestStatus:
          "caregiver_accepted",
      });
    } finally {
      setConfirmingBooking(
        false
      );
    }
  }

  async function choose(
    caregiver:
      CustomerPresentedCaregiver
  ) {
    if (
      busyCaregiverId ||
      declining ||
      confirmingBooking
    ) {
      return;
    }

    setBusyCaregiverId(
      caregiver.caregiver_id
    );

    setError("");

    setPaymentSucceededButNotPersisted(
      false
    );

    try {
      const result =
        await selectPresentedCaregiver(
          sessionId,
          caregiver.caregiver_id
        );

      if (
        !result.success
      ) {
        setError(
          result.error
        );

        await refresh();

        return;
      }

      saveBookingDraft({
        selectedCaregiverId:
          caregiver.caregiver_id,

        assignedCaregiverId:
          caregiver.caregiver_id,

        requestStatus:
          "caregiver_accepted",
      });

      const finalization =
        await finalizeSelectedCaregiverBooking(
          sessionId
        );

      if (
        !finalization.success
      ) {
        if (
          finalization.paymentSucceeded
        ) {
          setPaymentSucceededButNotPersisted(
            true
          );
        }

        setError(
          finalization.error
        );

        await refresh();

        return;
      }

      setBookingConfirmed(
        finalization.result
      );

      await refresh();
    } finally {
      setBusyCaregiverId(
        ""
      );
    }
  }

  async function decline() {
    if (
      declining ||
      busyCaregiverId ||
      confirmingBooking
    ) {
      return;
    }

    setDeclining(
      true
    );

    setError("");

    try {
      const result =
        await declinePresentedCaregivers(
          sessionId
        );

      if (
        !result.success
      ) {
        setError(
          result.error
        );

        return;
      }

      saveBookingDraft({
        presentedCaregiverIds:
          [],

        selectedCaregiverId:
          undefined,

        assignedCaregiverId:
          undefined,

        requestStatus:
          "matching",
      });

      await refresh();
    } finally {
      setDeclining(
        false
      );
    }
  }

  const remaining =
    getMinutesRemaining(
      match
        ?.automatedDeadlineAt ||
        null,
      now
    );

  return (
    <DashboardLayout
      activeItem="Find Care"
      role="customer"
    >
      <div className="mx-auto max-w-6xl">
        {loading ? (
          <Loading />
        ) : error &&
          !match ? (
          <ErrorState
            message={error}
            onBack={() =>
              router.push(
                "/find-care/review"
              )
            }
          />
        ) : bookingConfirmed ? (
          <BookingConfirmed
            result={
              bookingConfirmed
            }
            onDashboard={() =>
              router.push(
                "/dashboard"
              )
            }
          />
        ) : match?.status ===
          "caregiver_selected" ? (
          <Selected
            error={error}
            confirming={
              confirmingBooking
            }
            paymentSucceededButNotPersisted={
              paymentSucceededButNotPersisted
            }
            onConfirm={
              confirmSelectedBooking
            }
          />
        ) : match?.status ===
          "manual_sourcing" ? (
          <Manual
            message={
              match.customerMessage
            }
          />
        ) : caregivers.length >
          0 ? (
          <Found
            caregivers={
              caregivers
            }
            profiles={
              caregiverProfiles
            }
            error={error}
            busyCaregiverId={
              busyCaregiverId
            }
            declining={
              declining
            }
            onChoose={
              choose
            }
            onDecline={
              decline
            }
          />
        ) : (
          <Searching
            wave={
              match
                ?.currentWave ||
              1
            }
            remaining={
              remaining
            }
          />
        )}
      </div>
    </DashboardLayout>
  );
}

function Searching({
  wave,
  remaining,
}: {
  wave: 1 | 2;
  remaining:
    number | null;
}) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-12">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl font-black text-emerald-700">
        …
      </div>

      <p className="mt-5 text-sm font-bold uppercase tracking-wide text-emerald-700">
        Matching in progress
      </p>

      <h1 className="mt-2 text-3xl font-bold text-gray-950 sm:text-4xl">
        We&apos;re finding the right caregiver for you
      </h1>

      <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base">
        Your care request is active. We&apos;re confirming interest with caregivers who are strong fits for your needs and location.
      </p>

      <div className="mx-auto mt-7 max-w-lg rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="font-bold text-emerald-900">
          We&apos;ll update you shortly
        </p>

        <p className="mt-1 text-sm text-emerald-800">
          {wave === 1
            ? "We are checking our first pair of matched caregivers."
            : "We are checking another pair of strong caregiver matches."}
        </p>

        {remaining !==
          null && (
          <p className="mt-3 text-xs font-semibold text-emerald-700">
            Our automated search is designed to resolve within about an hour. Approximately{" "}
            {remaining} minute
            {remaining === 1
              ? ""
              : "s"}{" "}
            remain in that window.
          </p>
        )}
      </div>

      <p className="mt-6 text-xs text-gray-500">
        You do not need to stay on this page. Your care request remains active.
      </p>
    </section>
  );
}

function Found({
  caregivers,
  profiles,
  error,
  busyCaregiverId,
  declining,
  onChoose,
  onDecline,
}: {
  caregivers:
    CustomerPresentedCaregiver[];
  profiles:
    Record<string, PresentedCaregiverProfile>;
  error: string;
  busyCaregiverId:
    string;
  declining: boolean;
  onChoose: (
    caregiver:
      CustomerPresentedCaregiver
  ) => void;
  onDecline:
    () => void;
}) {
  const pair =
    caregivers.length >
    1;

  return (
    <section>
      <header className="text-center">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">
          Caregiver found
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-950 sm:text-4xl">
          {pair
            ? "Good news! We found two caregivers for you"
            : "Good news! We’ve found your caregiver"}
        </h1>

        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base">
          {pair
            ? "Both caregivers fit your care needs and are available for this visit."
            : "This caregiver fits your care needs and is available for your visit."}
        </p>
      </header>

      {error && (
        <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div
        className={`mx-auto mt-8 grid max-w-5xl gap-5 ${
          pair
            ? "md:grid-cols-2"
            : "max-w-xl"
        }`}
      >
        {caregivers.map(
          (
            caregiver
          ) => (
            <CaregiverCard
              key={
                caregiver.caregiver_id
              }
              caregiver={
                caregiver
              }
              profile={
                profiles[caregiver.caregiver_id]
              }
              busy={
                busyCaregiverId ===
                caregiver.caregiver_id
              }
              disabled={
                Boolean(
                  busyCaregiverId
                ) ||
                declining
              }
              onChoose={() =>
                onChoose(
                  caregiver
                )
              }
            />
          )
        )}
      </div>

      <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center">
        <p className="text-sm font-semibold text-gray-700">
          Prefer another caregiver?
        </p>

        <p className="mt-1 text-xs text-gray-500">
          We’ll continue to the next suitable caregivers where available.
        </p>

        <button
          type="button"
          disabled={
            declining ||
            Boolean(
              busyCaregiverId
            )
          }
          onClick={
            onDecline
          }
          className="mt-4 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-60"
        >
          {declining
            ? "Continuing search..."
            : pair
              ? "Continue search"
              : "Find another caregiver"}
        </button>
      </div>
    </section>
  );
}

function CaregiverCard({
  caregiver,
  profile,
  busy,
  disabled,
  onChoose,
}: {
  caregiver: CustomerPresentedCaregiver;
  profile?: PresentedCaregiverProfile;
  busy: boolean;
  disabled: boolean;
  onChoose: () => void;
}) {
  const displayName =
    profile?.fullName ||
    caregiver.caregiver_number ||
    "Carerity caregiver";

  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "CG";

  const languageText =
    profile?.languages
      ?.map((item) => item.language)
      .filter(Boolean)
      .join(", ") || "";

  const practicalHighlights =
    [
      profile?.canDrive
        ? "Can drive"
        : "",
      profile?.ownsVehicle
        ? "Own vehicle"
        : "",
      profile?.willingToTransportClient
        ? "Client transportation"
        : "",
      profile?.acceptsOvernight
        ? "Overnight care"
        : "",
    ].filter(
      Boolean
    );

  return (
    <article className="overflow-hidden rounded-[30px] border border-emerald-200 bg-white shadow-[0_18px_45px_rgba(5,150,105,0.10)]">
      <div className="bg-gradient-to-br from-emerald-50 via-white to-purple-50 p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[26px] border-4 border-white bg-emerald-100 text-xl font-black text-emerald-700 shadow-md">
            {profile?.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                Verified caregiver
              </span>

              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-gray-500 shadow-sm">
                Available for your visit
              </span>
            </div>

            <h2 className="mt-3 truncate text-2xl font-black text-gray-950">
              {displayName}
            </h2>

            {caregiver.caregiver_number && (
              <p className="mt-1 text-xs font-semibold text-gray-500">
                {caregiver.caregiver_number}
              </p>
            )}

            {profile?.yearsExperience !== null &&
              profile?.yearsExperience !== undefined && (
                <p className="mt-2 text-sm font-bold text-gray-700">
                  {profile.yearsExperience} year
                  {profile.yearsExperience === 1 ? "" : "s"} of care experience
                </p>
              )}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {typeof caregiver.distance_km === "number" && (
            <ProfileFact
              label="Nearby"
              value={`${caregiver.distance_km.toFixed(1)} km away`}
            />
          )}

          {languageText && (
            <ProfileFact
              label="Languages"
              value={languageText}
            />
          )}
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">
            Why this caregiver stands out
          </p>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {profile?.yearsExperience !== null &&
              profile?.yearsExperience !== undefined && (
                <ValuePoint
                  title="Experienced"
                  detail={`${profile.yearsExperience} year${
                    profile.yearsExperience === 1 ? "" : "s"
                  } providing care`}
                />
              )}

            {profile?.verified && (
              <ValuePoint
                title="Carerity approved"
                detail="Profile and required onboarding checks completed"
              />
            )}

            {typeof caregiver.distance_km === "number" && (
              <ValuePoint
                title="Nearby"
                detail={`Approximately ${caregiver.distance_km.toFixed(
                  1
                )} km from your care location`}
              />
            )}

            {languageText && (
              <ValuePoint
                title="Communication"
                detail={languageText}
              />
            )}
          </div>
        </div>

        {profile?.qualifications && profile.qualifications.length > 0 && (
          <div className="mt-5">
            <p className="text-[11px] font-black uppercase tracking-wide text-gray-400">
              Qualifications
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.qualifications.map((value) => (
                <span
                  key={value}
                  className="rounded-full bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700"
                >
                  {value}
                </span>
              ))}
            </div>
          </div>
        )}

        {profile?.experienceAreas && profile.experienceAreas.length > 0 && (
          <div className="mt-5">
            <p className="text-[11px] font-black uppercase tracking-wide text-gray-400">
              Care experience
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.experienceAreas.slice(0, 4).map((value) => (
                <span
                  key={value}
                  className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800"
                >
                  {value}
                </span>
              ))}
            </div>
          </div>
        )}

        {practicalHighlights.length > 0 && (
          <div className="mt-5">
            <p className="text-[11px] font-black uppercase tracking-wide text-gray-400">
              Practical fit
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {practicalHighlights.map((value) => (
                <span
                  key={value}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700"
                >
                  ✓ {value}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
          <p className="text-sm font-black text-emerald-900">
            Ready for your care visit
          </p>
          <p className="mt-1 text-xs leading-5 text-emerald-800">
            Carerity has already checked this caregiver against your care needs,
            availability and location.
          </p>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={onChoose}
          className="mt-5 min-h-[52px] w-full rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700 disabled:bg-emerald-300"
        >
          {busy
            ? "Confirming caregiver and payment..."
            : "Continue with this caregiver"}
        </button>
      </div>
    </article>
  );
}

function ValuePoint({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl bg-white/80 p-3">
      <p className="text-sm font-black text-gray-950">
        ✓ {title}
      </p>
      <p className="mt-1 text-xs leading-5 text-gray-600">
        {detail}
      </p>
    </div>
  );
}

function ProfileFact({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}

function Selected({
  error,
  confirming,
  paymentSucceededButNotPersisted,
  onConfirm,
}: {
  error: string;
  confirming:
    boolean;
  paymentSucceededButNotPersisted:
    boolean;
  onConfirm:
    () => void;
}) {
  return (
    <section className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm sm:p-12">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl font-black text-emerald-700">
        ✓
      </div>

      <p className="mt-5 text-sm font-bold uppercase tracking-wide text-emerald-700">
        Caregiver selected
      </p>

      <h1 className="mt-2 text-3xl font-bold text-gray-950">
        Your caregiver has been selected
      </h1>

      <p className="mx-auto mt-4 max-w-xl text-sm text-gray-600">
        Your payment method was secured before matching. Complete booking confirmation to charge the scheduled care and create your visit.
      </p>

      {error && (
        <div
          className={`mx-auto mt-6 max-w-2xl rounded-2xl border p-4 text-left text-sm font-semibold ${
            paymentSucceededButNotPersisted
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {error}

          {paymentSucceededButNotPersisted && (
            <p className="mt-2 text-xs font-medium">
              Do not enter another card. Retry this confirmation; Stripe idempotency protects against a duplicate charge.
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={
          onConfirm
        }
        disabled={
          confirming
        }
        className="mx-auto mt-7 min-h-[52px] w-full max-w-md rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700 disabled:bg-emerald-300"
      >
        {confirming
          ? "Confirming payment and visit..."
          : paymentSucceededButNotPersisted
            ? "Retry booking confirmation"
            : "Complete booking confirmation"}
      </button>
    </section>
  );
}

function BookingConfirmed({
  result,
  onDashboard,
}: {
  result:
    BookingFinalizationResult;
  onDashboard:
    () => void;
}) {
  return (
    <section className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm sm:p-12">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl font-black text-emerald-700">
        ✓
      </div>

      <p className="mt-5 text-sm font-bold uppercase tracking-wide text-emerald-700">
        Booking confirmed
      </p>

      <h1 className="mt-2 text-3xl font-bold text-gray-950">
        Your care visit is scheduled
      </h1>

      <p className="mx-auto mt-4 max-w-xl text-sm text-gray-600">
        Payment was confirmed and your selected caregiver is now attached to a real scheduled Carerity visit.
      </p>

      <div className="mx-auto mt-7 max-w-md rounded-2xl border border-gray-200 bg-gray-50 p-5 text-left text-sm">
        <Detail
          label="Visit status"
          value={
            result.visitStatus ||
            "scheduled"
          }
        />

        <Detail
          label="Payment status"
          value={
            result.paymentStatus ||
            "paid"
          }
        />

        {result
          .visitPublicId && (
          <Detail
            label="Visit reference"
            value={
              result.visitPublicId
            }
          />
        )}

        {typeof result
          .amount ===
          "number" && (
          <Detail
            label="Amount paid"
            value={
              new Intl.NumberFormat(
                "en-CA",
                {
                  style:
                    "currency",
                  currency:
                    result.currency ||
                    "CAD",
                }
              ).format(
                result.amount
              )
            }
          />
        )}
      </div>

      <button
        type="button"
        onClick={
          onDashboard
        }
        className="mx-auto mt-7 min-h-[52px] w-full max-w-md rounded-xl bg-purple-600 px-5 py-3 font-bold text-white hover:bg-purple-700"
      >
        Go to dashboard
      </button>
    </section>
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
    <div className="flex items-start justify-between gap-4 border-b border-gray-200 py-2.5 last:border-b-0">
      <span className="text-gray-500">
        {label}
      </span>

      <span className="break-all text-right font-bold text-gray-900">
        {value}
      </span>
    </div>
  );
}

function Manual({
  message,
}: {
  message:
    string | null;
}) {
  return (
    <section className="rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm sm:p-12">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-2xl">
        …
      </div>

      <p className="mt-5 text-sm font-bold uppercase tracking-wide text-amber-700">
        Care team assisting
      </p>

      <h1 className="mt-2 text-3xl font-bold text-gray-950">
        We&apos;re exploring other care options for you
      </h1>

      <p className="mx-auto mt-4 max-w-2xl text-sm text-gray-600">
        {message ||
          "We are still working on your care request. Our care team is now exploring additional channels to arrange your care."}
      </p>
    </section>
  );
}

function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mx-auto h-5 w-40 rounded bg-gray-200" />

      <div className="mx-auto mt-4 h-10 w-96 max-w-full rounded bg-gray-200" />

      <div className="mx-auto mt-8 h-72 max-w-2xl rounded-3xl bg-gray-200" />
    </div>
  );
}

function ErrorState({
  message,
  onBack,
}: {
  message: string;
  onBack:
    () => void;
}) {
  return (
    <section className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-2xl font-bold text-gray-950">
        We couldn&apos;t load your caregiver search
      </h1>

      <p className="mx-auto mt-3 max-w-xl text-sm text-gray-600">
        {message}
      </p>

      <button
        type="button"
        onClick={
          onBack
        }
        className="mt-6 rounded-xl bg-gray-900 px-5 py-3 font-bold text-white"
      >
        Return to booking review
      </button>
    </section>
  );
}

function mapStatus(
  status:
    CustomerMatchSessionStatus
) {
  if (
    status ===
    "awaiting_first_pair"
  ) {
    return "awaiting_first_pair" as const;
  }

  if (
    status ===
    "first_pair_ready"
  ) {
    return "first_pair_ready" as const;
  }

  if (
    status ===
    "customer_choice_pending"
  ) {
    return "customer_choice_pending" as const;
  }

  if (
    status ===
    "awaiting_second_pair"
  ) {
    return "awaiting_second_pair" as const;
  }

  if (
    status ===
    "second_pair_ready"
  ) {
    return "second_pair_ready" as const;
  }

  if (
    status ===
    "caregiver_selected"
  ) {
    return "caregiver_selected" as const;
  }

  if (
    status ===
    "manual_sourcing"
  ) {
    return "manual_sourcing" as const;
  }

  return "closed" as const;
}
