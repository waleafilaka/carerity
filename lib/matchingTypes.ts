import type {
  CareContextId,
  CaregiverCapabilityId,
  CareNeedId,
} from "./careTaxonomy";

import type {
  CaregiverSex,
} from "./caregiverOnboardingDraft";

/*
 * ============================================================
 * CARERITY MATCHING TYPES
 * ============================================================
 */

export type MatchingRequirementLevel =
  | "required"
  | "preferred"
  | "informational";

export type MatchingSignalType =
  | "care_need"
  | "care_context"
  | "language"
  | "sex_preference"
  | "availability"
  | "location"
  | "driving"
  | "transportation"
  | "live_in"
  | "live_out"
  | "overnight"
  | "continuity"
  | "qualification"
  | "other";

export type CustomerMatchingRequest = {
  /** One customer decision: flexible preferences rank; "only" restricts eligibility. */
  caregiverGenderPreference?:
    | "no_preference"
    | "female_preferred"
    | "male_preferred"
    | "female_only"
    | "male_only";

  bookingId?:
    string;

  customerId?:
    string;

  careRecipientName?:
    string;

  careNeedIds:
    CareNeedId[];

  careContextIds:
    CareContextId[];

  otherNeed?:
    string;

  otherContext?:
    string;

  primaryLanguage?:
    string;

  secondaryLanguage?:
    string;

  /*
   * Not currently exposed as a normal customer booking filter.
   * This remains available for exceptional future workflows.
   */
  preferredCaregiverSex?:
    | "male"
    | "female";

  address?:
    string;

  city?:
    string;

  province?:
    string;

  postalCode?:
    string;

  latitude?:
    number;

  longitude?:
    number;

  scheduleType?:
    | "One-Time Care"
    | "Recurring Care";

  careDate?:
    string;

  startTime?:
    string;

  endTime?:
    string;

  recurringDays?:
    string[];

  requiresLiveIn?:
    boolean;

  requiresLiveOut?:
    boolean;

  requiresOvernight?:
    boolean;

  requiresDriver?:
    boolean;

  requiresCaregiverVehicle?:
    boolean;

  requiresClientTransportation?:
    boolean;

  preferSameCaregiver?:
    boolean;

  createdAt?:
    string;
};

export type CaregiverMatchingProfile = {
  caregiverId:
    string;

  userId?:
    string;

  caregiverNumber?:
    string;

  firstName?:
    string;

  lastName?:
    string;

  sex?:
    CaregiverSex;

  applicationStatus?:
    | "draft"
    | "submitted"
    | "under_review"
    | "approved"
    | "needs_attention"
    | "declined";

  eligibleForMatching:
    boolean;

  availableForWork:
    boolean;

  capabilityIds?:
    CaregiverCapabilityId[];

  languages?:
    CaregiverMatchingLanguage[];

  yearsExperience?:
    number;

  qualificationTypes?:
    string[];

  city?:
    string;

  province?:
    string;

  postalCode?:
    string;

  latitude?:
    number;

  longitude?:
    number;

  canDrive?:
    boolean;

  ownsVehicle?:
    boolean;

  willingToTransportClient?:
    boolean;

  acceptsLiveOut?:
    boolean;

  acceptsLiveIn?:
    boolean;

  acceptsOvernight?:
    boolean;

  weeklyAvailability?:
    CaregiverMatchingAvailability;

  temporaryTimeOffStart?:
    string;

  temporaryTimeOffEnd?:
    string;

  currentActiveVisitCount?:
    number;

  currentWeeklyHours?:
    number;

  lastMatchedAt?:
    string;
};

export type CaregiverMatchingLanguage = {
  language:
    string;

  fluency?:
    | "Basic"
    | "Conversational"
    | "Fluent"
    | "Native / Bilingual";
};

export type CaregiverMatchingAvailabilityDay = {
  enabled:
    boolean;

  startTime?:
    string;

  endTime?:
    string;
};

export type CaregiverMatchingAvailability = {
  Monday?:
    CaregiverMatchingAvailabilityDay;

  Tuesday?:
    CaregiverMatchingAvailabilityDay;

  Wednesday?:
    CaregiverMatchingAvailabilityDay;

  Thursday?:
    CaregiverMatchingAvailabilityDay;

  Friday?:
    CaregiverMatchingAvailabilityDay;

  Saturday?:
    CaregiverMatchingAvailabilityDay;

  Sunday?:
    CaregiverMatchingAvailabilityDay;
};

export type MatchingSignal = {
  id:
    string;

  type:
    MatchingSignalType;

  level:
    MatchingRequirementLevel;

  label:
    string;

  weight:
    number;

  matched:
    boolean;

  awardedScore:
    number;

  explanation?:
    string;
};

export type MatchingEligibilityFailureCode =
  | "not_approved"
  | "not_eligible_for_matching"
  | "not_available_for_work"
  | "missing_location"
  | "schedule_conflict"
  | "temporary_time_off"
  | "missing_required_capability"
  | "language_requirement"
  | "sex_preference"
  | "driver_required"
  | "vehicle_required"
  | "transport_required"
  | "live_in_not_accepted"
  | "live_out_not_accepted"
  | "overnight_not_accepted"
  | "invalid_candidate";

export type MatchingEligibilityFailure = {
  code:
    MatchingEligibilityFailureCode;

  message:
    string;

  field?:
    string;

  value?:
    string;
};

export type CaregiverEligibilityResult = {
  eligible:
    boolean;

  failures:
    MatchingEligibilityFailure[];
};

export type MatchingDistanceMethod =
  | "haversine"
  | "google_routes";

export type MatchingDistanceResult = {
  method:
    MatchingDistanceMethod;

  distanceKm:
    number;

  durationMinutes?:
    number;

  routeRefined:
    boolean;
};

export type MatchingScoreBreakdown = {
  capabilityScore:
    number;

  contextScore:
    number;

  languageScore:
    number;

  availabilityScore:
    number;

  locationScore:
    number;

  transportationScore:
    number;

  workTypeScore:
    number;

  continuityScore:
    number;

  experienceScore:
    number;

  totalScore:
    number;

  maximumPossibleScore:
    number;

  percentage:
    number;
};

export type CaregiverMatchCandidate = {
  caregiver:
    CaregiverMatchingProfile;

  eligibility:
    CaregiverEligibilityResult;

  distance?:
    MatchingDistanceResult;

  signals:
    MatchingSignal[];

  score:
    MatchingScoreBreakdown;

  rank?:
    number;

  requiresRouteRefinement?:
    boolean;

  partialFit?:
    boolean;

  unmatchedCapabilityIds?:
    CaregiverCapabilityId[];
};

/*
 * ============================================================
 * OFFER / OUTREACH PLAN
 * ============================================================
 *
 * Customer does not browse the full matching pool.
 *
 * MVP:
 * - ranks #1 and #2 are contacted first
 * - each receives a 5-minute response window
 * - if both accept, customer sees two choices
 * - if one accepts, customer sees that one
 * - rank #3 is reserve
 * - no more than three caregivers are contacted for one
 *   request before manual sourcing / waitlist
 */

export const CAREGIVER_OFFER_RESPONSE_WINDOW_MINUTES =
  5;

/** First outreach pair response window (minutes). */
export const CAREGIVER_PAIR_INTEREST_WINDOW_MINUTES =
  CAREGIVER_OFFER_RESPONSE_WINDOW_MINUTES;

/** Overall automated matching deadline (minutes). */
export const CAREGIVER_CUSTOMER_PROMISE_MINUTES = 30;

export const CAREGIVER_MAX_OUTREACH_PER_REQUEST =
  3;

export type CaregiverOutreachCandidate = {
  caregiverId:
    string;

  rank:
    number;

  score:
    number;

  distanceKm?:
    number;

  sex?:
    CaregiverSex;
};

export type CaregiverOutreachPlan = {
  firstPair: CaregiverOutreachCandidate[];

  secondPair: CaregiverOutreachCandidate[];

  primary:
    CaregiverOutreachCandidate[];

  reserve?:
    CaregiverOutreachCandidate;

  responseWindowMinutes:
    number;

  maximumCaregiversToContact:
    number;
};

export type CaregiverMatchRun = {
  request:
    CustomerMatchingRequest;

  totalCandidates:
    number;

  eligibleCandidates:
    number;

  candidates:
    CaregiverMatchCandidate[];

  bestMatch?:
    CaregiverMatchCandidate;

  /*
   * Optional because matching can still be used for pure
   * diagnostics. The offer persistence layer can derive this
   * directly from candidates if the engine does not set it.
   */
  outreachPlan?:
    CaregiverOutreachPlan;

  generatedAt:
    string;
};

export type MatchingEngineConfig = {
  initialRadiusKm:
    number;

  expandedRadiusKm:
    number;

  maximumRadiusKm:
    number;

  routeRefinementCandidateCount:
    number;

  /*
   * Internal admin-quality labels only.
   *
   * These thresholds do NOT remove an otherwise operationally
   * eligible caregiver inside the maximum geographic boundary.
   */
  preferredMinimumScore:
    number;

  partialFitMinimumScore:
    number;
};

export const DEFAULT_MATCHING_ENGINE_CONFIG:
  MatchingEngineConfig = {
  initialRadiusKm:
    15,

  expandedRadiusKm:
    30,

  maximumRadiusKm:
    60,

  routeRefinementCandidateCount:
    5,

  preferredMinimumScore:
    75,

  partialFitMinimumScore:
    55,
};

export const MATCHING_SCORE_WEIGHTS = {
  careNeed:
    20,

  careContext:
    12,

  primaryLanguage:
    10,

  secondaryLanguage:
    4,

  availability:
    20,

  proximity:
    18,

  transportation:
    5,

  workType:
    5,

  continuity:
    4,

  experience:
    2,
} as const;

export const MATCHING_DISTANCE_BANDS = [
  {
    maximumKm:
      5,

    scoreMultiplier:
      1,
  },

  {
    maximumKm:
      10,

    scoreMultiplier:
      0.9,
  },

  {
    maximumKm:
      15,

    scoreMultiplier:
      0.8,
  },

  {
    maximumKm:
      25,

    scoreMultiplier:
      0.65,
  },

  {
    maximumKm:
      40,

    scoreMultiplier:
      0.45,
  },

  {
    maximumKm:
      60,

    scoreMultiplier:
      0.25,
  },
] as const;

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

export function isFiniteCoordinate(
  value:
    unknown
): value is number {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    )
  );
}

export function hasMatchingCoordinates(
  value:
    | {
        latitude?: number;
        longitude?: number;
      }
    | null
    | undefined
) {
  if (
    !value
  ) {
    return false;
  }

  return (
    isFiniteCoordinate(
      value.latitude
    ) &&
    isFiniteCoordinate(
      value.longitude
    )
  );
}

export function normalizeMatchingLanguage(
  value:
    unknown
) {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .trim()
    .toLocaleLowerCase(
      "en-CA"
    );
}

export function caregiverSpeaksLanguage(
  caregiver:
    CaregiverMatchingProfile,

  language?:
    string
) {
  const target =
    normalizeMatchingLanguage(
      language
    );

  if (
    !target
  ) {
    return false;
  }

  const languages =
    Array.isArray(
      caregiver?.languages
    )
      ? caregiver.languages
      : [];

  return languages.some(
    (
      item
    ) => {
      if (
        !item ||
        typeof item !==
          "object"
      ) {
        return false;
      }

      return (
        normalizeMatchingLanguage(
          item.language
        ) ===
        target
      );
    }
  );
}

export function caregiverHasCapability(
  caregiver:
    CaregiverMatchingProfile,

  capability:
    CaregiverCapabilityId
) {
  const capabilityIds =
    Array.isArray(
      caregiver?.capabilityIds
    )
      ? caregiver.capabilityIds
      : [];

  return capabilityIds.includes(
    capability
  );
}

export function caregiverHasAnyCapability(
  caregiver:
    CaregiverMatchingProfile,

  capabilities?:
    | CaregiverCapabilityId[]
    | null
) {
  const requestedCapabilities =
    Array.isArray(
      capabilities
    )
      ? capabilities
      : [];

  if (
    requestedCapabilities.length ===
    0
  ) {
    return true;
  }

  return requestedCapabilities.some(
    (
      capability
    ) =>
      caregiverHasCapability(
        caregiver,
        capability
      )
  );
}

export function caregiverHasAllCapabilities(
  caregiver:
    CaregiverMatchingProfile,

  capabilities?:
    | CaregiverCapabilityId[]
    | null
) {
  const requestedCapabilities =
    Array.isArray(
      capabilities
    )
      ? capabilities
      : [];

  return requestedCapabilities.every(
    (
      capability
    ) =>
      caregiverHasCapability(
        caregiver,
        capability
      )
  );
}

export function buildCaregiverOutreachPlan(
  candidates:
    CaregiverMatchCandidate[]
):
  CaregiverOutreachPlan {
  const ranked =
    [
      ...candidates,
    ]
      .filter(
        (
          candidate
        ) =>
          candidate.eligibility
            .eligible
      )
      .sort(
        (
          a,
          b
        ) =>
          (
            a.rank ??
            Number.MAX_SAFE_INTEGER
          ) -
          (
            b.rank ??
            Number.MAX_SAFE_INTEGER
          )
      )
      .slice(
        0,
        CAREGIVER_MAX_OUTREACH_PER_REQUEST
      );

  const mapped =
    ranked.map(
      (
        candidate,
        index
      ): CaregiverOutreachCandidate => ({
        caregiverId:
          candidate.caregiver
            .caregiverId,

        rank:
          candidate.rank ??
          index +
            1,

        score:
          candidate.score
            .percentage,

        distanceKm:
          candidate.distance
            ?.distanceKm,

        sex:
          candidate.caregiver
            .sex,
      })
    );

  return {
    firstPair: mapped.slice(0, 2),

    secondPair: mapped.slice(2, CAREGIVER_MAX_OUTREACH_PER_REQUEST),

    primary:
      mapped.slice(
        0,
        2
      ),

    reserve:
      mapped[2],

    responseWindowMinutes:
      CAREGIVER_OFFER_RESPONSE_WINDOW_MINUTES,

    maximumCaregiversToContact:
      CAREGIVER_MAX_OUTREACH_PER_REQUEST,
  };
}

