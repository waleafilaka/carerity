"use client";

import {
  caregiverSupabase,
  customerSupabase,
} from "./supabaseClient";

export type CanonicalDashboardVisit = {
  id: string;
  publicId: string | null;
  status:
    | "scheduled"
    | "in_progress"
    | "completed"
    | "cancelled";
  startDatetime: string;
  endDatetime: string;
  clockInAt: string | null;
  clockOutAt: string | null;
  recipientId: string;
  recipientName: string;
  caregiverId: string | null;
  caregiverNumber: string | null;
  caregiverName: string | null;
  careRequestId: string | null;
  offerSessionId: string | null;
  city: string | null;
  province: string | null;
  paymentStatus: string | null;
  amountPaid: number | null;
  stripePaymentId: string | null;
};

type RpcVisitPayload = {
  success?: boolean;
  message?: string;
  visit?: {
    id?: string;
    public_id?: string | null;
    status?: CanonicalDashboardVisit["status"];
    start_datetime?: string;
    end_datetime?: string;
    clock_in_at?: string | null;
    clock_out_at?: string | null;
    recipient_id?: string;
    recipient_name?: string | null;
    caregiver_id?: string | null;
    caregiver_number?: string | null;
    caregiver_name?: string | null;
    care_request_id?: string | null;
    offer_session_id?: string | null;
    city?: string | null;
    province?: string | null;
    payment_status?: string | null;
    amount_paid?: number | string | null;
    stripe_payment_id?: string | null;
  } | null;
};

export async function loadCustomerCurrentVisit() {
  const {
    data,
    error,
  } =
    await customerSupabase.rpc(
      "get_my_customer_current_visit"
    );

  return normalizeResult(
    data as RpcVisitPayload | null,
    error?.message
  );
}

export async function loadCaregiverCurrentVisit() {
  const {
    data,
    error,
  } =
    await caregiverSupabase.rpc(
      "get_my_caregiver_current_visit"
    );

  return normalizeResult(
    data as RpcVisitPayload | null,
    error?.message
  );
}

function normalizeResult(
  payload: RpcVisitPayload | null,
  rpcError?: string
) {
  if (rpcError) {
    return {
      success: false as const,
      visit: null,
      error: rpcError,
    };
  }

  if (!payload || payload.success === false) {
    return {
      success: false as const,
      visit: null,
      error:
        payload?.message ||
        "Unable to load your visit.",
    };
  }

  if (!payload.visit) {
    return {
      success: true as const,
      visit: null,
    };
  }

  const row =
    payload.visit;

  if (
    !row.id ||
    !row.status ||
    !row.start_datetime ||
    !row.end_datetime ||
    !row.recipient_id
  ) {
    return {
      success: false as const,
      visit: null,
      error:
        "The visit record is incomplete.",
    };
  }

  const amount =
    row.amount_paid === null ||
    row.amount_paid === undefined
      ? null
      : Number(
          row.amount_paid
        );

  const visit:
    CanonicalDashboardVisit = {
    id:
      row.id,

    publicId:
      row.public_id ||
      null,

    status:
      row.status,

    startDatetime:
      row.start_datetime,

    endDatetime:
      row.end_datetime,

    clockInAt:
      row.clock_in_at ||
      null,

    clockOutAt:
      row.clock_out_at ||
      null,

    recipientId:
      row.recipient_id,

    recipientName:
      row.recipient_name?.trim() ||
      "Care recipient",

    caregiverId:
      row.caregiver_id ||
      null,

    caregiverNumber:
      row.caregiver_number ||
      null,

    caregiverName:
      row.caregiver_name?.trim() ||
      null,

    careRequestId:
      row.care_request_id ||
      null,

    offerSessionId:
      row.offer_session_id ||
      null,

    city:
      row.city ||
      null,

    province:
      row.province ||
      null,

    paymentStatus:
      row.payment_status ||
      null,

    amountPaid:
      Number.isFinite(
        amount
      )
        ? amount
        : null,

    stripePaymentId:
      row.stripe_payment_id ||
      null,
  };

  return {
    success: true as const,
    visit,
  };
}

