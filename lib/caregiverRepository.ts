import { supabase } from "./supabaseClient";

export type CaregiverDatabaseRecord = {
  id: string;
  user_id: string;
  caregiver_number: string | null;
  application_status:
    | "draft"
    | "submitted"
    | "under_review"
    | "approved"
    | "needs_attention"
    | "declined"
    | null;
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
  address?: string | null;
  unit?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  google_place_id?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  authorized_to_work_in_canada?: boolean | null;
  available_for_work?: boolean | null;
  service_radius_km?: number | null;
  can_drive?: boolean | null;
  owns_vehicle?: boolean | null;
  willing_to_transport_client?: boolean | null;
  accepts_live_out?: boolean | null;
  accepts_live_in?: boolean | null;
  accepts_overnight?: boolean | null;
  submitted_at?: string | null;
  created_at?: string | null;
  last_updated_at?: string | null;
};

export type CaregiverRepositoryResult<T> = {
  data: T | null;
  error: string | null;
};

export async function getAuthenticatedCaregiverUser() {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      return {
        data: null,
        error: error.message,
      };
    }

    if (!user) {
      return {
        data: null,
        error: "No signed-in caregiver account was found.",
      };
    }

    const role = user.user_metadata?.role;

    if (role !== "caregiver") {
      return {
        data: null,
        error: "The signed-in account is not a caregiver account.",
      };
    }

    return {
      data: user,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: getErrorMessage(
        error,
        "Unable to load the caregiver account."
      ),
    };
  }
}

export async function getCurrentCaregiverRecord(): Promise<
  CaregiverRepositoryResult<CaregiverDatabaseRecord>
> {
  try {
    const authResult = await getAuthenticatedCaregiverUser();

    if (!authResult.data) {
      return {
        data: null,
        error: authResult.error,
      };
    }

    const user = authResult.data;

    const { data, error } = await supabase
      .from("caregivers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return {
        data: null,
        error: error.message,
      };
    }

    if (!data) {
      return {
        data: null,
        error: "No caregiver profile exists for this account yet.",
      };
    }

    return {
      data: data as CaregiverDatabaseRecord,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: getErrorMessage(
        error,
        "Unable to load the caregiver profile."
      ),
    };
  }
}

export async function ensureCurrentCaregiverRecord(): Promise<
  CaregiverRepositoryResult<CaregiverDatabaseRecord>
> {
  try {
    const authResult = await getAuthenticatedCaregiverUser();

    if (!authResult.data) {
      return {
        data: null,
        error: authResult.error,
      };
    }

    const user = authResult.data;

    const existing = await getCurrentCaregiverRecord();

    if (existing.data) {
      return existing;
    }

    const metadata = user.user_metadata || {};

    const firstName =
      typeof metadata.first_name === "string"
        ? metadata.first_name.trim()
        : null;

    const lastName =
      typeof metadata.last_name === "string"
        ? metadata.last_name.trim()
        : null;

    const phone =
      typeof metadata.phone === "string"
        ? metadata.phone.trim()
        : null;

    const { data, error } = await supabase
      .from("caregivers")
      .insert({
        user_id: user.id,
        application_status: "draft",
        first_name: firstName,
        last_name: lastName,
        phone,
      })
      .select("*")
      .single();

    if (error) {
      return {
        data: null,
        error: error.message,
      };
    }

    return {
      data: data as CaregiverDatabaseRecord,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: getErrorMessage(
        error,
        "Unable to create the caregiver profile."
      ),
    };
  }
}

export async function updateCurrentCaregiver(
  update: Partial<CaregiverDatabaseRecord>
): Promise<
  CaregiverRepositoryResult<CaregiverDatabaseRecord>
> {
  try {
    const authResult = await getAuthenticatedCaregiverUser();

    if (!authResult.data) {
      return {
        data: null,
        error: authResult.error,
      };
    }

    const user = authResult.data;

    const safeUpdate = removeProtectedFields(update);

    const { data, error } = await supabase
      .from("caregivers")
      .update({
        ...safeUpdate,
        last_updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      return {
        data: null,
        error: error.message,
      };
    }

    return {
      data: data as CaregiverDatabaseRecord,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: getErrorMessage(
        error,
        "Unable to update the caregiver profile."
      ),
    };
  }
}

export async function setCaregiverApplicationStatus(
  status:
    | "draft"
    | "submitted"
    | "under_review"
    | "approved"
    | "needs_attention"
    | "declined"
): Promise<
  CaregiverRepositoryResult<CaregiverDatabaseRecord>
> {
  const update: Partial<CaregiverDatabaseRecord> = {
    application_status: status,
  };

  if (status === "submitted") {
    update.submitted_at = new Date().toISOString();
  }

  return updateCurrentCaregiver(update);
}

export async function getCaregiverNumber(): Promise<
  CaregiverRepositoryResult<string>
> {
  const caregiver = await getCurrentCaregiverRecord();

  if (!caregiver.data) {
    return {
      data: null,
      error: caregiver.error,
    };
  }

  if (!caregiver.data.caregiver_number) {
    return {
      data: null,
      error: "Caregiver number has not been generated yet.",
    };
  }

  return {
    data: caregiver.data.caregiver_number,
    error: null,
  };
}

function removeProtectedFields(
  update: Partial<CaregiverDatabaseRecord>
) {
  const {
    id: _id,
    user_id: _userId,
    caregiver_number: _caregiverNumber,
    created_at: _createdAt,
    ...allowedFields
  } = update;

  return allowedFields;
}

function getErrorMessage(
  error: unknown,
  fallback: string
) {
  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    const message = (
      error as {
        message?: unknown;
      }
    ).message;

    if (
      typeof message === "string" &&
      message.trim()
    ) {
      return message;
    }
  }

  if (typeof error === "string") {
    return error;
  }

  return fallback;
}
