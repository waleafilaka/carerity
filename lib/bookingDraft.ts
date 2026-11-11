export type BookingRequestStatus =
  | "draft"
  | "payment_method_secured"
  | "matching"
  | "caregiver_accepted"
  | "payment_processing"
  | "confirmed"
  | "payment_action_required"
  | "cancelled";

export type BookingPaymentStatus =
  | "not_set"
  | "method_secured"
  | "processing"
  | "paid"
  | "failed"
  | "action_required";

export type VisitStatus =
  | "Scheduled"
  | "Matched"
  | "Accepted"
  | "On the Way"
  | "Delayed"
  | "Arrived"
  | "Verified"
  | "In Progress"
  | "Completed"
  | "Cancelled"
  | "No Show"
  | "Incident";

export type BookingScheduleType =
  | "One-Time Care"
  | "Recurring Care";

export type RecurringFrequency =
  | "Weekly"
  | "Biweekly"
  | "Monthly";

export type RecurringStatus =
  | "Active"
  | "Paused"
  | "Cancelled";

export type BookingFor =
  | "myself"
  | "someoneElse";

export type BookingOfferStatus =
  | "not_started"
  | "contacting_primary"
  | "awaiting_responses"
  | "awaiting_first_pair"
  | "first_pair_ready"
  | "customer_choice_pending"
  | "awaiting_second_pair"
  | "second_pair_ready"
  | "caregiver_selected"
  | "manual_sourcing"
  | "closed";

export const RECURRING_DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type RecurringDayName =
  (typeof RECURRING_DAY_NAMES)[number];

export type RecurringDaySchedule = {
  day:
    RecurringDayName;

  startTime:
    string;

  endTime:
    string;

  durationHours:
    number;
};

export type BookingDraft = {
  bookingFor?:
    BookingFor;

  firstName?:
    string;

  lastName?:
    string;

  email?:
    string;

  phone?:
    string;

  careRecipientName?:
    string;

  recipientName?:
    string;

  country?:
    string;

  address?:
    string;

  unit?:
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

  placeId?:
    string;

  googlePlaceId?:
    string;

  selectedNeeds?:
    string[];

  selectedContext?:
    string[];

  otherNeed?:
    string;

  otherContext?:
    string;

  primaryLanguage?:
    string;

  secondaryLanguage?:
    string;

  scheduleType?:
    BookingScheduleType;

  careDate?:
    string;

  startTime?:
    string;

  endTime?:
    string;

  durationHours?:
    number;

  recurringFrequency?:
    RecurringFrequency;

  recurringDays?:
    RecurringDayName[];

  recurringDaySchedules?:
    RecurringDaySchedule[];

  recurringStartDate?:
    string;

  recurringEndDate?:
    string;

  preferSameCaregiver?:
    boolean;

  recurringStatus?:
    RecurringStatus;

  skippedVisitDates?:
    string[];

  completedVisitDates?:
    string[];

  cancelledVisitDates?:
    string[];

  inProgressVisitDate?:
    string;

  /*
   * ============================================================
   * MATCHING / OFFER ORCHESTRATION
   * ============================================================
   *
   * Operational offer records live in Supabase.
   * These fields only let the current customer booking draft
   * remember which live offer session it belongs to.
   */

  matchingSessionId?:
    string;

  offerStatus?:
    BookingOfferStatus;

  automatedMatchingDeadlineAt?:
    string;

  presentedCaregiverIds?:
    string[];

  declinedPresentedCaregiverIds?:
    string[];

  selectedCaregiverId?:
    string;

  assignedCaregiverId?:
    string;

  assignedCaregiverName?:
    string;

  requestStatus?:
    BookingRequestStatus;

  caregiverAcceptedAt?:
    string;

  lastRecurringUpdate?:
    string;

  visitId?:
    string;

  visitStatus?:
    VisitStatus;

  caregiverEta?:
    string;

  caregiverArrivedAt?:
    string;

  visitStartedAt?:
    string;

  visitCompletedAt?:
    string;

  hourlyRate?:
    number;

  estimatedSubtotal?:
    number;

  estimatedTaxes?:
    number;

  estimatedTotal?:
    number;

  stripeCustomerId?:
    string;

  stripeSetupSessionId?:
    string;

  paymentMethodStatus?:
    "not_set"
    | "secured";

  paymentAuthorizationAcceptedAt?:
    string;

  paymentStatus?:
    BookingPaymentStatus;

  stripePaymentIntentId?:
    string;

  paidAmount?:
    number;

  paidCurrency?:
    string;

  paidAt?:
    string;

  createdAt?:
    string;

  updatedAt?:
    string;
};

const STORAGE_KEY =
  "carerityBookingDraft";

export const BOOKING_DRAFT_UPDATED_EVENT =
  "carerityBookingDraftUpdated";

export const BOOKING_DRAFT_CLEARED_EVENT =
  "carerityBookingDraftCleared";

export function getBookingDraft():
  BookingDraft {
  if (
    typeof window ===
    "undefined"
  ) {
    return {};
  }

  try {
    const saved =
      window.localStorage.getItem(
        STORAGE_KEY
      );

    if (
      !saved
    ) {
      return {};
    }

    const parsed =
      JSON.parse(
        saved
      ) as unknown;

    if (
      !isPlainObject(
        parsed
      )
    ) {
      return {};
    }

    return normalizeBookingDraft(
      parsed as BookingDraft
    );
  } catch (
    error
  ) {
    console.error(
      "Unable to read the Carerity booking draft:",
      error
    );

    return {};
  }
}

export function saveBookingDraft(
  update:
    Partial<BookingDraft>
):
  BookingDraft {
  if (
    typeof window ===
    "undefined"
  ) {
    return {};
  }

  const existing =
    getBookingDraft();

  const now =
    new Date()
      .toISOString();

  const next =
    normalizeBookingDraft({
      ...existing,

      ...removeUndefinedValues(
        update
      ),

      createdAt:
        existing.createdAt ??
        update.createdAt ??
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

    dispatchBookingDraftEvent(
      BOOKING_DRAFT_UPDATED_EVENT,
      next
    );
  } catch (
    error
  ) {
    console.error(
      "Unable to save the Carerity booking draft:",
      error
    );
  }

  return next;
}

export function replaceBookingDraft(
  draft:
    BookingDraft
):
  BookingDraft {
  if (
    typeof window ===
    "undefined"
  ) {
    return {};
  }

  const now =
    new Date()
      .toISOString();

  const next =
    normalizeBookingDraft({
      ...removeUndefinedValues(
        draft
      ),

      createdAt:
        draft.createdAt ??
        now,

      updatedAt:
        now,
    });

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      next
    )
  );

  dispatchBookingDraftEvent(
    BOOKING_DRAFT_UPDATED_EVENT,
    next
  );

  return next;
}

export function clearBookingDraft() {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.removeItem(
    STORAGE_KEY
  );

  dispatchBookingDraftEvent(
    BOOKING_DRAFT_CLEARED_EVENT,
    {}
  );
}

export function hasCompleteCareLocation(
  draft:
    BookingDraft
) {
  return Boolean(
    draft.country?.trim() &&
    draft.address?.trim() &&
    draft.city?.trim() &&
    draft.province?.trim() &&
    draft.postalCode?.trim()
  );
}

export function getCareLocationDisplay(
  draft:
    BookingDraft
) {
  const addressLine =
    [
      draft.address,
      draft.unit,
    ]
      .filter(
        isNonEmptyString
      )
      .join(
        ", "
      );

  const cityLine =
    [
      draft.city,
      draft.province,
      draft.postalCode,
    ]
      .filter(
        isNonEmptyString
      )
      .join(
        ", "
      );

  return [
    addressLine,
    cityLine,
  ]
    .filter(
      Boolean
    )
    .join(
      " · "
    );
}

export function toDateInputValue(
  date:
    Date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() +
      1
    )
      .padStart(
        2,
        "0"
      );

  const day =
    String(
      date.getDate()
    )
      .padStart(
        2,
        "0"
      );

  return `${year}-${month}-${day}`;
}

export function getDayNameFromDate(
  value:
    string
):
  RecurringDayName |
  "" {
  if (
    !value
  ) {
    return "";
  }

  const date =
    new Date(
      `${value}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleDateString(
    "en-CA",
    {
      weekday:
        "long",
    }
  ) as RecurringDayName;
}

export function calculateDurationHours(
  startTime:
    string,

  endTime:
    string
) {
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
    return null;
  }

  let difference =
    end -
    start;

  if (
    difference <=
    0
  ) {
    difference +=
      24 *
      60;
  }

  return (
    difference /
    60
  );
}

export function addHoursToTime(
  startTime:
    string,

  hoursToAdd:
    number
) {
  const start =
    minutesFromTime(
      startTime
    );

  if (
    start ===
    null
  ) {
    return "";
  }

  const total =
    (
      start +
      Math.round(
        hoursToAdd *
        60
      )
    ) %
    (
      24 *
      60
    );

  const hours =
    Math.floor(
      total /
      60
    );

  const minutes =
    total %
    60;

  return `${String(
    hours
  ).padStart(
    2,
    "0"
  )}:${String(
    minutes
  ).padStart(
    2,
    "0"
  )}`;
}

export function getRecurringScheduleForDay(
  draft:
    BookingDraft,

  day:
    string
):
  RecurringDaySchedule |
  undefined {
  const direct =
    draft.recurringDaySchedules
      ?.find(
        (
          item
        ) =>
          item.day ===
          day
      );

  if (
    direct
  ) {
    return direct;
  }

  if (
    draft.recurringDays?.includes(
      day as RecurringDayName
    ) &&
    draft.startTime &&
    draft.endTime
  ) {
    return {
      day:
        day as RecurringDayName,

      startTime:
        draft.startTime,

      endTime:
        draft.endTime,

      durationHours:
        calculateDurationHours(
          draft.startTime,
          draft.endTime
        ) ??
        draft.durationHours ??
        0,
    };
  }

  return undefined;
}

export function getRecurringScheduleForDate(
  draft:
    BookingDraft,

  dateValue:
    string
) {
  const day =
    getDayNameFromDate(
      dateValue
    );

  return day
    ? getRecurringScheduleForDay(
        draft,
        day
      )
    : undefined;
}

export function isRecurringDateScheduled(
  draft:
    BookingDraft,

  date:
    Date
) {
  if (
    draft.scheduleType !==
      "Recurring Care" ||
    draft.recurringStatus ===
      "Cancelled"
  ) {
    return false;
  }

  const startValue =
    draft.recurringStartDate ||
    draft.careDate;

  if (
    !startValue
  ) {
    return false;
  }

  const start =
    startOfDay(
      new Date(
        `${startValue}T00:00:00`
      )
    );

  const candidate =
    startOfDay(
      date
    );

  if (
    candidate <
    start
  ) {
    return false;
  }

  if (
    draft.recurringEndDate
  ) {
    const end =
      startOfDay(
        new Date(
          `${draft.recurringEndDate}T00:00:00`
        )
      );

    if (
      candidate >
      end
    ) {
      return false;
    }
  }

  const day =
    candidate.toLocaleDateString(
      "en-CA",
      {
        weekday:
          "long",
      }
    ) as RecurringDayName;

  if (
    !getRecurringScheduleForDay(
      draft,
      day
    )
  ) {
    return false;
  }

  const frequency =
    draft.recurringFrequency ||
    "Weekly";

  if (
    frequency ===
    "Weekly"
  ) {
    return true;
  }

  const differenceInDays =
    Math.floor(
      (
        candidate.getTime() -
        start.getTime()
      ) /
      86_400_000
    );

  if (
    frequency ===
    "Biweekly"
  ) {
    return (
      Math.floor(
        differenceInDays /
        7
      ) %
      2 ===
      0
    );
  }

  return (
    getWeekOfMonth(
      candidate
    ) ===
    getWeekOfMonth(
      start
    )
  );
}

export function getNextRecurringVisits(
  draft:
    BookingDraft,

  count =
    5,

  fromDate =
    new Date()
) {
  if (
    draft.recurringStatus ===
      "Paused" ||
    draft.recurringStatus ===
      "Cancelled"
  ) {
    return [];
  }

  const startValue =
    draft.recurringStartDate ||
    draft.careDate;

  if (
    !startValue
  ) {
    return [];
  }

  const start =
    startOfDay(
      new Date(
        `${startValue}T00:00:00`
      )
    );

  const today =
    startOfDay(
      fromDate
    );

  const base =
    start >
    today
      ? start
      : today;

  const results:
    string[] =
    [];

  for (
    let offset =
      0;

    offset <=
      730 &&
    results.length <
      count;

    offset +=
      1
  ) {
    const candidate =
      new Date(
        base
      );

    candidate.setDate(
      base.getDate() +
      offset
    );

    if (
      !isRecurringDateScheduled(
        draft,
        candidate
      )
    ) {
      continue;
    }

    const value =
      toDateInputValue(
        candidate
      );

    if (
      draft.skippedVisitDates
        ?.includes(
          value
        )
    ) {
      continue;
    }

    if (
      draft.cancelledVisitDates
        ?.includes(
          value
        )
    ) {
      continue;
    }

    results.push(
      value
    );
  }

  return results;
}

/*
 * ============================================================
 * NORMALIZATION
 * ============================================================
 */

function normalizeBookingDraft(
  draft:
    BookingDraft
):
  BookingDraft {
  const recurringDays =
    cleanRecurringDays(
      draft.recurringDays
    );

  const recurringDaySchedules =
    cleanRecurringSchedules(
      draft.recurringDaySchedules,
      recurringDays,
      draft.startTime,
      draft.endTime,
      draft.durationHours
    );

  return {
    ...draft,

    country:
      cleanOptionalString(
        draft.country
      ) ||
      "Canada",

    firstName:
      cleanOptionalString(
        draft.firstName
      ),

    lastName:
      cleanOptionalString(
        draft.lastName
      ),

    email:
      cleanOptionalString(
        draft.email
      )?.toLowerCase(),

    phone:
      cleanOptionalString(
        draft.phone
      ),

    careRecipientName:
      cleanOptionalString(
        draft.careRecipientName
      ),

    recipientName:
      cleanOptionalString(
        draft.recipientName
      ),

    address:
      cleanOptionalString(
        draft.address
      ),

    unit:
      cleanOptionalString(
        draft.unit
      ),

    city:
      cleanOptionalString(
        draft.city
      ),

    province:
      cleanOptionalString(
        draft.province
      ) ||
      "Ontario",

    postalCode:
      draft.postalCode
        ? formatCanadianPostalCode(
            draft.postalCode
          )
        : undefined,

    placeId:
      cleanOptionalString(
        draft.placeId
      ),

    googlePlaceId:
      cleanOptionalString(
        draft.googlePlaceId
      ),

    selectedNeeds:
      cleanStringArray(
        draft.selectedNeeds
      ),

    selectedContext:
      cleanStringArray(
        draft.selectedContext
      ),

    otherNeed:
      cleanOptionalString(
        draft.otherNeed
      ),

    otherContext:
      cleanOptionalString(
        draft.otherContext
      ),

    primaryLanguage:
      cleanOptionalString(
        draft.primaryLanguage
      ),

    secondaryLanguage:
      cleanOptionalString(
        draft.secondaryLanguage
      ),

    recurringDays:
      recurringDaySchedules
        ?.map(
          (
            item
          ) =>
            item.day
        ) ??
      recurringDays,

    recurringDaySchedules,

    skippedVisitDates:
      cleanStringArray(
        draft.skippedVisitDates
      ),

    completedVisitDates:
      cleanStringArray(
        draft.completedVisitDates
      ),

    cancelledVisitDates:
      cleanStringArray(
        draft.cancelledVisitDates
      ),

    inProgressVisitDate:
      cleanOptionalString(
        draft.inProgressVisitDate
      ),

    matchingSessionId:
      cleanOptionalString(
        draft.matchingSessionId
      ),

    automatedMatchingDeadlineAt:
      cleanOptionalString(
        draft.automatedMatchingDeadlineAt
      ),

    presentedCaregiverIds:
      cleanStringArray(
        draft.presentedCaregiverIds
      ),

    declinedPresentedCaregiverIds:
      cleanStringArray(
        draft.declinedPresentedCaregiverIds
      ),

    selectedCaregiverId:
      cleanOptionalString(
        draft.selectedCaregiverId
      ),

    assignedCaregiverId:
      cleanOptionalString(
        draft.assignedCaregiverId
      ),

    assignedCaregiverName:
      cleanOptionalString(
        draft.assignedCaregiverName
      ),

    stripeCustomerId:
      cleanOptionalString(
        draft.stripeCustomerId
      ),

    stripeSetupSessionId:
      cleanOptionalString(
        draft.stripeSetupSessionId
      ),

    stripePaymentIntentId:
      cleanOptionalString(
        draft.stripePaymentIntentId
      ),
  };
}

/*
 * ============================================================
 * RECURRING HELPERS
 * ============================================================
 */

function cleanRecurringDays(
  value:
    unknown
):
  RecurringDayName[] |
  undefined {
  if (
    !Array.isArray(
      value
    )
  ) {
    return undefined;
  }

  const days =
    Array.from(
      new Set(
        value.filter(
          (
            item
          ): item is RecurringDayName =>
            typeof item ===
              "string" &&
            RECURRING_DAY_NAMES.includes(
              item as RecurringDayName
            )
        )
      )
    );

  return days.length
    ? sortDays(
        days
      )
    : undefined;
}

function cleanRecurringSchedules(
  value:
    unknown,

  days?:
    RecurringDayName[],

  fallbackStart?:
    string,

  fallbackEnd?:
    string,

  fallbackDuration?:
    number
):
  RecurringDaySchedule[] |
  undefined {
  const schedules:
    RecurringDaySchedule[] =
    [];

  if (
    Array.isArray(
      value
    )
  ) {
    value.forEach(
      (
        item
      ) => {
        if (
          !isPlainObject(
            item
          )
        ) {
          return;
        }

        const {
          day,
          startTime,
          endTime,
        } =
          item;

        if (
          typeof day !==
            "string" ||
          !RECURRING_DAY_NAMES.includes(
            day as RecurringDayName
          ) ||
          typeof startTime !==
            "string" ||
          typeof endTime !==
            "string"
        ) {
          return;
        }

        const durationHours =
          calculateDurationHours(
            startTime,
            endTime
          );

        if (
          !durationHours
        ) {
          return;
        }

        schedules.push({
          day:
            day as RecurringDayName,

          startTime,

          endTime,

          durationHours,
        });
      }
    );
  }

  if (
    !schedules.length &&
    days?.length &&
    fallbackStart &&
    fallbackEnd
  ) {
    const durationHours =
      calculateDurationHours(
        fallbackStart,
        fallbackEnd
      ) ??
      fallbackDuration ??
      0;

    if (
      durationHours >
      0
    ) {
      days.forEach(
        (
          day
        ) =>
          schedules.push({
            day,

            startTime:
              fallbackStart,

            endTime:
              fallbackEnd,

            durationHours,
          })
      );
    }
  }

  if (
    !schedules.length
  ) {
    return undefined;
  }

  return Array.from(
    new Map(
      schedules.map(
        (
          item
        ) => [
          item.day,
          item,
        ]
      )
    ).values()
  ).sort(
    (
      a,
      b
    ) =>
      RECURRING_DAY_NAMES.indexOf(
        a.day
      ) -
      RECURRING_DAY_NAMES.indexOf(
        b.day
      )
  );
}

function sortDays(
  days:
    RecurringDayName[]
) {
  return [
    ...days,
  ].sort(
    (
      a,
      b
    ) =>
      RECURRING_DAY_NAMES.indexOf(
        a
      ) -
      RECURRING_DAY_NAMES.indexOf(
        b
      )
  );
}

/*
 * ============================================================
 * GENERIC HELPERS
 * ============================================================
 */

function minutesFromTime(
  value:
    string
) {
  if (
    !/^\d{2}:\d{2}$/.test(
      value
    )
  ) {
    return null;
  }

  const [
    hours,
    minutes,
  ] =
    value
      .split(
        ":"
      )
      .map(
        Number
      );

  if (
    hours >
      23 ||
    minutes >
      59
  ) {
    return null;
  }

  return (
    hours *
      60 +
    minutes
  );
}

function getWeekOfMonth(
  date:
    Date
) {
  return (
    Math.floor(
      (
        date.getDate() -
        1
      ) /
      7
    ) +
    1
  );
}

function startOfDay(
  date:
    Date
) {
  const next =
    new Date(
      date
    );

  next.setHours(
    0,
    0,
    0,
    0
  );

  return next;
}

function removeUndefinedValues<
  T extends object
>(
  value:
    T
):
  Partial<T> {
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

function cleanOptionalString(
  value:
    unknown
):
  string |
  undefined {
  if (
    typeof value !==
    "string"
  ) {
    return undefined;
  }

  return (
    value.trim() ||
    undefined
  );
}

function cleanStringArray(
  value:
    unknown
):
  string[] |
  undefined {
  if (
    !Array.isArray(
      value
    )
  ) {
    return undefined;
  }

  const items =
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

  return items.length
    ? items
    : undefined;
}

function isPlainObject(
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

function isNonEmptyString(
  value:
    unknown
): value is string {
  return (
    typeof value ===
      "string" &&
    value.trim() !==
      ""
  );
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

  return cleaned.length <=
    3
    ? cleaned
    : `${cleaned.slice(
        0,
        3
      )} ${cleaned.slice(
        3
      )}`;
}

function dispatchBookingDraftEvent(
  eventName:
    string,

  draft:
    BookingDraft
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<BookingDraft>(
      eventName,
      {
        detail:
          draft,
      }
    )
  );
}
