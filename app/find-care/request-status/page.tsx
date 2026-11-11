"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  BookingDraft,
  getBookingDraft,
  saveBookingDraft,
} from "../../../lib/bookingDraft";

import {
  CustomerMatchSessionStatus,
  loadCustomerMatchStatus,
} from "../../../lib/customerMatchingPersistence";

import { customerSupabase } from "../../../lib/supabaseClient";

type BridgeState =
  | "booting"
  | "starting"
  | "matching"
  | "caregiver_response"
  | "ready"
  | "manual"
  | "error";

type StartMatchingResponse = {
  success?: boolean;
  reused?: boolean;
  offerSessionId?: string;
  status?: CustomerMatchSessionStatus;
  firstPairDeadline?: string | null;
  automatedDeadlineAt?: string | null;
  careRecipientId?: string | null;
  careRequestId?: string | null;
  candidateCount?: number;
  eligibleCandidateCount?: number;
  firstWaveCaregiverIds?: string[];
  secondWaveCaregiverIds?: string[];
  error?: string;
  databaseMessage?: string;
};

export default function RequestStatusPage() {
  const router = useRouter();

  const [booking, setBooking] = useState<BookingDraft>({});
  const [bridgeState, setBridgeState] = useState<BridgeState>("booting");
  const [sessionId, setSessionId] = useState("");
  const [sessionStatus, setSessionStatus] =
    useState<CustomerMatchSessionStatus | null>(null);
  const [message, setMessage] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [responseDeadline, setResponseDeadline] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [currentWave, setCurrentWave] = useState<1 | 2>(1);

  const startInFlightRef = useRef(false);
  const lastStartAttemptRef = useRef(0);

  const startAutomaticMatching = useCallback(
    async (draft: BookingDraft) => {
      if (startInFlightRef.current) return null;

      const now = Date.now();

      // Prevent the 4-second poll from hammering the start route after an error.
      if (now - lastStartAttemptRef.current < 8000) {
        return null;
      }

      startInFlightRef.current = true;
      lastStartAttemptRef.current = now;
      setBridgeState("starting");
      setMessage("");

      try {
        const {
          data: { session },
          error: sessionError,
        } = await customerSupabase.auth.getSession();

        if (sessionError || !session?.access_token) {
          setBridgeState("error");
          setMessage("Your customer session has expired. Please sign in again.");
          return null;
        }

        const response = await fetch("/api/matching/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ booking: draft }),
        });

        const result = (await response.json()) as StartMatchingResponse;

        if (!response.ok || !result.success || !result.offerSessionId) {
          const detail = result.databaseMessage
            ? `${result.error || "Unable to start matching."} (${result.databaseMessage})`
            : result.error || "Unable to start caregiver matching.";

          setBridgeState("error");
          setMessage(detail);
          return null;
        }

        saveBookingDraft({
          matchingSessionId: result.offerSessionId,
          offerStatus: "awaiting_responses",
          automatedMatchingDeadlineAt:
            result.automatedDeadlineAt || undefined,
          requestStatus: "matching",
          assignedCaregiverId: undefined,
          assignedCaregiverName: undefined,
          selectedCaregiverId: undefined,
          presentedCaregiverIds: [],
        });

        setSessionId(result.offerSessionId);
        setSessionStatus(result.status || "awaiting_first_pair");
        setCurrentWave(result.status === "awaiting_second_pair" ? 2 : 1);

        // IMPORTANT:
        // Bind this matching session to the current Stripe Setup Session.
        // This prevents a new booking from accidentally reusing an older
        // completed/selected matching session left in the browser draft.
        if (draft.stripeSetupSessionId) {
          try {
            window.localStorage.setItem(
              `carerity-matching-session:${draft.stripeSetupSessionId}`,
              result.offerSessionId
            );
          } catch {
            // Browser storage is only a recovery aid. The server route remains
            // the source of truth and is idempotent by Stripe setup session.
          }
        }

        if (result.firstPairDeadline) {
          setResponseDeadline(result.firstPairDeadline);

          try {
            window.localStorage.setItem(
              `carerity-response-deadline:${result.offerSessionId}`,
              result.firstPairDeadline
            );
          } catch {
            // Countdown persistence is UI-only. Matching must not depend on it.
          }
        }

        setBridgeState("caregiver_response");

        return result.offerSessionId;
      } catch (error) {
        console.error("Automatic matching start failed:", error);
        setBridgeState("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to start caregiver matching."
        );
        return null;
      } finally {
        startInFlightRef.current = false;
      }
    },
    []
  );

  const resolveRealSession = useCallback(async () => {
    const draft = getBookingDraft();
    setBooking(draft);

    if (
      draft.paymentMethodStatus !== "secured" &&
      draft.paymentStatus !== "method_secured"
    ) {
      setBridgeState("error");
      setMessage("Your payment method is not secured for this care request.");
      return;
    }

    const bookingReference = draft.stripeSetupSessionId?.trim() || "";

    if (!bookingReference) {
      setBridgeState("error");
      setMessage(
        "This care request is missing its secured payment reference. Please return to payment and try again."
      );
      return;
    }

    // Never trust a generic matchingSessionId from a previous booking.
    // A matching session must be tied to THIS booking's Stripe Setup Session.
    let resolvedSessionId = "";

    try {
      resolvedSessionId =
        window.localStorage.getItem(
          `carerity-matching-session:${bookingReference}`
        ) || "";
    } catch {
      resolvedSessionId = "";
    }

    // If this browser has no binding yet, ask the existing server route.
    // The route is already idempotent on:
    //   booking_reference = Stripe Setup Session ID + customer_user_id
    // so it safely returns the correct existing session for this booking,
    // or creates a new one when this is a genuinely new booking.
    if (!resolvedSessionId) {
      resolvedSessionId = (await startAutomaticMatching(draft)) || "";
    }

    if (!resolvedSessionId) {
      return;
    }

    setSessionId(resolvedSessionId);

    try {
      window.localStorage.setItem(
        `carerity-matching-session:${bookingReference}`,
        resolvedSessionId
      );
    } catch {
      // Non-critical browser recovery aid only.
    }

    try {
      const savedDeadline = window.localStorage.getItem(
        `carerity-response-deadline:${resolvedSessionId}`
      );

      if (savedDeadline) {
        setResponseDeadline(savedDeadline);
      }
    } catch {
      // UI countdown persistence must never interrupt the live matching flow.
    }

    saveBookingDraft({
      matchingSessionId: resolvedSessionId,
      requestStatus: "matching",
    });

    const statusResult = await loadCustomerMatchStatus(resolvedSessionId);

    if (!statusResult.success) {
      setBridgeState("error");
      setMessage(statusResult.error);
      return;
    }

    const resolvedStatus = statusResult.match.status;
    setSessionStatus(resolvedStatus);
    setCurrentWave(statusResult.match.currentWave || 1);

    // The backend deadline is the source of truth for the visible clock.
    // Refreshing this page must never restart a new 30-minute countdown.
    if (statusResult.match.currentWaveDeadline) {
      setResponseDeadline(statusResult.match.currentWaveDeadline);
      try {
        window.localStorage.setItem(
          `carerity-response-deadline:${resolvedSessionId}`,
          statusResult.match.currentWaveDeadline
        );
      } catch {
        // UI persistence only. Matching does not depend on localStorage.
      }
    } else {
      setResponseDeadline(null);
    }

    if (resolvedStatus === "manual_sourcing") {
      setBridgeState("manual");
      setMessage(
        statusResult.match.customerMessage ||
          "Our care team is helping source your caregiver."
      );
      return;
    }

    const hasPresentedCaregiver =
      statusResult.match.presentedCaregivers.some(
        (caregiver) =>
          caregiver.status === "presented" || caregiver.status === "selected"
      );

    if (
      resolvedStatus === "caregiver_selected" ||
      hasPresentedCaregiver ||
      resolvedStatus === "first_pair_ready" ||
      resolvedStatus === "second_pair_ready" ||
      resolvedStatus === "customer_choice_pending"
    ) {
      setBridgeState("ready");
      router.replace("/find-care/matching");
      return;
    }

    if (
      resolvedStatus === "awaiting_first_pair" ||
      resolvedStatus === "awaiting_second_pair"
    ) {
      setBridgeState("caregiver_response");
      return;
    }

    setBridgeState("matching");
  }, [router, startAutomaticMatching]);

  useEffect(() => {
    void resolveRealSession();

    const poll = window.setInterval(() => {
      void resolveRealSession();
    }, 4000);

    const clock = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);

      setResponseDeadline((deadline) => {
        if (!deadline) {
          setRemainingSeconds(null);
          return deadline;
        }

        const remaining = Math.max(
          0,
          Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000)
        );

        setRemainingSeconds(remaining);
        return deadline;
      });
    }, 1000);

    return () => {
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, [resolveRealSession]);

  useEffect(() => {
    if (!responseDeadline) {
      setRemainingSeconds(null);
      return;
    }

    setRemainingSeconds(
      Math.max(
        0,
        Math.ceil((new Date(responseDeadline).getTime() - Date.now()) / 1000)
      )
    );
  }, [responseDeadline]);

  const recipientName = useMemo(() => {
    return (
      booking.careRecipientName ||
      booking.recipientName ||
      [booking.firstName, booking.lastName].filter(Boolean).join(" ") ||
      "your care recipient"
    );
  }, [booking]);

  const presentation = getPresentation(
    bridgeState,
    recipientName,
    sessionStatus,
    currentWave
  );

  const activeSearch =
    bridgeState !== "error" &&
    bridgeState !== "manual" &&
    bridgeState !== "ready";

  const responseWindowText =
    remainingSeconds === null
      ? "Up to 30 min"
      : remainingSeconds <= 0
        ? "Window closing"
        : formatCountdown(remainingSeconds);

  const progress = getProgressState(bridgeState);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f5efff_0,_#fbfaff_34%,_#f7f7fb_100%)] px-4 py-6 text-gray-900 sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-4xl overflow-hidden rounded-[34px] border border-purple-100 bg-white/95 shadow-[0_24px_70px_rgba(91,33,182,0.12)] backdrop-blur">
        <div className="px-5 pb-6 pt-7 sm:px-8 sm:pt-8">
          <div className="text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.38em] text-purple-700">
              CARERITY
            </p>

            <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.16em] text-purple-700">
              {presentation.eyebrow}
            </p>

            <h1 className="mx-auto mt-2 max-w-2xl text-3xl font-black tracking-tight text-gray-950 sm:text-[2.35rem] sm:leading-[1.05]">
              {presentation.title}
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-600">
              {presentation.detail}
            </p>
          </div>

          {activeSearch && (
            <>
              <div className="mt-7 overflow-hidden rounded-[30px] border border-purple-200 bg-[#f8f5ff] shadow-[inset_0_0_50px_rgba(126,34,206,0.07),0_16px_35px_rgba(126,34,206,0.08)]">
                <div className="relative h-[390px] sm:h-[440px]">
                  <MapBackdrop
                    city={booking.city || "Markham"}
                    province={booking.province || "Ontario"}
                  />

                  <div className="absolute left-4 top-4 z-20 rounded-2xl border border-purple-100 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-purple-700">⌖</span>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">Care location</p>
                        <p className="text-xs font-bold text-gray-900">
                          {[booking.city, booking.province].filter(Boolean).join(", ") || "Verified location"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="absolute right-4 top-4 z-20 rounded-2xl border border-purple-100 bg-white/95 px-3 py-2 text-right shadow-sm backdrop-blur">
                    <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                      Response window
                    </p>
                    <p className="mt-0.5 text-xl font-black text-purple-700">
                      {responseWindowText}
                    </p>
                    <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] font-bold text-emerald-600">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      Live
                    </div>
                  </div>

                  <div className="absolute inset-0 z-10 flex items-center justify-center">
                    <CarerityRadar active />
                  </div>

                  <span className="absolute left-[24%] top-[46%] z-10 h-2.5 w-2.5 animate-pulse rounded-full bg-purple-600 shadow-[0_0_0_6px_rgba(147,51,234,0.09)]" />
                  <span className="absolute right-[23%] top-[52%] z-10 h-2.5 w-2.5 animate-pulse rounded-full bg-purple-500 shadow-[0_0_0_6px_rgba(147,51,234,0.08)] [animation-delay:450ms]" />
                  <span className="absolute bottom-[20%] left-[42%] z-10 h-2 w-2 animate-pulse rounded-full bg-purple-500 shadow-[0_0_0_5px_rgba(147,51,234,0.07)] [animation-delay:800ms]" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-2xl border border-purple-100 bg-white px-4 py-3 shadow-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-50">
                    <span className="absolute h-3 w-3 animate-ping rounded-full bg-purple-400 opacity-60" />
                    <span className="relative h-3 w-3 rounded-full bg-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-gray-950">Search active</p>
                    <p className="mt-0.5 text-xs text-gray-500">Your caregiver search is continuing in real time.</p>
                  </div>
                </div>
                <span className="ml-3 shrink-0 text-xs font-bold text-emerald-600">● Live</span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <SearchSignal label="Location" value={[booking.city, booking.province].filter(Boolean).join(", ") || "Verified"} />
                <SearchSignal
                  label="Care needs"
                  value={booking.selectedNeeds?.length ? `${booking.selectedNeeds.length} need${booking.selectedNeeds.length === 1 ? "" : "s"}` : "Recorded"}
                />
                <SearchSignal
                  label="Status"
                  value={bridgeState === "caregiver_response" ? "Caregivers contacted" : bridgeState === "starting" ? "Checking" : "Searching"}
                />
              </div>

              <div className="mt-5 rounded-2xl border border-purple-100 bg-white p-4 shadow-sm">
                <div className="grid grid-cols-4 gap-2">
                  <ProgressStep
                    label="Request received"
                    state={progress.request}
                  />
                  <ProgressStep
                    label="Caregivers identified"
                    state={progress.matched}
                  />
                  <ProgressStep
                    label="Invitations sent"
                    state={progress.contacted}
                  />
                  <ProgressStep
                    label="Awaiting responses"
                    state={progress.waiting}
                  />
                </div>
              </div>

              {bridgeState === "caregiver_response" && (
                <div className="mt-5 rounded-2xl border border-purple-100 bg-purple-50/70 px-4 py-4 text-center">
                  <span className="inline-flex rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wide text-purple-700 shadow-sm">
                    {currentWave === 1 ? "First caregiver round" : "Second caregiver round"}
                  </span>

                  <p className="mt-2 text-sm font-black text-gray-950">
                    {currentWave === 1
                      ? "Responses typically take up to 30 minutes."
                      : "We’re checking another set of suitable caregivers."}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-600">
                    You can leave this page. We’ll notify you when your caregiver is ready.
                  </p>
                </div>
              )}

              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="rounded-xl border border-purple-200 bg-white px-5 py-2.5 text-sm font-bold text-purple-700 transition hover:bg-purple-50"
                >
                  Back to dashboard
                </button>
              </div>
            </>
          )}

          {bridgeState === "manual" && (
            <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
              <p className="font-bold text-amber-900">Carerity care coordinator taking over</p>
              <p className="mt-2 text-sm leading-relaxed text-amber-800">{message}</p>
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="mt-4 rounded-xl border border-amber-300 bg-white px-5 py-2.5 text-sm font-bold text-amber-900"
              >
                Back to dashboard
              </button>
            </div>
          )}

          {bridgeState === "error" && (
            <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-5">
              <p className="font-bold text-red-800">We couldn&apos;t continue this search</p>
              <p className="mt-2 text-sm text-red-700">{message}</p>
              <button
                type="button"
                onClick={() => {
                  lastStartAttemptRef.current = 0;
                  setBridgeState("booting");
                  setMessage("");
                  void resolveRealSession();
                }}
                className="mt-4 rounded-xl bg-purple-600 px-5 py-3 font-semibold text-white"
              >
                Try Again
              </button>
            </div>
          )}

          {bridgeState === "ready" && (
            <div className="mt-7 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl font-black text-emerald-700">✓</div>
              <h2 className="mt-4 text-2xl font-black text-gray-950">Good news! We&apos;ve found your caregiver</h2>
              <p className="mt-2 text-sm text-gray-600">Taking you to your caregiver details.</p>
            </div>
          )}

          {bridgeState !== "error" && bridgeState !== "manual" && bridgeState !== "ready" && (
            <div className="mt-5 flex items-center justify-center gap-2 text-[11px] font-semibold text-gray-400">
              <span>Live caregiver search</span><span>·</span><span>{formatElapsed(elapsedSeconds)}</span>
            </div>
          )}

          {sessionId && (
            <p className="mt-3 break-all text-center text-[9px] text-gray-300">Search reference: {sessionId}</p>
          )}
        </div>
      </section>
    </main>
  );
}

function CarerityRadar({
  active,
}: {
  active:
    boolean;
}) {
  return (
    <div className="relative h-[290px] w-[290px] sm:h-[340px] sm:w-[340px]">
      {/* soft glow */}
      <div className="absolute inset-[8%] rounded-full bg-purple-500/10 blur-3xl" />

      {/* radar rings */}
      <div className="absolute inset-0 rounded-full border border-purple-200 bg-white/20 shadow-[0_0_60px_rgba(126,34,206,0.12)]" />
      <div className="absolute inset-[13%] rounded-full border border-purple-300/70" />
      <div className="absolute inset-[26%] rounded-full border border-purple-300/70" />
      <div className="absolute inset-[39%] rounded-full border border-purple-300/70" />

      {/* crosshair */}
      <div className="absolute left-1/2 top-[4%] h-[92%] w-px -translate-x-1/2 bg-purple-200/45" />
      <div className="absolute left-[4%] top-1/2 h-px w-[92%] -translate-y-1/2 bg-purple-200/45" />

      {active && (
        <>
          {/* guaranteed visible rotating radar sweep */}
          <div className="absolute inset-[3%] animate-spin rounded-full [animation-duration:3s]">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0deg, transparent 292deg, rgba(196,181,253,0.12) 308deg, rgba(147,51,234,0.38) 330deg, rgba(109,40,217,0.90) 358deg, transparent 360deg)",
              }}
            />
          </div>

          {/* expanding pulse rings */}
          <div className="absolute inset-[32%] animate-ping rounded-full border-2 border-purple-500/40 [animation-duration:2.2s]" />
          <div className="absolute inset-[32%] animate-ping rounded-full border-2 border-purple-400/25 [animation-delay:1.1s] [animation-duration:2.2s]" />

          {/* caregiver/location signals */}
          <RadarSignal className="left-[18%] top-[38%]" delay="0ms" />
          <RadarSignal className="right-[16%] top-[45%]" delay="450ms" />
          <RadarSignal className="bottom-[18%] left-[42%]" delay="850ms" />
          <RadarSignal className="right-[30%] top-[22%]" delay="1250ms" />
        </>
      )}

      {/* center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative flex h-[82px] w-[82px] items-center justify-center rounded-full border-[6px] border-white bg-purple-700 shadow-[0_12px_35px_rgba(126,34,206,0.35)]">
          {active && (
            <span className="absolute inset-0 animate-ping rounded-full bg-purple-500/25 [animation-duration:2s]" />
          )}

          <div className="relative">
            <CarerityHeartMark />
          </div>
        </div>
      </div>
    </div>
  );
}

function RadarSignal({
  className,
  delay,
}: {
  className:
    string;

  delay:
    string;
}) {
  return (
    <span
      className={`absolute z-20 flex h-4 w-4 items-center justify-center ${className}`}
    >
      <span
        className="absolute h-4 w-4 animate-ping rounded-full bg-purple-500/30"
        style={{
          animationDelay:
            delay,
        }}
      />

      <span className="relative h-2.5 w-2.5 rounded-full border-2 border-white bg-purple-600 shadow-[0_0_12px_rgba(126,34,206,0.55)]" />
    </span>
  );
}

function CarerityHeartMark() {
  return (
    <svg viewBox="0 0 64 64" className="h-10 w-10" aria-hidden="true" fill="none">
      <path d="M32 52C24.2 45.9 12 37.4 12 25.5C12 18.6 17.1 14 23 14C27 14 30 16.1 32 19.1C34 16.1 37 14 41 14C46.9 14 52 18.6 52 25.5C52 37.4 39.8 45.9 32 52Z" stroke="white" strokeWidth="4" strokeLinejoin="round" />
      <path d="M32 24V38M25 31H39" stroke="white" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function MapBackdrop({ city, province }: { city: string; province: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#f7f5ff]">
      <div
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            "linear-gradient(28deg, transparent 43%, rgba(167,139,250,0.32) 44%, rgba(167,139,250,0.32) 46%, transparent 47%), linear-gradient(155deg, transparent 37%, rgba(196,181,253,0.50) 38%, rgba(196,181,253,0.50) 40%, transparent 41%), linear-gradient(82deg, transparent 48%, rgba(226,232,240,0.75) 49%, rgba(226,232,240,0.75) 51%, transparent 52%), radial-gradient(circle at 50% 52%, rgba(168,85,247,0.20), transparent 38%)",
          backgroundSize:
            "170px 120px, 225px 155px, 145px 145px, 100% 100%",
        }}
      />
      <div className="absolute left-[7%] top-[38%] text-[10px] font-bold text-gray-500">{city}</div>
      <div className="absolute right-[9%] top-[34%] text-[9px] font-semibold text-gray-400">Unionville</div>
      <div className="absolute bottom-[14%] left-[11%] text-[9px] font-semibold text-gray-400">Milliken Mills</div>
      <div className="absolute bottom-[12%] right-[8%] text-[9px] font-semibold text-gray-400">Scarborough</div>
      <div className="absolute right-[8%] top-[61%] max-w-[74px] text-right text-[8px] font-medium leading-3 text-gray-400">Rouge National Urban Park</div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/75 px-2 py-1 text-[8px] font-semibold text-gray-400">{province}</div>
    </div>
  );
}

function SearchSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white bg-white p-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}

type ProgressVisualState = "done" | "active" | "pending";

function ProgressStep({ label, state }: { label: string; state: ProgressVisualState }) {
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <div className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-black ${state === "done" ? "border-purple-600 bg-purple-600 text-white" : state === "active" ? "border-purple-300 bg-purple-50 text-purple-700" : "border-gray-200 bg-white text-gray-300"}`}>
        {state === "done" ? "✓" : state === "active" ? "●" : "○"}
      </div>
      <p className={`mt-2 text-[9px] font-bold leading-3 sm:text-[10px] ${state === "pending" ? "text-gray-400" : "text-gray-700"}`}>{label}</p>
    </div>
  );
}

function getProgressState(state: BridgeState) {
  if (state === "caregiver_response") {
    return { request: "done" as const, matched: "done" as const, contacted: "done" as const, waiting: "active" as const };
  }
  if (state === "matching" || state === "starting") {
    return { request: "done" as const, matched: "active" as const, contacted: "pending" as const, waiting: "pending" as const };
  }
  return { request: "active" as const, matched: "pending" as const, contacted: "pending" as const, waiting: "pending" as const };
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function getPresentation(
  state: BridgeState,
  recipientName: string,
  sessionStatus: CustomerMatchSessionStatus | null,
  currentWave: 1 | 2
) {
  switch (state) {
    case "starting":
      return {
        eyebrow: "Live caregiver search",
        title: "We’re finding the right caregiver for you",
        detail: "Checking approved caregivers based on your care needs, availability and location.",
      };

    case "caregiver_response":
      return {
        eyebrow:
          currentWave === 1
            ? "Caregiver outreach active"
            : "Second caregiver round active",
        title:
          currentWave === 1
            ? "Caregivers identified for your care needs"
            : "We’re checking more suitable caregivers",
        detail:
          currentWave === 1
            ? "Suitable approved caregivers have been invited. We’re waiting for their response."
            : "The first group wasn’t available, so we moved straight to the next suitable caregivers.",
      };

    case "ready":
      return {
        eyebrow: "Caregiver found",
        title: "Good news! We’ve found your caregiver",
        detail: "Your caregiver is available and fits your care needs.",
      };

    case "manual":
      return {
        eyebrow: "Carerity care team",
        title: "We’re exploring other channels",
        detail:
          "The automatic matching window has ended, so our care team is helping with your request.",
      };

    case "error":
      return {
        eyebrow: "Search interrupted",
        title: "We need to reconnect your care request",
        detail:
          "Your booking information is safe. Retry the matching connection below.",
      };

    case "matching":
      return {
        eyebrow: "Live caregiver search",
        title: "We’re finding the right caregiver for you",
        detail: "Checking approved caregivers based on your care needs, availability and location.",
      };

    default:
      return {
        eyebrow: "Care request secured",
        title: "Starting your caregiver search",
        detail: "Your care details are logged. We’re starting the live caregiver search now.",
      };
  }
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(
    2,
    "0"
  )}`;
}
