import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

import Stripe from "stripe";

import type { BookingDraft } from "../../../../lib/bookingDraft";

import {

  buildMatchingRequestFromBooking,

  buildMatchingProfileFromCaregiver,

} from "../../../../lib/caregiverMatchingPersistence";

import {

  matchCaregivers,

  buildCaregiverCandidate,

} from "../../../../lib/caregiverMatching";

import {

  buildCaregiverOutreachPlan,

  CAREGIVER_PAIR_INTEREST_WINDOW_MINUTES,

  CAREGIVER_CUSTOMER_PROMISE_MINUTES,

  DEFAULT_MATCHING_ENGINE_CONFIG,

} from "../../../../lib/matchingTypes";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

type StartMatchingPayload = {

  booking?: BookingDraft;

};

type CaregiverRow = {

  id: string;

  user_id?: string | null;

  caregiver_number?: string | null;

  application_status?: string | null;

  eligible_for_matching?: boolean | null;

};

type CaregiverReviewQueueRow = {

  caregiver_id: string;

  user_id?: string | null;

  caregiver_number?: string | null;

  application_status?: string | null;

  eligible_for_matching?: boolean | null;

};

type CaregiverDraftRow = {

  caregiver_id?: string | null;

  user_id?: string | null;

  draft_data?: unknown;

  application_status?: string | null;

  updated_at?: string | null;

};

function jsonError(

  error: string,

  status: number,

  extra: Record<string, unknown> = {}

) {

  return NextResponse.json(

    {

      success: false,

      error,

      ...extra,

    },

    {

      status,

    }

  );

}

export async function POST(request: NextRequest) {

  try {

    /**

*     * ============================================================*

*     * SERVER CONFIG*

*     * ============================================================*

*     */

    if (!supabaseUrl || !supabaseServiceRoleKey) {

      return jsonError(

        "Server-side matching is not configured.",

        500

      );

    }

    if (!stripeSecretKey) {

      return jsonError(

        "Stripe is not configured.",

        500

      );

    }

    /**

*     * ============================================================*

*     * CUSTOMER AUTH*

*     * ============================================================*

*     */

    const authorization =

      request.headers.get("authorization") || "";

    const accessToken =

      authorization.startsWith("Bearer ")

        ? authorization.slice(7).trim()

        : "";

    if (!accessToken) {

      return jsonError(

        "Sign in again to start caregiver matching.",

        401

      );

    }

    const supabaseAdmin = createClient(

      supabaseUrl,

      supabaseServiceRoleKey,

      {

        auth: {

          persistSession: false,

          autoRefreshToken: false,

        },

      }

    );

    const {

      data: {

        user,

      },

      error: userError,

    } =

      await supabaseAdmin.auth.getUser(

        accessToken

      );

    if (

      userError ||

      !user

    ) {

      return jsonError(

        "Your customer session could not be verified.",

        401

      );

    }

    /**

*     * ============================================================*

*     * BOOKING*

*     * ============================================================*

*     */

    const body =

      (await request.json()) as StartMatchingPayload;

    const booking =

      body.booking || {};

    const setupSessionId =

      booking.stripeSetupSessionId?.trim() ||

      "";

    if (

      !setupSessionId ||

      !setupSessionId.startsWith("cs_")

    ) {

      return jsonError(

        "The secured payment-method reference is missing.",

        409

      );

    }

    if (

      typeof booking.latitude !==

        "number" ||

      !Number.isFinite(

        booking.latitude

      ) ||

      typeof booking.longitude !==

        "number" ||

      !Number.isFinite(

        booking.longitude

      )

    ) {

      return jsonError(

        "The care request does not have a verified location.",

        409

      );

    }

    const careDate = (

      booking.careDate ||

      booking.recurringStartDate ||

      ""

    ).trim();

    const startTime =

      booking.startTime?.trim() ||

      "";

    const endTime =

      booking.endTime?.trim() ||

      "";

    if (

      !careDate ||

      !startTime ||

      !endTime

    ) {

      return jsonError(

        "The requested care date and time are incomplete.",

        409

      );

    }

    const durationHours =

      normalizeDurationHours(

        booking.durationHours,

        startTime,

        endTime

      );

    if (

      durationHours < 4 ||

      durationHours > 24

    ) {

      return jsonError(

        "The care duration is not valid for matching.",

        409

      );

    }

    /**

*     * ============================================================*

*     * STRIPE PAYMENT-METHOD VERIFICATION*

*     * ============================================================*

*     */

    const stripe =

      new Stripe(

        stripeSecretKey

      );

    const checkoutSession =

      await stripe.checkout.sessions.retrieve(

        setupSessionId,

        {

          expand: [

            "setup_intent",

          ],

        }

      );

    const setupIntent =

      typeof checkoutSession.setup_intent ===

      "string"

        ? await stripe.setupIntents.retrieve(

            checkoutSession.setup_intent

          )

        : checkoutSession.setup_intent;

    if (

      checkoutSession.status !==

        "complete" ||

      !setupIntent ||

      setupIntent.status !==

        "succeeded"

    ) {

      return jsonError(

        "Your payment method is not ready for matching.",

        409

      );

    }

    /**

*     * ============================================================*

*     * IDEMPOTENCY*

*     * ============================================================*

*     */

    const {

      data:

        existingSession,

      error:

        existingSessionError,

    } =

      await supabaseAdmin

        .from(

          "caregiver_offer_sessions"

        )

        .select(

          [

            "id",

            "status",

            "current_wave",

            "current_wave_deadline",

            "automated_deadline_at",

            "care_recipient_id",

            "care_request_id",

          ].join(",")

        )

        .eq(

          "booking_reference",

          setupSessionId

        )

        .eq(

          "customer_user_id",

          user.id

        )

        .order(

          "created_at",

          {

            ascending: false,

          }

        )

        .limit(1)

        .maybeSingle();

    if (

      existingSessionError

    ) {

      console.error(

        "Unable to inspect existing matching session:",

        existingSessionError

      );

      return jsonError(

        "Unable to check the current caregiver search.",

        500

      );

    }

    if (

      existingSession

    ) {

      return NextResponse.json({

        success: true,

        reused: true,

        offerSessionId:

          existingSession.id,

        status:

          existingSession.status,

        currentWave:

          existingSession.current_wave,

        firstPairDeadline:

          existingSession.current_wave_deadline,

        automatedDeadlineAt:

          existingSession.automated_deadline_at,

        careRecipientId:

          existingSession.care_recipient_id,

        careRequestId:

          existingSession.care_request_id,

      });

    }

    /**

*     * ============================================================*

*     * LOAD APPROVED + MATCHABLE CAREGIVERS*

*     * ============================================================*

*     **

*     * IMPORTANT:*

*     **

*     * Use the same source already used by the working admin*

*     * matching implementation:*

*     **

*     * admin_caregiver_review_queue*

*     **

*     * The view exposes caregiver_id, so normalize caregiver_id*

*     * back to id before passing the caregiver into the existing*

*     * matching persistence/profile builder.*

*     * ============================================================*

*     */

    const {

      data:

        caregiverRows,

      error:

        caregiverError,

    } =

      await supabaseAdmin

        .from(

          "admin_caregiver_review_queue"

        )

        .select(

          [

            "caregiver_id",

            "user_id",

            "caregiver_number",

            "application_status",

            "eligible_for_matching",

          ].join(",")

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

      console.error(

        "Unable to load matching caregivers:",

        caregiverError

      );

      return jsonError(

        "Unable to load approved caregivers for matching.",

        500,

        {

          databaseMessage:

            caregiverError.message ||

            undefined,

        }

      );

    }

    const caregivers: CaregiverRow[] =

      (

        (caregiverRows ||

          []) as CaregiverReviewQueueRow[]

      ).map(

        (

          row

        ) => ({

          id:

            row.caregiver_id,

          user_id:

            row.user_id,

          caregiver_number:

            row.caregiver_number,

          application_status:

            row.application_status,

          eligible_for_matching:

            row.eligible_for_matching,

        })

      );

    console.log(

      "[Carerity matching] approved database caregivers:",

      caregivers.map(

        (

          caregiver

        ) => ({

          id:

            caregiver.id,

          caregiverNumber:

            caregiver.caregiver_number,

          applicationStatus:

            caregiver.application_status,

          eligibleForMatching:

            caregiver.eligible_for_matching,

        })

      )

    );

    if (

      caregivers.length ===

      0

    ) {

      return jsonError(

        "No approved caregivers are currently available for automatic matching.",

        409,

        {

          databaseEligibleCaregivers:

            0,

        }

      );

    }

    /**

*     * ============================================================*

*     * LOAD CAREGIVER ONBOARDING PROFILES*

*     * ============================================================*

*     */

    const caregiverIds =

      caregivers

        .map(

          (

            caregiver

          ) =>

            caregiver.id

        )

        .filter(

          Boolean

        );

    const {

      data:

        draftRows,

      error:

        draftError,

    } =

      await supabaseAdmin

        .from(

          "caregiver_onboarding_drafts"

        )

        .select(

          [

            "caregiver_id",

            "user_id",

            "draft_data",

            "application_status",

            "updated_at",

          ].join(",")

        )

        .in(

          "caregiver_id",

          caregiverIds

        );

    if (

      draftError

    ) {

      console.error(

        "Unable to load caregiver matching profiles:",

        draftError

      );

      return jsonError(

        "Unable to load caregiver matching profiles.",

        500,

        {

          databaseMessage:

            draftError.message ||

            undefined,

        }

      );

    }

    const drafts =

      (

        draftRows ||

        []

      ) as CaregiverDraftRow[];

    const draftByCaregiverId =

      new Map<

        string,

        CaregiverDraftRow

      >();

    drafts.forEach(

      (

        row

      ) => {

        if (

          row.caregiver_id

        ) {

          draftByCaregiverId.set(

            row.caregiver_id,

            row

          );

        }

      }

    );

    /**

*     * ============================================================*

*     * BUILD MATCHING PROFILES*

*     * ============================================================*

*     */

    const matchingProfiles =

      caregivers

        .map(

          (

            caregiver

          ) => {

            const row =

              draftByCaregiverId.get(

                caregiver.id

              );

            const draft =

              isRecord(

                row?.draft_data

              )

                ? row?.draft_data

                : {};

            return buildMatchingProfileFromCaregiver(

              caregiver,

              draft as any

            );

          }

        )

        .filter(

          (

            profile

          ): profile is NonNullable<

            typeof profile

          > =>

            Boolean(

              profile

            )

        );

    console.log(

      "[Carerity matching] profile diagnostics:",

      {

        databaseEligibleCaregivers:

          caregivers.length,

        onboardingDraftsLoaded:

          drafts.length,

        matchingProfilesBuilt:

          matchingProfiles.length,

      }

    );

    if (

      matchingProfiles.length ===

      0

    ) {

      return jsonError(

        "Approved caregiver profiles are incomplete for matching.",

        409,

        {

          databaseEligibleCaregivers:

            caregivers.length,

          onboardingDraftsLoaded:

            drafts.length,

          matchingProfilesBuilt:

            0,

        }

      );

    }

    /**

*     * ============================================================*

*     * RUN EXISTING MATCHING ENGINE*

*     * ============================================================*

*     */

    const matchingRequest =

      buildMatchingRequestFromBooking(

        booking

      );

      const eligibilityDiagnostics =

      matchingProfiles.map((profile) => {

        const candidate =

          buildCaregiverCandidate(

            matchingRequest,

            profile,

            {

              config:

                DEFAULT_MATCHING_ENGINE_CONFIG,

            }

          );

        return {

          caregiverId:

            profile.caregiverId,

          caregiverNumber:

            profile.caregiverNumber,

          availableForWork:

            profile.availableForWork,

          latitude:

            profile.latitude,

          longitude:

            profile.longitude,

          city:

            profile.city,

          weeklyAvailability:

            profile.weeklyAvailability,

          acceptsLiveOut:

            profile.acceptsLiveOut,

          acceptsLiveIn:

            profile.acceptsLiveIn,

          acceptsOvernight:

            profile.acceptsOvernight,

          request: {

            careDate:

              matchingRequest.careDate,

            startTime:

              matchingRequest.startTime,

            endTime:

              matchingRequest.endTime,

            requiresLiveOut:

              matchingRequest.requiresLiveOut,

            requiresLiveIn:

              matchingRequest.requiresLiveIn,

            requiresOvernight:

              matchingRequest.requiresOvernight,

            preferredCaregiverSex:

              matchingRequest.preferredCaregiverSex,

            latitude:

              matchingRequest.latitude,

            longitude:

              matchingRequest.longitude,

          },

          eligible:

            candidate.eligibility.eligible,

          failures:

            candidate.eligibility.failures,

          distance:

            candidate.distance,

        };

      });

    console.dir(

      {

        carerityEligibilityDiagnostics:

          eligibilityDiagnostics,

      },

      {

        depth: null,

      }

    );

    const matchRun =

      matchCaregivers(

        matchingRequest,

        matchingProfiles,

        DEFAULT_MATCHING_ENGINE_CONFIG

      );

    const eligibleCandidateCount =

      matchRun.candidates.filter(

        (

          candidate

        ) =>

          candidate

            .eligibility

            .eligible

      ).length;

    console.log(

      "[Carerity matching] engine result:",

      {

        candidateCount:

          matchRun.candidates.length,

        eligibleCandidateCount,

        candidates:

          matchRun.candidates.map(

            (

              candidate

            ) => ({

              caregiverId:

                candidate.caregiver?.caregiverId,

              rank:

                candidate.rank,

              score:

                candidate.score?.percentage,

              distanceKm:

                candidate.distance?.distanceKm,

              eligible:

                candidate

                  .eligibility

                  .eligible,

              eligibility:

                candidate

                  .eligibility,

            })

          ),

      }

    );

    /**

*     * ============================================================*

*     * BUILD OUTREACH PLAN*

*     * ============================================================*

*     */

    const plan =

      matchRun.outreachPlan ||

      buildCaregiverOutreachPlan(

        matchRun.candidates

      );

    if (

      plan.firstPair.length ===

      0

    ) {

      return jsonError(

        "No eligible caregiver is available for automatic outreach.",

        409,

        {

          databaseEligibleCaregivers:

            caregivers.length,

          onboardingDraftsLoaded:

            drafts.length,

          matchingProfilesBuilt:

            matchingProfiles.length,

          candidateCount:

            matchRun.candidates.length,

          eligibleCandidateCount,

        }

      );

    }

    /**

*     * ============================================================*

*     * CARE RECIPIENT*

*     * ============================================================*

*     */

    const recipientName =

      getRecipientName(

        booking

      );

    const {

      firstName:

        recipientFirstName,

      lastName:

        recipientLastName,

    } =

      splitName(

        recipientName

      );

    let careRecipientId =

      "";

    const {

      data:

        recipientRows,

      error:

        recipientLookupError,

    } =

      await supabaseAdmin

        .from(

          "care_recipients"

        )

        .select(

          [

            "id",

            "first_name",

            "last_name",

            "created_at",

          ].join(",")

        )

        .eq(

          "family_user_id",

          user.id

        )

        .order(

          "created_at",

          {

            ascending: true,

          }

        );

    if (

      recipientLookupError

    ) {

      console.error(

        "Unable to resolve care recipient:",

        recipientLookupError

      );

      return jsonError(

        "Unable to resolve the care recipient.",

        500

      );

    }

    const normalizedFirst =

      normalizeText(

        recipientFirstName

      );

    const normalizedLast =

      normalizeText(

        recipientLastName

      );

    const matchingRecipient =

      (

        recipientRows ||

        []

      ).find(

        (

          row: any

        ) =>

          normalizeText(

            row.first_name

          ) ===

            normalizedFirst &&

          normalizeText(

            row.last_name

          ) ===

            normalizedLast

      );

    if (

      matchingRecipient?.id

    ) {

      careRecipientId =

        matchingRecipient.id;

    } else {

      const {

        data:

          createdRecipient,

        error:

          createRecipientError,

      } =

        await supabaseAdmin

          .from(

            "care_recipients"

          )

          .insert({

            family_user_id:

              user.id,

            first_name:

              recipientFirstName,

            last_name:

              recipientLastName,

          })

          .select(

            "id"

          )

          .single();

      if (

        createRecipientError ||

        !createdRecipient

      ) {

        console.error(

          "Unable to create care recipient:",

          createRecipientError

        );

        return jsonError(

          "Unable to create the care recipient for this request.",

          500,

          {

            databaseMessage:

              createRecipientError?.message ||

              undefined,

          }

        );

      }

      careRecipientId =

        createdRecipient.id;

    }

    /**

*     * ============================================================*

*     * CANONICAL CARE REQUEST*

*     * ============================================================*

*     */

    let careRequestId =

      "";

    const {

      data:

        existingCareRequest,

      error:

        careRequestLookupError,

    } =

      await supabaseAdmin

        .from(

          "care_requests"

        )

        .select(

          "id,status"

        )

        .eq(

          "recipient_id",

          careRecipientId

        )

        .eq(

          "requested_date",

          careDate

        )

        .eq(

          "start_time",

          startTime

        )

        .eq(

          "hours_requested",

          durationHours

        )

        .limit(1)

        .maybeSingle();

    if (

      careRequestLookupError

    ) {

      console.error(

        "Unable to inspect existing care request:",

        careRequestLookupError

      );

      return jsonError(

        "Unable to prepare the care request.",

        500

      );

    }

    if (

      existingCareRequest?.id

    ) {

      careRequestId =

        existingCareRequest.id;

    } else {

      const requestSummary =

        buildRequestSummary(

          booking

        );

      const {

        data:

          createdCareRequest,

        error:

          createCareRequestError,

      } =

        await supabaseAdmin

          .from(

            "care_requests"

          )

          .insert({

            recipient_id:

              careRecipientId,

            requested_date:

              careDate,

            start_time:

              startTime,

            hours_requested:

              durationHours,

            care_type:

              null,

            status:

              "matching",

            custom_care_notes:

              requestSummary,

            flexibility_notes:

              null,

            preferred_gender:

              null,

          })

          .select(

            "id"

          )

          .single();

      if (

        createCareRequestError ||

        !createdCareRequest

      ) {

        console.error(

          "Unable to create canonical care request:",

          createCareRequestError

        );

        return jsonError(

          "Unable to create the care request for matching.",

          500,

          {

            databaseMessage:

              createCareRequestError?.message ||

              undefined,

          }

        );

      }

      careRequestId =

        createdCareRequest.id;

    }

    /**

*     * ============================================================*

*     * OFFER SESSION*

*     * ============================================================*

*     */

    const now =

      new Date();

    const firstPairDeadline =

      new Date(

        now.getTime() +

          CAREGIVER_PAIR_INTEREST_WINDOW_MINUTES *

            60_000

      ).toISOString();

    const automatedDeadlineAt =

      new Date(

        now.getTime() +

          CAREGIVER_CUSTOMER_PROMISE_MINUTES *

            60_000

      ).toISOString();

    const {

      data:

        sessionRow,

      error:

        sessionError,

    } =

      await supabaseAdmin

        .from(

          "caregiver_offer_sessions"

        )

        .insert({

          booking_reference:

            setupSessionId,

          customer_user_id:

            user.id,

          status:

            "awaiting_first_pair",

          response_window_minutes:

            CAREGIVER_PAIR_INTEREST_WINDOW_MINUTES,

          max_outreach_count:

            plan.maximumCaregiversToContact,

          current_wave:

            1,

          current_wave_deadline:

            firstPairDeadline,

          automated_deadline_at:

            automatedDeadlineAt,

          care_recipient_name:

            recipientName,

          care_city:

            booking.city ||

            null,

          care_province:

            booking.province ||

            null,

          schedule_type:

            booking.scheduleType ||

            null,

          care_date:

            careDate,

          start_time:

            startTime,

          end_time:

            endTime,

          recurring_days:

            booking.recurringDays ||

            [],

          care_recipient_id:

            careRecipientId,

          care_request_id:

            careRequestId,

        })

        .select(

          "id"

        )

        .single();

    if (

      sessionError ||

      !sessionRow

    ) {

      console.error(

        "Unable to create caregiver offer session:",

        sessionError

      );

      return jsonError(

        "Unable to start caregiver outreach.",

        500,

        {

          databaseMessage:

            sessionError?.message ||

            undefined,

        }

      );

    }

    /**

*     * ============================================================*

*     * WAVE 1*

*     * ============================================================*

*     */

    const firstPairRows =

      plan.firstPair.map(

        (

          candidate

        ) => ({

          offer_session_id:

            sessionRow.id,

          caregiver_id:

            candidate.caregiverId,

          wave:

            1,

          rank:

            candidate.rank,

          match_score:

            candidate.score,

          distance_km:

            candidate.distanceKm ??

            null,

          status:

            "pending",

          offered_at:

            now.toISOString(),

          expires_at:

            firstPairDeadline,

        })

      );

    /**

*     * ============================================================*

*     * WAVE 2*

*     * ============================================================*

*     */

    const secondPairRows =

      plan.secondPair.map(

        (

          candidate

        ) => ({

          offer_session_id:

            sessionRow.id,

          caregiver_id:

            candidate.caregiverId,

          wave:

            2,

          rank:

            candidate.rank,

          match_score:

            candidate.score,

          distance_km:

            candidate.distanceKm ??

            null,

          status:

            "queued",

          offered_at:

            null,

          expires_at:

            null,

        })

      );

    /**

*     * ============================================================*

*     * CREATE JOB OFFERS*

*     * ============================================================*

*     */

    const {

      error:

        offersError,

    } =

      await supabaseAdmin

        .from(

          "caregiver_job_offers"

        )

        .insert([

          ...firstPairRows,

          ...secondPairRows,

        ]);

    if (

      offersError

    ) {

      console.error(

        "Unable to create caregiver offers:",

        offersError

      );

      await supabaseAdmin

        .from(

          "caregiver_offer_sessions"

        )

        .delete()

        .eq(

          "id",

          sessionRow.id

        );

      return jsonError(

        "Unable to create caregiver outreach offers.",

        500,

        {

          databaseMessage:

            offersError.message,

        }

      );

    }

    /**

*     * ============================================================*

*     * SUCCESS*

*     * ============================================================*

*     */

    return NextResponse.json({

      success: true,

      reused: false,

      offerSessionId:

        sessionRow.id,

      status:

        "awaiting_first_pair",

      firstPairDeadline,

      automatedDeadlineAt,

      careRecipientId,

      careRequestId,

      databaseEligibleCaregivers:

        caregivers.length,

      onboardingDraftsLoaded:

        drafts.length,

      matchingProfilesBuilt:

        matchingProfiles.length,

      candidateCount:

        matchRun.candidates.length,

      eligibleCandidateCount,

      firstWaveCaregiverIds:

        plan.firstPair.map(

          (

            caregiver

          ) =>

            caregiver.caregiverId

        ),

      secondWaveCaregiverIds:

        plan.secondPair.map(

          (

            caregiver

          ) =>

            caregiver.caregiverId

        ),

    });

  } catch (

    error

  ) {

    console.error(

      "Automatic caregiver matching failed:",

      error

    );

    return jsonError(

      error instanceof Error

        ? error.message

        : "Unable to start caregiver matching.",

      500

    );

  }

}

/**

* * ================================================================*

* * DURATION*

* * ================================================================*

* */

function normalizeDurationHours(

  supplied:

    number |

    undefined,

  startTime:

    string,

  endTime:

    string

) {

  if (

    typeof supplied ===

      "number" &&

    Number.isFinite(

      supplied

    ) &&

    supplied >

      0

  ) {

    return Math.round(

      supplied

    );

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

    return 0;

  }

  const minutes =

    end >

    start

      ? end -

        start

      : 24 *

          60 -

        start +

        end;

  return Math.round(

    minutes /

      60

  );

}

/**

* * ================================================================*

* * TIME*

* * ================================================================*

* */

function minutesFromTime(

  value:

    string

) {

  if (

    !/^\d{1,2}:\d{2}/.test(

      value

    )

  ) {

    return null;

  }

  const [

    hourText,

    minuteText,

  ] =

    value

      .slice(

        0,

        5

      )

      .split(

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

/**

* * ================================================================*

* * RECIPIENT NAME*

* * ================================================================*

* */

function getRecipientName(

  booking:

    BookingDraft

) {

  const explicit =

    (

      booking.careRecipientName ||

      booking.recipientName ||

      ""

    ).trim();

  if (

    explicit

  ) {

    return explicit;

  }

  const accountName =

    [

      booking.firstName,

      booking.lastName,

    ]

      .filter(

        Boolean

      )

      .join(

        " "

      )

      .trim();

  return (

    accountName ||

    "Care Recipient"

  );

}

/**

* * ================================================================*

* * SPLIT NAME*

* * ================================================================*

* */

function splitName(

  fullName:

    string

) {

  const parts =

    fullName

      .trim()

      .split(

        /\s+/

      )

      .filter(

        Boolean

      );

  if (

    parts.length ===

    0

  ) {

    return {

      firstName:

        "Care",

      lastName:

        "Recipient",

    };

  }

  if (

    parts.length ===

    1

  ) {

    return {

      firstName:

        parts[0],

      lastName:

        "",

    };

  }

  return {

    firstName:

      parts[0],

    lastName:

      parts

        .slice(

          1

        )

        .join(

          " "

        ),

  };

}

/**

* * ================================================================*

* * TEXT NORMALIZATION*

* * ================================================================*

* */

function normalizeText(

  value:

    unknown

) {

  return typeof value ===

    "string"

    ? value

        .trim()

        .toLowerCase()

        .replace(

          /\s+/g,

          " "

        )

    : "";

}

/**

* * ================================================================*

* * REQUEST SUMMARY*

* * ================================================================*

* */

function buildRequestSummary(

  booking:

    BookingDraft

) {

  const needs =

    booking.selectedNeeds ||

    [];

  const context =

    booking.selectedContext ||

    [];

  const parts =

    [

      needs.length

        ? `Care needs: ${needs.join(

            ", "

          )}.`

        : "",

      context.length

        ? `Care context: ${context.join(

            ", "

          )}.`

        : "",

      booking.primaryLanguage

        ? `Primary language: ${booking.primaryLanguage}.`

        : "",

      booking.otherNeed

        ? `Other need: ${booking.otherNeed}.`

        : "",

      booking.otherContext

        ? `Other context: ${booking.otherContext}.`

        : "",

    ].filter(

      Boolean

    );

  return (

    parts.join(

      " "

    ) ||

    "Created from Carerity customer booking flow."

  );

}

/**

* * ================================================================*

* * GENERIC OBJECT CHECK*

* * ================================================================*

* */

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
