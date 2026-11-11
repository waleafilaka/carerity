import {
  CaregiverApplicationStatus,
  CaregiverOnboardingDraft,
  CaregiverOnboardingSection,
  clearActiveCaregiverDraftUserId,
  getCaregiverApplicationProgress,
  getCaregiverOnboardingDraft,
  refreshCaregiverCompletionFlags,
  removeLegacyCaregiverDraftCache,
  saveCaregiverOnboardingDraft,
  setActiveCaregiverDraftUserId,
} from "./caregiverOnboardingDraft";

import {
  caregiverSupabase,
  customerSupabase,
} from "./supabaseClient";

const supabase = caregiverSupabase;

export type CaregiverPersistenceResult = {
  success: boolean;
  authenticated: boolean;
  draft: CaregiverOnboardingDraft;
  caregiverId?: string;
  caregiverNumber?: string;
  userId?: string;
  error?: string;
};

export type CareritySignOutRole =
  | "caregiver"
  | "customer";

export type CareritySignOutResult = {
  success: boolean;
  redirectTo: string;
  error?: string;
};

export type CaregiverSubmissionResult =
  CaregiverPersistenceResult & {
    submittedAt?: string;
  };

type AuthenticatedCaregiverResult =
  | {
      authenticated: true;
      userId: string;
      email?: string;
      caregiverId: string;
      caregiverNumber?: string;
      applicationStatus?: CaregiverApplicationStatus;
    }
  | {
      authenticated: false;
      error: string;
    };

/*
 * ============================================================
 * APPROVED CAREGIVER EDIT POLICY
 * ============================================================
 *
 * Approval protects the verified application, but it must NOT
 * permanently freeze the caregiver's working profile.
 *
 * Approved caregivers may maintain:
 * - profile photo
 * - address / verified coordinates
 * - emergency contact
 * - experience / qualifications / languages
 * - work preferences and available-for-work switch
 * - weekly availability / temporary time off
 * - documents
 * - professional memberships / insurance
 *
 * Verified identity facts remain protected:
 * - legal name
 * - date of birth
 * - sex
 * - work-eligibility declaration
 * - application status / submission metadata
 *
 * Background screening remains admin/system controlled.
 * ============================================================
 */

const APPROVED_EDITABLE_SECTIONS =
  new Set<CaregiverOnboardingSection>([
    "profile",
    "experience",
    "preferences",
    "availability",
    "credentials",
    "professional",
  ]);

const APPROVED_PROFILE_KEYS = [
  "profilePhoto",
  "address",
  "unit",
  "city",
  "province",
  "country",
  "postalCode",
  "latitude",
  "longitude",
  "googlePlaceId",
  "emergencyContactName",
  "emergencyContactPhone",
  "emergencyContactRelationship",
] as const;

const APPROVED_EXPERIENCE_KEYS = [
  "qualificationType",
  "qualificationTypes",
  "qualificationOther",
  "yearsExperience",
  "experienceCategories",
  "otherExperienceCategory",
  "languages",
] as const;

const APPROVED_PREFERENCES_KEYS = [
  "availableForWork",
  "canDrive",
  "ownsVehicle",
  "willingToTransportClient",
  "acceptsLiveOut",
  "acceptsLiveIn",
  "acceptsOvernight",
] as const;

const APPROVED_AVAILABILITY_KEYS = [
  "weeklyAvailability",
  "temporaryTimeOffStart",
  "temporaryTimeOffEnd",
  "temporaryTimeOffNote",
] as const;

const APPROVED_CREDENTIAL_KEYS = [
  "governmentId",
  "workEligibility",
  "qualification",
  "qualificationDocuments",
  "vulnerableSectorCheck",
  "resume",
  "cprFirstAid",
  "tbEvidence",
  "tbStatus",
  "tbTestDate",
  "covid19VaccinationEvidence",
  "vaccinationInfoProvided",
  "vaccinationNotes",
] as const;

const APPROVED_PROFESSIONAL_KEYS = [
  "hscpoaMember",
  "hscpoaNumber",
  "opswaMember",
  "opswaMemberId",
  "liabilityInsurance",
  "liabilityInsuranceProvider",
  "liabilityInsurancePolicyNumber",
  "liabilityInsuranceExpiry",
] as const;

async function getAuthenticatedCaregiver():
  Promise<AuthenticatedCaregiverResult> {
  try {
    const {
      data: {
        session,
      },
      error: sessionError,
    } =
      await supabase.auth.getSession();

    if (sessionError) {
      return {
        authenticated: false,
        error: getErrorMessage(
          sessionError,
          "Unable to check your caregiver session."
        ),
      };
    }

    if (!session?.user) {
      clearActiveCaregiverDraftUserId();

      return {
        authenticated: false,
        error:
          "You must be signed in as a caregiver.",
      };
    }

    const {
      data: {
        user,
      },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      clearActiveCaregiverDraftUserId();

      return {
        authenticated: false,
        error: getErrorMessage(
          userError,
          "Your caregiver session is no longer valid."
        ),
      };
    }

    const {
      data: caregiver,
      error: caregiverError,
    } =
      await supabase
        .from("caregivers")
        .select(
          "id, caregiver_number, application_status"
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (caregiverError) {
      return {
        authenticated: false,
        error: getErrorMessage(
          caregiverError,
          "Unable to verify your caregiver profile."
        ),
      };
    }

    if (!caregiver) {
      clearActiveCaregiverDraftUserId();

      return {
        authenticated: false,
        error:
          "This signed-in account does not have a caregiver profile.",
      };
    }

    setActiveCaregiverDraftUserId(
      user.id
    );

    removeLegacyCaregiverDraftCache();

    return {
      authenticated: true,
      userId:
        user.id,
      email:
        user.email ||
        undefined,
      caregiverId:
        caregiver.id,
      caregiverNumber:
        caregiver.caregiver_number ||
        undefined,
      applicationStatus:
        normalizeApplicationStatus(
          caregiver.application_status
        ),
    };
  } catch (error) {
    return {
      authenticated: false,
      error: getErrorMessage(
        error,
        "Unable to verify your caregiver session."
      ),
    };
  }
}

export async function loadCaregiverOnboardingDraftFromSupabase(): Promise<
  CaregiverPersistenceResult
> {
  const auth =
    await getAuthenticatedCaregiver();

  if (
    !auth.authenticated
  ) {
    return {
      success: false,
      authenticated: false,
      draft: {},
      error:
        auth.error,
    };
  }

  const userId =
    auth.userId;

  const localDraft =
    getCaregiverOnboardingDraft(
      userId
    );

  try {
    const {
      data: databaseDraft,
      error: draftError,
    } =
      await supabase
        .from(
          "caregiver_onboarding_drafts"
        )
        .select(
          "draft_data, application_status, current_section, updated_at"
        )
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();

    if (draftError) {
      throw draftError;
    }

    if (!databaseDraft) {
      const applicationStatus =
        auth.applicationStatus ||
        localDraft.applicationStatus ||
        "draft";

      const refreshed =
        refreshCaregiverCompletionFlags({
          ...localDraft,

          email:
            localDraft.email ||
            auth.email,

          applicationStatus,
        });

      saveCaregiverOnboardingDraft(
        refreshed,
        userId
      );

      return {
        success: true,
        authenticated: true,
        draft:
          refreshed,
        caregiverId:
          auth.caregiverId,
        caregiverNumber:
          auth.caregiverNumber,
        userId,
      };
    }

    const remoteDraft =
      isRecord(
        databaseDraft.draft_data
      )
        ? (
            databaseDraft.draft_data as
              CaregiverOnboardingDraft
          )
        : {};

    const applicationStatus =
      auth.applicationStatus ||
      normalizeApplicationStatus(
        databaseDraft.application_status
      ) ||
      remoteDraft.applicationStatus ||
      localDraft.applicationStatus ||
      "draft";

    const mergedDraft:
      CaregiverOnboardingDraft = {
      ...localDraft,
      ...remoteDraft,

      email:
        remoteDraft.email ||
        auth.email ||
        localDraft.email,

      applicationStatus,

      lastUpdatedAt:
        typeof databaseDraft.updated_at ===
        "string"
          ? databaseDraft.updated_at
          : remoteDraft.lastUpdatedAt ||
            localDraft.lastUpdatedAt,
    };

    const refreshed =
      refreshCaregiverCompletionFlags(
        mergedDraft
      );

    saveCaregiverOnboardingDraft(
      refreshed,
      userId
    );

    if (
      normalizeApplicationStatus(
        databaseDraft.application_status
      ) !==
      applicationStatus
    ) {
      const {
        error: repairError,
      } =
        await supabase
          .from(
            "caregiver_onboarding_drafts"
          )
          .update({
            application_status:
              applicationStatus,
            draft_data: {
              ...remoteDraft,
              applicationStatus,
            },
          })
          .eq(
            "user_id",
            userId
          );

      if (repairError) {
        console.error(
          "Unable to synchronize onboarding application status:",
          repairError
        );
      }
    }

    return {
      success: true,
      authenticated: true,
      draft:
        refreshed,
      caregiverId:
        auth.caregiverId,
      caregiverNumber:
        auth.caregiverNumber,
      userId,
    };
  } catch (error) {
    console.error(
      "Unable to load caregiver onboarding draft from Supabase:",
      error
    );

    return {
      success: false,
      authenticated: true,
      draft:
        localDraft,
      caregiverId:
        auth.caregiverId,
      caregiverNumber:
        auth.caregiverNumber,
      userId,
      error: getErrorMessage(
        error,
        "Unable to load your saved caregiver application."
      ),
    };
  }
}

export async function saveCaregiverOnboardingToSupabase(
  section:
    CaregiverOnboardingSection,
  update:
    Partial<CaregiverOnboardingDraft>
): Promise<CaregiverPersistenceResult> {
  const auth =
    await getAuthenticatedCaregiver();

  if (
    !auth.authenticated
  ) {
    return {
      success: false,
      authenticated: false,
      draft: {},
      error:
        "Your session has expired. Sign in again to save this application online.",
    };
  }

  const userId =
    auth.userId;

  const currentResult =
    await loadCaregiverOnboardingDraftFromSupabase();

  const existing =
    currentResult.authenticated
      ? currentResult.draft
      : getCaregiverOnboardingDraft(
          userId
        );

  const authoritativeStatus =
    auth.applicationStatus ||
    existing.applicationStatus ||
    "draft";

  if (
    authoritativeStatus ===
      "submitted" ||
    authoritativeStatus ===
      "under_review" ||
    authoritativeStatus ===
      "declined"
  ) {
    const protectedDraft =
      refreshCaregiverCompletionFlags({
        ...existing,
        applicationStatus:
          authoritativeStatus,
      });

    saveCaregiverOnboardingDraft(
      protectedDraft,
      userId
    );

    return {
      success: false,
      authenticated: true,
      draft:
        protectedDraft,
      caregiverId:
        auth.caregiverId,
      caregiverNumber:
        auth.caregiverNumber,
      userId,
      error:
        "This application is currently read-only.",
    };
  }

  let safeUpdate =
    update;

  if (
    authoritativeStatus ===
    "approved"
  ) {
    if (
      !APPROVED_EDITABLE_SECTIONS.has(
        section
      )
    ) {
      const protectedDraft =
        refreshCaregiverCompletionFlags({
          ...existing,
          applicationStatus:
            "approved",
        });

      saveCaregiverOnboardingDraft(
        protectedDraft,
        userId
      );

      return {
        success: false,
        authenticated: true,
        draft:
          protectedDraft,
        caregiverId:
          auth.caregiverId,
        caregiverNumber:
          auth.caregiverNumber,
        userId,
        error:
          "This part of your approved application is managed by Carerity.",
      };
    }

    safeUpdate =
      filterApprovedUpdate(
        section,
        update
      );
  }

  const refreshed =
    refreshCaregiverCompletionFlags({
      ...existing,
      ...safeUpdate,

      email:
        existing.email ||
        auth.email,

      applicationStatus:
        authoritativeStatus,

      submittedAt:
        existing.submittedAt,
    });

  saveCaregiverOnboardingDraft(
    refreshed,
    userId
  );

  try {
    const {
      data: existingRow,
      error: existingRowError,
    } =
      await supabase
        .from(
          "caregiver_onboarding_drafts"
        )
        .select("id")
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();

    if (existingRowError) {
      throw existingRowError;
    }

    const payload = {
      caregiver_id:
        auth.caregiverId,

      application_status:
        authoritativeStatus,

      current_section:
        section,

      draft_data:
        refreshed,
    };

    if (existingRow) {
      const {
        error: updateError,
      } =
        await supabase
          .from(
            "caregiver_onboarding_drafts"
          )
          .update(
            payload
          )
          .eq(
            "id",
            existingRow.id
          );

      if (updateError) {
        throw updateError;
      }
    } else {
      const {
        error: insertError,
      } =
        await supabase
          .from(
            "caregiver_onboarding_drafts"
          )
          .insert({
            user_id:
              userId,
            ...payload,
          });

      if (insertError) {
        throw insertError;
      }
    }

    return {
      success: true,
      authenticated: true,
      draft:
        refreshed,
      caregiverId:
        auth.caregiverId,
      caregiverNumber:
        auth.caregiverNumber,
      userId,
    };
  } catch (error) {
    console.error(
      "Unable to save caregiver onboarding draft to Supabase:",
      error
    );

    return {
      success: false,
      authenticated: true,
      draft:
        refreshed,
      caregiverId:
        auth.caregiverId,
      caregiverNumber:
        auth.caregiverNumber,
      userId,
      error: getErrorMessage(
        error,
        "Your information was saved on this device, but we couldn't save it online."
      ),
    };
  }
}

export async function submitCaregiverApplicationToSupabase():
  Promise<CaregiverSubmissionResult> {
  const auth =
    await getAuthenticatedCaregiver();

  if (
    !auth.authenticated
  ) {
    return {
      success: false,
      authenticated: false,
      draft: {},
      error:
        "Your session has expired. Sign in again before submitting your application.",
    };
  }

  const userId =
    auth.userId;

  const existing =
    getCaregiverOnboardingDraft(
      userId
    );

  const refreshed =
    refreshCaregiverCompletionFlags(
      existing
    );

  const currentStatus =
    auth.applicationStatus ||
    refreshed.applicationStatus ||
    "draft";

  if (
    currentStatus ===
    "approved"
  ) {
    const approvedDraft:
      CaregiverOnboardingDraft = {
      ...refreshed,
      applicationStatus:
        "approved",
    };

    saveCaregiverOnboardingDraft(
      approvedDraft,
      userId
    );

    return {
      success: true,
      authenticated: true,
      draft:
        approvedDraft,
      caregiverId:
        auth.caregiverId,
      caregiverNumber:
        auth.caregiverNumber,
      userId,
    };
  }

  if (
    currentStatus ===
      "submitted" ||
    currentStatus ===
      "under_review" ||
    currentStatus ===
      "declined"
  ) {
    return {
      success: false,
      authenticated: true,
      draft: {
        ...refreshed,
        applicationStatus:
          currentStatus,
      },
      caregiverId:
        auth.caregiverId,
      caregiverNumber:
        auth.caregiverNumber,
      userId,
      error:
        "This application is not currently available for resubmission.",
    };
  }

  const progress =
    getCaregiverApplicationProgress(
      refreshed
    );

  if (
    !progress.allComplete
  ) {
    return {
      success: false,
      authenticated: true,
      draft:
        refreshed,
      caregiverId:
        auth.caregiverId,
      caregiverNumber:
        auth.caregiverNumber,
      userId,
      error:
        "Complete all required sections before submitting.",
    };
  }

  try {
    const submittedAt =
      new Date()
        .toISOString();

    const submittedDraft:
      CaregiverOnboardingDraft = {
      ...refreshed,

      email:
        refreshed.email ||
        auth.email,

      applicationStatus:
        "submitted",

      submittedAt,

      lastUpdatedAt:
        submittedAt,
    };

    const {
      data: existingRow,
      error: existingRowError,
    } =
      await supabase
        .from(
          "caregiver_onboarding_drafts"
        )
        .select("id")
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();

    if (existingRowError) {
      throw existingRowError;
    }

    const payload = {
      caregiver_id:
        auth.caregiverId,

      application_status:
        "submitted",

      current_section:
        "background",

      draft_data:
        submittedDraft,
    };

    if (existingRow) {
      const {
        error: updateError,
      } =
        await supabase
          .from(
            "caregiver_onboarding_drafts"
          )
          .update(
            payload
          )
          .eq(
            "id",
            existingRow.id
          );

      if (updateError) {
        throw updateError;
      }
    } else {
      const {
        error: insertError,
      } =
        await supabase
          .from(
            "caregiver_onboarding_drafts"
          )
          .insert({
            user_id:
              userId,
            ...payload,
          });

      if (insertError) {
        throw insertError;
      }
    }

    const {
      error: caregiverUpdateError,
    } =
      await supabase
        .from("caregivers")
        .update({
          application_status:
            "submitted",
        })
        .eq(
          "id",
          auth.caregiverId
        );

    if (caregiverUpdateError) {
      throw caregiverUpdateError;
    }

    saveCaregiverOnboardingDraft(
      submittedDraft,
      userId
    );

    return {
      success: true,
      authenticated: true,
      draft:
        submittedDraft,
      caregiverId:
        auth.caregiverId,
      caregiverNumber:
        auth.caregiverNumber,
      userId,
      submittedAt,
    };
  } catch (error) {
    console.error(
      "Unable to submit caregiver application:",
      error
    );

    return {
      success: false,
      authenticated: true,
      draft:
        refreshed,
      caregiverId:
        auth.caregiverId,
      caregiverNumber:
        auth.caregiverNumber,
      userId,
      error: getErrorMessage(
        error,
        "Unable to submit your application."
      ),
    };
  }
}

export async function loadLatestCaregiverDraft() {
  return loadCaregiverOnboardingDraftFromSupabase();
}

export async function saveCaregiverDraftWithCloud(
  section:
    CaregiverOnboardingSection,
  update:
    Partial<CaregiverOnboardingDraft>
) {
  return saveCaregiverOnboardingToSupabase(
    section,
    update
  );
}

export async function hasActiveCaregiverSession() {
  const auth =
    await getAuthenticatedCaregiver();

  return auth.authenticated;
}

export async function signOutCarerity(
  role:
    CareritySignOutRole = "caregiver",
  email?:
    string
): Promise<CareritySignOutResult> {
  const redirectTo =
    role ===
      "caregiver"
      ? "/caregiver/login"
      : "/login";

  try {
    rememberSignInEmail(
      role,
      email
    );

    const authClient =
      role ===
        "caregiver"
        ? caregiverSupabase
        : customerSupabase;

    const {
      error,
    } =
      await authClient.auth.signOut({
        scope:
          "local",
      });

    if (error) {
      throw error;
    }

    if (
      role ===
      "caregiver"
    ) {
      clearActiveCaregiverDraftUserId();
    }

    return {
      success: true,
      redirectTo,
    };
  } catch (error) {
    console.error(
      "Unable to sign out of Carerity:",
      error
    );

    return {
      success: false,
      redirectTo,
      error: getErrorMessage(
        error,
        "Unable to sign out."
      ),
    };
  }
}

export function getRememberedSignInEmail(
  role:
    CareritySignOutRole
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  try {
    return (
      window.localStorage.getItem(
        getRememberedEmailKey(
          role
        )
      ) ||
      ""
    );
  } catch {
    return "";
  }
}

export function rememberSignInEmail(
  role:
    CareritySignOutRole,
  email?:
    string
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const cleanEmail =
    email
      ?.trim()
      .toLowerCase() ||
    "";

  if (!cleanEmail) {
    return;
  }

  try {
    window.localStorage.setItem(
      getRememberedEmailKey(
        role
      ),
      cleanEmail
    );
  } catch (error) {
    console.error(
      "Unable to remember sign-in email:",
      error
    );
  }
}

export function clearRememberedSignInEmail(
  role:
    CareritySignOutRole
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    window.localStorage.removeItem(
      getRememberedEmailKey(
        role
      )
    );
  } catch (error) {
    console.error(
      "Unable to clear remembered sign-in email:",
      error
    );
  }
}

function getRememberedEmailKey(
  role:
    CareritySignOutRole
) {
  return role ===
    "caregiver"
    ? "carerityRememberedCaregiverEmail"
    : "carerityRememberedCustomerEmail";
}

function filterApprovedUpdate(
  section:
    CaregiverOnboardingSection,
  update:
    Partial<CaregiverOnboardingDraft>
): Partial<CaregiverOnboardingDraft> {
  switch (section) {
    case "profile":
      return pickDraftFields(
        update,
        APPROVED_PROFILE_KEYS
      );

    case "experience":
      return pickDraftFields(
        update,
        APPROVED_EXPERIENCE_KEYS
      );

    case "preferences":
      return pickDraftFields(
        update,
        APPROVED_PREFERENCES_KEYS
      );

    case "availability":
      return pickDraftFields(
        update,
        APPROVED_AVAILABILITY_KEYS
      );

    case "credentials":
      return pickDraftFields(
        update,
        APPROVED_CREDENTIAL_KEYS
      );

    case "professional":
      return pickDraftFields(
        update,
        APPROVED_PROFESSIONAL_KEYS
      );

    default:
      return {};
  }
}

function pickDraftFields(
  source:
    Partial<CaregiverOnboardingDraft>,
  keys:
    readonly (
      keyof CaregiverOnboardingDraft
    )[]
): Partial<CaregiverOnboardingDraft> {
  const result:
    Partial<CaregiverOnboardingDraft> = {};

  for (
    const key
    of keys
  ) {
    if (
      Object.prototype.hasOwnProperty.call(
        source,
        key
      )
    ) {
      (
        result as Record<
          string,
          unknown
        >
      )[key] =
        source[key];
    }
  }

  return result;
}

function normalizeApplicationStatus(
  value:
    unknown
): CaregiverApplicationStatus | undefined {
  switch (value) {
    case "draft":
    case "submitted":
    case "under_review":
    case "approved":
    case "needs_attention":
    case "declined":
      return value;

    default:
      return undefined;
  }
}

function isRecord(
  value:
    unknown
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value
    )
  );
}

function getErrorMessage(
  error:
    unknown,
  fallback:
    string
) {
  if (
    error instanceof
      Error &&
    error.message
  ) {
    return error.message;
  }

  if (
    typeof error ===
      "object" &&
    error !==
      null &&
    "message" in
      error &&
    typeof (
      error as {
        message?: unknown;
      }
    ).message ===
      "string"
  ) {
    const message =
      (
        error as {
          message:
            string;
        }
      ).message.trim();

    if (message) {
      return message;
    }
  }

  if (
    typeof error ===
      "string" &&
    error.trim()
  ) {
    return error.trim();
  }

  return fallback;
}

