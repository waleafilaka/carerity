"use client";

import {
  caregiverSupabase,
} from "./supabaseClient";

export type CareActivityKey =
  | "personal_care"
  | "meal_prepared"
  | "meal_assistance"
  | "medication_reminder"
  | "mobility_assistance"
  | "bath_given"
  | "walk_mobility"
  | "vitals_checked"
  | "laundry_completed"
  | "groceries_errands"
  | "client_comfortable";

export type CareActivity = {
  id: string;
  eventType: string;
  description: string;
  createdAt: string | null;
};

export async function addMyCaregiverCareActivity(
  visitId: string,
  activityKey: CareActivityKey
) {
  const {
    data,
    error,
  } =
    await caregiverSupabase.rpc(
      "add_my_caregiver_care_activity",
      {
        p_visit_id:
          visitId,
        p_activity_key:
          activityKey,
      }
    );

  if (error) {
    return {
      success: false as const,
      error: error.message,
    };
  }

  const payload =
    data as {
      success?: boolean;
      message?: string;
      activity?: {
        id?: string;
        event_type?: string;
        description?: string;
        created_at?: string | null;
      };
    } | null;

  if (
    !payload ||
    payload.success === false ||
    !payload.activity?.id ||
    !payload.activity.description
  ) {
    return {
      success: false as const,
      error:
        payload?.message ||
        "Unable to save this care activity.",
    };
  }

  return {
    success: true as const,
    activity: {
      id:
        payload.activity.id,
      eventType:
        payload.activity.event_type ||
        activityKey,
      description:
        payload.activity.description,
      createdAt:
        payload.activity.created_at ||
        null,
    } satisfies CareActivity,
  };
}

export async function loadMyCaregiverVisitActivities(
  visitId: string
) {
  const {
    data,
    error,
  } =
    await caregiverSupabase.rpc(
      "get_my_caregiver_visit_activities",
      {
        p_visit_id:
          visitId,
      }
    );

  if (error) {
    return {
      success: false as const,
      activities: [] as CareActivity[],
      error: error.message,
    };
  }

  const payload =
    data as {
      success?: boolean;
      message?: string;
      activities?: Array<{
        id?: string;
        event_type?: string;
        description?: string;
        created_at?: string | null;
      }>;
    } | null;

  if (
    !payload ||
    payload.success === false
  ) {
    return {
      success: false as const,
      activities: [] as CareActivity[],
      error:
        payload?.message ||
        "Unable to load care activities.",
    };
  }

  const activities =
    Array.isArray(
      payload.activities
    )
      ? payload.activities
          .filter(
            (
              item
            ) =>
              Boolean(
                item.id &&
                item.description
              )
          )
          .map(
            (
              item
            ) => ({
              id:
                String(
                  item.id
                ),
              eventType:
                String(
                  item.event_type ||
                  ""
                ),
              description:
                String(
                  item.description
                ),
              createdAt:
                item.created_at
                  ? String(
                      item.created_at
                    )
                  : null,
            })
          )
      : [];

  return {
    success: true as const,
    activities,
  };
}
