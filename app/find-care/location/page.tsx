"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import ProgressHeader from "../../../components/ui/ProgressHeader";

import AddressAutocomplete, {
  AddressResult,
} from "../../../components/ui/AddressAutocomplete";

import {
  BookingFor,
  getBookingDraft,
  saveBookingDraft,
} from "../../../lib/bookingDraft";

const CANADIAN_PROVINCES =
  [
    "Alberta",
    "British Columbia",
    "Manitoba",
    "New Brunswick",
    "Newfoundland and Labrador",
    "Northwest Territories",
    "Nova Scotia",
    "Nunavut",
    "Ontario",
    "Prince Edward Island",
    "Quebec",
    "Saskatchewan",
    "Yukon",
  ];

export default function LocationPage() {
  const router =
    useRouter();

  const [
    bookingFor,
    setBookingFor,
  ] =
    useState<
      BookingFor |
      ""
    >("");

  const [
    country,
    setCountry,
  ] =
    useState(
      "Canada"
    );

  const [
    address,
    setAddress,
  ] =
    useState("");

  const [
    unit,
    setUnit,
  ] =
    useState("");

  const [
    city,
    setCity,
  ] =
    useState("");

  const [
    province,
    setProvince,
  ] =
    useState(
      "Ontario"
    );

  const [
    postalCode,
    setPostalCode,
  ] =
    useState("");

  const [
    latitude,
    setLatitude,
  ] =
    useState<
      number |
      undefined
    >(undefined);

  const [
    longitude,
    setLongitude,
  ] =
    useState<
      number |
      undefined
    >(undefined);

  const [
    placeId,
    setPlaceId,
  ] =
    useState("");

  const [
    showErrors,
    setShowErrors,
  ] =
    useState(false);

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  /*
   * ============================================================
   * LOAD BOOKING
   * ============================================================
   */

  useEffect(() => {
    const draft =
      getBookingDraft();

    setBookingFor(
      draft.bookingFor ||
        ""
    );

    setCountry(
      draft.country ||
        "Canada"
    );

    setAddress(
      draft.address ||
        ""
    );

    setUnit(
      draft.unit ||
        ""
    );

    setCity(
      draft.city ||
        ""
    );

    setProvince(
      draft.province ||
        "Ontario"
    );

    setPostalCode(
      draft.postalCode ||
        ""
    );

    setLatitude(
      draft.latitude
    );

    setLongitude(
      draft.longitude
    );

    setPlaceId(
      draft.placeId ||
        draft.googlePlaceId ||
        ""
    );
  }, []);

  /*
   * ============================================================
   * VALIDATION
   * ============================================================
   */

  const addressValid =
    address
      .trim()
      .length >=
    3;

  const cityValid =
    city
      .trim()
      .length >=
    2;

  const provinceValid =
    province
      .trim()
      .length >
    0;

  const postalCodeValid =
    isValidCanadianPostalCode(
      postalCode
    );

  const countryValid =
    country ===
    "Canada";

  const coordinatesValid =
    typeof latitude ===
      "number" &&
    Number.isFinite(
      latitude
    ) &&
    latitude >=
      -90 &&
    latitude <=
      90 &&
    typeof longitude ===
      "number" &&
    Number.isFinite(
      longitude
    ) &&
    longitude >=
      -180 &&
    longitude <=
      180;

  /*
   * A Google place ID is useful for traceability,
   * but coordinates are the essential matching field.
   *
   * We require both for this stage because a genuine
   * Google selection should provide both.
   */
  const verifiedGoogleLocation =
    coordinatesValid &&
    Boolean(
      placeId.trim()
    );

  const isValid =
    addressValid &&
    cityValid &&
    provinceValid &&
    postalCodeValid &&
    countryValid &&
    verifiedGoogleLocation;

  /*
   * ============================================================
   * SUMMARY
   * ============================================================
   */

  const locationSummary =
    useMemo(
      () => {
        const firstLine =
          [
            address.trim(),
            unit.trim(),
          ]
            .filter(
              Boolean
            )
            .join(
              ", "
            );

        const secondLine =
          [
            city.trim(),
            province.trim(),
            formatCanadianPostalCode(
              postalCode
            ),
          ]
            .filter(
              Boolean
            )
            .join(
              ", "
            );

        return [
          firstLine,
          secondLine,
          "Canada",
        ]
          .filter(
            Boolean
          )
          .join(
            " · "
          );
      },
      [
        address,
        unit,
        city,
        province,
        postalCode,
      ]
    );

  /*
   * ============================================================
   * GOOGLE ADDRESS
   * ============================================================
   */

  function handleAddressSelected(
    result:
      AddressResult
  ) {
    setAddress(
      result.address
    );

    setCity(
      result.city
    );

    setProvince(
      result.province ||
        "Ontario"
    );

    setPostalCode(
      formatCanadianPostalCode(
        result.postalCode
      )
    );

    setCountry(
      "Canada"
    );

    setLatitude(
      result.latitude
    );

    setLongitude(
      result.longitude
    );

    setPlaceId(
      result.placeId ||
        ""
    );

    /*
     * If Continue was previously pressed,
     * a successful new Google selection should
     * immediately remove the stale error state.
     */
    setShowErrors(
      false
    );
  }

  /*
   * ============================================================
   * MANUAL STREET CHANGE
   * ============================================================
   *
   * This is deliberately strict.
   *
   * Example:
   *
   * Google selected:
   * 21 Cedar Street
   *
   * Coordinates belong to 21 Cedar Street.
   *
   * User then types:
   * 29 Cedar Street
   *
   * Those old coordinates can no longer be trusted.
   */

  function handleStreetAddressChange(
    value:
      string
  ) {
    setAddress(
      value
    );

    setLatitude(
      undefined
    );

    setLongitude(
      undefined
    );

    setPlaceId(
      ""
    );
  }

  /*
   * Unit does NOT change the underlying
   * building coordinates.
   */
  function handleUnitChange(
    value:
      string
  ) {
    setUnit(
      value
    );
  }

  /*
   * City/province/postal can be edited,
   * but if a verified Google address already exists,
   * changing these fields means that the text may
   * contradict Google's selected address.
   *
   * Therefore we invalidate only when the actual
   * value changes after verification.
   */

  function handleCityChange(
    value:
      string
  ) {
    if (
      verifiedGoogleLocation &&
      value.trim() !==
        city.trim()
    ) {
      clearVerifiedCoordinates();
    }

    setCity(
      value
    );
  }

  function handleProvinceChange(
    value:
      string
  ) {
    if (
      verifiedGoogleLocation &&
      value !==
        province
    ) {
      clearVerifiedCoordinates();
    }

    setProvince(
      value
    );
  }

  function handlePostalCodeChange(
    value:
      string
  ) {
    const formatted =
      formatCanadianPostalCode(
        value
      );

    if (
      verifiedGoogleLocation &&
      formatted !==
        formatCanadianPostalCode(
          postalCode
        )
    ) {
      clearVerifiedCoordinates();
    }

    setPostalCode(
      formatted
    );
  }

  function clearVerifiedCoordinates() {
    setLatitude(
      undefined
    );

    setLongitude(
      undefined
    );

    setPlaceId(
      ""
    );
  }

  /*
   * ============================================================
   * SAVE
   * ============================================================
   */

  async function handleContinue() {
    setShowErrors(
      true
    );

    if (
      isSaving ||
      !isValid
    ) {
      return;
    }

    setIsSaving(
      true
    );

    try {
      saveBookingDraft({
        bookingFor:
          bookingFor ||
          undefined,

        address:
          address.trim(),

        unit:
          unit.trim(),

        city:
          city.trim(),

        province:
          province.trim(),

        postalCode:
          formatCanadianPostalCode(
            postalCode
          ),

        country:
          "Canada",

        latitude,

        longitude,

        placeId:
          placeId ||
          undefined,

        /*
         * Compatibility with existing
         * Carerity code.
         */
        googlePlaceId:
          placeId ||
          undefined,
      });

      router.push(
        "/find-care/needs"
      );
    } finally {
      setIsSaving(
        false
      );
    }
  }

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-5 text-gray-900 sm:px-6">
      <section className="mx-auto w-full max-w-xl rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <ProgressHeader
          backHref="/find-care/account"
          stage="2 of 4"
          progress="w-[50%]"
          title="Where is care needed?"
          subtitle="Add the care address so we can find nearby caregivers."
        />

        <div className="space-y-5">
          <section>
            <p className="text-sm font-bold text-gray-900">
              Care address
            </p>

            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              Start typing the address and select the correct location from Google.
            </p>

            <div className="mt-4 space-y-4">
              {/* STREET */}

              <div>
                <AddressAutocomplete
                  label="Street address"
                  value={
                    address
                  }
                  onChange={
                    handleStreetAddressChange
                  }
                  onAddressSelected={
                    handleAddressSelected
                  }
                  accent="purple"
                  placeholder="Start typing the care address"
                  hasError={
                    showErrors &&
                    (
                      !addressValid ||
                      !verifiedGoogleLocation
                    )
                  }
                  helperText="Choose the exact Google suggestion so Carerity can calculate caregiver proximity accurately."
                />

                {showErrors &&
                  !addressValid && (
                    <p className="mt-2 text-sm font-semibold text-red-600">
                      Enter the street address.
                    </p>
                  )}

                {showErrors &&
                  addressValid &&
                  !verifiedGoogleLocation && (
                    <p className="mt-2 text-sm font-semibold text-red-600">
                      Select the correct address from the Google suggestions.
                    </p>
                  )}
              </div>

              {/* UNIT */}

              <TextField
                label="Apartment / Unit"
                value={
                  unit
                }
                onChange={
                  handleUnitChange
                }
                autoComplete="address-line2"
                optional
              />

              {/* CITY + PROVINCE */}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField
                  label="City"
                  required
                  value={
                    city
                  }
                  onChange={
                    handleCityChange
                  }
                  autoComplete="address-level2"
                  error={
                    showErrors &&
                    !cityValid
                      ? "Enter the city."
                      : ""
                  }
                />

                <SelectField
                  label="Province"
                  required
                  value={
                    province
                  }
                  onChange={
                    handleProvinceChange
                  }
                  error={
                    showErrors &&
                    !provinceValid
                      ? "Select the province."
                      : ""
                  }
                >
                  <option value="">
                    Select province
                  </option>

                  {CANADIAN_PROVINCES.map(
                    (
                      provinceName
                    ) => (
                      <option
                        key={
                          provinceName
                        }
                        value={
                          provinceName
                        }
                      >
                        {
                          provinceName
                        }
                      </option>
                    )
                  )}
                </SelectField>
              </div>

              {/* POSTAL */}

              <TextField
                label="Postal code"
                required
                value={
                  postalCode
                }
                onChange={
                  handlePostalCodeChange
                }
                autoComplete="postal-code"
                placeholder="A1A 1A1"
                maxLength={
                  7
                }
                error={
                  showErrors &&
                  !postalCodeValid
                    ? "Enter a valid Canadian postal code."
                    : ""
                }
              />

              {/* COUNTRY LAST */}

              <SelectField
                label="Country"
                required
                value={
                  country
                }
                onChange={() => {
                  setCountry(
                    "Canada"
                  );
                }}
              >
                <option value="Canada">
                  Canada
                </option>
              </SelectField>
            </div>
          </section>

          {/* VERIFIED */}

          {verifiedGoogleLocation && (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white font-bold text-emerald-700 shadow-sm">
                  ✓
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900">
                    Care location verified
                  </p>

                  <p className="mt-1 text-sm leading-relaxed text-gray-600">
                    {
                      locationSummary
                    }
                  </p>

                  <p className="mt-2 text-xs font-semibold text-emerald-700">
                    Ready for proximity matching
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* MATCHING EXPLANATION */}

          <section className="rounded-2xl border border-purple-100 bg-purple-50/60 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-purple-700">
              Nearby caregiver matching
            </p>

            <p className="mt-2 text-xs leading-relaxed text-gray-600">
              Carerity uses the verified care location to find suitable nearby caregivers. Closer qualified caregivers are prioritized, while the platform controls how far the search expands when necessary.
            </p>
          </section>

          <p className="text-xs leading-relaxed text-gray-500">
            Your exact address is used for your booking and matching. Carerity does not publicly display it to caregivers browsing opportunities.
          </p>

          {/* PAGE ERROR */}

          {showErrors &&
            !isValid && (
              <div
                role="alert"
                className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
              >
                <p className="text-sm font-bold text-amber-900">
                  Complete the care location
                </p>

                <p className="mt-1 text-sm leading-relaxed text-amber-800">
                  Choose the correct Canadian address from Google before continuing.
                </p>
              </div>
            )}

          {/* CONTINUE */}

          <button
            type="button"
            onClick={
              handleContinue
            }
            disabled={
              isSaving
            }
            className={`min-h-[52px] w-full rounded-xl px-4 py-3.5 text-center font-semibold shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed ${
              isValid &&
              !isSaving
                ? "bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800"
                : "border border-purple-300 bg-purple-100 text-purple-700"
            }`}
          >
            {isSaving
              ? "Saving..."
              : isValid
                ? "Continue"
                : "Select care location to continue"}
          </button>

          <Link
            href="/find-care/account"
            className="block text-center text-sm font-semibold text-gray-500 hover:text-purple-700"
          >
            ← Back to account
          </Link>
        </div>
      </section>
    </main>
  );
}

/*
 * ============================================================
 * TEXT FIELD
 * ============================================================
 */

function TextField({
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  optional =
    false,
  required =
    false,
  error =
    "",
  maxLength,
}: {
  label:
    string;

  value:
    string;

  onChange:
    (
      value:
        string
    ) => void;

  autoComplete?:
    string;

  placeholder?:
    string;

  optional?:
    boolean;

  required?:
    boolean;

  error?:
    string;

  maxLength?:
    number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-gray-900">
        {
          label
        }

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}

        {optional && (
          <span className="ml-1 font-medium text-gray-400">
            (optional)
          </span>
        )}
      </span>

      <input
        type="text"
        value={
          value
        }
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        autoComplete={
          autoComplete
        }
        placeholder={
          placeholder
        }
        maxLength={
          maxLength
        }
        className={`mt-2 min-h-[52px] w-full rounded-xl border px-4 py-3 outline-none transition focus:ring-2 ${
          error
            ? "border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-100"
            : "border-gray-300 focus:border-purple-400 focus:ring-purple-100"
        }`}
      />

      {error && (
        <p className="mt-1 text-sm font-semibold text-red-600">
          {
            error
          }
        </p>
      )}
    </label>
  );
}

/*
 * ============================================================
 * SELECT FIELD
 * ============================================================
 */

function SelectField({
  label,
  value,
  onChange,
  children,
  required =
    false,
  error =
    "",
}: {
  label:
    string;

  value:
    string;

  onChange:
    (
      value:
        string
    ) => void;

  children:
    React.ReactNode;

  required?:
    boolean;

  error?:
    string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-gray-900">
        {
          label
        }

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      <select
        value={
          value
        }
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        className={`mt-2 min-h-[52px] w-full rounded-xl border bg-white px-4 py-3 outline-none transition focus:ring-2 ${
          error
            ? "border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-100"
            : "border-gray-300 focus:border-purple-400 focus:ring-purple-100"
        }`}
      >
        {
          children
        }
      </select>

      {error && (
        <p className="mt-1 text-sm font-semibold text-red-600">
          {
            error
          }
        </p>
      )}
    </label>
  );
}

/*
 * ============================================================
 * LOCATION HELPERS
 * ============================================================
 */

function isValidCanadianPostalCode(
  value:
    string
) {
  const normalized =
    value
      .trim()
      .toUpperCase()
      .replace(
        /\s/g,
        ""
      );

  return /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$/.test(
    normalized
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
