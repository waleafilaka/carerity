"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

export type AddressResult = {
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
};

type AddressAutocompleteProps = {
  value: string;

  onChange: (
    value: string
  ) => void;

  onAddressSelected: (
    result: AddressResult
  ) => void;

  accent?:
    | "purple"
    | "emerald";

  placeholder?: string;

  hasError?: boolean;

  disabled?: boolean;

  label?: string;

  helperText?: string;
};

type GoogleAddressComponent = {
  longText?: string;
  shortText?: string;
  long_name?: string;
  short_name?: string;
  types?: string[];
};

type GooglePlace = {
  id?: string;
  formattedAddress?: string;

  addressComponents?:
    GoogleAddressComponent[];

  location?: {
    lat: () => number;
    lng: () => number;
  };

  fetchFields: (
    options: {
      fields: string[];
    }
  ) => Promise<void>;
};

type GooglePlacePrediction = {
  toPlace:
    () => GooglePlace;
};

type GooglePlaceSelectEvent =
  Event & {
    placePrediction?:
      GooglePlacePrediction;
  };

type GooglePlaceAutocompleteElement =
  HTMLElement & {
    placeholder?: string;
    includedRegionCodes?: string[];
    value?: string;
  };

type GeocoderResult = {
  formatted_address?: string;
  address_components?: GoogleAddressComponent[];
};

declare global {
  interface Window {
    google?: any;

    __carerityGoogleMapsPromise?:
      Promise<void>;

    __carerityGoogleMapsLoaded?:
      () => void;
  }
}

const GOOGLE_MAPS_SCRIPT_ID =
  "carerity-google-maps";

const GOOGLE_CALLBACK_NAME =
  "__carerityGoogleMapsLoaded";

export default function AddressAutocomplete({
  value,
  onChange,
  onAddressSelected,
  accent =
    "purple",
  placeholder =
    "Start typing an address",
  hasError =
    false,
  disabled =
    false,
  label,
  helperText,
}: AddressAutocompleteProps) {
  const inputId =
    useId();

  const helperId =
    `${inputId}-helper`;

  const containerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const autocompleteRef =
    useRef<
      GooglePlaceAutocompleteElement |
      null
    >(
      null
    );

  /*
   * Keep parent callbacks stable without rebuilding Google's
   * custom autocomplete element on every parent render.
   */
  const onChangeRef =
    useRef(
      onChange
    );

  const onAddressSelectedRef =
    useRef(
      onAddressSelected
    );

  useEffect(
    () => {
      onChangeRef.current =
        onChange;
    },
    [
      onChange,
    ]
  );

  useEffect(
    () => {
      onAddressSelectedRef.current =
        onAddressSelected;
    },
    [
      onAddressSelected,
    ]
  );

  const [
    isLoadingGoogle,
    setIsLoadingGoogle,
  ] =
    useState(
      true
    );

  const [
    googleReady,
    setGoogleReady,
  ] =
    useState(
      false
    );

  const [
    googleError,
    setGoogleError,
  ] =
    useState(
      ""
    );

  const accentClasses =
    accent ===
    "emerald"
      ? {
          border:
            "border-emerald-300",
          focus:
            "focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100",
          icon:
            "text-emerald-700",
          spinner:
            "border-t-emerald-600",
        }
      : {
          border:
            "border-purple-300",
          focus:
            "focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100",
          icon:
            "text-purple-700",
          spinner:
            "border-t-purple-600",
        };

  /*
   * ============================================================
   * INITIALIZE GOOGLE PLACES
   * ============================================================
   */

  useEffect(
    () => {
      let mounted =
        true;

      let autocomplete:
        GooglePlaceAutocompleteElement |
        null =
          null;

      let handlePlaceSelect:
        ((event: Event) => void) |
        null =
          null;

      async function initialize() {
        try {
          setGoogleError(
            ""
          );

          setGoogleReady(
            false
          );

          setIsLoadingGoogle(
            true
          );

          await loadGoogleMaps();

          if (
            !mounted
          ) {
            return;
          }

          if (
            !window.google?.maps
              ?.importLibrary
          ) {
            throw new Error(
              "Google Maps loaded, but importLibrary is unavailable."
            );
          }

          const placesLibrary =
            await window.google.maps.importLibrary(
              "places"
            );

          if (
            !mounted
          ) {
            return;
          }

          const PlaceAutocompleteElement =
            placesLibrary
              .PlaceAutocompleteElement;

          if (
            !PlaceAutocompleteElement
          ) {
            throw new Error(
              "Google Place Autocomplete is unavailable."
            );
          }

          const container =
            containerRef.current;

          if (
            !container
          ) {
            throw new Error(
              "Address search container was not found."
            );
          }

          /*
           * Remove stale Google custom elements left by Fast Refresh
           * or a previous component initialization.
           */
          container.replaceChildren();

          autocomplete =
            new PlaceAutocompleteElement({
              includedRegionCodes: [
                "ca",
              ],
            }) as
              GooglePlaceAutocompleteElement;

          autocomplete.placeholder =
            placeholder;

          autocomplete.includedRegionCodes =
            [
              "ca",
            ];

          autocomplete.setAttribute(
            "aria-label",
            label ||
              "Street address"
          );

          if (
            disabled
          ) {
            autocomplete.setAttribute(
              "disabled",
              ""
            );
          } else {
            autocomplete.removeAttribute(
              "disabled"
            );
          }

          handlePlaceSelect =
            (
              event:
                Event
            ) => {
              void readSelectedPlace(
                event
              );
            };

          async function readSelectedPlace(
            event:
              Event
          ) {
            try {
              const selectEvent =
                event as
                  GooglePlaceSelectEvent;

              const prediction =
                selectEvent
                  .placePrediction;

              if (
                !prediction
              ) {
                return;
              }

              const place =
                prediction.toPlace();

              await place.fetchFields({
                fields: [
                  "id",
                  "formattedAddress",
                  "location",
                  "addressComponents",
                ],
              });

              if (
                !mounted
              ) {
                return;
              }

              let components =
                place.addressComponents ||
                [];

              const latitude =
                place.location
                  ?.lat?.();

              const longitude =
                place.location
                  ?.lng?.();

              if (
                typeof latitude !==
                  "number" ||
                typeof longitude !==
                  "number"
              ) {
                throw new Error(
                  "Google returned the address without location coordinates."
                );
              }

              let address =
                buildStreetAddress(
                  components
                ) ||
                getStreetFromFormattedAddress(
                  place.formattedAddress ||
                    ""
                );

              let city =
                getAddressComponent(
                  components,
                  [
                    "locality",
                    "postal_town",
                    "sublocality",
                    "administrative_area_level_3",
                  ]
                );

              let province =
                getAddressComponent(
                  components,
                  [
                    "administrative_area_level_1",
                  ]
                );

              let postalCode =
                normalizeCanadianPostalCode(
                  getAddressComponent(
                    components,
                    [
                      "postal_code",
                    ]
                  )
                );

              let country =
                getAddressComponent(
                  components,
                  [
                    "country",
                  ]
                ) ||
                "Canada";

              /*
               * Google Place Autocomplete occasionally returns a
               * street/city/province but omits postal_code.
               *
               * Fallback #1:
               * Reverse-geocode the selected coordinates. This usually
               * returns a more complete address_components collection,
               * including the Canadian postal code.
               */
              if (
                !postalCode
              ) {
                const reverseResult =
                  await reverseGeocodeCoordinates(
                    latitude,
                    longitude
                  );

                if (
                  reverseResult
                ) {
                  const reverseComponents =
                    reverseResult.address_components ||
                    [];

                  if (
                    reverseComponents.length >
                    0
                  ) {
                    components =
                      mergeAddressComponents(
                        components,
                        reverseComponents
                      );
                  }

                  address =
                    address ||
                    buildStreetAddress(
                      reverseComponents
                    ) ||
                    getStreetFromFormattedAddress(
                      reverseResult.formatted_address ||
                        ""
                    );

                  city =
                    city ||
                    getAddressComponent(
                      reverseComponents,
                      [
                        "locality",
                        "postal_town",
                        "sublocality",
                        "administrative_area_level_3",
                      ]
                    );

                  province =
                    province ||
                    getAddressComponent(
                      reverseComponents,
                      [
                        "administrative_area_level_1",
                      ]
                    );

                  postalCode =
                    normalizeCanadianPostalCode(
                      getAddressComponent(
                        reverseComponents,
                        [
                          "postal_code",
                        ]
                      )
                    );

                  country =
                    country ||
                    getAddressComponent(
                      reverseComponents,
                      [
                        "country",
                      ]
                    ) ||
                    "Canada";

                  /*
                   * Fallback #2:
                   * If Google embeds a postal code only in the formatted
                   * address, extract the Canadian A1A 1A1 pattern.
                   */
                  if (
                    !postalCode
                  ) {
                    postalCode =
                      extractCanadianPostalCode(
                        reverseResult.formatted_address ||
                          ""
                      );
                  }
                }
              }

              /*
               * Fallback #3:
               * Try the original formatted address as well.
               */
              if (
                !postalCode
              ) {
                postalCode =
                  extractCanadianPostalCode(
                    place.formattedAddress ||
                      ""
                  );
              }

              if (
                !address
              ) {
                throw new Error(
                  "Google returned a location without a street address."
                );
              }

              const result:
                AddressResult = {
                address:
                  address.trim(),

                city:
                  city.trim(),

                province:
                  province.trim(),

                postalCode,

                country:
                  country.trim() ||
                  "Canada",

                latitude,

                longitude,

                placeId:
                  place.id ||
                  undefined,
              };

              /*
               * Parent owns persisted state.
               */
              onChangeRef.current(
                result.address
              );

              onAddressSelectedRef.current(
                result
              );

              /*
               * Clear Google's search input after a valid selection.
               * The chosen value is rendered in our own Selected
               * address card below.
               */
              if (
                autocompleteRef.current
              ) {
                try {
                  autocompleteRef.current.value =
                    "";
                } catch {
                  // Google owns the internal input; harmless if unsupported.
                }
              }

              setGoogleError(
                ""
              );
            } catch (
              error
            ) {
              console.error(
                "Unable to read selected Google address:",
                error
              );

              if (
                mounted
              ) {
                setGoogleError(
                  getErrorMessage(
                    error,
                    "We couldn't read that address."
                  )
                );
              }
            }
          }

          autocomplete.addEventListener(
            "gmp-select",
            handlePlaceSelect
          );

          autocompleteRef.current =
            autocomplete;

          container.appendChild(
            autocomplete
          );

          if (
            mounted
          ) {
            setGoogleReady(
              true
            );

            setIsLoadingGoogle(
              false
            );
          }
        } catch (
          error
        ) {
          console.error(
            "Unable to initialize Google Places:",
            error
          );

          if (
            mounted
          ) {
            setGoogleReady(
              false
            );

            setIsLoadingGoogle(
              false
            );

            setGoogleError(
              getErrorMessage(
                error,
                "Google address suggestions are temporarily unavailable."
              )
            );
          }
        }
      }

      void initialize();

      return () => {
        mounted =
          false;

        if (
          autocomplete &&
          handlePlaceSelect
        ) {
          autocomplete.removeEventListener(
            "gmp-select",
            handlePlaceSelect
          );
        }

        if (
          autocompleteRef.current ===
          autocomplete
        ) {
          autocompleteRef.current =
            null;
        }
      };
    },
    [
      disabled,
      label,
      placeholder,
    ]
  );

  function clearSelectedAddress() {
    onChangeRef.current(
      ""
    );

    setGoogleError(
      ""
    );

    if (
      autocompleteRef.current
    ) {
      try {
        autocompleteRef.current.value =
          "";
      } catch {
        // Ignore if Google's element does not expose value.
      }

      autocompleteRef.current.focus();
    }
  }

  return (
    <div>
      {label && (
        <label
          htmlFor={
            inputId
          }
          className="mb-2 block text-sm font-bold text-gray-900"
        >
          {
            label
          }
        </label>
      )}

      <div
        className={`relative min-h-[56px] rounded-xl border bg-white transition ${
          hasError
            ? "border-red-400 ring-2 ring-red-100"
            : `${accentClasses.border} ${accentClasses.focus}`
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 ${accentClasses.icon}`}
        >
          ⌖
        </span>

        <div
          id={
            inputId
          }
          ref={
            containerRef
          }
          className="carerity-place-autocomplete min-h-[54px] w-full pl-8"
          aria-describedby={
            helperText
              ? helperId
              : undefined
          }
        />

        {isLoadingGoogle && (
          <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
            <div
              className={`h-5 w-5 animate-spin rounded-full border-2 border-gray-200 ${accentClasses.spinner}`}
            />
          </div>
        )}
      </div>

      {helperText && (
        <p
          id={
            helperId
          }
          className="mt-1.5 text-xs leading-relaxed text-gray-500"
        >
          {
            helperText
          }
        </p>
      )}

      {googleReady &&
        !googleError && (
          <p className="mt-2 text-[10px] font-semibold text-gray-400">
            Address search powered by Google
          </p>
        )}

      {value && (
        <div
          className={`mt-3 rounded-xl border px-3 py-2.5 ${
            accent ===
            "emerald"
              ? "border-emerald-200 bg-emerald-50"
              : "border-purple-200 bg-purple-50"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className={`text-xs font-bold ${
                  accent ===
                  "emerald"
                    ? "text-emerald-800"
                    : "text-purple-800"
                }`}
              >
                Selected address
              </p>

              <p className="mt-1 break-words text-sm text-gray-700">
                {
                  value
                }
              </p>
            </div>

            {!disabled && (
              <button
                type="button"
                onClick={
                  clearSelectedAddress
                }
                aria-label="Clear selected address"
                className="shrink-0 rounded-lg px-2 py-1 text-sm font-bold text-gray-500 transition hover:bg-white"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {googleError && (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3"
        >
          <p className="text-xs font-bold text-red-800">
            Google address search could not start
          </p>

          <p className="mt-1 text-xs leading-relaxed text-red-700">
            {
              googleError
            }
          </p>
        </div>
      )}

      <style jsx global>{`
        .carerity-place-autocomplete
          gmp-place-autocomplete {
          display: block;
          width: 100%;
          min-height: 54px;
          position: relative;
          z-index: 20;
        }

        .carerity-place-autocomplete
          gmp-place-autocomplete::part(input) {
          width: 100%;
          min-height: 54px;
          border: 0;
          outline: 0;
          background: transparent;
          padding: 14px 44px 14px 12px;
          font-size: 16px;
          line-height: 24px;
          color: #111827;
        }
      `}</style>
    </div>
  );
}

/*
 * ============================================================
 * GOOGLE MAPS LOADER
 * ============================================================
 */

async function loadGoogleMaps() {
  if (
    typeof window ===
    "undefined"
  ) {
    throw new Error(
      "Google Maps can only load in the browser."
    );
  }

  if (
    window.google?.maps
      ?.importLibrary
  ) {
    return;
  }

  if (
    window.__carerityGoogleMapsPromise
  ) {
    return window.__carerityGoogleMapsPromise;
  }

  const apiKey =
    process.env
      .NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      ?.trim();

  if (
    !apiKey
  ) {
    throw new Error(
      "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing."
    );
  }

  window.__carerityGoogleMapsPromise =
    new Promise<void>(
      (
        resolve,
        reject
      ) => {
        const existing =
          document.getElementById(
            GOOGLE_MAPS_SCRIPT_ID
          ) as
            HTMLScriptElement |
            null;

        const timeout =
          window.setTimeout(
            () => {
              reject(
                new Error(
                  "Google Maps took too long to load."
                )
              );
            },
            15000
          );

        const finish =
          () => {
            window.clearTimeout(
              timeout
            );

            if (
              window.google?.maps
                ?.importLibrary
            ) {
              resolve();
            } else {
              reject(
                new Error(
                  "Google Maps loaded without the required library API."
                )
              );
            }
          };

        window[
          GOOGLE_CALLBACK_NAME
        ] =
          finish;

        if (
          existing
        ) {
          if (
            window.google?.maps
              ?.importLibrary
          ) {
            finish();

            return;
          }

          existing.addEventListener(
            "load",
            finish,
            {
              once: true,
            }
          );

          existing.addEventListener(
            "error",
            () => {
              window.clearTimeout(
                timeout
              );

              reject(
                new Error(
                  "Google Maps failed to load."
                )
              );
            },
            {
              once: true,
            }
          );

          return;
        }

        const script =
          document.createElement(
            "script"
          );

        script.id =
          GOOGLE_MAPS_SCRIPT_ID;

        script.async =
          true;

        script.defer =
          true;

        script.src =
          `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
            apiKey
          )}&libraries=places&loading=async&callback=${GOOGLE_CALLBACK_NAME}`;

        script.onerror =
          () => {
            window.clearTimeout(
              timeout
            );

            window.__carerityGoogleMapsPromise =
              undefined;

            reject(
              new Error(
                "Google Maps failed to load."
              )
            );
          };

        document.head.appendChild(
          script
        );
      }
    );

  return window.__carerityGoogleMapsPromise;
}

/*
 * ============================================================
 * POSTAL-CODE FALLBACK
 * ============================================================
 */

async function reverseGeocodeCoordinates(
  latitude:
    number,
  longitude:
    number
): Promise<GeocoderResult | null> {
  try {
    await loadGoogleMaps();

    if (
      !window.google?.maps
        ?.Geocoder
    ) {
      return null;
    }

    const geocoder =
      new window.google.maps.Geocoder();

    const response =
      await geocoder.geocode({
        location: {
          lat:
            latitude,
          lng:
            longitude,
        },
      });

    const results =
      response?.results as
        GeocoderResult[] |
        undefined;

    if (
      !Array.isArray(
        results
      ) ||
      results.length ===
        0
    ) {
      return null;
    }

    /*
     * Prefer the first result that actually contains a postal code.
     */
    const withPostalCode =
      results.find(
        (
          result
        ) =>
          Boolean(
            getAddressComponent(
              result.address_components ||
                [],
              [
                "postal_code",
              ]
            )
          )
      );

    return (
      withPostalCode ||
      results[0] ||
      null
    );
  } catch (
    error
  ) {
    console.warn(
      "Postal-code reverse geocoding failed:",
      error
    );

    /*
     * Postal fallback should not destroy an otherwise valid
     * Google address selection.
     */
    return null;
  }
}

/*
 * ============================================================
 * ADDRESS HELPERS
 * ============================================================
 */

function buildStreetAddress(
  components:
    GoogleAddressComponent[]
) {
  const streetNumber =
    getAddressComponent(
      components,
      [
        "street_number",
      ]
    );

  const route =
    getAddressComponent(
      components,
      [
        "route",
      ]
    );

  return [
    streetNumber,
    route,
  ]
    .filter(
      Boolean
    )
    .join(
      " "
    )
    .trim();
}

function getStreetFromFormattedAddress(
  formattedAddress:
    string
) {
  return (
    formattedAddress
      .split(
        ","
      )[0]
      ?.trim() ||
    ""
  );
}

function getAddressComponent(
  components:
    GoogleAddressComponent[],
  acceptedTypes:
    string[]
) {
  for (
    const type of acceptedTypes
  ) {
    const component =
      components.find(
        (
          item
        ) =>
          Array.isArray(
            item.types
          ) &&
          item.types.includes(
            type
          )
      );

    if (
      component
    ) {
      return (
        component.longText ||
        component.long_name ||
        component.shortText ||
        component.short_name ||
        ""
      );
    }
  }

  return "";
}

function mergeAddressComponents(
  primary:
    GoogleAddressComponent[],
  fallback:
    GoogleAddressComponent[]
) {
  const result =
    [
      ...primary,
    ];

  for (
    const fallbackComponent of fallback
  ) {
    const fallbackTypes =
      fallbackComponent.types ||
      [];

    const alreadyExists =
      result.some(
        (
          current
        ) =>
          (
            current.types ||
            []
          ).some(
            (
              type
            ) =>
              fallbackTypes.includes(
                type
              )
          )
      );

    if (
      !alreadyExists
    ) {
      result.push(
        fallbackComponent
      );
    }
  }

  return result;
}

function normalizeCanadianPostalCode(
  value:
    string
) {
  const compact =
    value
      .trim()
      .toUpperCase()
      .replace(
        /\s+/g,
        ""
      );

  if (
    !/^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTVWXYZ]\d[ABCEGHJ-NPRSTVWXYZ]\d$/.test(
      compact
    )
  ) {
    return "";
  }

  return `${compact.slice(
    0,
    3
  )} ${compact.slice(
    3
  )}`;
}

function extractCanadianPostalCode(
  value:
    string
) {
  const match =
    value
      .toUpperCase()
      .match(
        /\b([ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTVWXYZ])[\s-]?(\d[ABCEGHJ-NPRSTVWXYZ]\d)\b/
      );

  if (
    !match
  ) {
    return "";
  }

  return `${match[1]} ${match[2]}`;
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

  return fallback;
}
