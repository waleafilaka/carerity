import type {

  CaregiverLanguage,

  CaregiverOnboardingDraft,

} from "./caregiverOnboardingDraft";



import {

  CaregiverCapabilityId,

  normalizeCareContextSelection,

  normalizeCareNeedSelection,

} from "./careTaxonomy";



import type {

  CaregiverMatchingLanguage,

} from "./matchingTypes";



import {

  CaregiverMatchRun,

  CaregiverMatchingProfile,

  CustomerMatchingRequest,

  DEFAULT_MATCHING_ENGINE_CONFIG,

  MatchingEngineConfig,

} from "./matchingTypes";



import {

  matchCaregivers,

} from "./caregiverMatching";



import {

  BookingDraft,

} from "./bookingDraft";



import {

  adminSupabase,

  checkCarerityAdminAccess,

} from "./supabaseClient";




/* ADMIN MATCHING CLIENT; Current use:; /admin/matching-test; Production customer matching should later run behind; a server/API boundary. */




const supabase =

  adminSupabase;




/* DIAGNOSTICS */




export type MatchingPersistenceDiagnostics = {

  
/* Approved + eligible caregiver rows. */


  databaseEligibleCaregivers:

    number;



  
/* Stored caregiver profile/onboarding records loaded.; caregiver_onboarding_drafts is the current table name even; after a caregiver has been approved. */


  onboardingDraftsLoaded:

    number;



  
/* Usable matching profiles successfully created. */


  matchingProfilesBuilt:

    number;

};




/* Backwards-compatible alias in case another diagnostic page; still imports the older name. */




export type MatchingLoadDiagnostics =

  MatchingPersistenceDiagnostics;



export type MatchingPersistenceResult =

  | {

      success:

        true;



      request:

        CustomerMatchingRequest;



      caregivers:

        CaregiverMatchingProfile[];



      matchRun:

        CaregiverMatchRun;



      diagnostics:

        MatchingPersistenceDiagnostics;

    }

  | {

      success:

        false;



      request?:

        CustomerMatchingRequest;



      caregivers:

        CaregiverMatchingProfile[];



      diagnostics:

        MatchingPersistenceDiagnostics;



      error:

        string;

    };



type CaregiverDatabaseRow = {

  id:

    string;



  user_id?:

    string | null;



  caregiver_number?:

    string | null;



  application_status?:

    string | null;



  eligible_for_matching?:

    boolean | null;

};



type CaregiverDraftDatabaseRow = {

  caregiver_id?:

    string | null;



  user_id?:

    string | null;



  draft_data?:

    unknown;



  application_status?:

    string | null;



  updated_at?:

    string | null;

};



type EligibleCaregiverLoadResult = {

  caregivers:

    CaregiverMatchingProfile[];



  databaseEligibleCaregivers:

    number;



  onboardingDraftsLoaded:

    number;



  matchingProfilesBuilt:

    number;

};




/* MAIN ENTRY POINT */




export async function runCaregiverMatchingForBooking(

  booking:

    BookingDraft,



  config:

    MatchingEngineConfig =

      DEFAULT_MATCHING_ENGINE_CONFIG

): Promise<MatchingPersistenceResult> {

  const request =

    buildMatchingRequestFromBooking(

      booking

    );



  const emptyDiagnostics:

    MatchingPersistenceDiagnostics = {

    databaseEligibleCaregivers:

      0,



    onboardingDraftsLoaded:

      0,



    matchingProfilesBuilt:

      0,

  };



  if (

    !hasValidCustomerLocation(

      request

    )

  ) {

    return {

      success:

        false,



      request,



      caregivers:

        [],



      diagnostics:

        emptyDiagnostics,



      error:

        "The care request does not have a verified location.",

    };

  }



  try {

    const loadResult =

      await loadEligibleCaregiversForMatchingWithDiagnostics();



    const matchRun =

      matchCaregivers(

        request,

        loadResult.caregivers,

        config

      );



    return {

      success:

        true,



      request,



      caregivers:

        loadResult.caregivers,



      matchRun,



      diagnostics: {

        databaseEligibleCaregivers:

          loadResult

            .databaseEligibleCaregivers,



        onboardingDraftsLoaded:

          loadResult

            .onboardingDraftsLoaded,



        matchingProfilesBuilt:

          loadResult

            .matchingProfilesBuilt,

      },

    };

  } catch (

    error

  ) {

    console.error(

      "Unable to run caregiver matching:",

      error

    );



    return {

      success:

        false,



      request,



      caregivers:

        [],



      diagnostics:

        emptyDiagnostics,



      error:

        getErrorMessage(

          error,

          "Unable to match caregivers right now."

        ),

    };

  }

}




/* SIMPLE PUBLIC LOADER */




export async function loadEligibleCaregiversForMatching():

  Promise<

    CaregiverMatchingProfile[]

  > {

  const result =

    await loadEligibleCaregiversForMatchingWithDiagnostics();



  return result.caregivers;

}




/* DIAGNOSTIC LOADER */




export async function loadEligibleCaregiversForMatchingWithDiagnostics():

  Promise<

    EligibleCaregiverLoadResult

  > {

  
/* ADMIN SESSION */




  const {

    data: {

      session,

    },



    error:

      sessionError,

  } =

    await supabase.auth

      .getSession();



  if (

    sessionError

  ) {

    throw sessionError;

  }



  if (

    !session?.user

  ) {

    throw new Error(

      "No active Carerity admin session was found for matching."

    );

  }



  const adminAccess =

    await checkCarerityAdminAccess(

      session.user.id,

      adminSupabase

    );



  if (

    !adminAccess.authorized

  ) {

    throw new Error(

      adminAccess.error ||

        "The active session is not authorized to run caregiver matching."

    );

  }



  
/* APPROVED + MATCHABLE CAREGIVERS */




  const {

    data:

      caregiverRows,



    error:

      caregiverError,

  } =

    await supabase

      .from(

        "admin_caregiver_review_queue"

      )

      .select(

        `

        caregiver_id,

        user_id,

        caregiver_number,

        application_status,

        eligible_for_matching

        `

      )

      .eq(

        "application_status",

        "approved"

      )

      .eq(

        "eligible_for_matching",

        true

      );



  if (

    caregiverError

  ) {

    throw caregiverError;

  }



  const caregivers:

    CaregiverDatabaseRow[] =

    (

      caregiverRows ||

      []

    )

      .map(

        (

          row

        ) => ({

          id:

            String(

              row.caregiver_id ||

              ""

            ),



          user_id:

            row.user_id ??

            null,



          caregiver_number:

            row.caregiver_number ??

            null,



          application_status:

            row.application_status ??

            null,



          eligible_for_matching:

            row.eligible_for_matching ??

            null,

        })

      )

      .filter(

        (

          row

        ) =>

          Boolean(

            row.id

          )

      );



  const databaseEligibleCaregivers =

    caregivers.length;



  if (

    caregivers.length ===

    0

  ) {

    return {

      caregivers:

        [],



      databaseEligibleCaregivers,



      onboardingDraftsLoaded:

        0,



      matchingProfilesBuilt:

        0,

    };

  }



  const caregiverIds =

    caregivers.map(

      (

        caregiver

      ) =>

        caregiver.id

    );



  
/* PROFILE / ONBOARDING DATA */




  const {

    data:

      draftRows,



    error:

      draftError,

  } =

    await supabase

      .from(

        "caregiver_onboarding_drafts"

      )

      .select(

        `

        caregiver_id,

        user_id,

        draft_data,

        application_status,

        updated_at

        `

      )

      .in(

        "caregiver_id",

        caregiverIds

      );



  if (

    draftError

  ) {

    throw draftError;

  }



  const drafts =

    (

      draftRows ||

      []

    ) as

      CaregiverDraftDatabaseRow[];



  const onboardingDraftsLoaded =

    drafts.length;



  
/* If more than one profile row somehow exists for a caregiver,; keep the latest updated record. */




  const draftByCaregiverId =

    new Map<

      string,

      CaregiverDraftDatabaseRow

    >();



  for (

    const row of

    drafts

  ) {

    if (

      !row.caregiver_id

    ) {

      continue;

    }



    const existing =

      draftByCaregiverId.get(

        row.caregiver_id

      );



    if (

      !existing

    ) {

      draftByCaregiverId.set(

        row.caregiver_id,

        row

      );



      continue;

    }



    const existingTime =

      timestampValue(

        existing.updated_at

      );



    const nextTime =

      timestampValue(

        row.updated_at

      );



    if (

      nextTime >=

      existingTime

    ) {

      draftByCaregiverId.set(

        row.caregiver_id,

        row

      );

    }

  }



  
/* BUILD MATCHING PROFILES */




  const matchingProfiles =

    caregivers

      .map(

        (

          caregiver

        ) => {

          const draftRow =

            draftByCaregiverId.get(

              caregiver.id

            );



          const draft =

            parseCaregiverDraftData(

              draftRow

                ?.draft_data

            );



          return (

            buildMatchingProfileFromCaregiver(

              caregiver,

              draft

            )

          );

        }

      )

      .filter(

        (

          profile

        ): profile is CaregiverMatchingProfile =>

          Boolean(

            profile

          )

      );



  return {

    caregivers:

      matchingProfiles,



    databaseEligibleCaregivers,



    onboardingDraftsLoaded,



    matchingProfilesBuilt:

      matchingProfiles.length,

  };

}




/* CUSTOMER MATCHING REQUEST */




export function buildMatchingRequestFromBooking(

  booking:

    BookingDraft

): CustomerMatchingRequest {

  const careNeedIds =

    normalizeCareNeedSelection(

      booking.selectedNeeds ||

        []

    );



  const careContextIds =

    normalizeCareContextSelection(

      booking.selectedContext ||

        []

    );



  
/* Overnight means the visit crosses midnight.; 22:00 -> 06:00 = overnight; 20:00 -> 23:00 = not overnight */




  const requiresOvernight =

    isOvernightBooking(

      booking.startTime,

      booking.endTime

    );



  return {

    bookingId:

      booking.visitId,

    caregiverGenderPreference:
      booking.caregiverGenderPreference ?? "no_preference",



    latitude:

      booking.latitude,



    longitude:

      booking.longitude,



    address:

      booking.address,



    city:

      booking.city,



    province:

      booking.province,



    postalCode:

      booking.postalCode,



    careNeedIds,



    careContextIds,



    primaryLanguage:

      booking.primaryLanguage,



    secondaryLanguage:

      booking.secondaryLanguage,



    scheduleType:

      booking.scheduleType,



    careDate:

      booking.careDate,



    startTime:

      booking.startTime,



    endTime:

      booking.endTime,



    recurringDays:

      normalizeStringArray(

        booking.recurringDays

      ),



    preferSameCaregiver:

      booking.preferSameCaregiver,



    requiresLiveOut:

      !requiresOvernight,



    requiresLiveIn:

      false,



    requiresOvernight,



    requiresDriver:

      false,



    requiresCaregiverVehicle:

      false,



    requiresClientTransportation:

      false,

  };

}




/* CAREGIVER -> MATCHING PROFILE */




export function buildMatchingProfileFromCaregiver(

  caregiver:

    CaregiverDatabaseRow,



  draft:

    CaregiverOnboardingDraft

):

  | CaregiverMatchingProfile

  | null {

  if (

    caregiver

      .application_status !==

      "approved"

  ) {

    return null;

  }



  if (

    caregiver

      .eligible_for_matching !==

      true

  ) {

    return null;

  }



  const capabilityIds =

    deriveCaregiverCapabilities(

      draft

    );



  return {

    caregiverId:

      caregiver.id,



    caregiverNumber:

      cleanOptionalString(

        caregiver

          .caregiver_number

      ),



    userId:

      cleanOptionalString(

        caregiver.user_id

      ),



    firstName:

      cleanOptionalString(

        draft.firstName

      ),



    lastName:

      cleanOptionalString(

        draft.lastName

      ),



    sex:

      draft.sex,



    applicationStatus:

      "approved",



    eligibleForMatching:

      true,



    availableForWork:

      draft.availableForWork ===

      true,



    
/* This must be capabilityIds.; matchingTypes.ts and caregiverMatching.ts use:; caregiver.capabilityIds */




    capabilityIds,



    languages:

      normalizeCaregiverLanguages(

        draft.languages

      ),



    latitude:

      finiteNumberOrUndefined(

        draft.latitude

      ),



    longitude:

      finiteNumberOrUndefined(

        draft.longitude

      ),



    city:

      cleanOptionalString(

        draft.city

      ),



    province:

      cleanOptionalString(

        draft.province

      ),



    postalCode:

      cleanOptionalString(

        draft.postalCode

      ),



    qualificationTypes:

      normalizeQualificationTypes(

        draft

      ),



    yearsExperience:

      finiteNumberOrUndefined(

        draft.yearsExperience

      ),



    weeklyAvailability:

      draft.weeklyAvailability,



    temporaryTimeOffStart:

      cleanOptionalString(

        draft.temporaryTimeOffStart

      ),



    temporaryTimeOffEnd:

      cleanOptionalString(

        draft.temporaryTimeOffEnd

      ),



    canDrive:

      draft.canDrive,



    ownsVehicle:

      draft.ownsVehicle,



    willingToTransportClient:

      draft

        .willingToTransportClient,



    acceptsLiveOut:

      draft.acceptsLiveOut,



    acceptsLiveIn:

      draft.acceptsLiveIn,



    acceptsOvernight:

      draft.acceptsOvernight,

  };

}




/* CAREGIVER CAPABILITY DERIVATION */




export function deriveCaregiverCapabilities(

  draft:

    CaregiverOnboardingDraft

):

  CaregiverCapabilityId[] {

  const capabilities =

    new Set<

      CaregiverCapabilityId

    >();



  const experience =

    Array.isArray(

      draft.experienceCategories

    )

      ? draft.experienceCategories

      : [];



  experience.forEach(

    (

      rawValue

    ) => {

      if (

        typeof rawValue !==

        "string"

      ) {

        return;

      }



      const value =

        normalizeText(

          rawValue

        );



      if (

        includesAny(

          value,

          [

            "personal care",

            "activities of daily living",

            "adl",

          ]

        )

      ) {

        capabilities.add(

          "personal_care"

        );



        capabilities.add(

          "bathing_hygiene"

        );



        capabilities.add(

          "dressing_grooming"

        );



        capabilities.add(

          "toileting"

        );

      }



      if (

        includesAny(

          value,

          [

            "bath",

            "bathing",

            "hygiene",

          ]

        )

      ) {

        capabilities.add(

          "bathing_hygiene"

        );



        capabilities.add(

          "personal_care"

        );

      }



      if (

        includesAny(

          value,

          [

            "dressing",

            "grooming",

          ]

        )

      ) {

        capabilities.add(

          "dressing_grooming"

        );



        capabilities.add(

          "personal_care"

        );

      }



      if (

        includesAny(

          value,

          [

            "toileting",

            "continence",

            "incontinence",

          ]

        )

      ) {

        capabilities.add(

          "toileting"

        );



        capabilities.add(

          "personal_care"

        );

      }



      if (

        includesAny(

          value,

          [

            "mobility",

            "ambulation",

            "walking",

          ]

        )

      ) {

        capabilities.add(

          "mobility_assistance"

        );



        capabilities.add(

          "mobility_support"

        );

      }



      if (

        includesAny(

          value,

          [

            "transfer",

            "transfers",

            "lifting",

            "hoist",

            "hoyer",

          ]

        )

      ) {

        capabilities.add(

          "transfer_assistance"

        );



        capabilities.add(

          "mobility_assistance"

        );

      }



      if (

        includesAny(

          value,

          [

            "meal",

            "food",

            "nutrition",

            "feeding",

          ]

        )

      ) {

        capabilities.add(

          "meal_preparation"

        );

      }



      if (

        includesAny(

          value,

          [

            "medication",

            "medicine",

            "medications",

          ]

        )

      ) {

        capabilities.add(

          "medication_reminders"

        );

      }



      if (

        includesAny(

          value,

          [

            "companionship",

            "companion",

            "social",

          ]

        )

      ) {

        capabilities.add(

          "companionship"

        );

      }



      if (

        includesAny(

          value,

          [

            "housekeeping",

            "house keeping",

            "cleaning",

          ]

        )

      ) {

        capabilities.add(

          "light_housekeeping"

        );

      }



      if (

        includesAny(

          value,

          [

            "respite",

          ]

        )

      ) {

        capabilities.add(

          "respite_care"

        );

      }



      if (

        includesAny(

          value,

          [

            "overnight",

            "night care",

          ]

        )

      ) {

        capabilities.add(

          "overnight_care"

        );



        capabilities.add(

          "safety_supervision"

        );

      }



      if (

        includesAny(

          value,

          [

            "dementia",

            "alzheimer",

            "memory",

            "cognitive",

          ]

        )

      ) {

        capabilities.add(

          "dementia_memory_support"

        );



        capabilities.add(

          "safety_supervision"

        );

      }



      if (

        includesAny(

          value,

          [

            "diabetes",

            "diabetic",

          ]

        )

      ) {

        capabilities.add(

          "diabetes_support"

        );

      }



      if (

        includesAny(

          value,

          [

            "cancer",

            "oncology",

          ]

        )

      ) {

        capabilities.add(

          "cancer_support"

        );

      }



      if (

        includesAny(

          value,

          [

            "mental health",

            "psychiatric",

            "psychiatry",

          ]

        )

      ) {

        capabilities.add(

          "mental_health_support"

        );

      }



      if (

        includesAny(

          value,

          [

            "fall",

            "falls",

            "fall prevention",

          ]

        )

      ) {

        capabilities.add(

          "fall_prevention"

        );



        capabilities.add(

          "safety_supervision"

        );

      }



      if (

        includesAny(

          value,

          [

            "post hospital",

            "post-hospital",

            "hospital discharge",

            "recovery",

            "rehabilitation",

            "rehab",

          ]

        )

      ) {

        capabilities.add(

          "post_hospital_support"

        );

      }



      if (

        includesAny(

          value,

          [

            "chronic",

            "long term condition",

            "long-term condition",

          ]

        )

      ) {

        capabilities.add(

          "chronic_condition_support"

        );

      }



      if (

        includesAny(

          value,

          [

            "immunocompromised",

            "infection control",

            "infection prevention",

          ]

        )

      ) {

        capabilities.add(

          "immunocompromised_support"

        );

      }



      if (

        includesAny(

          value,

          [

            "hearing",

            "deaf",

          ]

        )

      ) {

        capabilities.add(

          "hearing_support"

        );

      }



      if (

        includesAny(

          value,

          [

            "vision",

            "blind",

            "visual impairment",

          ]

        )

      ) {

        capabilities.add(

          "vision_support"

        );

      }



      if (

        includesAny(

          value,

          [

            "allergy",

            "allergies",

          ]

        )

      ) {

        capabilities.add(

          "allergy_awareness"

        );

      }

    }

  );



  
/* PSW GENERALIST BASELINE */




  if (

    hasGeneralistCareQualification(

      draft

    )

  ) {

    capabilities.add(

      "personal_care"

    );



    capabilities.add(

      "bathing_hygiene"

    );



    capabilities.add(

      "dressing_grooming"

    );



    capabilities.add(

      "toileting"

    );



    capabilities.add(

      "mobility_assistance"

    );



    capabilities.add(

      "mobility_support"

    );



    capabilities.add(

      "transfer_assistance"

    );



    capabilities.add(

      "meal_preparation"

    );



    capabilities.add(

      "medication_reminders"

    );



    capabilities.add(

      "companionship"

    );



    capabilities.add(

      "light_housekeeping"

    );



    capabilities.add(

      "respite_care"

    );



    capabilities.add(

      "safety_supervision"

    );

  }



  if (

    draft.acceptsOvernight ===

      true

  ) {

    capabilities.add(

      "overnight_care"

    );

  }



  return Array.from(

    capabilities

  );

}




/* GENERALIST QUALIFICATION */




function hasGeneralistCareQualification(

  draft:

    CaregiverOnboardingDraft

) {

  return normalizeQualificationTypes(

    draft

  ).some(

    (

      value

    ) =>

      includesAny(

        normalizeText(

          value

        ),

        [

          "psw",

          "personal support worker",

          "personal support",

          "health care aide",

          "healthcare aide",

          "health care assistant",

          "healthcare assistant",

          "care aide",

          "caregiver",

        ]

      )

  );

}



function normalizeQualificationTypes(

  draft:

    CaregiverOnboardingDraft

) {

  return [

    draft.qualificationType,



    ...(

      Array.isArray(

        draft.qualificationTypes

      )

        ? draft.qualificationTypes

        : []

    ),

  ]

    .filter(

      (

        item

      ): item is string =>

        typeof item ===

          "string" &&

        Boolean(

          item.trim()

        )

    )

    .map(

      (

        item

      ) =>

        item.trim()

    );

}




/* LANGUAGE NORMALIZATION */




function normalizeCaregiverLanguages(

  value:

    CaregiverLanguage[] |

    unknown

):

  CaregiverMatchingLanguage[] {

  if (

    !Array.isArray(

      value

    )

  ) {

    return [];

  }



  const normalized:

    CaregiverMatchingLanguage[] =

    [];



  for (

    const item of

    value

  ) {

    
/* Legacy data may contain a plain language string. */




    if (

      typeof item ===

      "string"

    ) {

      const language =

        item.trim();



      if (

        language

      ) {

        normalized.push({

          language,

        });

      }



      continue;

    }



    if (

      !isRecord(

        item

      )

    ) {

      continue;

    }



    const language =

      typeof item.language ===

        "string"

        ? item.language.trim()

        : "";



    if (

      !language

    ) {

      continue;

    }



    const fluency =

      normalizeFluency(

        item.fluency

      );



    normalized.push({

      language,



      fluency:

        fluency ||

        undefined,

    });

  }



  return normalized;

}



function normalizeFluency(

  value:

    unknown

):

  CaregiverMatchingLanguage["fluency"] |

  "" {

  switch (

    value

  ) {

    case "Basic":

    case "Conversational":

    case "Fluent":

    case "Native / Bilingual":

      return value;



    default:

      return "";

  }

}




/* CUSTOMER LOCATION */




function hasValidCustomerLocation(

  request:

    CustomerMatchingRequest

) {

  return (

    typeof request.latitude ===

      "number" &&

    Number.isFinite(

      request.latitude

    ) &&

    typeof request.longitude ===

      "number" &&

    Number.isFinite(

      request.longitude

    )

  );

}




/* OVERNIGHT DETECTION; Overnight care means the visit crosses midnight.; Examples:; 22:00 -> 06:00 = overnight; 20:00 -> 23:00 = not overnight */




function isOvernightBooking(

  startTime?:

    string,



  endTime?:

    string

) {

  if (

    !startTime ||

    !endTime

  ) {

    return false;

  }



  const start =

    minutesFromTime(

      startTime

    );



  const end =

    minutesFromTime(

      endTime

    );



  if (

    start ===

      null ||

    end ===

      null

  ) {

    return false;

  }



  return (

    end <=

    start

  );

}




/* DRAFT PARSER */




function parseCaregiverDraftData(

  value:

    unknown

):

  CaregiverOnboardingDraft {

  if (

    !isRecord(

      value

    )

  ) {

    return {};

  }



  return (

    value as

      CaregiverOnboardingDraft

  );

}




/* STRING HELPERS */




function normalizeText(

  value:

    string

) {

  return value

    .trim()

    .toLowerCase()

    .replace(

      /[\_/()-]+/g,

      " "

    )

    .replace(

      /\s+/g,

      " "

    );

}



function includesAny(

  value:

    string,



  terms:

    string[]

) {

  return terms.some(

    (

      term

    ) =>

      value.includes(

        normalizeText(

          term

        )

      )

  );

}




/* TIME */




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




/* GENERIC HELPERS */




function normalizeStringArray(

  value:

    unknown

) {

  if (

    !Array.isArray(

      value

    )

  ) {

    return [];

  }



  return value

    .filter(

      (

        item

      ): item is string =>

        typeof item ===

          "string" &&

        Boolean(

          item.trim()

        )

    )

    .map(

      (

        item

      ) =>

        item.trim()

    );

}



function finiteNumberOrUndefined(

  value:

    unknown

) {

  return (

    typeof value ===

      "number" &&

    Number.isFinite(

      value

    )

  )

    ? value

    : undefined;

}



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



function timestampValue(

  value:

    unknown

) {

  if (

    typeof value !==

      "string" ||

    !value

  ) {

    return 0;

  }



  const timestamp =

    new Date(

      value

    ).getTime();



  return Number.isFinite(

    timestamp

  )

    ? timestamp

    : 0;

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

    return (

      error.message

    );

  }



  if (

    typeof error ===

      "object" &&

    error !==

      null &&

    "message" in

      error

  ) {

    const message =

      (

        error as {

          message?:

            unknown;

        }

      ).message;



    if (

      typeof message ===

        "string" &&

      message.trim()

    ) {

      return (

        message.trim()

      );

    }

  }



  if (

    typeof error ===

      "string" &&

    error.trim()

  ) {

    return (

      error.trim()

    );

  }



  return fallback;

}
