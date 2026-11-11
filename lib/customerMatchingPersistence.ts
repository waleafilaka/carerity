"use client";

import {
  customerSupabase,
} from "./supabaseClient";

export type CustomerMatchSessionStatus =
  | "awaiting_first_pair"
  | "first_pair_ready"
  | "customer_choice_pending"
  | "awaiting_second_pair"
  | "second_pair_ready"
  | "caregiver_selected"
  | "manual_sourcing"
  | "cancelled"
  | "closed";

export type CustomerPresentedCaregiver = {
  offer_id: string;
  caregiver_id: string;
  caregiver_number:
    string | null;
  wave: 1 | 2;
  rank: number;
  distance_km:
    number | null;
  status:
    | "presented"
    | "selected";
};

export type CustomerMatchStatus = {
  sessionId: string;
  status:
    CustomerMatchSessionStatus;
  currentWave: 1 | 2;
  currentWaveDeadline:
    string | null;
  automatedDeadlineAt:
    string | null;
  selectedCaregiverId:
    string | null;
  presentedCaregivers:
    CustomerPresentedCaregiver[];
  customerMessage:
    string | null;
};

export type BookingFinalizationResult = {
  paid: boolean;
  persisted: boolean;
  status?: string;
  paymentIntentId?: string;
  amount?: number;
  currency?: string;
  visitId?: string;
  visitPublicId?: string;
  paymentId?: string;
  paymentStatus?: string;
  visitStatus?: string;
  alreadyFinalized?: boolean;
};

/*
 * ============================================================
 * RECOVER LATEST ACTIVE MATCHING SESSION FOR SIGNED-IN CUSTOMER
 * ============================================================
 *
 * Used when local bookingDraft/matchingSessionId is missing.
 * The database remains the source of truth.
 */
export async function recoverMyLatestMatchingSession() {
  const {
    data,
    error,
  } =
    await customerSupabase.rpc(
      "get_my_latest_matching_session"
    );

  if (error) {
    return {
      success:
        false as const,
      error:
        error.message,
    };
  }

  const payload =
    data as any;

  if (
    !payload ||
    payload.success ===
      false ||
    !payload.session_id
  ) {
    return {
      success:
        false as const,
      error:
        payload?.message ||
        "No active caregiver search was found.",
    };
  }

  return {
    success:
      true as const,
    sessionId:
      String(
        payload.session_id
      ),
    status:
      payload.status as
        CustomerMatchSessionStatus,
  };
}

export async function loadCustomerMatchStatus(
  sessionId: string
) {
  const cleanSessionId =
    sessionId.trim();

  if (!cleanSessionId) {
    return {
      success:
        false as const,
      error:
        "Missing matching session.",
    };
  }

  const {
    data,
    error,
  } =
    await customerSupabase.rpc(
      "get_customer_match_status",
      {
        p_session_id:
          cleanSessionId,
      }
    );

  if (error) {
    return {
      success:
        false as const,
      error:
        error.message,
    };
  }

  const payload =
    data as any;

  if (
    !payload ||
    payload.success ===
      false
  ) {
    return {
      success:
        false as const,
      error:
        payload?.message ||
        "Unable to load your caregiver match.",
    };
  }

  return {
    success:
      true as const,

    match: {
      sessionId:
        payload.session_id,

      status:
        payload.status,

      currentWave:
        payload.current_wave,

      currentWaveDeadline:
        payload.current_wave_deadline,

      automatedDeadlineAt:
        payload.automated_deadline_at,

      selectedCaregiverId:
        payload.selected_caregiver_id,

      presentedCaregivers:
        payload.presented_caregivers ||
        [],

      customerMessage:
        payload.customer_message,
    } as CustomerMatchStatus,
  };
}

export async function selectPresentedCaregiver(
  sessionId: string,
  caregiverId: string
) {
  const {
    data,
    error,
  } =
    await customerSupabase.rpc(
      "customer_select_presented_caregiver",
      {
        p_session_id:
          sessionId,

        p_caregiver_id:
          caregiverId,
      }
    );

  if (error) {
    return {
      success:
        false as const,
      error:
        error.message,
    };
  }

  const payload =
    data as any;

  if (
    !payload ||
    payload.success ===
      false
  ) {
    return {
      success:
        false as const,
      error:
        payload?.message ||
        "This caregiver is no longer available.",
    };
  }

  return {
    success:
      true as const,
    result:
      payload,
  };
}

export async function declinePresentedCaregivers(
  sessionId: string
) {
  const {
    data,
    error,
  } =
    await customerSupabase.rpc(
      "customer_decline_presented_caregivers",
      {
        p_session_id:
          sessionId,
      }
    );

  if (error) {
    return {
      success:
        false as const,
      error:
        error.message,
    };
  }

  const payload =
    data as any;

  if (
    !payload ||
    payload.success ===
      false
  ) {
    return {
      success:
        false as const,
      error:
        payload?.message ||
        "Unable to continue matching.",
    };
  }

  return {
    success:
      true as const,
    result:
      payload,
  };
}

export async function finalizeSelectedCaregiverBooking(
  sessionId: string
) {
  const cleanSessionId =
    sessionId.trim();

  if (!cleanSessionId) {
    return {
      success:
        false as const,
      error:
        "Missing matching session.",
    };
  }

  const {
    data: {
      session,
    },
    error:
      sessionError,
  } =
    await customerSupabase
      .auth
      .getSession();

  if (
    sessionError ||
    !session?.access_token
  ) {
    return {
      success:
        false as const,
      error:
        "Sign in again to confirm this booking.",
    };
  }

  try {
    const response =
      await fetch(
        "/api/stripe/charge-booking",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${session.access_token}`,
          },

          body:
            JSON.stringify({
              offerSessionId:
                cleanSessionId,
            }),
        }
      );

    const payload =
      (await response.json()) as
        Partial<BookingFinalizationResult> & {
          error?: string;
          actionRequired?: boolean;
        };

    if (
      payload.paid ===
        true &&
      payload.persisted !==
        true
    ) {
      return {
        success:
          false as const,
        paymentSucceeded:
          true as const,
        error:
          payload.error ||
          "Payment succeeded, but booking confirmation needs to be retried.",
        result:
          payload,
      };
    }

    if (
      !response.ok ||
      payload.paid !==
        true ||
      payload.persisted !==
        true
    ) {
      return {
        success:
          false as const,
        paymentSucceeded:
          false as const,
        actionRequired:
          Boolean(
            payload.actionRequired
          ),
        error:
          payload.error ||
          "The booking could not be confirmed.",
        result:
          payload,
      };
    }

    return {
      success:
        true as const,
      result:
        payload as
          BookingFinalizationResult,
    };
  } catch (error) {
    console.error(
      "Unable to finalize selected caregiver booking:",
      error
    );

    return {
      success:
        false as const,
      paymentSucceeded:
        false as const,
      error:
        error instanceof
          Error
          ? error.message
          : "The booking could not be confirmed.",
    };
  }
}

export function getMinutesRemaining(
  deadline: string | null,
  now = Date.now()
) {
  if (!deadline) {
    return null;
  }

  const end =
    new Date(
      deadline
    ).getTime();

  if (
    !Number.isFinite(
      end
    )
  ) {
    return null;
  }

  return Math.max(
    0,
    Math.ceil(
      (end - now) /
        60000
    )
  );
}
