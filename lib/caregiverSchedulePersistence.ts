"use client";

import {
  caregiverSupabase,
} from "./supabaseClient";

export type CaregiverScheduleVisitStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export type CaregiverScheduleVisit = {
  id: string;
  publicId: string | null;
  status: CaregiverScheduleVisitStatus;
  startDatetime: string | null;
  endDatetime: string | null;
  clockInAt: string | null;
  clockOutAt: string | null;
  recipientId: string;
  recipientName: string;
  careRequestId: string | null;
  offerSessionId: string | null;
  city: string | null;
  province: string | null;
};

export async function loadMyCaregiverVisitSchedule() {
  const {
    data,
    error,
  } =
    await caregiverSupabase.rpc(
      "get_my_caregiver_visit_schedule"
    );

  if (error) {
    return {
      success: false as const,
      visits: [] as CaregiverScheduleVisit[],
      error: error.message,
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
      visits: [] as CaregiverScheduleVisit[],
      error:
        payload?.message ||
        "Unable to load your visit schedule.",
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
            ): visit is CaregiverScheduleVisit =>
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
): CaregiverScheduleVisit | null {
  if (
    !row.id ||
    !row.status ||
    !row.recipient_id
  ) {
    return null;
  }

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
      row.status as CaregiverScheduleVisitStatus,

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
  };
}
