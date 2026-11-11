import {
  getCareContextById,
  getCareNeedById,
  getCaregiverCapabilitySignals,
  normalizeCareContextSelection,
  normalizeCareNeedSelection,
  type CareContextId,
  type CaregiverCapabilityId,
  type CareNeedId,
} from "./careTaxonomy";

import {
  DEFAULT_MATCHING_ENGINE_CONFIG,
  MATCHING_DISTANCE_BANDS,
  MATCHING_SCORE_WEIGHTS,
  caregiverHasCapability,
  caregiverSpeaksLanguage,
  hasMatchingCoordinates,
  type CaregiverEligibilityResult,
  type CaregiverMatchCandidate,
  type CaregiverMatchRun,
  type CaregiverMatchingProfile,
  type CustomerMatchingRequest,
  type MatchingDistanceResult,
  type MatchingEngineConfig,
  type MatchingSignal,
  type MatchingScoreBreakdown,
} from "./matchingTypes";

/*
 * ============================================================
 * CARERITY CAREGIVER MATCHING ENGINE
 * ============================================================
 *
 * Matching philosophy:
 *
 * 1. Do NOT compare customer wording directly with caregiver
 *    wording.
 *
 * 2. Use canonical taxonomy/capability mappings.
 *
 * 3. Do NOT over-filter caregivers merely because a specific
 *    capability phrase is missing.
 *
 * 4. Approved PSWs / qualified caregivers are treated as
 *    broad-care generalists for ordinary non-clinical
 *    home-care functions.
 *
 * 5. Specific capability alignment improves ranking.
 *
 * 6. Proximity, availability, language, work arrangement,
 *    transportation and experience can compensate for
 *    weaker taxonomy alignment.
 *
 * 7. Only genuine operational/safety incompatibilities
 *    should remove a caregiver from the candidate pool.
 *
 * 8. Partial-fit candidates remain possible where no
 *    ideal caregiver is available.
 *
 * 9. Google Routes can refine the finalists later.
 *
 * ============================================================
 */

/*
 * ============================================================
 * INTERNAL MATCHING MODEL
 * ============================================================
 */

type NeedAssessment = {
  needId: CareNeedId;
  matched: boolean;
  exactCapabilityMatches: CaregiverCapabilityId[];
  generalistCovered: boolean;
};

type ContextAssessment = {
  contextId: CareContextId;
  matched: boolean;
  exactCapabilityMatches: CaregiverCapabilityId[];
  generalistCovered: boolean;
};

type CapabilityAssessment = {
  needAssessments: NeedAssessment[];
  contextAssessments: ContextAssessment[];

  matchedNeedCount: number;
  totalNeedCount: number;

  matchedContextCount: number;
  totalContextCount: number;

  unmatchedCapabilities: CaregiverCapabilityId[];

  exactCapabilityCount: number;

  generalistCoverageCount: number;
};

type MatchCandidateOptions = {
  config: MatchingEngineConfig;
};

/*
 * ============================================================
 * MVP CAREGIVER OUTREACH PLAN
 * ============================================================
 *
 * Matching ranks the eligible pool. The offer/orchestration
 * layer can then contact the first two caregivers together and
 * keep the third caregiver as the single reserve candidate.
 *
 * Sex does NOT change eligibility or force a reorder. If the
 * naturally-ranked finalists happen to include a male and a
 * female caregiver, the customer can receive that natural choice.
 * ============================================================
 */

export const INITIAL_CAREGIVER_OUTREACH_COUNT = 2;
export const MAX_CAREGIVER_OUTREACH_PER_REQUEST = 3;
export const DEFAULT_CAREGIVER_RESPONSE_WINDOW_MINUTES = 5;

export type CaregiverOutreachPlan = {
  initialCandidates: CaregiverMatchCandidate[];
  reserveCandidate?: CaregiverMatchCandidate;
  maximumCaregiversToContact: number;
  responseWindowMinutes: number;
};

/*
 * ============================================================
 * GENERALIST CAPABILITY RULES
 * ============================================================
 *
 * PSWs are generalists across many routine home-care tasks.
 *
 * These capabilities should NOT become hard exclusions when
 * absent from a caregiver's explicit capability list.
 *
 * Example:
 *
 * A PSW may absolutely be suitable for companionship,
 * personal care, meal support, mobility assistance or
 * housekeeping even if an older onboarding record did not
 * contain the exact capability ID.
 *
 * The matching engine therefore gives generalist credit.
 *
 * More specialized contexts such as dementia, cancer,
 * mental-health support, etc. remain stronger ranking
 * signals when explicitly present.
 * ============================================================
 */

const GENERALIST_PSW_CAPABILITIES:
  CaregiverCapabilityId[] = [
  "personal_care",
  "bathing_hygiene",
  "dressing_grooming",
  "toileting",

  "mobility_assistance",
  "mobility_support",
  "transfer_assistance",

  "meal_preparation",
  "medication_reminders",

  "companionship",
  "light_housekeeping",
  "respite_care",

  "safety_supervision",
];

/*
 * These remain broader/specialized context signals.
 *
 * Missing them does NOT automatically remove the caregiver,
 * but explicit experience should materially improve ranking.
 */
const SPECIALIZED_CAPABILITIES:
  CaregiverCapabilityId[] = [
  "dementia_memory_support",
  "diabetes_support",
  "cancer_support",
  "mental_health_support",
  "fall_prevention",
  "post_hospital_support",
  "chronic_condition_support",
  "immunocompromised_support",
  "hearing_support",
  "vision_support",
  "allergy_awareness",
];

/*
 * Environmental compatibility is different.
 *
 * Example:
 * If the customer has pets and caregiver explicitly says
 * they cannot work around pets, that could eventually become
 * a hard incompatibility.
 *
 * At present our profile only stores positive capability IDs,
 * so absence remains a soft negative rather than exclusion.
 */
const ENVIRONMENTAL_CAPABILITIES:
  CaregiverCapabilityId[] = [
  "pet_friendly",
  "smoke_environment_acceptance",
  "allergy_awareness",
];

/*
 * ============================================================
 * PUBLIC MATCH FUNCTION
 * ============================================================
 */

export function matchCaregivers(
  rawRequest: CustomerMatchingRequest,
  caregivers: CaregiverMatchingProfile[],
  config:
    MatchingEngineConfig =
      DEFAULT_MATCHING_ENGINE_CONFIG
): CaregiverMatchRun {
  const request =
    normalizeMatchingRequest(
      rawRequest
    );

  /*
   * Normalize persisted caregiver profiles at the engine boundary.
   * Older records can be missing array fields even when the current
   * TypeScript contract expects them.
   */
  const normalizedCaregivers =
    Array.isArray(
      caregivers
    )
      ? caregivers
          .filter(
            (
              caregiver
            ): caregiver is CaregiverMatchingProfile =>
              Boolean(
                caregiver &&
                typeof caregiver ===
                  "object"
              )
          )
          .map(
            normalizeCaregiverMatchingProfile
          )
      : [];

  const candidateOptions:
    MatchCandidateOptions = {
    config,
  };

  const candidates =
    normalizedCaregivers
      .map(
        (
          caregiver
        ) =>
          buildCaregiverCandidate(
            request,
            caregiver,
            candidateOptions
          )
      )
      .filter(
        (
          candidate
        ) =>
          candidate.eligibility
            .eligible
      )
      .sort(
        (a, b) => compareCandidates(a, b, request.caregiverGenderPreference)
      )
      .map(
        (
          candidate,
          index
        ) => ({
          ...candidate,

          rank:
            index + 1,
        })
      );

  const bestMatch =
    candidates[0];

  return {
    request,

    totalCandidates:
      normalizedCaregivers.length,

    eligibleCandidates:
      candidates.length,

    candidates,

    bestMatch,

    generatedAt:
      new Date()
        .toISOString(),
  };
}

/*
 * ============================================================
 * SINGLE CANDIDATE
 * ============================================================
 */

export function buildCaregiverCandidate(
  request:
    CustomerMatchingRequest,

  caregiver:
    CaregiverMatchingProfile,

  options?: Partial<
    MatchCandidateOptions
  >
): CaregiverMatchCandidate {
  const config =
    options?.config ||
    DEFAULT_MATCHING_ENGINE_CONFIG;

  const normalizedCaregiver =
    normalizeCaregiverMatchingProfile(
      caregiver
    );

  const eligibility =
    evaluateCaregiverEligibility(
      request,
      normalizedCaregiver,
      config
    );

  const distance =
    calculateCandidateDistance(
      request,
      normalizedCaregiver
    );

  const capabilityAssessment =
    assessCapabilities(
      request,
      normalizedCaregiver
    );

  const signals =
    buildMatchingSignals(
      request,
      normalizedCaregiver,
      distance,
      capabilityAssessment
    );

  const score =
    calculateScoreBreakdown(
      request,
      normalizedCaregiver,
      distance,
      capabilityAssessment,
      signals
    );

  const unmatchedCapabilityIds =
    capabilityAssessment
      .unmatchedCapabilities;

  const partialFit =
    determinePartialFit(
      eligibility,
      score,
      capabilityAssessment,
      config
    );

  return {
    caregiver:
      normalizedCaregiver,

    eligibility,

    distance,

    signals,

    score,

    requiresRouteRefinement:
      Boolean(
        eligibility.eligible &&
        distance &&
        distance.distanceKm <=
          config.maximumRadiusKm
      ),

    partialFit,

    unmatchedCapabilityIds,
  };
}

/*
 * ============================================================
 * REQUEST NORMALIZATION
 * ============================================================
 */

export function normalizeMatchingRequest(
  request:
    CustomerMatchingRequest
): CustomerMatchingRequest {
  const careNeedIds =
    normalizeCareNeedSelection(
      Array.isArray(
        request.careNeedIds
      )
        ? request.careNeedIds
        : []
    );

  const careContextIds =
    normalizeCareContextSelection(
      Array.isArray(
        request.careContextIds
      )
        ? request.careContextIds
        : []
    );

  return {
    ...request,

    careNeedIds,

    careContextIds,

    primaryLanguage:
      cleanOptionalString(
        request.primaryLanguage
      ),

    secondaryLanguage:
      cleanOptionalString(
        request.secondaryLanguage
      ),

    address:
      cleanOptionalString(
        request.address
      ),

    city:
      cleanOptionalString(
        request.city
      ),

    province:
      cleanOptionalString(
        request.province
      ),

    postalCode:
      cleanOptionalString(
        request.postalCode
      ),

    startTime:
      cleanOptionalString(
        request.startTime
      ),

    endTime:
      cleanOptionalString(
        request.endTime
      ),
  };
}

/*
 * ============================================================
 * HARD ELIGIBILITY
 * ============================================================
 *
 * IMPORTANT:
 *
 * Capability taxonomy mismatches are generally NOT used here.
 *
 * That is deliberate.
 *
 * We want nearby, approved, available PSWs to remain
 * candidates even if exact capability wording is absent.
 *
 * True exclusions remain operational.
 * ============================================================
 */

export function evaluateCaregiverEligibility(
  request:
    CustomerMatchingRequest,

  caregiver:
    CaregiverMatchingProfile,

  config:
    MatchingEngineConfig =
      DEFAULT_MATCHING_ENGINE_CONFIG
): CaregiverEligibilityResult {
  const failures:
    CaregiverEligibilityResult["failures"] =
      [];

  if (
    !caregiver ||
    !caregiver.caregiverId
  ) {
    failures.push({
      code:
        "invalid_candidate",

      message:
        "Caregiver record is invalid.",
    });

    return {
      eligible:
        false,

      failures,
    };
  }

  if (
    caregiver.applicationStatus !==
    "approved"
  ) {
    failures.push({
      code:
        "not_approved",

      message:
        "Caregiver is not approved.",
    });
  }

  if (
    caregiver.eligibleForMatching !==
    true
  ) {
    failures.push({
      code:
        "not_eligible_for_matching",

      message:
        "Caregiver is not currently eligible for matching.",
    });
  }

  if (
    caregiver.availableForWork !==
    true
  ) {
    failures.push({
      code:
        "not_available_for_work",

      message:
        "Caregiver is not currently available for work.",
    });
  }

  /*
   * Matching requires coordinates.
   *
   * This is one of the few strict location requirements.
   */
  if (
    !hasMatchingCoordinates(
      caregiver
    )
  ) {
    failures.push({
      code:
        "missing_location",

      message:
        "Caregiver location is unavailable.",
    });
  }

  /*
   * Location radius.
   *
   * We do NOT reject merely because a caregiver is
   * outside the first 15 km.
   *
   * We allow staged expansion up to maximumRadiusKm.
   */
  if (
    hasMatchingCoordinates(
      request
    ) &&
    hasMatchingCoordinates(
      caregiver
    )
  ) {
    const distanceKm =
      calculateHaversineDistanceKm(
        request.latitude!,
        request.longitude!,
        caregiver.latitude!,
        caregiver.longitude!
      );

    if (
      distanceKm >
      config.maximumRadiusKm
    ) {
      failures.push({
        code:
          "missing_location",

        message:
          `Caregiver is outside the current ${config.maximumRadiusKm} km automatic matching area.`,

        field:
          "distanceKm",

        value:
          distanceKm.toFixed(
            1
          ),
      });
    }
  }

  /*
   * Schedule conflict is hard.
   */
  if (
    !isCaregiverAvailableForRequest(
      request,
      caregiver
    )
  ) {
    failures.push({
      code:
        "schedule_conflict",

      message:
        "Caregiver is not available for the requested schedule.",
    });
  }

  /*
   * Temporary time off is hard.
   */
  if (
    isCaregiverTemporarilyUnavailable(
      request,
      caregiver
    )
  ) {
    failures.push({
      code:
        "temporary_time_off",

      message:
        "Caregiver is unavailable during the requested date.",
    });
  }

  /*
   * Driver / vehicle requirements are true operational
   * requirements when the customer explicitly needs them.
   */
  if (
    request.requiresDriver ===
      true &&
    caregiver.canDrive !==
      true
  ) {
    failures.push({
      code:
        "driver_required",

      message:
        "This request requires a caregiver who can drive.",
    });
  }

  if (
    request.requiresCaregiverVehicle ===
      true &&
    caregiver.ownsVehicle !==
      true
  ) {
    failures.push({
      code:
        "vehicle_required",

      message:
        "This request requires a caregiver with a vehicle.",
    });
  }

  if (
    request.requiresClientTransportation ===
      true &&
    caregiver.willingToTransportClient !==
      true
  ) {
    failures.push({
      code:
        "transport_required",

      message:
        "This request requires client transportation.",
    });
  }

  /*
   * Work arrangements are hard only when the customer
   * specifically requires that arrangement.
   */
  if (
    request.requiresLiveIn ===
      true &&
    caregiver.acceptsLiveIn !==
      true
  ) {
    failures.push({
      code:
        "live_in_not_accepted",

      message:
        "Caregiver does not accept live-in care.",
    });
  }

  if (
    request.requiresLiveOut ===
      true &&
    caregiver.acceptsLiveOut !==
      true
  ) {
    failures.push({
      code:
        "live_out_not_accepted",

      message:
        "Caregiver does not accept live-out care.",
    });
  }

  if (
    request.requiresOvernight ===
      true &&
    caregiver.acceptsOvernight !==
      true
  ) {
    failures.push({
      code:
        "overnight_not_accepted",

      message:
        "Caregiver does not accept overnight care.",
    });
  }

  // Explicit "only" selections are mandatory. Soft preferences never exclude.
  const genderPreference = request.caregiverGenderPreference;
  if (
    (genderPreference === "female_only" && caregiver.sex !== "female") ||
    (genderPreference === "male_only" && caregiver.sex !== "male")
  ) {
    failures.push({
      code: "sex_preference",
      message: "Caregiver does not meet the requested gender requirement.",
    });
  }

  return {
    eligible:
      failures.length ===
      0,

    failures,
  };
}

/*
 * ============================================================
 * CAPABILITY ASSESSMENT
 * ============================================================
 *
 * KEY DESIGN RULE:
 *
 * A care need definition may contain multiple compatible
 * caregiver capability IDs.
 *
 * We treat them as:
 *
 * "one or more of these indicates direct alignment"
 *
 * NOT:
 *
 * "caregiver must possess every ID."
 *
 * General PSW functions can also receive fallback coverage.
 * ============================================================
 */

function assessCapabilities(
  request:
    CustomerMatchingRequest,

  caregiver:
    CaregiverMatchingProfile
): CapabilityAssessment {
  const needAssessments:
    NeedAssessment[] =
      request.careNeedIds.map(
        (
          needId
        ) => {
          const definition =
            getCareNeedById(
              needId
            );

          const capabilities =
            definition
              ?.caregiverCapabilities ||
            [];

          const exactCapabilityMatches =
            capabilities.filter(
              (
                capability
              ) =>
                caregiverHasCapability(
                  caregiver,
                  capability
                )
            );

          const generalistCovered =
            exactCapabilityMatches.length ===
              0 &&
            canGeneralistCoverCapabilities(
              capabilities
            );

          return {
            needId,

            matched:
              exactCapabilityMatches.length >
                0 ||
              generalistCovered,

            exactCapabilityMatches,

            generalistCovered,
          };
        }
      );

  const contextAssessments:
    ContextAssessment[] =
      request.careContextIds.map(
        (
          contextId
        ) => {
          const definition =
            getCareContextById(
              contextId
            );

          const capabilities =
            definition
              ?.caregiverCapabilities ||
            [];

          const exactCapabilityMatches =
            capabilities.filter(
              (
                capability
              ) =>
                caregiverHasCapability(
                  caregiver,
                  capability
                )
            );

          /*
           * Context is handled more carefully.
           *
           * Generalist credit applies only if ALL
           * capabilities for the context are normal
           * PSW/generalist functions.
           *
           * Specialized conditions get weaker/no fallback
           * credit unless another capability provides support.
           */
          const generalistCovered =
            exactCapabilityMatches.length ===
              0 &&
            capabilities.length >
              0 &&
            capabilities.every(
              (
                capability
              ) =>
                GENERALIST_PSW_CAPABILITIES.includes(
                  capability
                )
            );

          return {
            contextId,

            matched:
              exactCapabilityMatches.length >
                0 ||
              generalistCovered,

            exactCapabilityMatches,

            generalistCovered,
          };
        }
      );

  const allRequestedCapabilities =
    getCaregiverCapabilitySignals(
      request.careNeedIds,
      request.careContextIds
    ).allCapabilities;

  const unmatchedCapabilities =
    allRequestedCapabilities.filter(
      (
        capability
      ) =>
        !caregiverHasCapability(
          caregiver,
          capability
        )
    );

  return {
    needAssessments,

    contextAssessments,

    matchedNeedCount:
      needAssessments.filter(
        (
          item
        ) =>
          item.matched
      ).length,

    totalNeedCount:
      needAssessments.length,

    matchedContextCount:
      contextAssessments.filter(
        (
          item
        ) =>
          item.matched
      ).length,

    totalContextCount:
      contextAssessments.length,

    unmatchedCapabilities,

    exactCapabilityCount:
      [
        ...needAssessments,
        ...contextAssessments,
      ].reduce(
        (
          total,
          item
        ) =>
          total +
          item
            .exactCapabilityMatches
            .length,
        0
      ),

    generalistCoverageCount:
      [
        ...needAssessments,
        ...contextAssessments,
      ].filter(
        (
          item
        ) =>
          item.generalistCovered
      ).length,
  };
}

/*
 * ============================================================
 * GENERALIST FALLBACK
 * ============================================================
 */

function canGeneralistCoverCapabilities(
  capabilities:
    CaregiverCapabilityId[]
) {
  if (
    capabilities.length ===
    0
  ) {
    /*
     * "Other" cannot be intelligently auto-matched.
     *
     * We keep caregiver eligible but award no direct
     * capability credit. Admin/manual review can later
     * inspect the free-text requirement.
     */
    return false;
  }

  return capabilities.some(
    (
      capability
    ) =>
      GENERALIST_PSW_CAPABILITIES.includes(
        capability
      )
  );
}

/*
 * ============================================================
 * SIGNAL BUILDING
 * ============================================================
 */

function buildMatchingSignals(
  request:
    CustomerMatchingRequest,

  caregiver:
    CaregiverMatchingProfile,

  distance:
    MatchingDistanceResult |
    undefined,

  assessment:
    CapabilityAssessment
): MatchingSignal[] {
  const signals:
    MatchingSignal[] = [];

  /*
   * ----------------------------------------------------------
   * CARE NEEDS
   * ----------------------------------------------------------
   */

  request.careNeedIds.forEach(
    (
      needId
    ) => {
      const definition =
        getCareNeedById(
          needId
        );

      const item =
        assessment
          .needAssessments
          .find(
            (
              assessmentItem
            ) =>
              assessmentItem.needId ===
              needId
          );

      if (
        !definition ||
        !item
      ) {
        return;
      }

      const exact =
        item.exactCapabilityMatches.length >
        0;

      const multiplier =
        exact
          ? 1
          : item.generalistCovered
            ? 0.7
            : 0;

      signals.push({
        id:
          `need:${needId}`,

        type:
          "care_need",

        level:
          "preferred",

        label:
          definition.label,

        weight:
          MATCHING_SCORE_WEIGHTS
            .careNeed,

        matched:
          item.matched,

        awardedScore:
          MATCHING_SCORE_WEIGHTS
            .careNeed *
          multiplier,

        explanation:
          exact
            ? "Caregiver has direct capability alignment."
            : item.generalistCovered
              ? "Covered through general PSW/home-care competency."
              : "No direct capability evidence found.",
      });
    }
  );

  /*
   * ----------------------------------------------------------
   * CARE CONTEXT
   * ----------------------------------------------------------
   */

  request.careContextIds.forEach(
    (
      contextId
    ) => {
      const definition =
        getCareContextById(
          contextId
        );

      const item =
        assessment
          .contextAssessments
          .find(
            (
              assessmentItem
            ) =>
              assessmentItem.contextId ===
              contextId
          );

      if (
        !definition ||
        !item
      ) {
        return;
      }

      const exact =
        item.exactCapabilityMatches.length >
        0;

      const multiplier =
        exact
          ? 1
          : item.generalistCovered
            ? 0.55
            : getSpecializedContextFallbackMultiplier(
                definition
                  .caregiverCapabilities
              );

      const awardedScore =
        MATCHING_SCORE_WEIGHTS
          .careContext *
        multiplier;

      signals.push({
        id:
          `context:${contextId}`,

        type:
          "care_context",

        level:
          "preferred",

        label:
          definition.label,

        weight:
          MATCHING_SCORE_WEIGHTS
            .careContext,

        matched:
          awardedScore >
          0,

        awardedScore,

        explanation:
          exact
            ? "Caregiver has direct context-specific experience."
            : item.generalistCovered
              ? "Context can reasonably be supported through general PSW competencies."
              : awardedScore >
                  0
                ? "No exact context capability recorded, but caregiver remains potentially suitable."
                : "No specific supporting context capability recorded.",
      });
    }
  );

  /*
   * ----------------------------------------------------------
   * PRIMARY LANGUAGE
   * ----------------------------------------------------------
   */

  if (
    request.primaryLanguage
      ?.trim()
  ) {
    const matched =
      caregiverSpeaksLanguage(
        caregiver,
        request.primaryLanguage
      );

    signals.push({
      id:
        "language:primary",

      type:
        "language",

      level:
        "preferred",

      label:
        `Primary language: ${request.primaryLanguage}`,

      weight:
        MATCHING_SCORE_WEIGHTS
          .primaryLanguage,

      matched,

      awardedScore:
        matched
          ? MATCHING_SCORE_WEIGHTS
              .primaryLanguage
          : 0,
    });
  }

  /*
   * ----------------------------------------------------------
   * SECONDARY LANGUAGE
   * ----------------------------------------------------------
   */

  if (
    request.secondaryLanguage
      ?.trim()
  ) {
    const matched =
      caregiverSpeaksLanguage(
        caregiver,
        request.secondaryLanguage
      );

    signals.push({
      id:
        "language:secondary",

      type:
        "language",

      level:
        "preferred",

      label:
        `Secondary language: ${request.secondaryLanguage}`,

      weight:
        MATCHING_SCORE_WEIGHTS
          .secondaryLanguage,

      matched,

      awardedScore:
        matched
          ? MATCHING_SCORE_WEIGHTS
              .secondaryLanguage
          : 0,
    });
  }

  /*
   * ----------------------------------------------------------
   * AVAILABILITY
   * ----------------------------------------------------------
   */

  const available =
    isCaregiverAvailableForRequest(
      request,
      caregiver
    );

  signals.push({
    id:
      "availability",

    type:
      "availability",

    level:
      "required",

    label:
      "Schedule availability",

    weight:
      MATCHING_SCORE_WEIGHTS
        .availability,

    matched:
      available,

    awardedScore:
      available
        ? MATCHING_SCORE_WEIGHTS
            .availability
        : 0,
  });

  /*
   * ----------------------------------------------------------
   * LOCATION
   * ----------------------------------------------------------
   */

  if (
    distance
  ) {
    const locationMultiplier =
      getDistanceScoreMultiplier(
        distance.distanceKm
      );

    signals.push({
      id:
        "location",

      type:
        "location",

      level:
        "preferred",

      label:
        "Caregiver proximity",

      weight:
        MATCHING_SCORE_WEIGHTS
          .proximity,

      matched:
        locationMultiplier >
        0,

      awardedScore:
        MATCHING_SCORE_WEIGHTS
          .proximity *
        locationMultiplier,

      explanation:
        `${distance.distanceKm.toFixed(
          1
        )} km straight-line distance.`,
    });
  }

  /*
   * ----------------------------------------------------------
   * TRANSPORTATION
   * ----------------------------------------------------------
   */

  const transportationRequested =
    request.requiresDriver ===
      true ||
    request.requiresCaregiverVehicle ===
      true ||
    request.requiresClientTransportation ===
      true;

  if (
    transportationRequested
  ) {
    const transportationMatched =
      (
        request.requiresDriver !==
          true ||
        caregiver.canDrive ===
          true
      ) &&
      (
        request.requiresCaregiverVehicle !==
          true ||
        caregiver.ownsVehicle ===
          true
      ) &&
      (
        request.requiresClientTransportation !==
          true ||
        caregiver.willingToTransportClient ===
          true
      );

    signals.push({
      id:
        "transportation",

      type:
        "transportation",

      level:
        "required",

      label:
        "Transportation requirements",

      weight:
        MATCHING_SCORE_WEIGHTS
          .transportation,

      matched:
        transportationMatched,

      awardedScore:
        transportationMatched
          ? MATCHING_SCORE_WEIGHTS
              .transportation
          : 0,
    });
  }

  /*
   * ----------------------------------------------------------
   * WORK TYPE
   * ----------------------------------------------------------
   */

  const workTypeRequested =
    request.requiresLiveIn ===
      true ||
    request.requiresLiveOut ===
      true ||
    request.requiresOvernight ===
      true;

  if (
    workTypeRequested
  ) {
    const workTypeMatched =
      (
        request.requiresLiveIn !==
          true ||
        caregiver.acceptsLiveIn ===
          true
      ) &&
      (
        request.requiresLiveOut !==
          true ||
        caregiver.acceptsLiveOut ===
          true
      ) &&
      (
        request.requiresOvernight !==
          true ||
        caregiver.acceptsOvernight ===
          true
      );

    signals.push({
      id:
        "work-type",

      type:
        request.requiresOvernight
          ? "overnight"
          : request.requiresLiveIn
            ? "live_in"
            : "live_out",

      level:
        "required",

      label:
        "Care arrangement",

      weight:
        MATCHING_SCORE_WEIGHTS
          .workType,

      matched:
        workTypeMatched,

      awardedScore:
        workTypeMatched
          ? MATCHING_SCORE_WEIGHTS
              .workType
          : 0,
    });
  }

  /*
   * ----------------------------------------------------------
   * CONTINUITY
   * ----------------------------------------------------------
   */

  if (
    request.preferSameCaregiver ===
    true
  ) {
    /*
     * Future:
     * compare with previous assigned caregiver.
     *
     * For now we keep this neutral so the matching model
     * already supports the concept without inventing data.
     */

    signals.push({
      id:
        "continuity",

      type:
        "continuity",

      level:
        "preferred",

      label:
        "Same caregiver preferred",

      /*
       * No prior assigned caregiver is available yet, so this
       * signal is not measurable. Keep it visible for Admin but
       * neutral in both numerator and denominator.
       */
      weight:
        0,

      matched:
        false,

      awardedScore:
        0,

      explanation:
        "Continuity comparison requires prior-caregiver assignment data.",
    });
  }

  /*
   * ----------------------------------------------------------
   * EXPERIENCE
   * ----------------------------------------------------------
   */

  const experienceScore =
    scoreExperience(
      caregiver.yearsExperience
    );

  signals.push({
    id:
      "experience",

    type:
      "qualification",

    level:
      "preferred",

    label:
      "Caregiving experience",

    weight:
      MATCHING_SCORE_WEIGHTS
        .experience,

    matched:
      experienceScore >
      0,

    awardedScore:
      experienceScore,
  });

  return signals;
}

/*
 * ============================================================
 * SCORE
 * ============================================================
 */

function calculateScoreBreakdown(
  request:
    CustomerMatchingRequest,

  caregiver:
    CaregiverMatchingProfile,

  distance:
    MatchingDistanceResult |
    undefined,

  assessment:
    CapabilityAssessment,

  signals:
    MatchingSignal[]
): MatchingScoreBreakdown {
  const capabilityScore =
    sumSignalScores(
      signals,
      "care_need"
    );

  const contextScore =
    sumSignalScores(
      signals,
      "care_context"
    );

  const languageScore =
    sumSignalScores(
      signals,
      "language"
    );

  const availabilityScore =
    sumSignalScores(
      signals,
      "availability"
    );

  const locationScore =
    sumSignalScores(
      signals,
      "location"
    );

  const transportationScore =
    sumSignalScores(
      signals,
      "transportation"
    );

  const workTypeScore =
    sumSignalScoresByTypes(
      signals,
      [
        "live_in",
        "live_out",
        "overnight",
      ]
    );

  const continuityScore =
    sumSignalScores(
      signals,
      "continuity"
    );

  const experienceScore =
    sumSignalScores(
      signals,
      "qualification"
    );

  const totalScore =
    capabilityScore +
    contextScore +
    languageScore +
    availabilityScore +
    locationScore +
    transportationScore +
    workTypeScore +
    continuityScore +
    experienceScore;

  const maximumPossibleScore =
    signals.reduce(
      (
        total,
        signal
      ) =>
        total +
        signal.weight,
      0
    );

  const percentage =
    maximumPossibleScore >
    0
      ? Math.round(
          (
            totalScore /
            maximumPossibleScore
          ) *
            100
        )
      : 0;

  return {
    capabilityScore:
      roundScore(
        capabilityScore
      ),

    contextScore:
      roundScore(
        contextScore
      ),

    languageScore:
      roundScore(
        languageScore
      ),

    availabilityScore:
      roundScore(
        availabilityScore
      ),

    locationScore:
      roundScore(
        locationScore
      ),

    transportationScore:
      roundScore(
        transportationScore
      ),

    workTypeScore:
      roundScore(
        workTypeScore
      ),

    continuityScore:
      roundScore(
        continuityScore
      ),

    experienceScore:
      roundScore(
        experienceScore
      ),

    totalScore:
      roundScore(
        totalScore
      ),

    maximumPossibleScore:
      roundScore(
        maximumPossibleScore
      ),

    percentage,
  };
}

/*
 * ============================================================
 * PARTIAL FIT
 * ============================================================
 *
 * Partial fit means:
 *
 * - caregiver passes true operational eligibility
 * - caregiver does not have perfect capability alignment
 * - overall score is still commercially/practically useful
 *
 * This supports the previously established Carerity behavior:
 *
 * if no perfect match exists, present the closest suitable
 * caregiver rather than immediately failing the request.
 * ============================================================
 */

function determinePartialFit(
  eligibility:
    CaregiverEligibilityResult,

  score:
    MatchingScoreBreakdown,

  assessment:
    CapabilityAssessment,

  config:
    MatchingEngineConfig
) {
  if (
    !eligibility.eligible
  ) {
    return false;
  }

  const hasCapabilityGap =
    assessment
      .unmatchedCapabilities
      .length >
    0;

  /*
   * Partial fit is now an ADMIN classification only.
   * It must not suppress an otherwise eligible caregiver.
   */
  return hasCapabilityGap;
}

/*
 * ============================================================
 * SPECIALIZED CONTEXT FALLBACK
 * ============================================================
 *
 * We deliberately give some fallback score rather than zero.
 *
 * Example:
 *
 * A nearby experienced PSW without a recorded
 * "cancer_support" tag should not disappear completely.
 *
 * They simply rank below a similarly suitable PSW who does
 * have explicit cancer-support experience.
 * ============================================================
 */

function getSpecializedContextFallbackMultiplier(
  capabilities?:
    | CaregiverCapabilityId[]
    | null
) {
  const safeCapabilities =
    Array.isArray(
      capabilities
    )
      ? capabilities
      : [];

  if (
    safeCapabilities.length ===
    0
  ) {
    return 0;
  }

  const containsSpecialized =
    safeCapabilities.some(
      (
        capability
      ) =>
        SPECIALIZED_CAPABILITIES.includes(
          capability
        )
    );

  if (
    containsSpecialized
  ) {
    return 0.25;
  }

  const containsEnvironmental =
    safeCapabilities.some(
      (
        capability
      ) =>
        ENVIRONMENTAL_CAPABILITIES.includes(
          capability
        )
    );

  if (
    containsEnvironmental
  ) {
    return 0.2;
  }

  return 0.35;
}

/*
 * ============================================================
 * AVAILABILITY
 * ============================================================
 */

export function isCaregiverAvailableForRequest(
  request:
    CustomerMatchingRequest,

  caregiver:
    CaregiverMatchingProfile
) {
  /*
   * If no schedule has been selected yet, do not reject.
   */
  if (
    !request.careDate &&
    !request.recurringDays?.length
  ) {
    return true;
  }

  /*
   * Recurring.
   */
  if (
    request.scheduleType ===
      "Recurring Care" &&
    request.recurringDays?.length
  ) {
    return request
      .recurringDays
      .every(
        (
          day
        ) =>
          caregiverAvailableOnDay(
            caregiver,
            day,
            request.startTime,
            request.endTime
          )
      );
  }

  /*
   * One-time.
   */
  if (
    request.careDate
  ) {
    const day =
      getDayNameFromDate(
        request.careDate
      );

    if (
      !day
    ) {
      return false;
    }

    return caregiverAvailableOnDay(
      caregiver,
      day,
      request.startTime,
      request.endTime
    );
  }

  return true;
}

function caregiverAvailableOnDay(
  caregiver:
    CaregiverMatchingProfile,

  day:
    string,

  requestedStart?:
    string,

  requestedEnd?:
    string
) {
  const availability =
    caregiver.weeklyAvailability;

  if (
    !availability
  ) {
    return false;
  }

  const dayRecord =
    availability[
      day as keyof typeof availability
    ];

  if (
    !dayRecord?.enabled
  ) {
    return false;
  }

  /*
   * If request has no exact times yet,
   * enabled day is enough.
   */
  if (
    !requestedStart ||
    !requestedEnd
  ) {
    return true;
  }

  if (
    !dayRecord.startTime ||
    !dayRecord.endTime
  ) {
    return false;
  }

  return timeRangeContains(
    dayRecord.startTime,
    dayRecord.endTime,
    requestedStart,
    requestedEnd
  );
}

/*
 * ============================================================
 * TEMPORARY TIME OFF
 * ============================================================
 */

function isCaregiverTemporarilyUnavailable(
  request:
    CustomerMatchingRequest,

  caregiver:
    CaregiverMatchingProfile
) {
  if (
    !request.careDate
  ) {
    return false;
  }

  if (
    !caregiver.temporaryTimeOffStart &&
    !caregiver.temporaryTimeOffEnd
  ) {
    return false;
  }

  const requestDate =
    dateValueToTimestamp(
      request.careDate
    );

  if (
    requestDate ===
    null
  ) {
    return false;
  }

  const start =
    caregiver.temporaryTimeOffStart
      ? dateValueToTimestamp(
          caregiver
            .temporaryTimeOffStart
        )
      : null;

  const end =
    caregiver.temporaryTimeOffEnd
      ? dateValueToTimestamp(
          caregiver
            .temporaryTimeOffEnd
        )
      : null;

  if (
    start !==
      null &&
    requestDate <
      start
  ) {
    return false;
  }

  if (
    end !==
      null &&
    requestDate >
      end
  ) {
    return false;
  }

  return true;
}

/*
 * ============================================================
 * DISTANCE
 * ============================================================
 */

export function calculateCandidateDistance(
  request:
    CustomerMatchingRequest,

  caregiver:
    CaregiverMatchingProfile
): MatchingDistanceResult | undefined {
  if (
    !hasMatchingCoordinates(
      request
    ) ||
    !hasMatchingCoordinates(
      caregiver
    )
  ) {
    return undefined;
  }

  const distanceKm =
    calculateHaversineDistanceKm(
      request.latitude!,
      request.longitude!,
      caregiver.latitude!,
      caregiver.longitude!
    );

  return {
    method:
      "haversine",

    distanceKm:
      roundDistance(
        distanceKm
      ),

    routeRefined:
      false,
  };
}

export function calculateHaversineDistanceKm(
  latitude1:
    number,

  longitude1:
    number,

  latitude2:
    number,

  longitude2:
    number
) {
  const earthRadiusKm =
    6371;

  const latitudeDelta =
    degreesToRadians(
      latitude2 -
        latitude1
    );

  const longitudeDelta =
    degreesToRadians(
      longitude2 -
        longitude1
    );

  const lat1 =
    degreesToRadians(
      latitude1
    );

  const lat2 =
    degreesToRadians(
      latitude2
    );

  const a =
    Math.sin(
      latitudeDelta /
        2
    ) **
      2 +
    Math.sin(
      longitudeDelta /
        2
    ) **
      2 *
      Math.cos(
        lat1
      ) *
      Math.cos(
        lat2
      );

  const c =
    2 *
    Math.atan2(
      Math.sqrt(
        a
      ),
      Math.sqrt(
        1 -
          a
      )
    );

  return (
    earthRadiusKm *
    c
  );
}

/*
 * ============================================================
 * DISTANCE SCORE
 * ============================================================
 */

function getDistanceScoreMultiplier(
  distanceKm:
    number
) {
  const band =
    MATCHING_DISTANCE_BANDS.find(
      (
        item
      ) =>
        distanceKm <=
        item.maximumKm
    );

  return (
    band
      ?.scoreMultiplier ||
    0
  );
}

/*
 * ============================================================
 * EXPERIENCE
 * ============================================================
 */

function scoreExperience(
  yearsExperience?:
    number
) {
  const maximum =
    MATCHING_SCORE_WEIGHTS
      .experience;

  if (
    typeof yearsExperience !==
      "number" ||
    !Number.isFinite(
      yearsExperience
    ) ||
    yearsExperience <
      0
  ) {
    return 0;
  }

  if (
    yearsExperience >=
    5
  ) {
    return maximum;
  }

  if (
    yearsExperience >=
    3
  ) {
    return (
      maximum *
      0.85
    );
  }

  if (
    yearsExperience >=
    1
  ) {
    return (
      maximum *
      0.65
    );
  }

  return (
    maximum *
    0.35
  );
}

/*
 * ============================================================
 * RANKING
 * ============================================================
 *
 * Final order:
 *
 * 1. score percentage
 * 2. direct capability alignment
 * 3. proximity
 * 4. experience
 *
 * This means proximity can absolutely help a generalist PSW
 * rise above a poorly located candidate.
 *
 * But proximity does not automatically beat a clearly much
 * stronger/specialized caregiver.
 * ============================================================
 */

function compareCandidates(
  a: CaregiverMatchCandidate,
  b: CaregiverMatchCandidate,
  genderPreference?: CustomerMatchingRequest["caregiverGenderPreference"]
) {
  // Soft preference: add a modest ranking-only bonus.
  // Eligibility and the underlying clinical/capability score are unchanged.
  const preferredSex =
    genderPreference === "female_preferred"
      ? "female"
      : genderPreference === "male_preferred"
        ? "male"
        : undefined;

  const preferenceBonus = 5;
  const aAdjustedScore =
    a.score.percentage +
    (preferredSex && a.caregiver.sex === preferredSex
      ? preferenceBonus
      : 0);
  const bAdjustedScore =
    b.score.percentage +
    (preferredSex && b.caregiver.sex === preferredSex
      ? preferenceBonus
      : 0);

  if (bAdjustedScore !== aAdjustedScore) {
    return bAdjustedScore - aAdjustedScore;
  }

  if (b.score.percentage !== a.score.percentage) {
    return b.score.percentage - a.score.percentage;
  }

  if (b.score.capabilityScore !== a.score.capabilityScore) {
    return b.score.capabilityScore - a.score.capabilityScore;
  }

  const distanceA =
    a.distance?.distanceKm ??
    Number.POSITIVE_INFINITY;

  const distanceB =
    b.distance?.distanceKm ??
    Number.POSITIVE_INFINITY;

  if (
    distanceA !==
    distanceB
  ) {
    return (
      distanceA -
      distanceB
    );
  }

  return (
    (
      b.caregiver
        .yearsExperience ||
      0
    ) -
    (
      a.caregiver
        .yearsExperience ||
      0
    )
  );
}

/*
 * ============================================================
 * TOP CANDIDATES FOR ROUTE REFINEMENT
 * ============================================================
 *
 * Later, Google Routes should be called only for finalists.
 *
 * We do NOT need to pay for routing every caregiver in the
 * database.
 * ============================================================
 */

export function getCandidatesForRouteRefinement(
  run:
    CaregiverMatchRun,

  config:
    MatchingEngineConfig =
      DEFAULT_MATCHING_ENGINE_CONFIG
) {
  return run.candidates
    .filter(
      (
        candidate
      ) =>
        candidate
          .requiresRouteRefinement
    )
    .slice(
      0,
      config
        .routeRefinementCandidateCount
    );
}

/*
 * ============================================================
 * APPLY ROUTE RESULT
 * ============================================================
 *
 * This lets the future Google Routes service update the
 * finalist without rewriting the whole matching engine.
 * ============================================================
 */

export function applyRouteDistanceToCandidate(
  candidate:
    CaregiverMatchCandidate,

  distanceKm:
    number,

  durationMinutes?:
    number
): CaregiverMatchCandidate {
  const distance:
    MatchingDistanceResult = {
    method:
      "google_routes",

    distanceKm:
      roundDistance(
        distanceKm
      ),

    durationMinutes:
      typeof durationMinutes ===
        "number" &&
      Number.isFinite(
        durationMinutes
      )
        ? Math.round(
            durationMinutes
          )
        : undefined,

    routeRefined:
      true,
  };

  const locationSignal =
    candidate.signals.find(
      (
        signal
      ) =>
        signal.type ===
        "location"
    );

  const multiplier =
    getDistanceScoreMultiplier(
      distanceKm
    );

  const updatedSignals =
    candidate.signals.map(
      (
        signal
      ) => {
        if (
          signal !==
          locationSignal
        ) {
          return signal;
        }

        return {
          ...signal,

          matched:
            multiplier >
            0,

          awardedScore:
            MATCHING_SCORE_WEIGHTS
              .proximity *
            multiplier,

          explanation:
            typeof durationMinutes ===
              "number"
              ? `${distanceKm.toFixed(
                  1
                )} km road distance, approximately ${Math.round(
                  durationMinutes
                )} minutes travel time.`
              : `${distanceKm.toFixed(
                  1
                )} km road distance.`,
        };
      }
    );

  /*
   * Recalculate totals from signals.
   */
  const score =
    rebuildScoreFromSignals(
      updatedSignals
    );

  return {
    ...candidate,

    distance,

    signals:
      updatedSignals,

    score,

    requiresRouteRefinement:
      false,
  };
}

/*
 * ============================================================
 * RERANK AFTER ROUTE REFINEMENT
 * ============================================================
 */

export function rerankCaregiverMatches(
  run:
    CaregiverMatchRun
): CaregiverMatchRun {
  const candidates =
    [...run.candidates]
      .sort(
        (a, b) => compareCandidates(a, b, run.request.caregiverGenderPreference)
      )
      .map(
        (
          candidate,
          index
        ) => ({
          ...candidate,

          rank:
            index + 1,
        })
      );

  return {
    ...run,

    candidates,

    bestMatch:
      candidates[0],

    generatedAt:
      new Date()
        .toISOString(),
  };
}

/*
 * ============================================================
 * BEST MATCH / PARTIAL MATCH HELPERS
 * ============================================================
 *
 * MVP RULE:
 *
 * Once a caregiver passes hard eligibility, score affects ranking
 * rather than whether the caregiver disappears. The configured
 * maximum radius remains the hard geographic boundary.
 * ============================================================
 */

export function getBestAutomaticMatch(
  run:
    CaregiverMatchRun,

  _config:
    MatchingEngineConfig =
      DEFAULT_MATCHING_ENGINE_CONFIG
) {
  return run.bestMatch;
}

export function getBestPartialFitMatch(
  run:
    CaregiverMatchRun,

  _config:
    MatchingEngineConfig =
      DEFAULT_MATCHING_ENGINE_CONFIG
) {
  return run.candidates.find(
    (
      candidate
    ) =>
      candidate.eligibility
        .eligible &&
      candidate.partialFit ===
        true
  );
}

/*
 * ============================================================
 * MVP OUTREACH SHORTLIST
 * ============================================================
 *
 * Contact ranked #1 and #2 together. Candidate #3 is the reserve.
 * The later orchestration layer owns the 5-minute timer, accept /
 * decline responses, notifications and customer presentation.
 * ============================================================
 */

export function getCaregiverOutreachPlan(
  run:
    CaregiverMatchRun,

  responseWindowMinutes =
    DEFAULT_CAREGIVER_RESPONSE_WINDOW_MINUTES
): CaregiverOutreachPlan {
  const eligibleCandidates =
    run.candidates
      .filter(
        (
          candidate
        ) =>
          candidate.eligibility
            .eligible
      )
      .slice(
        0,
        MAX_CAREGIVER_OUTREACH_PER_REQUEST
      );

  return {
    initialCandidates:
      eligibleCandidates.slice(
        0,
        INITIAL_CAREGIVER_OUTREACH_COUNT
      ),

    reserveCandidate:
      eligibleCandidates[
        INITIAL_CAREGIVER_OUTREACH_COUNT
      ],

    maximumCaregiversToContact:
      MAX_CAREGIVER_OUTREACH_PER_REQUEST,

    responseWindowMinutes:
      Math.max(
        1,
        Math.round(
          responseWindowMinutes
        )
      ),
  };
}

/*
 * ============================================================
 * MATCHING OUTCOME
 * ============================================================
 *
 * "partial_fit" is an Admin quality descriptor. It does not mean
 * the caregiver is hidden from the customer offer workflow.
 * ============================================================
 */

export type CaregiverMatchingOutcome =
  | {
      type:
        "ideal_match";

      candidate:
        CaregiverMatchCandidate;
    }
  | {
      type:
        "partial_fit";

      candidate:
        CaregiverMatchCandidate;
    }
  | {
      type:
        "waitlist";

      candidate?:
        CaregiverMatchCandidate;
    };

export function getCaregiverMatchingOutcome(
  run:
    CaregiverMatchRun,

  _config:
    MatchingEngineConfig =
      DEFAULT_MATCHING_ENGINE_CONFIG
): CaregiverMatchingOutcome {
  const candidate =
    run.bestMatch;

  if (
    !candidate
  ) {
    return {
      type:
        "waitlist",
    };
  }

  if (
    candidate.partialFit
  ) {
    return {
      type:
        "partial_fit",

      candidate,
    };
  }

  return {
    type:
      "ideal_match",

    candidate,
  };
}

/*
 * ============================================================
 * SCORE REBUILD
 * ============================================================
 */

function rebuildScoreFromSignals(
  signals:
    MatchingSignal[]
): MatchingScoreBreakdown {
  const capabilityScore =
    sumSignalScores(
      signals,
      "care_need"
    );

  const contextScore =
    sumSignalScores(
      signals,
      "care_context"
    );

  const languageScore =
    sumSignalScores(
      signals,
      "language"
    );

  const availabilityScore =
    sumSignalScores(
      signals,
      "availability"
    );

  const locationScore =
    sumSignalScores(
      signals,
      "location"
    );

  const transportationScore =
    sumSignalScores(
      signals,
      "transportation"
    );

  const workTypeScore =
    sumSignalScoresByTypes(
      signals,
      [
        "live_in",
        "live_out",
        "overnight",
      ]
    );

  const continuityScore =
    sumSignalScores(
      signals,
      "continuity"
    );

  const experienceScore =
    sumSignalScores(
      signals,
      "qualification"
    );

  const totalScore =
    signals.reduce(
      (
        total,
        signal
      ) =>
        total +
        signal.awardedScore,
      0
    );

  const maximumPossibleScore =
    signals.reduce(
      (
        total,
        signal
      ) =>
        total +
        signal.weight,
      0
    );

  const percentage =
    maximumPossibleScore >
    0
      ? Math.round(
          (
            totalScore /
            maximumPossibleScore
          ) *
            100
        )
      : 0;

  return {
    capabilityScore:
      roundScore(
        capabilityScore
      ),

    contextScore:
      roundScore(
        contextScore
      ),

    languageScore:
      roundScore(
        languageScore
      ),

    availabilityScore:
      roundScore(
        availabilityScore
      ),

    locationScore:
      roundScore(
        locationScore
      ),

    transportationScore:
      roundScore(
        transportationScore
      ),

    workTypeScore:
      roundScore(
        workTypeScore
      ),

    continuityScore:
      roundScore(
        continuityScore
      ),

    experienceScore:
      roundScore(
        experienceScore
      ),

    totalScore:
      roundScore(
        totalScore
      ),

    maximumPossibleScore:
      roundScore(
        maximumPossibleScore
      ),

    percentage,
  };
}

/*
 * ============================================================
 * SIGNAL TOTALS
 * ============================================================
 */

function sumSignalScores(
  signals:
    MatchingSignal[],

  type:
    MatchingSignal["type"]
) {
  return signals
    .filter(
      (
        signal
      ) =>
        signal.type ===
        type
    )
    .reduce(
      (
        total,
        signal
      ) =>
        total +
        signal.awardedScore,
      0
    );
}

function sumSignalScoresByTypes(
  signals:
    MatchingSignal[],

  types:
    MatchingSignal["type"][]
) {
  const safeTypes =
    Array.isArray(
      types
    )
      ? types
      : [];

  return signals
    .filter(
      (
        signal
      ) =>
        safeTypes.includes(
          signal.type
        )
    )
    .reduce(
      (
        total,
        signal
      ) =>
        total +
        signal.awardedScore,
      0
    );
}

/*
 * ============================================================
 * CAREGIVER PROFILE NORMALIZATION
 * ============================================================
 */

function normalizeCaregiverMatchingProfile(
  caregiver:
    CaregiverMatchingProfile
): CaregiverMatchingProfile {
  const safeCaregiver =
    caregiver &&
    typeof caregiver ===
      "object"
      ? caregiver
      : ({
          caregiverId:
            "",
        } as CaregiverMatchingProfile);

  return {
    ...safeCaregiver,

    caregiverId:
      typeof safeCaregiver.caregiverId ===
        "string"
        ? safeCaregiver.caregiverId
        : "",

    capabilityIds:
      Array.isArray(
        safeCaregiver.capabilityIds
      )
        ? safeCaregiver.capabilityIds
        : [],

    languages:
      Array.isArray(
        safeCaregiver.languages
      )
        ? safeCaregiver.languages.filter(
            (
              item
            ) =>
              Boolean(
                item &&
                typeof item ===
                  "object" &&
                typeof item.language ===
                  "string"
              )
          )
        : [],

    qualificationTypes:
      Array.isArray(
        safeCaregiver.qualificationTypes
      )
        ? safeCaregiver.qualificationTypes
        : [],
  };
}

/*
 * ============================================================
 * DATE / TIME HELPERS
 * ============================================================
 */

function getDayNameFromDate(
  value:
    string
) {
  const timestamp =
    dateValueToTimestamp(
      value
    );

  if (
    timestamp ===
    null
  ) {
    return "";
  }

  return new Date(
    timestamp
  ).toLocaleDateString(
    "en-CA",
    {
      weekday:
        "long",
    }
  );
}

function dateValueToTimestamp(
  value:
    string
) {
  if (
    !value
  ) {
    return null;
  }

  const date =
    new Date(
      `${value}T12:00:00`
    );

  const timestamp =
    date.getTime();

  return Number.isNaN(
    timestamp
  )
    ? null
    : timestamp;
}

function timeRangeContains(
  caregiverStart:
    string,

  caregiverEnd:
    string,

  requestedStart:
    string,

  requestedEnd:
    string
) {
  const caregiverStartMinutes =
    minutesFromTime(
      caregiverStart
    );

  const caregiverEndMinutes =
    minutesFromTime(
      caregiverEnd
    );

  const requestedStartMinutes =
    minutesFromTime(
      requestedStart
    );

  const requestedEndMinutes =
    minutesFromTime(
      requestedEnd
    );

  if (
    caregiverStartMinutes ===
      null ||
    caregiverEndMinutes ===
      null ||
    requestedStartMinutes ===
      null ||
    requestedEndMinutes ===
      null
  ) {
    return false;
  }

  /*
   * An end time less than or equal to the start time means the
   * range crosses midnight. Shift that end into the next day.
   */
  const normalizedCaregiverEnd =
    caregiverEndMinutes <=
    caregiverStartMinutes
      ? caregiverEndMinutes +
        24 * 60
      : caregiverEndMinutes;

  const normalizedRequestedEnd =
    requestedEndMinutes <=
    requestedStartMinutes
      ? requestedEndMinutes +
        24 * 60
      : requestedEndMinutes;

  return (
    requestedStartMinutes >=
      caregiverStartMinutes &&
    normalizedRequestedEnd <=
      normalizedCaregiverEnd
  );
}

function minutesFromTime(
  value:
    string
) {
  if (
    !/^\d{1,2}:\d{2}$/.test(
      value
    )
  ) {
    return null;
  }

  const [
    hourText,
    minuteText,
  ] =
    value.split(
      ":"
    );

  const hour =
    Number(
      hourText
    );

  const minute =
    Number(
      minuteText
    );

  if (
    !Number.isInteger(
      hour
    ) ||
    !Number.isInteger(
      minute
    ) ||
    hour <
      0 ||
    hour >
      23 ||
    minute <
      0 ||
    minute >
      59
  ) {
    return null;
  }

  return (
    hour *
      60 +
    minute
  );
}

/*
 * ============================================================
 * MATH HELPERS
 * ============================================================
 */

function degreesToRadians(
  value:
    number
) {
  return (
    value *
    Math.PI /
    180
  );
}

function roundDistance(
  value:
    number
) {
  return Math.round(
    value *
      10
  ) /
    10;
}

function roundScore(
  value:
    number
) {
  return Math.round(
    value *
      100
  ) /
    100;
}

/*
 * ============================================================
 * STRING HELPER
 * ============================================================
 */

function cleanOptionalString(
  value:
    unknown
) {
  if (
    typeof value !==
    "string"
  ) {
    return undefined;
  }

  const trimmed =
    value.trim();

  return (
    trimmed ||
    undefined
  );
}
