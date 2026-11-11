

import {
    customerSupabase,
  } from "./supabaseClient";
  
  export type CustomerCareTimelineEvent = {
    id: string;
    eventType: string;
    description: string;
    createdAt: string | null;
  };
  
  export type CustomerCareVisitNote = {
    id: string;
    noteText: string;
    createdAt: string | null;
  };
  
  export type CustomerCareVisitRecord = {
    id: string;
    publicId: string | null;
    status:
      | "scheduled"
      | "in_progress"
      | "completed"
      | "cancelled";
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
    careRequestId: string | null;
    offerSessionId: string | null;
    paymentStatus: string | null;
    amountPaid: number | null;
    stripePaymentId: string | null;
  };
  
  export async function loadMyCustomerVisitRecord(
    visitId: string
  ) {
    const cleanVisitId =
      visitId.trim();
  
    if (
      !cleanVisitId
    ) {
      return {
        success: false as const,
        record: null,
        timeline: [] as CustomerCareTimelineEvent[],
        notes: [] as CustomerCareVisitNote[],
        error:
          "Missing visit.",
      };
    }
  
    const {
      data,
      error,
    } =
      await customerSupabase.rpc(
        "get_my_customer_visit_record",
        {
          p_visit_id:
            cleanVisitId,
        }
      );
  
    if (
      error
    ) {
      return {
        success: false as const,
        record: null,
        timeline: [] as CustomerCareTimelineEvent[],
        notes: [] as CustomerCareVisitNote[],
        error:
          error.message,
      };
    }
  
    const payload =
      data as {
        success?: boolean;
        message?: string;
        visit?: Record<string, unknown> | null;
        timeline?: Array<Record<string, unknown>>;
        notes?: Array<Record<string, unknown>>;
      } | null;
  
    if (
      !payload ||
      payload.success === false ||
      !payload.visit
    ) {
      return {
        success: false as const,
        record: null,
        timeline: [] as CustomerCareTimelineEvent[],
        notes: [] as CustomerCareVisitNote[],
        error:
          payload?.message ||
          "Unable to load this care visit.",
      };
    }
  
    const record =
      normalizeRecord(
        payload.visit
      );
  
    if (
      !record
    ) {
      return {
        success: false as const,
        record: null,
        timeline: [] as CustomerCareTimelineEvent[],
        notes: [] as CustomerCareVisitNote[],
        error:
          "The care visit record is incomplete.",
      };
    }
  
    const timeline =
      Array.isArray(
        payload.timeline
      )
        ? payload.timeline
            .map(
              normalizeTimelineEvent
            )
            .filter(
              (
                event
              ): event is CustomerCareTimelineEvent =>
                Boolean(
                  event
                )
            )
        : [];
  
    const notes =
      Array.isArray(
        payload.notes
      )
        ? payload.notes
            .map(
              normalizeNote
            )
            .filter(
              (
                note
              ): note is CustomerCareVisitNote =>
                Boolean(
                  note
                )
            )
        : [];
  
    return {
      success: true as const,
      record,
      timeline,
      notes,
    };
  }
  
  function normalizeRecord(
    row:
      Record<string, unknown>
  ): CustomerCareVisitRecord | null {
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
          CustomerCareVisitRecord["status"],
  
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
  
      stripePaymentId:
        row.stripe_payment_id
          ? String(
              row.stripe_payment_id
            )
          : null,
    };
  }
  
  function normalizeTimelineEvent(
    row:
      Record<string, unknown>
  ): CustomerCareTimelineEvent | null {
    if (
      !row.id ||
      !row.event_type ||
      !row.description
    ) {
      return null;
    }
  
    return {
      id:
        String(
          row.id
        ),
      eventType:
        String(
          row.event_type
        ),
      description:
        String(
          row.description
        ),
      createdAt:
        row.created_at
          ? String(
              row.created_at
            )
          : null,
    };
  }
  
  function normalizeNote(
    row:
      Record<string, unknown>
  ): CustomerCareVisitNote | null {
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
  