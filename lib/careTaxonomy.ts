/*
 * ============================================================
 * CARERITY CARE TAXONOMY
 * ============================================================
 *
 * This file is the canonical vocabulary used across:
 *
 * - Find Care onboarding
 * - Customer Care Profile
 * - Booking review
 * - Caregiver onboarding
 * - Matching engine
 * - Admin review
 *
 * IMPORTANT:
 *
 * Customer-facing wording and caregiver-facing wording
 * do NOT need to be identical.
 *
 * Matching happens through canonical IDs and capability IDs,
 * not by comparing the visible labels directly.
 * ============================================================
 */

export type CareNeedId =
  | "personal_care"
  | "bathing_hygiene"
  | "dressing_grooming"
  | "toileting"
  | "mobility_support"
  | "transfer_support"
  | "meal_support"
  | "medication_reminders"
  | "companionship"
  | "light_housekeeping"
  | "respite_support"
  | "overnight_support"
  | "safety_supervision"
  | "other";

export type CareContextId =
  | "memory_dementia"
  | "diabetes"
  | "cancer"
  | "mental_health"
  | "mobility_limitations"
  | "fall_risk"
  | "post_hospital_recovery"
  | "chronic_condition"
  | "immunocompromised"
  | "hearing_support"
  | "vision_support"
  | "pets_in_home"
  | "smoking_environment"
  | "allergies"
  | "other";

export type CaregiverCapabilityId =
  | "personal_care"
  | "bathing_hygiene"
  | "dressing_grooming"
  | "toileting"
  | "mobility_assistance"
  | "transfer_assistance"
  | "meal_preparation"
  | "medication_reminders"
  | "companionship"
  | "light_housekeeping"
  | "respite_care"
  | "overnight_care"
  | "safety_supervision"
  | "dementia_memory_support"
  | "diabetes_support"
  | "cancer_support"
  | "mental_health_support"
  | "mobility_support"
  | "fall_prevention"
  | "post_hospital_support"
  | "chronic_condition_support"
  | "immunocompromised_support"
  | "hearing_support"
  | "vision_support"
  | "pet_friendly"
  | "smoke_environment_acceptance"
  | "allergy_awareness";

export type CareNeedDefinition = {
  id: CareNeedId;

  /*
   * Customer-facing label.
   */
  label: string;

  /*
   * Short explanation shown where useful.
   */
  description?: string;

  /*
   * Caregiver capabilities that can satisfy
   * this care need.
   */
  caregiverCapabilities:
    CaregiverCapabilityId[];

  /*
   * Whether the option is currently available
   * to customers.
   */
  active: boolean;

  sortOrder: number;
};

export type CareContextDefinition = {
  id: CareContextId;

  /*
   * Customer-facing label.
   */
  label: string;

  description?: string;

  /*
   * Capabilities that make a caregiver more
   * suitable for this context.
   *
   * These are matching signals, not necessarily
   * strict exclusions.
   */
  caregiverCapabilities:
    CaregiverCapabilityId[];

  /*
   * Some context items may be environmental
   * rather than clinical.
   */
  category:
    | "condition"
    | "mobility"
    | "safety"
    | "environment"
    | "accessibility"
    | "recovery";

  active: boolean;

  sortOrder: number;
};

/*
 * ============================================================
 * CARE NEEDS
 * ============================================================
 */

export const CARE_NEEDS:
  CareNeedDefinition[] = [
  {
    id:
      "personal_care",

    label:
      "Personal care",

    description:
      "General support with personal daily-care activities.",

    caregiverCapabilities: [
      "personal_care",
    ],

    active:
      true,

    sortOrder:
      10,
  },

  {
    id:
      "bathing_hygiene",

    label:
      "Bathing & hygiene",

    description:
      "Support with bathing, hygiene and personal cleanliness.",

    caregiverCapabilities: [
      "bathing_hygiene",
      "personal_care",
    ],

    active:
      true,

    sortOrder:
      20,
  },

  {
    id:
      "dressing_grooming",

    label:
      "Dressing & grooming",

    description:
      "Support with dressing, grooming and appearance.",

    caregiverCapabilities: [
      "dressing_grooming",
      "personal_care",
    ],

    active:
      true,

    sortOrder:
      30,
  },

  {
    id:
      "toileting",

    label:
      "Toileting support",

    description:
      "Assistance with toileting and related personal-care needs.",

    caregiverCapabilities: [
      "toileting",
      "personal_care",
    ],

    active:
      true,

    sortOrder:
      40,
  },

  {
    id:
      "mobility_support",

    label:
      "Mobility support",

    description:
      "Help with walking, repositioning and safe movement.",

    caregiverCapabilities: [
      "mobility_assistance",
      "mobility_support",
    ],

    active:
      true,

    sortOrder:
      50,
  },

  {
    id:
      "transfer_support",

    label:
      "Transfer support",

    description:
      "Help moving safely between bed, chair, toilet or similar surfaces.",

    caregiverCapabilities: [
      "transfer_assistance",
      "mobility_assistance",
    ],

    active:
      true,

    sortOrder:
      60,
  },

  {
    id:
      "meal_support",

    label:
      "Meal support",

    description:
      "Meal preparation and basic mealtime assistance.",

    caregiverCapabilities: [
      "meal_preparation",
    ],

    active:
      true,

    sortOrder:
      70,
  },

  {
    id:
      "medication_reminders",

    label:
      "Medication reminders",

    description:
      "Non-clinical reminders to take medications as directed.",

    caregiverCapabilities: [
      "medication_reminders",
    ],

    active:
      true,

    sortOrder:
      80,
  },

  {
    id:
      "companionship",

    label:
      "Companionship",

    description:
      "Conversation, social engagement and general companionship.",

    caregiverCapabilities: [
      "companionship",
    ],

    active:
      true,

    sortOrder:
      90,
  },

  {
    id:
      "light_housekeeping",

    label:
      "Light housekeeping",

    description:
      "Basic household support related to the care recipient.",

    caregiverCapabilities: [
      "light_housekeeping",
    ],

    active:
      true,

    sortOrder:
      100,
  },

  {
    id:
      "respite_support",

    label:
      "Respite care",

    description:
      "Temporary support so a family or regular caregiver can take a break.",

    caregiverCapabilities: [
      "respite_care",
    ],

    active:
      true,

    sortOrder:
      110,
  },

  {
    id:
      "overnight_support",

    label:
      "Overnight support",

    description:
      "Care or supervision during overnight hours.",

    caregiverCapabilities: [
      "overnight_care",
      "safety_supervision",
    ],

    active:
      true,

    sortOrder:
      120,
  },

  {
    id:
      "safety_supervision",

    label:
      "Safety supervision",

    description:
      "General supervision where safety monitoring is important.",

    caregiverCapabilities: [
      "safety_supervision",
    ],

    active:
      true,

    sortOrder:
      130,
  },

  {
    id:
      "other",

    label:
      "Other",

    description:
      "A care need not listed above.",

    caregiverCapabilities:
      [],

    active:
      true,

    sortOrder:
      999,
  },
];

/*
 * ============================================================
 * CARE CONTEXT
 * ============================================================
 */

export const CARE_CONTEXT:
  CareContextDefinition[] = [
  {
    id:
      "memory_dementia",

    label:
      "Memory concerns / dementia",

    description:
      "Memory loss, cognitive changes or dementia-related support needs.",

    caregiverCapabilities: [
      "dementia_memory_support",
      "safety_supervision",
    ],

    category:
      "condition",

    active:
      true,

    sortOrder:
      10,
  },

  {
    id:
      "diabetes",

    label:
      "Diabetes",

    description:
      "Care where awareness of diabetes-related routines is helpful.",

    caregiverCapabilities: [
      "diabetes_support",
    ],

    category:
      "condition",

    active:
      true,

    sortOrder:
      20,
  },

  {
    id:
      "cancer",

    label:
      "Cancer",

    description:
      "Support for a person living with or recovering from cancer treatment.",

    caregiverCapabilities: [
      "cancer_support",
    ],

    category:
      "condition",

    active:
      true,

    sortOrder:
      30,
  },

  {
    id:
      "mental_health",

    label:
      "Mental health support",

    description:
      "Care where mental-health awareness and supportive communication are relevant.",

    caregiverCapabilities: [
      "mental_health_support",
    ],

    category:
      "condition",

    active:
      true,

    sortOrder:
      40,
  },

  {
    id:
      "mobility_limitations",

    label:
      "Mobility limitations",

    description:
      "Reduced mobility or difficulty moving independently.",

    caregiverCapabilities: [
      "mobility_support",
      "mobility_assistance",
      "transfer_assistance",
    ],

    category:
      "mobility",

    active:
      true,

    sortOrder:
      50,
  },

  {
    id:
      "fall_risk",

    label:
      "Fall risk",

    description:
      "A higher risk of falls or a need for additional safety awareness.",

    caregiverCapabilities: [
      "fall_prevention",
      "safety_supervision",
      "mobility_assistance",
    ],

    category:
      "safety",

    active:
      true,

    sortOrder:
      60,
  },

  {
    id:
      "post_hospital_recovery",

    label:
      "Recovery after hospital stay",

    description:
      "Temporary support following hospitalization or discharge.",

    caregiverCapabilities: [
      "post_hospital_support",
    ],

    category:
      "recovery",

    active:
      true,

    sortOrder:
      70,
  },

  {
    id:
      "chronic_condition",

    label:
      "Chronic health condition",

    description:
      "Ongoing support where a long-term health condition affects daily living.",

    caregiverCapabilities: [
      "chronic_condition_support",
    ],

    category:
      "condition",

    active:
      true,

    sortOrder:
      80,
  },

  {
    id:
      "immunocompromised",

    label:
      "Immunocompromised / infection precautions",

    description:
      "Care where additional infection-control awareness may be important.",

    caregiverCapabilities: [
      "immunocompromised_support",
    ],

    category:
      "condition",

    active:
      true,

    sortOrder:
      90,
  },

  {
    id:
      "hearing_support",

    label:
      "Hearing support",

    description:
      "Communication or care adjustments related to hearing limitations.",

    caregiverCapabilities: [
      "hearing_support",
    ],

    category:
      "accessibility",

    active:
      true,

    sortOrder:
      100,
  },

  {
    id:
      "vision_support",

    label:
      "Vision support",

    description:
      "Communication or care adjustments related to vision limitations.",

    caregiverCapabilities: [
      "vision_support",
    ],

    category:
      "accessibility",

    active:
      true,

    sortOrder:
      110,
  },

  {
    id:
      "pets_in_home",

    label:
      "Pets in the home",

    description:
      "The care location includes one or more household pets.",

    caregiverCapabilities: [
      "pet_friendly",
    ],

    category:
      "environment",

    active:
      true,

    sortOrder:
      120,
  },

  {
    id:
      "smoking_environment",

    label:
      "Smoking environment",

    description:
      "Smoking may occur in or around the care environment.",

    caregiverCapabilities: [
      "smoke_environment_acceptance",
    ],

    category:
      "environment",

    active:
      true,

    sortOrder:
      130,
  },

  {
    id:
      "allergies",

    label:
      "Allergies",

    description:
      "The care recipient has allergies that may affect the care environment.",

    caregiverCapabilities: [
      "allergy_awareness",
    ],

    category:
      "environment",

    active:
      true,

    sortOrder:
      140,
  },

  {
    id:
      "other",

    label:
      "Other",

    description:
      "Another care circumstance not listed above.",

    caregiverCapabilities:
      [],

    category:
      "condition",

    active:
      true,

    sortOrder:
      999,
  },
];

/*
 * ============================================================
 * ACTIVE CUSTOMER OPTIONS
 * ============================================================
 */

export const ACTIVE_CARE_NEEDS =
  CARE_NEEDS
    .filter(
      (
        item
      ) =>
        item.active
    )
    .sort(
      (
        a,
        b
      ) =>
        a.sortOrder -
        b.sortOrder
    );

export const ACTIVE_CARE_CONTEXT =
  CARE_CONTEXT
    .filter(
      (
        item
      ) =>
        item.active
    )
    .sort(
      (
        a,
        b
      ) =>
        a.sortOrder -
        b.sortOrder
    );

/*
 * ============================================================
 * LOOKUPS
 * ============================================================
 */

export function getCareNeedById(
  id:
    string
) {
  return CARE_NEEDS.find(
    (
      item
    ) =>
      item.id ===
      id
  );
}

export function getCareContextById(
  id:
    string
) {
  return CARE_CONTEXT.find(
    (
      item
    ) =>
      item.id ===
      id
  );
}

/*
 * ============================================================
 * LABEL HELPERS
 * ============================================================
 */

export function getCareNeedLabel(
  value:
    string
) {
  return (
    getCareNeedById(
      value
    )?.label ||
    value
  );
}

export function getCareContextLabel(
  value:
    string
) {
  return (
    getCareContextById(
      value
    )?.label ||
    value
  );
}

/*
 * ============================================================
 * CAREGIVER CAPABILITY LOOKUP
 * ============================================================
 */

export function getRequiredCapabilitiesForNeeds(
  selectedNeeds:
    string[]
) {
  return Array.from(
    new Set(
      selectedNeeds.flatMap(
        (
          needId
        ) =>
          getCareNeedById(
            needId
          )
            ?.caregiverCapabilities ||
          []
      )
    )
  );
}

export function getRelevantCapabilitiesForContext(
  selectedContext:
    string[]
) {
  return Array.from(
    new Set(
      selectedContext.flatMap(
        (
          contextId
        ) =>
          getCareContextById(
            contextId
          )
            ?.caregiverCapabilities ||
          []
      )
    )
  );
}

/*
 * ============================================================
 * COMBINED MATCHING SIGNALS
 * ============================================================
 */

export function getCaregiverCapabilitySignals(
  selectedNeeds:
    string[] = [],

  selectedContext:
    string[] = []
) {
  const needCapabilities =
    getRequiredCapabilitiesForNeeds(
      selectedNeeds
    );

  const contextCapabilities =
    getRelevantCapabilitiesForContext(
      selectedContext
    );

  return {
    needCapabilities,

    contextCapabilities,

    allCapabilities:
      Array.from(
        new Set([
          ...needCapabilities,
          ...contextCapabilities,
        ])
      ),
  };
}

/*
 * ============================================================
 * LEGACY VALUE SUPPORT
 * ============================================================
 *
 * Your existing bookings currently store visible strings.
 *
 * We should NOT break those records when we introduce
 * canonical IDs.
 *
 * These aliases let the new taxonomy understand older
 * onboarding values while we migrate gradually.
 * ============================================================
 */

const LEGACY_CARE_NEED_ALIASES:
  Record<
    string,
    CareNeedId
  > = {
  "Personal Care":
    "personal_care",

  "Bathing & Hygiene":
    "bathing_hygiene",

  "Bathing and Hygiene":
    "bathing_hygiene",

  "Dressing & Grooming":
    "dressing_grooming",

  "Dressing and Grooming":
    "dressing_grooming",

  "Toileting":
    "toileting",

  "Mobility Support":
    "mobility_support",

  "Transfers":
    "transfer_support",

  "Transfer Support":
    "transfer_support",

  "Meal Preparation":
    "meal_support",

  "Meal Support":
    "meal_support",

  "Medication Reminders":
    "medication_reminders",

  "Companionship":
    "companionship",

  "Light Housekeeping":
    "light_housekeeping",

  "Respite Care":
    "respite_support",

  "Overnight Care":
    "overnight_support",

  "Safety Supervision":
    "safety_supervision",

  "Other":
    "other",
};

const LEGACY_CARE_CONTEXT_ALIASES:
  Record<
    string,
    CareContextId
  > = {
  "Memory concerns / dementia":
    "memory_dementia",

  "Memory Concerns / Dementia":
    "memory_dementia",

  Dementia:
    "memory_dementia",

  Diabetes:
    "diabetes",

  Cancer:
    "cancer",

  "Mental health support":
    "mental_health",

  "Mental Health Support":
    "mental_health",

  "Mobility limitations":
    "mobility_limitations",

  "Mobility Limitations":
    "mobility_limitations",

  "Fall risk":
    "fall_risk",

  "Fall Risk":
    "fall_risk",

  "Recovery after hospital stay":
    "post_hospital_recovery",

  "Post-Hospital Recovery":
    "post_hospital_recovery",

  "Chronic health condition":
    "chronic_condition",

  "Immunocompromised / infection precautions":
    "immunocompromised",

  "Hearing support":
    "hearing_support",

  "Vision support":
    "vision_support",

  "Pets in the home":
    "pets_in_home",

  Pets:
    "pets_in_home",

  "Smoking environment":
    "smoking_environment",

  Smoking:
    "smoking_environment",

  Allergies:
    "allergies",

  Other:
    "other",
};

/*
 * ============================================================
 * NORMALIZATION
 * ============================================================
 */

export function normalizeCareNeedId(
  value:
    string
): CareNeedId | undefined {
  const direct =
    CARE_NEEDS.find(
      (
        item
      ) =>
        item.id ===
        value
    );

  if (
    direct
  ) {
    return direct.id;
  }

  return LEGACY_CARE_NEED_ALIASES[
    value.trim()
  ];
}

export function normalizeCareContextId(
  value:
    string
): CareContextId | undefined {
  const direct =
    CARE_CONTEXT.find(
      (
        item
      ) =>
        item.id ===
        value
    );

  if (
    direct
  ) {
    return direct.id;
  }

  return LEGACY_CARE_CONTEXT_ALIASES[
    value.trim()
  ];
}

export function normalizeCareNeedSelection(
  values:
    string[] = []
): CareNeedId[] {
  return Array.from(
    new Set(
      values
        .map(
          normalizeCareNeedId
        )
        .filter(
          (
            value
          ): value is CareNeedId =>
            Boolean(
              value
            )
        )
    )
  );
}

export function normalizeCareContextSelection(
  values:
    string[] = []
): CareContextId[] {
  return Array.from(
    new Set(
      values
        .map(
          normalizeCareContextId
        )
        .filter(
          (
            value
          ): value is CareContextId =>
            Boolean(
              value
            )
        )
    )
  );
}
