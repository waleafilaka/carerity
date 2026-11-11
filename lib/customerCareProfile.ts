import {
    BookingDraft,
    BookingFor,
    getBookingDraft,
  } from "./bookingDraft";
  
  import {
    supabase,
  } from "./supabaseClient";
  
  /*
   * ============================================================
   * CUSTOMER CARE PROFILE
   * ============================================================
   *
   * This is NOT a booking.
   *
   * It represents the customer's reusable care defaults:
   *
   * - recipient
   * - care location
   * - care needs
   * - care context
   * - languages
   * - continuity preference
   *
   * Confirmed / paid bookings keep their own snapshot.
   * Editing this profile therefore does NOT modify an
   * existing booking.
   * ============================================================
   */
  
  export type CustomerCareProfile = {
    id?: string;
    userId?: string;
  
    bookingFor?: BookingFor;
  
    careRecipientName?: string;
  
    country?: string;
  
    address?: string;
    unit?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  
    latitude?: number;
    longitude?: number;
    googlePlaceId?: string;
  
    selectedNeeds?: string[];
    selectedContext?: string[];
  
    otherNeed?: string;
    otherContext?: string;
  
    primaryLanguage?: string;
    secondaryLanguage?: string;
  
    preferSameCaregiver?: boolean;
  
    createdAt?: string;
    updatedAt?: string;
  };
  
  export type CustomerCareProfileResult = {
    success: boolean;
  
    authenticated: boolean;
  
    profile:
      CustomerCareProfile;
  
    error?: string;
  };
  
  const STORAGE_KEY =
    "carerityCustomerCareProfile";
  
  export const CUSTOMER_CARE_PROFILE_UPDATED_EVENT =
    "carerityCustomerCareProfileUpdated";
  
  /*
   * ============================================================
   * LOCAL PROFILE
   * ============================================================
   */
  
  export function getCustomerCareProfile():
    CustomerCareProfile {
    if (
      typeof window ===
      "undefined"
    ) {
      return {};
    }
  
    try {
      const raw =
        window.localStorage.getItem(
          STORAGE_KEY
        );
  
      if (
        !raw
      ) {
        return {};
      }
  
      const parsed =
        JSON.parse(
          raw
        );
  
      if (
        !isRecord(
          parsed
        )
      ) {
        return {};
      }
  
      return normalizeCustomerCareProfile(
        parsed as
          CustomerCareProfile
      );
    } catch (
      error
    ) {
      console.error(
        "Unable to read customer care profile:",
        error
      );
  
      return {};
    }
  }
  
  export function saveCustomerCareProfileLocally(
    update:
      Partial<CustomerCareProfile>
  ) {
    if (
      typeof window ===
      "undefined"
    ) {
      return {};
    }
  
    const existing =
      getCustomerCareProfile();
  
    const now =
      new Date()
        .toISOString();
  
    const next =
      normalizeCustomerCareProfile({
        ...existing,
        ...removeUndefinedValues(
          update
        ),
  
        createdAt:
          existing.createdAt ||
          update.createdAt ||
          now,
  
        updatedAt:
          now,
      });
  
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          next
        )
      );
  
      window.dispatchEvent(
        new CustomEvent(
          CUSTOMER_CARE_PROFILE_UPDATED_EVENT,
          {
            detail:
              next,
          }
        )
      );
    } catch (
      error
    ) {
      console.error(
        "Unable to save customer care profile locally:",
        error
      );
    }
  
    return next;
  }
  
  /*
   * ============================================================
   * SEED PROFILE FROM EXISTING BOOKING
   * ============================================================
   *
   * Existing Carerity users may already have completed
   * Find Care before this persistent profile existed.
   *
   * We therefore use their current booking draft ONCE as
   * a seed when no saved care profile exists.
   *
   * This does not make the booking and profile the same object.
   * ============================================================
   */
  
  export function buildCustomerCareProfileFromBooking(
    booking:
      BookingDraft
  ): CustomerCareProfile {
    return normalizeCustomerCareProfile({
      bookingFor:
        booking.bookingFor,
  
      careRecipientName:
        booking.careRecipientName ||
        booking.recipientName ||
        buildName(
          booking.firstName,
          booking.lastName
        ),
  
      country:
        booking.country ||
        "Canada",
  
      address:
        booking.address,
  
      unit:
        booking.unit,
  
      city:
        booking.city,
  
      province:
        booking.province ||
        "Ontario",
  
      postalCode:
        booking.postalCode,
  
      latitude:
        booking.latitude,
  
      longitude:
        booking.longitude,
  
      googlePlaceId:
        booking.googlePlaceId ||
        booking.placeId,
  
      selectedNeeds:
        booking.selectedNeeds,
  
      selectedContext:
        booking.selectedContext,
  
      otherNeed:
        booking.otherNeed,
  
      otherContext:
        booking.otherContext,
  
      primaryLanguage:
        booking.primaryLanguage,
  
      secondaryLanguage:
        booking.secondaryLanguage,
  
      preferSameCaregiver:
        booking.preferSameCaregiver,
    });
  }
  
  export function getCustomerCareProfileWithBookingFallback() {
    const profile =
      getCustomerCareProfile();
  
    if (
      hasMeaningfulCareProfile(
        profile
      )
    ) {
      return profile;
    }
  
    const booking =
      getBookingDraft();
  
    return buildCustomerCareProfileFromBooking(
      booking
    );
  }
  
  /*
   * ============================================================
   * LOAD FROM SUPABASE
   * ============================================================
   */
  
  export async function loadCustomerCareProfileFromSupabase():
    Promise<CustomerCareProfileResult> {
    const localProfile =
      getCustomerCareProfileWithBookingFallback();
  
    try {
      const {
        data: {
          user,
        },
        error:
          userError,
      } =
        await supabase.auth.getUser();
  
      if (
        userError ||
        !user
      ) {
        return {
          success:
            false,
  
          authenticated:
            false,
  
          profile:
            localProfile,
  
          error:
            "You must be signed in to load your care profile.",
        };
      }
  
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "customer_care_profiles"
          )
          .select(
            `
            id,
            user_id,
            booking_for,
            care_recipient_name,
            country,
            address,
            unit,
            city,
            province,
            postal_code,
            latitude,
            longitude,
            google_place_id,
            selected_needs,
            selected_context,
            other_need,
            other_context,
            primary_language,
            secondary_language,
            preferred_same_caregiver,
            created_at,
            updated_at
            `
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();
  
      if (
        error
      ) {
        throw error;
      }
  
      /*
       * No cloud profile yet.
       *
       * Return the booking-derived/local profile.
       * The first save will create the database record.
       */
      if (
        !data
      ) {
        const seeded =
          normalizeCustomerCareProfile({
            ...localProfile,
  
            userId:
              user.id,
          });
  
        if (
          hasMeaningfulCareProfile(
            seeded
          )
        ) {
          saveCustomerCareProfileLocally(
            seeded
          );
        }
  
        return {
          success:
            true,
  
          authenticated:
            true,
  
          profile:
            seeded,
        };
      }
  
      const remoteProfile =
        normalizeCustomerCareProfile({
          id:
            data.id,
  
          userId:
            data.user_id,
  
          bookingFor:
            normalizeBookingFor(
              data.booking_for
            ),
  
          careRecipientName:
            cleanOptionalString(
              data.care_recipient_name
            ),
  
          country:
            cleanOptionalString(
              data.country
            ) ||
            "Canada",
  
          address:
            cleanOptionalString(
              data.address
            ),
  
          unit:
            cleanOptionalString(
              data.unit
            ),
  
          city:
            cleanOptionalString(
              data.city
            ),
  
          province:
            cleanOptionalString(
              data.province
            ) ||
            "Ontario",
  
          postalCode:
            cleanOptionalString(
              data.postal_code
            ),
  
          latitude:
            normalizeNumber(
              data.latitude
            ),
  
          longitude:
            normalizeNumber(
              data.longitude
            ),
  
          googlePlaceId:
            cleanOptionalString(
              data.google_place_id
            ),
  
          selectedNeeds:
            cleanStringArray(
              data.selected_needs
            ),
  
          selectedContext:
            cleanStringArray(
              data.selected_context
            ),
  
          otherNeed:
            cleanOptionalString(
              data.other_need
            ),
  
          otherContext:
            cleanOptionalString(
              data.other_context
            ),
  
          primaryLanguage:
            cleanOptionalString(
              data.primary_language
            ),
  
          secondaryLanguage:
            cleanOptionalString(
              data.secondary_language
            ),
  
          preferSameCaregiver:
            typeof data.preferred_same_caregiver ===
              "boolean"
              ? data.preferred_same_caregiver
              : undefined,
  
          createdAt:
            cleanOptionalString(
              data.created_at
            ),
  
          updatedAt:
            cleanOptionalString(
              data.updated_at
            ),
        });
  
      saveCustomerCareProfileLocally(
        remoteProfile
      );
  
      return {
        success:
          true,
  
        authenticated:
          true,
  
        profile:
          remoteProfile,
      };
    } catch (
      error
    ) {
      console.error(
        "Unable to load customer care profile:",
        error
      );
  
      return {
        success:
          false,
  
        authenticated:
          true,
  
        profile:
          localProfile,
  
        error:
          getErrorMessage(
            error,
            "Unable to load your care profile."
          ),
      };
    }
  }
  
  /*
   * ============================================================
   * SAVE TO SUPABASE
   * ============================================================
   */
  
  export async function saveCustomerCareProfileToSupabase(
    update:
      Partial<CustomerCareProfile>
  ): Promise<CustomerCareProfileResult> {
    const existing =
      getCustomerCareProfileWithBookingFallback();
  
    const combined =
      normalizeCustomerCareProfile({
        ...existing,
        ...removeUndefinedValues(
          update
        ),
      });
  
    /*
     * Save locally first so a temporary network issue
     * does not destroy the customer's changes.
     */
    const localProfile =
      saveCustomerCareProfileLocally(
        combined
      );
  
    try {
      const {
        data: {
          user,
        },
        error:
          userError,
      } =
        await supabase.auth.getUser();
  
      if (
        userError ||
        !user
      ) {
        return {
          success:
            false,
  
          authenticated:
            false,
  
          profile:
            localProfile,
  
          error:
            "Your session has expired. Sign in again to save your care profile.",
        };
      }
  
      const payload = {
        user_id:
          user.id,
  
        booking_for:
          combined.bookingFor ||
          null,
  
        care_recipient_name:
          combined.careRecipientName ||
          null,
  
        country:
          combined.country ||
          "Canada",
  
        address:
          combined.address ||
          null,
  
        unit:
          combined.unit ||
          null,
  
        city:
          combined.city ||
          null,
  
        province:
          combined.province ||
          "Ontario",
  
        postal_code:
          combined.postalCode ||
          null,
  
        latitude:
          combined.latitude ??
          null,
  
        longitude:
          combined.longitude ??
          null,
  
        google_place_id:
          combined.googlePlaceId ||
          null,
  
        selected_needs:
          combined.selectedNeeds ||
          [],
  
        selected_context:
          combined.selectedContext ||
          [],
  
        other_need:
          combined.otherNeed ||
          null,
  
        other_context:
          combined.otherContext ||
          null,
  
        primary_language:
          combined.primaryLanguage ||
          null,
  
        secondary_language:
          combined.secondaryLanguage ||
          null,
  
        preferred_same_caregiver:
          combined.preferSameCaregiver ??
          null,
      };
  
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "customer_care_profiles"
          )
          .upsert(
            payload,
            {
              onConflict:
                "user_id",
            }
          )
          .select(
            `
            id,
            user_id,
            created_at,
            updated_at
            `
          )
          .single();
  
      if (
        error
      ) {
        throw error;
      }
  
      const saved =
        saveCustomerCareProfileLocally({
          ...combined,
  
          id:
            data.id,
  
          userId:
            data.user_id,
  
          createdAt:
            data.created_at,
  
          updatedAt:
            data.updated_at,
        });
  
      return {
        success:
          true,
  
        authenticated:
          true,
  
        profile:
          saved,
      };
    } catch (
      error
    ) {
      console.error(
        "Unable to save customer care profile:",
        error
      );
  
      return {
        success:
          false,
  
        authenticated:
          true,
  
        profile:
          localProfile,
  
        error:
          getErrorMessage(
            error,
            "Your changes were saved on this device, but could not be saved online."
          ),
      };
    }
  }
  
  /*
   * ============================================================
   * BOOKING DEFAULTS
   * ============================================================
   *
   * Use this when a NEW booking starts.
   *
   * We intentionally return only reusable care defaults.
   *
   * We DO NOT copy:
   *
   * - payment information
   * - Stripe IDs
   * - request status
   * - caregiver assignment
   * - visit status
   * - care date
   * - payment state
   *
   * ============================================================
   */
  
  export function getBookingDefaultsFromCustomerCareProfile(
    profile:
      CustomerCareProfile
  ): Partial<BookingDraft> {
    return {
      bookingFor:
        profile.bookingFor,
  
      careRecipientName:
        profile.careRecipientName,
  
      recipientName:
        profile.careRecipientName,
  
      country:
        profile.country ||
        "Canada",
  
      address:
        profile.address,
  
      unit:
        profile.unit,
  
      city:
        profile.city,
  
      province:
        profile.province ||
        "Ontario",
  
      postalCode:
        profile.postalCode,
  
      latitude:
        profile.latitude,
  
      longitude:
        profile.longitude,
  
      googlePlaceId:
        profile.googlePlaceId,
  
      placeId:
        profile.googlePlaceId,
  
      selectedNeeds:
        profile.selectedNeeds,
  
      selectedContext:
        profile.selectedContext,
  
      otherNeed:
        profile.otherNeed,
  
      otherContext:
        profile.otherContext,
  
      primaryLanguage:
        profile.primaryLanguage,
  
      secondaryLanguage:
        profile.secondaryLanguage,
  
      preferSameCaregiver:
        profile.preferSameCaregiver,
    };
  }
  
  /*
   * ============================================================
   * NORMALIZATION
   * ============================================================
   */
  
  function normalizeCustomerCareProfile(
    profile:
      CustomerCareProfile
  ): CustomerCareProfile {
    return {
      ...profile,
  
      id:
        cleanOptionalString(
          profile.id
        ),
  
      userId:
        cleanOptionalString(
          profile.userId
        ),
  
      bookingFor:
        normalizeBookingFor(
          profile.bookingFor
        ),
  
      careRecipientName:
        cleanOptionalString(
          profile.careRecipientName
        ),
  
      country:
        cleanOptionalString(
          profile.country
        ) ||
        "Canada",
  
      address:
        cleanOptionalString(
          profile.address
        ),
  
      unit:
        cleanOptionalString(
          profile.unit
        ),
  
      city:
        cleanOptionalString(
          profile.city
        ),
  
      province:
        cleanOptionalString(
          profile.province
        ) ||
        "Ontario",
  
      postalCode:
        profile.postalCode
          ? formatCanadianPostalCode(
              profile.postalCode
            )
          : undefined,
  
      latitude:
        normalizeNumber(
          profile.latitude
        ),
  
      longitude:
        normalizeNumber(
          profile.longitude
        ),
  
      googlePlaceId:
        cleanOptionalString(
          profile.googlePlaceId
        ),
  
      selectedNeeds:
        cleanStringArray(
          profile.selectedNeeds
        ),
  
      selectedContext:
        cleanStringArray(
          profile.selectedContext
        ),
  
      otherNeed:
        cleanOptionalString(
          profile.otherNeed
        ),
  
      otherContext:
        cleanOptionalString(
          profile.otherContext
        ),
  
      primaryLanguage:
        cleanOptionalString(
          profile.primaryLanguage
        ),
  
      secondaryLanguage:
        cleanOptionalString(
          profile.secondaryLanguage
        ),
  
      preferSameCaregiver:
        typeof profile.preferSameCaregiver ===
          "boolean"
          ? profile.preferSameCaregiver
          : undefined,
  
      createdAt:
        cleanOptionalString(
          profile.createdAt
        ),
  
      updatedAt:
        cleanOptionalString(
          profile.updatedAt
        ),
    };
  }
  
  function hasMeaningfulCareProfile(
    profile:
      CustomerCareProfile
  ) {
    return Boolean(
      profile.careRecipientName ||
        profile.address ||
        profile.selectedNeeds?.length ||
        profile.selectedContext?.length ||
        profile.primaryLanguage
    );
  }
  
  function normalizeBookingFor(
    value:
      unknown
  ): BookingFor | undefined {
    if (
      value ===
        "myself" ||
      value ===
        "someoneElse"
    ) {
      return value;
    }
  
    return undefined;
  }
  
  function normalizeNumber(
    value:
      unknown
  ) {
    if (
      typeof value ===
        "number" &&
      Number.isFinite(
        value
      )
    ) {
      return value;
    }
  
    return undefined;
  }
  
  function cleanOptionalString(
    value:
      unknown
  ): string | undefined {
    if (
      typeof value !==
      "string"
    ) {
      return undefined;
    }
  
    const trimmed =
      value.trim();
  
    return trimmed ||
      undefined;
  }
  
  function cleanStringArray(
    value:
      unknown
  ): string[] | undefined {
    if (
      !Array.isArray(
        value
      )
    ) {
      return undefined;
    }
  
    const values =
      Array.from(
        new Set(
          value
            .filter(
              (
                item
              ): item is string =>
                typeof item ===
                "string"
            )
            .map(
              (
                item
              ) =>
                item.trim()
            )
            .filter(
              Boolean
            )
        )
      );
  
    return values.length
      ? values
      : undefined;
  }
  
  function formatCanadianPostalCode(
    value:
      string
  ) {
    const cleaned =
      value
        .toUpperCase()
        .replace(
          /[^A-Z0-9]/g,
          ""
        )
        .slice(
          0,
          6
        );
  
    if (
      cleaned.length <=
      3
    ) {
      return cleaned;
    }
  
    return `${cleaned.slice(
      0,
      3
    )} ${cleaned.slice(
      3
    )}`;
  }
  
  function buildName(
    firstName?:
      string,
  
    lastName?:
      string
  ) {
    return [
      firstName,
      lastName,
    ]
      .filter(
        (
          value
        ): value is string =>
          Boolean(
            value?.trim()
          )
      )
      .map(
        (
          value
        ) =>
          value.trim()
      )
      .join(
        " "
      ) ||
      undefined;
  }
  
  function removeUndefinedValues<
    T extends object
  >(
    value:
      T
  ): Partial<T> {
    return Object.fromEntries(
      Object.entries(
        value
      ).filter(
        (
          [
            ,
            item,
          ]
        ) =>
          item !==
          undefined
      )
    ) as Partial<T>;
  }
  
  function isRecord(
    value:
      unknown
  ): value is Record<
    string,
    unknown
  > {
    return Boolean(
      value &&
        typeof value ===
          "object" &&
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
      error instanceof Error &&
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
        return message.trim();
      }
    }
  
    return fallback;
  }