"use client";

import {
  customerSupabase,
} from "./supabaseClient";

export type CustomerVisitHistoryStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export type CustomerVisitHistoryItem = {
  id: string;
  publicId: string | null;
  status: CustomerVisitHistoryStatus;
  startDatetime: string | null;
  endDatetime: string | null;
  clockInAt: string | null;
  clockOutAt: string | null;
  recipientId: string;
  recipientName: string;
  caregiverId: string | null;
  caregiverNumber: string | null;
  caregiverName: string;
  city: string | null;
  province: string | null;
  paymentStatus: string | null;
  amountPaid: number | null;
  paymentCreatedAt: string | null;
  careRequestId: string | null;
  offerSessionId: string | null;
};

export async function loadMyCustomerVisitHistory() {
  const {
    data,
    error,
  } =
    await customerSupabase.rpc(
      "get_my_customer_visit_history"
    );

  if (
    error
  ) {
    return {
      success: false as const,
      visits: [] as CustomerVisitHistoryItem[],
      error:
        error.message,
    };
  }

  const payload =
    data as {
      success?: boolean;
      message?: string;
      visits?: Array<Record<string, unknown>>;
    } | null;

  if (
    !payload ||
    payload.success === false
  ) {
    return {
      success: false as const,
      visits: [] as CustomerVisitHistoryItem[],
      error:
        payload?.message ||
        "Unable to load your care visits.",
    };
  }

  const visits =
    Array.isArray(
      payload.visits
    )
      ? payload.visits
          .map(
            normalizeVisit
          )
          .filter(
            (
              visit
            ): visit is CustomerVisitHistoryItem =>
              Boolean(
                visit
              )
          )
      : [];

  return {
    success: true as const,
    visits,
  };
}

function normalizeVisit(
  row:
    Record<string, unknown>
): CustomerVisitHistoryItem | null {
  if (
    !row.id ||
    !row.status ||
    !row.recipient_id
  ) {
    return null;
  }

  const rawAmount =
    row.amount_paid;

  const amount =
    rawAmount === null ||
    rawAmount === undefined
      ? null
      : Number(
          rawAmount
        );

  return {
    id:
      String(
        row.id
      ),

    publicId:
      row.public_id
        ? String(
            row.public_id
          )
        : null,

    status:
      row.status as
        CustomerVisitHistoryStatus,

    startDatetime:
      row.start_datetime
        ? String(
            row.start_datetime
          )
        : null,

    endDatetime:
      row.end_datetime
        ? String(
            row.end_datetime
          )
        : null,

    clockInAt:
      row.clock_in_at
        ? String(
            row.clock_in_at
          )
        : null,

    clockOutAt:
      row.clock_out_at
        ? String(
            row.clock_out_at
          )
        : null,

    recipientId:
      String(
        row.recipient_id
      ),

    recipientName:
      String(
        row.recipient_name ||
        "Care recipient"
      ),

    caregiverId:
      row.caregiver_id
        ? String(
            row.caregiver_id
          )
        : null,

    caregiverNumber:
      row.caregiver_number
        ? String(
            row.caregiver_number
          )
        : null,

    caregiverName:
      String(
        row.caregiver_name ||
        "Assigned caregiver"
      ),

    city:
      row.city
        ? String(
            row.city
          )
        : null,

    province:
      row.province
        ? String(
            row.province
          )
        : null,

    paymentStatus:
      row.payment_status
        ? String(
            row.payment_status
          )
        : null,

    amountPaid:
      amount !== null &&
      Number.isFinite(
        amount
      )
        ? amount
        : null,

    paymentCreatedAt:
      row.payment_created_at
        ? String(
            row.payment_created_at
          )
        : null,

    careRequestId:
      row.care_request_id
        ? String(
            row.care_request_id
          )
        : null,

    offerSessionId:
      row.offer_session_id
        ? String(
            row.offer_session_id
          )
        : null,
  };
}
