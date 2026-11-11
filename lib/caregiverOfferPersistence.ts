

import type {
    CaregiverMatchRun,
    CaregiverOutreachPlan,
  } from "./matchingTypes";
  
  import {
    buildCaregiverOutreachPlan,
    CAREGIVER_PAIR_INTEREST_WINDOW_MINUTES,
    CAREGIVER_CUSTOMER_PROMISE_MINUTES,
  } from "./matchingTypes";
  
  import {
    adminSupabase,
    caregiverSupabase,
    customerSupabase,
  } from "./supabaseClient";
  
  export type CaregiverOfferStatus =
    | "queued"
    | "pending"
    | "interested"
    | "declined"
    | "expired"
    | "withdrawn"
    | "presented"
    | "selected"
    | "not_selected";
  
  export type CaregiverOfferSessionStatus =
    | "awaiting_first_pair"
    | "first_pair_ready"
    | "customer_choice_pending"
    | "awaiting_second_pair"
    | "second_pair_ready"
    | "caregiver_selected"
    | "manual_sourcing"
    | "cancelled"
    | "closed";
  
  export type CaregiverJobOffer = {
    id:
      string;
  
    offer_session_id:
      string;
  
    caregiver_id:
      string;
  
    caregiver_number:
      string | null;
  
    wave:
      1 | 2;
  
    rank:
      number;
  
    match_score:
      number | null;
  
    distance_km:
      number | null;
  
    status:
      CaregiverOfferStatus;
  
    care_recipient_name:
      string | null;
  
    care_city:
      string | null;
  
    care_province:
      string | null;
  
    schedule_type:
      string | null;
  
    care_date:
      string | null;
  
    start_time:
      string | null;
  
    end_time:
      string | null;
  
    recurring_days:
      string[] | null;
  
    offered_at:
      string | null;
  
    expires_at:
      string | null;
  
    responded_at:
      string | null;
  
    created_at:
      string;
  };
  
  export type CreateOfferSessionInput = {
    bookingReference:
      string;
  
    customerUserId?:
      string;
  
    careRecipientName?:
      string;
  
    careCity?:
      string;
  
    careProvince?:
      string;
  
    scheduleType?:
      string;
  
    careDate?:
      string;
  
    startTime?:
      string;
  
    endTime?:
      string;
  
    recurringDays?:
      string[];
  };
  
  export async function createCaregiverOfferSessionFromMatchRun(
    matchRun:
      CaregiverMatchRun,
  
    input:
      CreateOfferSessionInput
  ) {
    const plan:
      CaregiverOutreachPlan =
      matchRun.outreachPlan ||
      buildCaregiverOutreachPlan(
        matchRun.candidates
      );
  
    if (
      plan.firstPair.length ===
      0
    ) {
      return {
        success:
          false as const,
  
        error:
          "No eligible caregiver is available for outreach.",
      };
    }
  
    let customerUserId =
      input.customerUserId?.trim() ||
      "";
  
    if (!customerUserId) {
      const { data: { user: customerUser }, error: customerUserError } =
        await customerSupabase.auth.getUser();
  
      if (customerUserError || !customerUser) {
        return {
          success: false as const,
          error: "No active customer session was found. Sign in to the customer account in this browser before starting live caregiver outreach.",
        };
      }
  
      customerUserId = customerUser.id;
    }
  
    const now =
      new Date();
  
    const firstPairDeadline =
      new Date(
        now.getTime() +
        CAREGIVER_PAIR_INTEREST_WINDOW_MINUTES *
          60_000
      )
        .toISOString();
  
    const automatedDeadlineAt =
      new Date(
        now.getTime() +
        CAREGIVER_CUSTOMER_PROMISE_MINUTES *
          60_000
      )
        .toISOString();
  
    const {
      data:
        sessionRow,
  
      error:
        sessionError,
    } =
      await adminSupabase
        .from(
          "caregiver_offer_sessions"
        )
        .insert({
          booking_reference:
            input.bookingReference,
  
          customer_user_id:
            customerUserId,
  
          status:
            "awaiting_first_pair",
  
          response_window_minutes:
            CAREGIVER_PAIR_INTEREST_WINDOW_MINUTES,
  
          max_outreach_count:
            plan.maximumCaregiversToContact,
  
          current_wave:
            1,
  
          current_wave_deadline:
            firstPairDeadline,
  
          automated_deadline_at:
            automatedDeadlineAt,
  
          care_recipient_name:
            input.careRecipientName ||
            null,
  
          care_city:
            input.careCity ||
            null,
  
          care_province:
            input.careProvince ||
            null,
  
          schedule_type:
            input.scheduleType ||
            null,
  
          care_date:
            input.careDate ||
            null,
  
          start_time:
            input.startTime ||
            null,
  
          end_time:
            input.endTime ||
            null,
  
          recurring_days:
            input.recurringDays ||
            [],
        })
        .select(
          "id"
        )
        .single();
  
    if (
      sessionError ||
      !sessionRow
    ) {
      return {
        success:
          false as const,
  
        error:
          sessionError?.message ||
          "Unable to create caregiver interest session.",
      };
    }
  
    const firstPairRows =
      plan.firstPair.map(
        (
          candidate
        ) => ({
          offer_session_id:
            sessionRow.id,
  
          caregiver_id:
            candidate.caregiverId,
  
          wave:
            1,
  
          rank:
            candidate.rank,
  
          match_score:
            candidate.score,
  
          distance_km:
            candidate.distanceKm ??
            null,
  
          status:
            "pending",
  
          offered_at:
            now.toISOString(),
  
          expires_at:
            firstPairDeadline,
        })
      );
  
    const secondPairRows =
      plan.secondPair.map(
        (
          candidate
        ) => ({
          offer_session_id:
            sessionRow.id,
  
          caregiver_id:
            candidate.caregiverId,
  
          wave:
            2,
  
          rank:
            candidate.rank,
  
          match_score:
            candidate.score,
  
          distance_km:
            candidate.distanceKm ??
            null,
  
          status:
            "queued",
  
          offered_at:
            null,
  
          expires_at:
            null,
        })
      );
  
    const {
      error:
        offersError,
    } =
      await adminSupabase
        .from(
          "caregiver_job_offers"
        )
        .insert(
          [
            ...firstPairRows,
            ...secondPairRows,
          ]
        );
  
    if (
      offersError
    ) {
      await adminSupabase
        .from(
          "caregiver_offer_sessions"
        )
        .delete()
        .eq(
          "id",
          sessionRow.id
        );
  
      return {
        success:
          false as const,
  
        error:
          offersError.message,
      };
    }
  
    return {
      success:
        true as const,
  
      offerSessionId:
        sessionRow.id,
  
      firstPairDeadline,
  
      automatedDeadlineAt,
  
      customerUserId,
  
      plan,
    };
  }
  
  export async function loadMyCaregiverJobOffers() {
    const {
      data: {
        user,
      },
  
      error:
        userError,
    } =
      await caregiverSupabase
        .auth
        .getUser();
  
    if (
      userError ||
      !user
    ) {
      return {
        success:
          false as const,
  
        authenticated:
          false,
  
        offers:
          [] as CaregiverJobOffer[],
  
        error:
          userError?.message ||
          "You must sign in as a caregiver.",
      };
    }
  
    const {
      data,
      error,
    } =
      await caregiverSupabase
        .from(
          "caregiver_job_offer_feed"
        )
        .select(
          "*"
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        );
  
    if (
      error
    ) {
      return {
        success:
          false as const,
  
        authenticated:
          true,
  
        offers:
          [] as CaregiverJobOffer[],
  
        error:
          error.message,
      };
    }
  
    return {
      success:
        true as const,
  
      authenticated:
        true,
  
      offers:
        (
          data ||
          []
        ) as CaregiverJobOffer[],
    };
  }
  
  export async function respondToCaregiverJobOffer(
    offerId:
      string,
  
    response:
      "interest"
      | "decline"
  ) {
    const {
      data,
      error,
    } =
      await caregiverSupabase
        .rpc(
          "respond_to_caregiver_job_offer",
          {
            p_offer_id:
              offerId,
  
            p_response:
              response,
          }
        );
  
    if (
      error
    ) {
      return {
        success:
          false as const,
  
        error:
          error.message,
      };
    }
  
    const payload =
      data as
        | {
            success?:
              boolean;
  
            message?:
              string;
          }
        | null;
  
    if (
      payload?.success ===
      false
    ) {
      return {
        success:
          false as const,
  
        error:
          payload.message ||
          "This care opportunity is no longer available.",
      };
    }
  
    return {
      success:
        true as const,
  
      result:
        data,
    };
  }
  
  export function getOfferSecondsRemaining(
    offer:
      Pick<
        CaregiverJobOffer,
        "status" |
        "expires_at"
      >,
  
    now =
      Date.now()
  ) {
    if (
      offer.status !==
        "pending" ||
      !offer.expires_at
    ) {
      return 0;
    }
  
    const expiry =
      new Date(
        offer.expires_at
      ).getTime();
  
    if (
      !Number.isFinite(
        expiry
      )
    ) {
      return 0;
    }
  
    return Math.max(
      0,
      Math.ceil(
        (
          expiry -
          now
        ) /
        1000
      )
    );
  }
  
  export function formatOfferCountdown(
    seconds:
      number
  ) {
    const safe =
      Math.max(
        0,
        seconds
      );
  
    const minutes =
      Math.floor(
        safe /
        60
      );
  
    const remainingSeconds =
      safe %
      60;
  
    return `${minutes}:${String(
      remainingSeconds
    ).padStart(
      2,
      "0"
    )}`;
  }
  
  export function getInterestReminderStage(
    offer:
      Pick<
        CaregiverJobOffer,
        "status" |
        "offered_at"
      >,
  
    now =
      Date.now()
  ):
    0 |
    10 |
    20 |
    25 {
    if (
      offer.status !==
        "pending" ||
      !offer.offered_at
    ) {
      return 0;
    }
  
    const offeredAt =
      new Date(
        offer.offered_at
      ).getTime();
  
    if (
      !Number.isFinite(
        offeredAt
      )
    ) {
      return 0;
    }
  
    const elapsedMinutes =
      Math.floor(
        (
          now -
          offeredAt
        ) /
        60_000
      );
  
    if (
      elapsedMinutes >=
      25
    ) {
      return 25;
    }
  
    if (
      elapsedMinutes >=
      20
    ) {
      return 20;
    }
  
    if (
      elapsedMinutes >=
      10
    ) {
      return 10;
    }
  
    return 0;
  }

  