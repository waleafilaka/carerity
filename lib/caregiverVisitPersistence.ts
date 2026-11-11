"use client";

import {
  caregiverSupabase,
} from "./supabaseClient";

export type ActiveVisitStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export type ActiveVisitNote = {
  id: string;
  noteText: string;
  createdAt: string | null;
};

export type ActiveCaregiverVisit = {
  id: string;
  publicId: string | null;
  status: ActiveVisitStatus;
  startDatetime: string | null;
  endDatetime: string | null;
  clockInAt: string | null;
  clockOutAt: string | null;
  recipientId: string;
  recipientName: string;
  caregiverId: string;
  careRequestId: string | null;
  offerSessionId: string | null;
  city: string | null;
  province: string | null;
  notes: ActiveVisitNote[];
};

type RpcEnvelope = {
  success?: boolean;
  message?: string;
  visit?: Record<string, any> | null;
  note?: Record<string, any> | null;
  status?: ActiveVisitStatus;
  clock_in_at?: string | null;
  clock_out_at?: string | null;
  already_checked_in?: boolean;
  already_completed?: boolean;
  note_count?: number;
};

export async function loadMyCaregiverVisit(
  visitId: string
) {
  const cleanVisitId =
    visitId.trim();

  if (!cleanVisitId) {
    return {
      success: false as const,
      visit: null,
      error: "Missing visit.",
    };
  }

  const {
    data,
    error,
  } =
    await caregiverSupabase.rpc(
      "get_my_caregiver_visit",
      {
        p_visit_id:
          cleanVisitId,
      }
    );

  if (error) {
    return {
      success: false as const,
      visit: null,
      error: error.message,
    };
  }

  const payload =
    data as RpcEnvelope | null;

  if (
    !payload ||
    payload.success === false ||
    !payload.visit
  ) {
    return {
      success: false as const,
      visit: null,
      error:
        payload?.message ||
        "Unable to load this visit.",
    };
  }

  const visit =
    normalizeVisit(
      payload.visit
    );

  if (!visit) {
    return {
      success: false as const,
      visit: null,
      error:
        "The visit record is incomplete.",
    };
  }

  return {
    success: true as const,
    visit,
  };
}

export async function clockInMyCaregiverVisit(
  visitId: string,
  location?: {
    latitude?: number | null;
    longitude?: number | null;
  }
) {
  const {
    data,
    error,
  } =
    await caregiverSupabase.rpc(
      "caregiver_clock_in_visit",
      {
        p_visit_id:
          visitId,
        p_latitude:
          location?.latitude ??
          null,
        p_longitude:
          location?.longitude ??
          null,
      }
    );

  return normalizeActionResult(
    data,
    error?.message
  );
}

export async function addMyCaregiverVisitNote(
  visitId: string,
  noteText: string
) {
  const {
    data,
    error,
  } =
    await caregiverSupabase.rpc(
      "add_my_caregiver_visit_note",
      {
        p_visit_id:
          visitId,
        p_note_text:
          noteText,
      }
    );

  if (error) {
    return {
      success: false as const,
      error: error.message,
    };
  }

  const payload =
    data as RpcEnvelope | null;

  if (
    !payload ||
    payload.success === false
  ) {
    return {
      success: false as const,
      error:
        payload?.message ||
        "Unable to save the care note.",
    };
  }

  const note =
    payload.note
      ? normalizeNote(
          payload.note
        )
      : null;

  return {
    success: true as const,
    note,
  };
}

export async function completeMyCaregiverVisit(
  visitId: string,
  location?: {
    latitude?: number | null;
    longitude?: number | null;
  }
) {
  const {
    data,
    error,
  } =
    await caregiverSupabase.rpc(
      "caregiver_complete_visit",
      {
        p_visit_id:
          visitId,
        p_latitude:
          location?.latitude ??
          null,
        p_longitude:
          location?.longitude ??
          null,
      }
    );

  return normalizeActionResult(
    data,
    error?.message
  );
}

function normalizeActionResult(
  data: unknown,
  rpcError?: string
) {
  if (rpcError) {
    return {
      success: false as const,
      error: rpcError,
    };
  }

  const payload =
    data as RpcEnvelope | null;

  if (
    !payload ||
    payload.success === false
  ) {
    return {
      success: false as const,
      error:
        payload?.message ||
        "The visit could not be updated.",
    };
  }

  return {
    success: true as const,
    result: payload,
  };
}

function normalizeVisit(
  row: Record<string, any>
): ActiveCaregiverVisit | null {
  if (
    !row.id ||
    !row.status ||
    !row.recipient_id ||
    !row.caregiver_id
  ) {
    return null;
  }

  const rawNotes =
    Array.isArray(
      row.notes
    )
      ? row.notes
      : [];

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
        ActiveVisitStatus,

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
      String(
        row.caregiver_id
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

    notes:
      rawNotes
        .map(
          (
            note
          ) =>
            normalizeNote(
              note
            )
        )
        .filter(
          (
            note
          ): note is ActiveVisitNote =>
            Boolean(
              note
            )
        ),
  };
}

function normalizeNote(
  row: Record<string, any>
): ActiveVisitNote | null {
  if (
    !row.id ||
    !row.note_text
  ) {
    return null;
  }

  return {
    id:
      String(
        row.id
      ),

    noteText:
      String(
        row.note_text
      ),

    createdAt:
      row.created_at
        ? String(
            row.created_at
          )
        : null,
  };
}