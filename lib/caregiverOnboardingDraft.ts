export type CaregiverApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "needs_attention"
  | "declined";

export type CaregiverSex =
  | "male"
  | "female"
  | "prefer_not_to_say";

export type CaregiverProfilePhoto = {
  storageBucket: string;
  storagePath: string;
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  uploadedAt?: string;
};

export type FluencyLevel =
  | "Basic"
  | "Conversational"
  | "Fluent"
  | "Native / Bilingual";

export type CaregiverLanguage = {
  language: string;
  fluency: FluencyLevel;
};

export type WeeklyAvailabilityDay = {
  enabled: boolean;
  startTime?: string;
  endTime?: string;
};

export type WeeklyAvailability = {
  Monday?: WeeklyAvailabilityDay;
  Tuesday?: WeeklyAvailabilityDay;
  Wednesday?: WeeklyAvailabilityDay;
  Thursday?: WeeklyAvailabilityDay;
  Friday?: WeeklyAvailabilityDay;
  Saturday?: WeeklyAvailabilityDay;
  Sunday?: WeeklyAvailabilityDay;
};

export type CredentialStatus =
  | "not_added"
  | "uploaded"
  | "verified"
  | "expired"
  | "needs_review";

export type CredentialRecord = {
  status?: CredentialStatus;

  /*
   * Supabase document identity.
   */
  documentId?: string;

  storageBucket?: string;
  storagePath?: string;

  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;

  issuedDate?: string;
  expiryDate?: string;
  referenceNumber?: string;

  uploadedAt?: string;
};

export type BackgroundScreeningStatus =
  | "not_started"
  | "consent_received"
  | "in_progress"
  | "completed"
  | "needs_review";

export type ReferenceStatus =
  | "not_started"
  | "added"
  | "verified"
  | "needs_review";

export type CaregiverOnboardingSection =
  | "profile"
  | "experience"
  | "preferences"
  | "availability"
  | "credentials"
  | "professional"
  | "background";

export type CaregiverOnboardingDraft = {
  // ============================================================
  // ACCOUNT
  // ============================================================

  accountCreated?: boolean;
  email?: string;
  phone?: string;

  // ============================================================
  // PROFILE
  // ============================================================

  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  sex?: CaregiverSex;
  profilePhoto?: CaregiverProfilePhoto;

  address?: string;
  unit?: string;
  city?: string;
  province?: string;
  country?: string;
  postalCode?: string;

  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;

  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;

  authorizedToWorkInCanada?: boolean;

  // ============================================================
  // PROVIDER STRUCTURE
  // ============================================================

  providerType?:
    | "individual"
    | "sole_proprietor"
    | "corporation";

  legalName?: string;
  businessName?: string;
  businessNumber?: string;
  gstHstNumber?: string;
  independentProviderAcknowledged?: boolean;

  // ============================================================
  // QUALIFICATIONS & EXPERIENCE
  // ============================================================

  qualificationType?: string;
  qualificationTypes?: string[];
  qualificationOther?: string;

  yearsExperience?: number;

  experienceCategories?: string[];
  otherExperienceCategory?: string;

  languages?: CaregiverLanguage[];

  // ============================================================
  // WORK PREFERENCES
  // ============================================================

  availableForWork?: boolean;
  serviceRadiusKm?: number;

  canDrive?: boolean;
  ownsVehicle?: boolean;
  willingToTransportClient?: boolean;

  acceptsLiveOut?: boolean;
  acceptsLiveIn?: boolean;
  acceptsOvernight?: boolean;

  // ============================================================
  // AVAILABILITY
  // ============================================================

  weeklyAvailability?: WeeklyAvailability;

  temporaryTimeOffStart?: string;
  temporaryTimeOffEnd?: string;
  temporaryTimeOffNote?: string;

  // ============================================================
  // CORE DOCUMENTS
  // ============================================================

  governmentId?: CredentialRecord;

  /*
   * Proof that the caregiver is legally eligible
   * to work in Canada.
   *
   * Examples may include a valid work permit,
   * permanent resident document, Canadian passport,
   * or other accepted proof of work eligibility.
   */
  workEligibility?: CredentialRecord;

  qualification?: CredentialRecord;
  qualificationDocuments?: CredentialRecord[];

  vulnerableSectorCheck?: CredentialRecord;

  resume?: CredentialRecord;

  /*
   * References remain available in the data model,
   * but they are NOT a separate compulsory
   * onboarding requirement.
   *
   * A caregiver may already have references
   * included in the submitted CV.
   */
  referencesStatus?: ReferenceStatus;
  referenceNames?: string[];

  // ============================================================
  // HEALTH & SAFETY
  // ============================================================

  /*
   * CPR / First Aid is compulsory.
   */
  cprFirstAid?: CredentialRecord;

  /*
   * TB status plus uploaded evidence is compulsory.
   *
   * A separate test date is not compulsory.
   */
  tbStatus?:
    | "not_added"
    | "negative"
    | "clearance_provided"
    | "needs_review";

  tbEvidence?: CredentialRecord;

  /*
   * Kept for compatibility with older drafts.
   */
  tbTestDate?: string;

  /*
   * COVID-19 vaccination evidence is compulsory
   * under the current Carerity onboarding design.
   */
  vaccinationInfoProvided?: boolean;

  covid19VaccinationEvidence?: CredentialRecord;

  /*
   * Kept for optional/general vaccination notes.
   */
  vaccinationNotes?: string;

  // ============================================================
  // OPTIONAL PROFESSIONAL DETAILS
  // ============================================================

  hscpoaMember?: boolean;
  hscpoaNumber?: string;

  opswaMember?: boolean;
  opswaMemberId?: string;

  liabilityInsurance?: boolean;
  liabilityInsuranceProvider?: string;
  liabilityInsurancePolicyNumber?: string;
  liabilityInsuranceExpiry?: string;

  // ============================================================
  // BACKGROUND SCREENING
  // ============================================================

  digitalBackgroundScreeningConsent?: boolean;

  digitalBackgroundScreeningStatus?: BackgroundScreeningStatus;

  // ============================================================
  // SECTION COMPLETION
  // ============================================================

  profileCompleted?: boolean;
  experienceCompleted?: boolean;
  preferencesCompleted?: boolean;
  availabilityCompleted?: boolean;
  credentialsCompleted?: boolean;
  professionalCompleted?: boolean;
  backgroundScreeningCompleted?: boolean;

  // ============================================================
  // APPLICATION
  // ============================================================

  applicationStatus?: CaregiverApplicationStatus;

  submittedAt?: string;
  lastUpdatedAt?: string;
  createdAt?: string;
};

export type CaregiverSectionStatus = {
  section: CaregiverOnboardingSection;
  complete: boolean;
  missingFields: string[];
};

const LEGACY_STORAGE_KEY =
  "carerityCaregiverOnboardingDraft";
const ACTIVE_CAREGIVER_USER_KEY =
  "carerityActiveCaregiverUserId";
const STORAGE_KEY_PREFIX =
  "carerityCaregiverOnboardingDraft:";

export const CAREGIVER_DRAFT_UPDATED_EVENT = "carerityCaregiverDraftUpdated";
export const CAREGIVER_DRAFT_CLEARED_EVENT = "carerityCaregiverDraftCleared";

export const MIN_CAREGIVER_SERVICE_RADIUS_KM =
  15;

const DAY_NAMES: Array<
  keyof WeeklyAvailability
> = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function isNonEmptyString(
  value?: string
) {
  return Boolean(
    value?.trim()
  );
}

function isValidCaregiverSex(value?: CaregiverSex) {
  return value === "male" || value === "female" || value === "prefer_not_to_say";
}

export function isCredentialAdded(
  record?: CredentialRecord
) {
  return (
    record?.status === "uploaded" ||
    record?.status === "verified" ||
    record?.status === "needs_review"
  );
}

function hasValidWeeklyAvailability(
  availability?: WeeklyAvailability
) {
  if (!availability) {
    return false;
  }

  return DAY_NAMES.some(
    (day) => {
      const item =
        availability[day];

      if (!item?.enabled) {
        return false;
      }

      if (
        !item.startTime ||
        !item.endTime
      ) {
        return false;
      }

      return (
        item.startTime <
        item.endTime
      );
    }
  );
}

// ============================================================
// ACCOUNT-SCOPED LOCAL STORAGE
// ============================================================

export function setActiveCaregiverDraftUserId(userId: string) {
  if (typeof window === "undefined") return;
  const id = userId.trim();
  if (id) window.localStorage.setItem(ACTIVE_CAREGIVER_USER_KEY, id);
}

export function getActiveCaregiverDraftUserId() {
  if (typeof window === "undefined") return "";
  try { return (window.localStorage.getItem(ACTIVE_CAREGIVER_USER_KEY) || "").trim(); } catch { return ""; }
}

export function clearActiveCaregiverDraftUserId() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(ACTIVE_CAREGIVER_USER_KEY); } catch {}
}

export function getCaregiverDraftStorageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}${userId.trim()}`;
}

function resolveDraftUserId(userId?: string) {
  return userId?.trim() || getActiveCaregiverDraftUserId();
}

export function getCaregiverOnboardingDraft(userId?: string): CaregiverOnboardingDraft {
  if (typeof window === "undefined") return {};
  const id = resolveDraftUserId(userId);
  if (!id) return {};
  try {
    const raw = window.localStorage.getItem(getCaregiverDraftStorageKey(id));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as CaregiverOnboardingDraft : {};
  } catch (error) {
    console.error("Unable to read caregiver onboarding draft:", error);
    return {};
  }
}

export function saveCaregiverOnboardingDraft(update: Partial<CaregiverOnboardingDraft>, userId?: string) {
  if (typeof window === "undefined") return;
  const id = resolveDraftUserId(userId);
  if (!id) return;
  const existing = getCaregiverOnboardingDraft(id);
  const now = new Date().toISOString();
  const next: CaregiverOnboardingDraft = {
    ...existing, ...update,
    applicationStatus: update.applicationStatus ?? existing.applicationStatus ?? "draft",
    createdAt: existing.createdAt ?? update.createdAt ?? now,
    lastUpdatedAt: now,
  };
  window.localStorage.setItem(getCaregiverDraftStorageKey(id), JSON.stringify(next));
  window.dispatchEvent(new CustomEvent<CaregiverOnboardingDraft>(CAREGIVER_DRAFT_UPDATED_EVENT, { detail: next }));
}

export function clearCaregiverOnboardingDraft(userId?: string) {
  if (typeof window === "undefined") return;
  const id = resolveDraftUserId(userId);
  if (!id) return;
  window.localStorage.removeItem(getCaregiverDraftStorageKey(id));
  window.dispatchEvent(new CustomEvent(CAREGIVER_DRAFT_CLEARED_EVENT));
}

export function removeLegacyCaregiverDraftCache() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
}

// ============================================================
// PROFILE VALIDATION
// ============================================================

export function getProfileSectionStatus(
  draft:
    CaregiverOnboardingDraft
): CaregiverSectionStatus {
  const missingFields:
    string[] = [];

  if (
    !isNonEmptyString(
      draft.firstName
    )
  ) {
    missingFields.push(
      "First name"
    );
  }

  if (
    !isNonEmptyString(
      draft.lastName
    )
  ) {
    missingFields.push(
      "Last name"
    );
  }

  if (
    !isNonEmptyString(
      draft.dateOfBirth
    )
  ) {
    missingFields.push(
      "Date of birth"
    );
  }

  if (!isValidCaregiverSex(draft.sex)) {
    missingFields.push("Sex");
  }

  if (
    !isNonEmptyString(
      draft.address
    )
  ) {
    missingFields.push(
      "Home address"
    );
  }

  if (
    !isNonEmptyString(
      draft.city
    )
  ) {
    missingFields.push(
      "City"
    );
  }

  if (
    !isNonEmptyString(
      draft.province
    )
  ) {
    missingFields.push(
      "Province"
    );
  }

  if (
    !isNonEmptyString(
      draft.postalCode
    )
  ) {
    missingFields.push(
      "Postal code"
    );
  }

  if (
    draft.authorizedToWorkInCanada !==
    true
  ) {
    missingFields.push(
      "Work eligibility"
    );
  }

  return {
    section:
      "profile",

    complete:
      missingFields.length ===
      0,

    missingFields,
  };
}

// ============================================================
// EXPERIENCE VALIDATION
// ============================================================

export function getExperienceSectionStatus(
  draft:
    CaregiverOnboardingDraft
): CaregiverSectionStatus {
  const missingFields:
    string[] = [];

  const qualifications =
    draft.qualificationTypes &&
    draft.qualificationTypes.length >
      0
      ? draft.qualificationTypes
      : draft.qualificationType
        ? [
            draft.qualificationType,
          ]
        : [];

  if (
    qualifications.length ===
    0
  ) {
    missingFields.push(
      "Qualification"
    );
  }

  if (
    qualifications.includes(
      "Other"
    ) &&
    !isNonEmptyString(
      draft.qualificationOther
    )
  ) {
    missingFields.push(
      "Other qualification"
    );
  }

  if (
    typeof draft.yearsExperience !==
      "number" ||
    draft.yearsExperience <
      0
  ) {
    missingFields.push(
      "Years of experience"
    );
  }

  if (
    !draft
      .experienceCategories
      ?.length
  ) {
    missingFields.push(
      "Experience areas"
    );
  }

  if (
    !draft.languages?.length
  ) {
    missingFields.push(
      "Languages"
    );
  }

  return {
    section:
      "experience",

    complete:
      missingFields.length ===
      0,

    missingFields,
  };
}

// ============================================================
// PREFERENCES VALIDATION
// ============================================================

export function getPreferencesSectionStatus(
  draft:
    CaregiverOnboardingDraft
): CaregiverSectionStatus {
  const missingFields:
    string[] = [];

  if (
    typeof draft.availableForWork !==
    "boolean"
  ) {
    missingFields.push(
      "Availability status"
    );
  }

  if (
    typeof draft.serviceRadiusKm !==
      "number" ||
    draft.serviceRadiusKm <
      MIN_CAREGIVER_SERVICE_RADIUS_KM
  ) {
    missingFields.push(
      `Service radius (minimum ${MIN_CAREGIVER_SERVICE_RADIUS_KM} km)`
    );
  }

  if (
    typeof draft.canDrive !==
    "boolean"
  ) {
    missingFields.push(
      "Driving ability"
    );
  }

  if (
    draft.canDrive ===
      true &&
    typeof draft.ownsVehicle !==
      "boolean"
  ) {
    missingFields.push(
      "Vehicle ownership"
    );
  }

  if (
    draft.canDrive ===
      true &&
    typeof draft.willingToTransportClient !==
      "boolean"
  ) {
    missingFields.push(
      "Client transportation preference"
    );
  }

  const acceptsAtLeastOneWorkType =
    draft.acceptsLiveOut ===
      true ||
    draft.acceptsLiveIn ===
      true ||
    draft.acceptsOvernight ===
      true;

  if (
    !acceptsAtLeastOneWorkType
  ) {
    missingFields.push(
      "Preferred work type"
    );
  }

  return {
    section:
      "preferences",

    complete:
      missingFields.length ===
      0,

    missingFields,
  };
}

// ============================================================
// AVAILABILITY VALIDATION
// ============================================================

export function getAvailabilitySectionStatus(
  draft:
    CaregiverOnboardingDraft
): CaregiverSectionStatus {
  const missingFields:
    string[] = [];

  if (
    !hasValidWeeklyAvailability(
      draft.weeklyAvailability
    )
  ) {
    missingFields.push(
      "Weekly availability"
    );
  }

  if (
    draft.temporaryTimeOffStart &&
    draft.temporaryTimeOffEnd &&
    draft.temporaryTimeOffStart >
      draft.temporaryTimeOffEnd
  ) {
    missingFields.push(
      "Valid time-off dates"
    );
  }

  return {
    section:
      "availability",

    complete:
      missingFields.length ===
      0,

    missingFields,
  };
}

// ============================================================
// CREDENTIALS / HEALTH VALIDATION
// ============================================================

export function getCredentialsSectionStatus(
  draft:
    CaregiverOnboardingDraft
): CaregiverSectionStatus {
  const missingFields:
    string[] = [];

  if (
    !isCredentialAdded(
      draft.governmentId
    )
  ) {
    missingFields.push(
      "Government ID"
    );
  }

  if (
    !isCredentialAdded(
      draft.workEligibility
    )
  ) {
    missingFields.push(
      "Proof of work eligibility"
    );
  }

  const hasQualificationDocument =
    isCredentialAdded(
      draft.qualification
    ) ||
    Boolean(
      draft
        .qualificationDocuments
        ?.some(
          (
            record
          ) =>
            isCredentialAdded(
              record
            )
        )
    );

  if (
    !hasQualificationDocument
  ) {
    missingFields.push(
      "Qualification document"
    );
  }

  if (
    !isCredentialAdded(
      draft.vulnerableSectorCheck
    )
  ) {
    missingFields.push(
      "Vulnerable Sector Check"
    );
  }

  if (
    !isCredentialAdded(
      draft.resume
    )
  ) {
    missingFields.push(
      "Resume / CV"
    );
  }

  /*
   * References are not separately compulsory.
   */

  if (
    !isCredentialAdded(
      draft.cprFirstAid
    )
  ) {
    missingFields.push(
      "CPR / First Aid certificate"
    );
  }

  if (
    !draft.tbStatus ||
    draft.tbStatus ===
      "not_added"
  ) {
    missingFields.push(
      "TB screening status"
    );
  }

  if (
    !isCredentialAdded(
      draft.tbEvidence
    )
  ) {
    missingFields.push(
      "TB screening evidence"
    );
  }

  if (
    !isCredentialAdded(
      draft
        .covid19VaccinationEvidence
    )
  ) {
    missingFields.push(
      "COVID-19 vaccination evidence"
    );
  }

  return {
    section:
      "credentials",

    complete:
      missingFields.length ===
      0,

    missingFields,
  };
}

// ============================================================
// PROFESSIONAL DETAILS
// ============================================================

export function getProfessionalSectionStatus(
  draft:
    CaregiverOnboardingDraft
): CaregiverSectionStatus {
  const missingFields:
    string[] = [];

  if (
    draft.hscpoaMember ===
      true &&
    !isNonEmptyString(
      draft.hscpoaNumber
    )
  ) {
    missingFields.push(
      "HSCPOA number"
    );
  }

  if (
    draft.opswaMember ===
      true &&
    !isNonEmptyString(
      draft.opswaMemberId
    )
  ) {
    missingFields.push(
      "OPSWA member ID"
    );
  }

  if (
    draft.liabilityInsurance ===
    true
  ) {
    if (
      !isNonEmptyString(
        draft
          .liabilityInsuranceProvider
      )
    ) {
      missingFields.push(
        "Insurance provider"
      );
    }

    if (
      !isNonEmptyString(
        draft
          .liabilityInsurancePolicyNumber
      )
    ) {
      missingFields.push(
        "Insurance policy number"
      );
    }

    if (
      !isNonEmptyString(
        draft
          .liabilityInsuranceExpiry
      )
    ) {
      missingFields.push(
        "Insurance expiry date"
      );
    }
  }

  return {
    section:
      "professional",

    complete:
      missingFields.length ===
      0,

    missingFields,
  };
}

// ============================================================
// BACKGROUND
// ============================================================

export function getBackgroundSectionStatus(
  draft:
    CaregiverOnboardingDraft
): CaregiverSectionStatus {
  const missingFields:
    string[] = [];

  if (
    draft.digitalBackgroundScreeningConsent !==
    true
  ) {
    missingFields.push(
      "Background screening consent"
    );
  }

  return {
    section:
      "background",

    complete:
      missingFields.length ===
      0,

    missingFields,
  };
}

// ============================================================
// SECTION HELPERS
// ============================================================

export function getCaregiverSectionStatus(
  section:
    CaregiverOnboardingSection,
  draft:
    CaregiverOnboardingDraft
): CaregiverSectionStatus {
  switch (section) {
    case "profile":
      return getProfileSectionStatus(
        draft
      );

    case "experience":
      return getExperienceSectionStatus(
        draft
      );

    case "preferences":
      return getPreferencesSectionStatus(
        draft
      );

    case "availability":
      return getAvailabilitySectionStatus(
        draft
      );

    case "credentials":
      return getCredentialsSectionStatus(
        draft
      );

    case "professional":
      return getProfessionalSectionStatus(
        draft
      );

    case "background":
      return getBackgroundSectionStatus(
        draft
      );
  }
}

export function getAllCaregiverSectionStatuses(
  draft:
    CaregiverOnboardingDraft
): CaregiverSectionStatus[] {
  return [
    getProfileSectionStatus(
      draft
    ),

    getExperienceSectionStatus(
      draft
    ),

    getPreferencesSectionStatus(
      draft
    ),

    getAvailabilitySectionStatus(
      draft
    ),

    getCredentialsSectionStatus(
      draft
    ),

    getProfessionalSectionStatus(
      draft
    ),

    getBackgroundSectionStatus(
      draft
    ),
  ];
}

export function getCaregiverApplicationProgress(
  draft:
    CaregiverOnboardingDraft
) {
  const sections =
    getAllCaregiverSectionStatuses(
      draft
    );

  const completed =
    sections.filter(
      (
        section
      ) =>
        section.complete
    ).length;

  return {
    completed,

    total:
      sections.length,

    percentage:
      Math.round(
        (
          completed /
          sections.length
        ) *
          100
      ),

    sections,

    allComplete:
      completed ===
      sections.length,
  };
}

export function refreshCaregiverCompletionFlags(
  draft:
    CaregiverOnboardingDraft
): CaregiverOnboardingDraft {
  const profile =
    getProfileSectionStatus(
      draft
    );

  const experience =
    getExperienceSectionStatus(
      draft
    );

  const preferences =
    getPreferencesSectionStatus(
      draft
    );

  const availability =
    getAvailabilitySectionStatus(
      draft
    );

  const credentials =
    getCredentialsSectionStatus(
      draft
    );

  const professional =
    getProfessionalSectionStatus(
      draft
    );

  const background =
    getBackgroundSectionStatus(
      draft
    );

  return {
    ...draft,

    profileCompleted:
      profile.complete,

    experienceCompleted:
      experience.complete,

    preferencesCompleted:
      preferences.complete,

    availabilityCompleted:
      availability.complete,

    credentialsCompleted:
      credentials.complete,

    professionalCompleted:
      professional.complete,

    backgroundScreeningCompleted:
      background.complete,
  };
}

export function saveAndRefreshCaregiverDraft(
  update:
    Partial<CaregiverOnboardingDraft>
) {
  const existing =
    getCaregiverOnboardingDraft();

  const combined:
    CaregiverOnboardingDraft = {
    ...existing,
    ...update,
  };

  const refreshed =
    refreshCaregiverCompletionFlags(
      combined
    );

  saveCaregiverOnboardingDraft(
    refreshed
  );

  return refreshed;
}

export function submitCaregiverApplication() {
  const draft =
    refreshCaregiverCompletionFlags(
      getCaregiverOnboardingDraft()
    );

  const progress =
    getCaregiverApplicationProgress(
      draft
    );

  if (
    !progress.allComplete
  ) {
    return {
      success:
        false,

      error:
        "Complete all required sections before submitting.",

      missingSections:
        progress.sections.filter(
          (
            section
          ) =>
            !section.complete
        ),
    };
  }

  const submittedAt =
    new Date().toISOString();

  saveCaregiverOnboardingDraft({
    ...draft,

    applicationStatus:
      "submitted",

    submittedAt,
  });

  return {
    success:
      true,

    submittedAt,

    missingSections: [],
  };
}

