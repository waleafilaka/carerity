"use client";

import {
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import AddressAutocomplete, {
  AddressResult,
} from "../../../../components/ui/AddressAutocomplete";

import CaregiverProfilePhotoTile from "../../../../components/caregiver/CaregiverProfilePhoto";

import {
  CaregiverOnboardingDraft,
  CaregiverProfilePhoto,
  CaregiverSex,
  getCaregiverOnboardingDraft,
} from "../../../../lib/caregiverOnboardingDraft";

import {
  loadCaregiverOnboardingDraftFromSupabase,
  saveCaregiverOnboardingToSupabase,
  signOutCarerity,
} from "../../../../lib/caregiverOnboardingPersistence";

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

const MONTHS =
  [
    {
      value:
        "01",
      label:
        "January",
    },
    {
      value:
        "02",
      label:
        "February",
    },
    {
      value:
        "03",
      label:
        "March",
    },
    {
      value:
        "04",
      label:
        "April",
    },
    {
      value:
        "05",
      label:
        "May",
    },
    {
      value:
        "06",
      label:
        "June",
    },
    {
      value:
        "07",
      label:
        "July",
    },
    {
      value:
        "08",
      label:
        "August",
    },
    {
      value:
        "09",
      label:
        "September",
    },
    {
      value:
        "10",
      label:
        "October",
    },
    {
      value:
        "11",
      label:
        "November",
    },
    {
      value:
        "12",
      label:
        "December",
    },
  ];

export default function CaregiverProfilePage() {
  const router =
    useRouter();

  const [
    applicationStatus,
    setApplicationStatus,
  ] =
    useState<CaregiverOnboardingDraft["applicationStatus"]>(
      "draft"
    );

  const isApproved =
    applicationStatus ===
    "approved";

  const [
    firstName,
    setFirstName,
  ] =
    useState("");

  const [
    lastName,
    setLastName,
  ] =
    useState("");

  const [
    birthMonth,
    setBirthMonth,
  ] =
    useState("");

  const [
    birthDay,
    setBirthDay,
  ] =
    useState("");

  const [
    birthYear,
    setBirthYear,
  ] =
    useState("");

  const [
    sex,
    setSex,
  ] =
    useState<
      CaregiverSex |
      undefined
    >(undefined);

  const [
    profilePhoto,
    setProfilePhoto,
  ] =
    useState<
      CaregiverProfilePhoto |
      undefined
    >(undefined);

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
    googlePlaceId,
    setGooglePlaceId,
  ] =
    useState("");

  const [
    emergencyContactName,
    setEmergencyContactName,
  ] =
    useState("");

  const [
    emergencyContactPhone,
    setEmergencyContactPhone,
  ] =
    useState("");

  const [
    emergencyContactRelationship,
    setEmergencyContactRelationship,
  ] =
    useState("");

  const [
    authorizedToWorkInCanada,
    setAuthorizedToWorkInCanada,
  ] =
    useState<
      boolean |
      undefined
    >(undefined);

  const [
    showErrors,
    setShowErrors,
  ] =
    useState(false);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [
    isSigningOut,
    setIsSigningOut,
  ] =
    useState(false);

  const [
    saveError,
    setSaveError,
  ] =
    useState("");

  const [
    savedMessage,
    setSavedMessage,
  ] =
    useState("");

  /*
   * ============================================================
   * LOAD PROFILE
   * ============================================================
   */

  useEffect(() => {
    let mounted =
      true;

    function applyDraft(
      draft:
        CaregiverOnboardingDraft
    ) {
      setApplicationStatus(
        draft.applicationStatus ||
          "draft"
      );

      setFirstName(
        draft.firstName ||
          ""
      );

      setLastName(
        draft.lastName ||
          ""
      );

      const parsedBirthDate =
        parseDateOfBirth(
          draft.dateOfBirth
        );

      setBirthMonth(
        parsedBirthDate.month
      );

      setBirthDay(
        parsedBirthDate.day
      );

      setBirthYear(
        parsedBirthDate.year
      );

      setSex(
        draft.sex
      );

      setProfilePhoto(
        draft.profilePhoto
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

      setGooglePlaceId(
        draft.googlePlaceId ||
          ""
      );

      setEmergencyContactName(
        draft.emergencyContactName ||
          ""
      );

      setEmergencyContactPhone(
        draft.emergencyContactPhone ||
          ""
      );

      setEmergencyContactRelationship(
        draft.emergencyContactRelationship ||
          ""
      );

      setAuthorizedToWorkInCanada(
        draft.authorizedToWorkInCanada
      );
    }

    async function loadProfile() {
      applyDraft(
        getCaregiverOnboardingDraft()
      );

      const result =
        await loadCaregiverOnboardingDraftFromSupabase();

      if (
        !mounted
      ) {
        return;
      }

      if (
        !result.authenticated
      ) {
        router.replace(
          "/caregiver/login"
        );

        return;
      }

      if (
        result.success
      ) {
        applyDraft(
          result.draft
        );
      } else if (
        result.error
      ) {
        setSaveError(
          result.error
        );
      }

      setIsLoading(
        false
      );
    }

    loadProfile();

    return () => {
      mounted =
        false;
    };
  }, [
    router,
  ]);

  /*
   * ============================================================
   * DATE OPTIONS
   * ============================================================
   */

  const availableYears =
    useMemo(
      () => {
        const currentYear =
          new Date()
            .getFullYear();

        const years:
          number[] =
            [];

        for (
          let year =
            currentYear -
            18;
          year >=
          currentYear -
            100;
          year -=
          1
        ) {
          years.push(
            year
          );
        }

        return years;
      },
      []
    );

  const availableDays =
    useMemo(
      () => {
        const monthNumber =
          Number(
            birthMonth
          );

        const yearNumber =
          Number(
            birthYear
          );

        const fallbackYear =
          new Date()
            .getFullYear();

        const dayCount =
          monthNumber >=
            1 &&
          monthNumber <=
            12
            ? new Date(
                yearNumber ||
                  fallbackYear,
                monthNumber,
                0
              ).getDate()
            : 31;

        return Array.from(
          {
            length:
              dayCount,
          },
          (
            _,
            index
          ) =>
            index +
            1
        );
      },
      [
        birthMonth,
        birthYear,
      ]
    );

  useEffect(() => {
    if (
      !birthDay
    ) {
      return;
    }

    const dayNumber =
      Number(
        birthDay
      );

    if (
      !availableDays.includes(
        dayNumber
      )
    ) {
      setBirthDay(
        ""
      );
    }
  }, [
    availableDays,
    birthDay,
  ]);

  /*
   * ============================================================
   * VALIDATION
   * ============================================================
   */

  const dateOfBirth =
    buildDateOfBirth(
      birthYear,
      birthMonth,
      birthDay
    );

  const birthDateValidation =
    validateDateOfBirth(
      dateOfBirth
    );

  const normalizedEmergencyPhone =
    emergencyContactPhone.trim()
      ? normalizeCanadianPhone(
          emergencyContactPhone
        )
      : "";

  const firstNameValid =
    firstName
      .trim()
      .length >=
    2;

  const lastNameValid =
    lastName
      .trim()
      .length >=
    2;

  const sexValid =
    sex ===
      "male" ||
    sex ===
      "female" ||
    sex ===
      "prefer_not_to_say";

  const addressValid =
    address
      .trim()
      .length >=
    3;

  const addressCoordinatesValid =
    typeof latitude ===
      "number" &&
    typeof longitude ===
      "number";

  const cityValid =
    city
      .trim()
      .length >=
    2;

  const provinceValid =
    province
      .trim() !==
    "";

  const postalCodeValid =
    isValidCanadianPostalCode(
      postalCode
    );

  const emergencyPhoneValid =
    emergencyContactPhone.trim() ===
      "" ||
    normalizedEmergencyPhone !==
      "";

  const workEligibilityValid =
    authorizedToWorkInCanada ===
    true;

  /*
   * Profile photo is intentionally optional.
   *
   * It does NOT affect profile completion or
   * caregiver approval.
   */

  const isValid =
    firstNameValid &&
    lastNameValid &&
    birthDateValidation.valid &&
    sexValid &&
    country ===
      "Canada" &&
    addressValid &&
    addressCoordinatesValid &&
    cityValid &&
    provinceValid &&
    postalCodeValid &&
    emergencyPhoneValid &&
    workEligibilityValid;

  /*
   * ============================================================
   * HELPERS
   * ============================================================
   */

  function clearSaveNotice() {
    if (
      saveError
    ) {
      setSaveError(
        ""
      );
    }

    if (
      savedMessage
    ) {
      setSavedMessage(
        ""
      );
    }
  }

  function handleProfilePhotoChange(
    nextPhoto:
      CaregiverProfilePhoto |
      undefined
  ) {
    setProfilePhoto(
      nextPhoto
    );

    clearSaveNotice();
  }

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

    setGooglePlaceId(
      result.placeId ||
        ""
    );

    clearSaveNotice();
  }

  function handleManualAddressChange(
    value:
      string
  ) {
    setAddress(
      value
    );

    /*
     * If street text changes manually,
     * previously selected coordinates are
     * no longer trusted.
     */

    setLatitude(
      undefined
    );

    setLongitude(
      undefined
    );

    setGooglePlaceId(
      ""
    );

    clearSaveNotice();
  }

  function buildUpdate():
    Partial<CaregiverOnboardingDraft> {
    return {
      firstName:
        firstName.trim(),

      lastName:
        lastName.trim(),

      dateOfBirth:
        dateOfBirth ||
        undefined,

      sex,

      profilePhoto,

      address:
        address.trim(),

      unit:
        unit.trim(),

      city:
        city.trim(),

      province,

      postalCode:
        formatCanadianPostalCode(
          postalCode
        ),

      country:
        "Canada",

      latitude,

      longitude,

      googlePlaceId:
        googlePlaceId ||
        undefined,

      emergencyContactName:
        emergencyContactName.trim(),

      emergencyContactPhone:
        normalizedEmergencyPhone,

      emergencyContactRelationship:
        emergencyContactRelationship.trim(),

      authorizedToWorkInCanada,
    };
  }

  /*
   * ============================================================
   * SAVE
   * ============================================================
   */

  async function saveProfile(
    requireComplete:
      boolean
  ) {
    if (
      isSaving
    ) {
      return false;
    }

    setSaveError(
      ""
    );

    setSavedMessage(
      ""
    );

    if (
      requireComplete
    ) {
      setShowErrors(
        true
      );

      if (
        !isValid
      ) {
        return false;
      }
    }

    setIsSaving(
      true
    );

    try {
      const result =
        await saveCaregiverOnboardingToSupabase(
          "profile",
          buildUpdate()
        );

      if (
        !result.authenticated
      ) {
        router.replace(
          "/caregiver/login"
        );

        return false;
      }

      if (
        !result.success
      ) {
        setSaveError(
          result.error ||
            "Your information could not be saved online."
        );

        return false;
      }

      /*
       * Keep this page synchronized with
       * whatever Supabase persisted.
       */

      setProfilePhoto(
        result.draft.profilePhoto
      );

      setSavedMessage(
        "Your progress has been saved."
      );

      return true;
    } catch (
      error
    ) {
      console.error(
        "Unable to save caregiver profile:",
        error
      );

      setSaveError(
        "Your information could not be saved online."
      );

      return false;
    } finally {
      setIsSaving(
        false
      );
    }
  }

  async function handleContinue() {
    const saved =
      await saveProfile(
        true
      );

    if (
      !saved
    ) {
      return;
    }

    router.push(
      "/caregiver/onboarding/experience"
    );
  }

  async function handleSaveAndExit() {
    const saved =
      await saveProfile(
        false
      );

    if (
      !saved
    ) {
      return;
    }

    router.push(
      isApproved
        ? "/caregiver/application"
        : "/caregiver/onboarding"
    );
  }

  async function handleSignOut() {
    if (
      isSigningOut
    ) {
      return;
    }

    setIsSigningOut(
      true
    );

    setSaveError(
      ""
    );

    const result =
      await signOutCarerity();

    if (
      !result.success
    ) {
      setSaveError(
        result.error ||
          "Unable to sign out."
      );

      setIsSigningOut(
        false
      );

      return;
    }

    router.replace(
      "/caregiver/login"
    );

    router.refresh();
  }

  if (
    isLoading
  ) {
    return (
      <LoadingScreen />
    );
  }

  return (
    <OnboardingShell
      stepLabel="1 of 7"
      backHref="/caregiver/onboarding"
      isSigningOut={
        isSigningOut
      }
      onSignOut={
        handleSignOut
      }
    >
      <div>
        <p className="text-sm font-bold text-emerald-700">
          About You
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          {isApproved
            ? "Manage your profile"
            : "Build your profile"}
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          {isApproved
            ? "Keep your working profile current. Verified identity details are locked after approval."
            : "Add your personal information and home address."}
        </p>
      </div>

      <div className="mt-6 space-y-6">
        {isApproved && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-bold text-blue-900">
              Approved profile
            </p>
            <p className="mt-1 text-sm leading-relaxed text-blue-800">
              You can update your photo, address and emergency contact. Legal name, date of birth, sex and work-eligibility declaration are protected because they formed part of your approved application.
            </p>
          </div>
        )}

        {/* LEGAL NAME */}

        <section
          className={`rounded-2xl border p-4 ${
            showErrors &&
            (
              !firstNameValid ||
              !lastNameValid
            )
              ? "border-red-400 bg-red-50"
              : "border-gray-200 bg-white"
          }`}
        >
          <SectionTitle
            title="Legal name"
            detail="Use the name shown on your government ID."
          />

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              label="First name"
              required
              value={
                firstName
              }
              onChange={(
                value
              ) => {
                setFirstName(
                  value
                );

                clearSaveNotice();
              }}
              autoComplete="given-name"
              disabled={isApproved}
              error={
                showErrors &&
                !firstNameValid
                  ? "Enter your first name."
                  : ""
              }
            />

            <TextField
              label="Last name"
              required
              value={
                lastName
              }
              onChange={(
                value
              ) => {
                setLastName(
                  value
                );

                clearSaveNotice();
              }}
              autoComplete="family-name"
              disabled={isApproved}
              error={
                showErrors &&
                !lastNameValid
                  ? "Enter your last name."
                  : ""
              }
            />
          </div>
        </section>

        {/* DOB */}

        <section
          className={`rounded-2xl border p-4 ${
            showErrors &&
            !birthDateValidation.valid
              ? "border-red-400 bg-red-50"
              : "border-gray-200 bg-white"
          }`}
        >
          <SectionTitle
            title="Date of birth"
            detail="You must be at least 18 years old."
            required
          />

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SelectField
              label="Month"
              value={
                birthMonth
              }
              onChange={(
                value
              ) => {
                setBirthMonth(
                  value
                );

                clearSaveNotice();
              }}
              disabled={isApproved}
              error={
                showErrors &&
                !birthMonth
                  ? "Select month."
                  : ""
              }
            >
              <option value="">
                Month
              </option>

              {MONTHS.map(
                (
                  month
                ) => (
                  <option
                    key={
                      month.value
                    }
                    value={
                      month.value
                    }
                  >
                    {
                      month.label
                    }
                  </option>
                )
              )}
            </SelectField>

            <SelectField
              label="Day"
              value={
                birthDay
              }
              onChange={(
                value
              ) => {
                setBirthDay(
                  value
                );

                clearSaveNotice();
              }}
              disabled={isApproved}
              error={
                showErrors &&
                !birthDay
                  ? "Select day."
                  : ""
              }
            >
              <option value="">
                Day
              </option>

              {availableDays.map(
                (
                  day
                ) => (
                  <option
                    key={
                      day
                    }
                    value={String(
                      day
                    ).padStart(
                      2,
                      "0"
                    )}
                  >
                    {
                      day
                    }
                  </option>
                )
              )}
            </SelectField>

            <SelectField
              label="Year"
              value={
                birthYear
              }
              onChange={(
                value
              ) => {
                setBirthYear(
                  value
                );

                clearSaveNotice();
              }}
              disabled={isApproved}
              error={
                showErrors &&
                !birthYear
                  ? "Select year."
                  : ""
              }
            >
              <option value="">
                Year
              </option>

              {availableYears.map(
                (
                  year
                ) => (
                  <option
                    key={
                      year
                    }
                    value={String(
                      year
                    )}
                  >
                    {
                      year
                    }
                  </option>
                )
              )}
            </SelectField>
          </div>

          {showErrors &&
            !birthDateValidation.valid && (
              <p className="mt-2 text-sm font-semibold text-red-600">
                {
                  birthDateValidation.message
                }
              </p>
            )}
        </section>

        {/* SEX */}

        <section
          className={`rounded-2xl border p-4 ${
            showErrors &&
            !sexValid
              ? "border-red-400 bg-red-50"
              : "border-gray-200 bg-white"
          }`}
        >
          <SectionTitle
            title="Sex"
            detail="Some clients may have a caregiver preference for personal-care needs."
            required
          />

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Choice
              selected={
                sex ===
                "male"
              }
              disabled={isApproved}
              onClick={() => {
                setSex(
                  "male"
                );

                clearSaveNotice();
              }}
              label="Male"
            />

            <Choice
              selected={
                sex ===
                "female"
              }
              disabled={isApproved}
              onClick={() => {
                setSex(
                  "female"
                );

                clearSaveNotice();
              }}
              label="Female"
            />

            <Choice
              selected={
                sex ===
                "prefer_not_to_say"
              }
              disabled={isApproved}
              onClick={() => {
                setSex(
                  "prefer_not_to_say"
                );

                clearSaveNotice();
              }}
              label="Prefer not to say"
            />
          </div>

          {showErrors &&
            !sexValid && (
              <p className="mt-2 text-sm font-semibold text-red-600">
                Select an option.
              </p>
            )}
        </section>

        {/* PROFILE PHOTO */}

        <CaregiverProfilePhotoTile
          photo={
            profilePhoto
          }
          firstName={
            firstName
          }
          lastName={
            lastName
          }
          disabled={
            isSaving
          }
          onChange={
            handleProfilePhotoChange
          }
        />

        {/* HOME ADDRESS */}

        <section
          className={`rounded-2xl border p-4 ${
            showErrors &&
            (
              !addressValid ||
              !addressCoordinatesValid ||
              !cityValid ||
              !provinceValid ||
              !postalCodeValid
            )
              ? "border-red-400 bg-red-50"
              : "border-gray-200 bg-white"
          }`}
        >
          <SectionTitle
            title="Home address"
            detail="Used to match you with nearby care opportunities."
            required
          />

          <div className="mt-4 space-y-4">
            <div>
              <AddressAutocomplete
                label="Street address"
                value={
                  address
                }
                onChange={
                  handleManualAddressChange
                }
                onAddressSelected={
                  handleAddressSelected
                }
                accent="emerald"
                placeholder="Start typing your address"
                hasError={
                  showErrors &&
                  (
                    !addressValid ||
                    !addressCoordinatesValid
                  )
                }
                helperText="Start typing and select your address from the Google suggestions."
              />

              {showErrors &&
                !addressValid && (
                  <p className="mt-1 text-sm font-semibold text-red-600">
                    Enter your street address.
                  </p>
                )}

              {showErrors &&
                addressValid &&
                !addressCoordinatesValid && (
                  <p className="mt-1 text-sm font-semibold text-red-600">
                    Select your address from the Google suggestions so we can determine your location accurately.
                  </p>
                )}
            </div>

            <TextField
              label="Apartment / Unit"
              value={
                unit
              }
              onChange={(
                value
              ) => {
                setUnit(
                  value
                );

                clearSaveNotice();
              }}
              autoComplete="address-line2"
              optional
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                label="City"
                required
                value={
                  city
                }
                onChange={(
                  value
                ) => {
                  setCity(
                    value
                  );

                  clearSaveNotice();
                }}
                autoComplete="address-level2"
                error={
                  showErrors &&
                  !cityValid
                    ? "Enter your city."
                    : ""
                }
              />

              <SelectField
                label="Province"
                required
                value={
                  province
                }
                onChange={(
                  value
                ) => {
                  setProvince(
                    value
                  );

                  clearSaveNotice();
                }}
                error={
                  showErrors &&
                  !provinceValid
                    ? "Select province."
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

            <TextField
              label="Postal code"
              required
              value={
                postalCode
              }
              onChange={(
                value
              ) => {
                setPostalCode(
                  formatCanadianPostalCode(
                    value
                  )
                );

                clearSaveNotice();
              }}
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

            <SelectField
              label="Country"
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

            {addressCoordinatesValid && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <p className="text-xs font-semibold text-emerald-800">
                  ✓ Address verified for proximity matching
                </p>

                <p className="mt-1 text-xs leading-relaxed text-emerald-700">
                  Your city, province, postal code and location coordinates were captured from Google.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* EMERGENCY CONTACT */}

        <section className="rounded-2xl border border-gray-200 bg-white p-4">
          <SectionTitle
            title="Emergency contact"
            detail="Optional for now. You can update this later."
          />

          <div className="mt-4 space-y-3">
            <TextField
              label="Contact name"
              value={
                emergencyContactName
              }
              onChange={(
                value
              ) => {
                setEmergencyContactName(
                  value
                );

                clearSaveNotice();
              }}
              autoComplete="off"
              optional
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                label="Relationship"
                value={
                  emergencyContactRelationship
                }
                onChange={(
                  value
                ) => {
                  setEmergencyContactRelationship(
                    value
                  );

                  clearSaveNotice();
                }}
                autoComplete="off"
                optional
              />

              <TextField
                label="Phone"
                value={
                  emergencyContactPhone
                }
                onChange={(
                  value
                ) => {
                  setEmergencyContactPhone(
                    value
                  );

                  clearSaveNotice();
                }}
                type="tel"
                autoComplete="tel"
                optional
                error={
                  showErrors &&
                  !emergencyPhoneValid
                    ? "Enter a valid Canada/US phone number."
                    : ""
                }
              />
            </div>
          </div>
        </section>

        {/* WORK ELIGIBILITY */}

        <section
          className={`rounded-2xl border p-4 ${
            showErrors &&
            !workEligibilityValid
              ? "border-red-400 bg-red-50"
              : "border-emerald-200 bg-emerald-50"
          }`}
        >
          <p className="font-bold text-gray-900">
            Work eligibility

            <span className="ml-1 text-red-500">
              *
            </span>
          </p>

          <p className="mt-1 text-sm text-gray-600">
            Are you legally authorized to work in Canada?
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Choice
              selected={
                authorizedToWorkInCanada ===
                true
              }
              disabled={isApproved}
              onClick={() => {
                setAuthorizedToWorkInCanada(
                  true
                );

                clearSaveNotice();
              }}
              label="Yes"
            />

            <Choice
              selected={
                authorizedToWorkInCanada ===
                false
              }
              disabled={isApproved}
              onClick={() => {
                setAuthorizedToWorkInCanada(
                  false
                );

                clearSaveNotice();
              }}
              label="No"
            />
          </div>

          {showErrors &&
            !workEligibilityValid && (
              <p className="mt-2 text-sm font-semibold text-red-600">
                You must be legally authorized to work in Canada to continue.
              </p>
            )}
        </section>

        {showErrors &&
          !isValid && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-bold text-red-900">
                Complete your profile
              </p>

              <p className="mt-1 text-sm text-red-800">
                Outstanding required fields are highlighted above.
              </p>
            </div>
          )}

        {saveError && (
          <NoticeBox
            tone="error"
            message={
              saveError
            }
          />
        )}

        {savedMessage && (
          <NoticeBox
            tone="success"
            message={`✓ ${savedMessage}`}
          />
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={
              handleSaveAndExit
            }
            disabled={
              isSaving
            }
            className="min-h-[52px] w-full rounded-xl border border-emerald-300 bg-white px-4 py-3.5 font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"
          >
            {isSaving
              ? "Saving..."
              : isApproved
                ? "Save & Return"
                : "Save & Exit"}
          </button>

          <button
            type="button"
            onClick={
              handleContinue
            }
            disabled={
              isSaving
            }
            className="min-h-[52px] w-full rounded-xl bg-emerald-600 px-4 py-3.5 font-semibold text-white transition hover:bg-emerald-700 disabled:bg-emerald-300"
          >
            {isSaving
              ? "Saving..."
              : "Continue"}
          </button>
        </div>
      </div>
    </OnboardingShell>
  );
}

/*
 * ============================================================
 * UI
 * ============================================================
 */

function SectionTitle({
  title,
  detail,
  required =
    false,
}: {
  title:
    string;

  detail:
    string;

  required?:
    boolean;
}) {
  return (
    <div>
      <p className="text-sm font-bold text-gray-900">
        {
          title
        }

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </p>

      <p className="mt-1 text-xs leading-relaxed text-gray-500">
        {
          detail
        }
      </p>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type =
    "text",
  autoComplete,
  placeholder,
  optional =
    false,
  required =
    false,
  error =
    "",
  maxLength,
  disabled =
    false,
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

  type?:
    | "text"
    | "tel";

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

  disabled?:
    boolean;
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
        type={
          type
        }
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
        disabled={
          disabled
        }
        inputMode={
          type ===
          "tel"
            ? "tel"
            : undefined
        }
        className={`mt-2 w-full rounded-xl border px-4 py-3 outline-none transition focus:ring-2 ${
          error
            ? "border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-100"
            : disabled
              ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500"
              : "border-gray-300 focus:border-emerald-400 focus:ring-emerald-100"
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

function SelectField({
  label,
  value,
  onChange,
  children,
  required =
    false,
  error =
    "",
  disabled =
    false,
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
    ReactNode;

  required?:
    boolean;

  error?:
    string;

  disabled?:
    boolean;
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
        disabled={
          disabled
        }
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none transition focus:ring-2 ${
          error
            ? "border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-100"
            : disabled
              ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500"
              : "border-gray-300 focus:border-emerald-400 focus:ring-emerald-100"
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

function Choice({
  selected,
  onClick,
  label,
  disabled =
    false,
}: {
  selected:
    boolean;

  onClick:
    () => void;

  label:
    string;

  disabled?:
    boolean;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      disabled={
        disabled
      }
      className={`rounded-xl border px-4 py-3 font-semibold transition ${
        selected
          ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm"
          : disabled
            ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500"
            : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/40"
      }`}
    >
      {selected
        ? "✓ "
        : ""}

      {
        label
      }
    </button>
  );
}

function NoticeBox({
  tone,
  message,
}: {
  tone:
    | "error"
    | "success";

  message:
    string;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 text-sm ${
        tone ===
        "success"
          ? "border-emerald-200 bg-emerald-50 font-semibold text-emerald-800"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {
        message
      }
    </div>
  );
}

function OnboardingShell({
  children,
  stepLabel,
  backHref,
  isSigningOut,
  onSignOut,
}: {
  children:
    ReactNode;

  stepLabel:
    string;

  backHref:
    string;

  isSigningOut:
    boolean;

  onSignOut:
    () => void;
}) {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            aria-label="Carerity home"
          >
            <img
              src="/carerityblacklogo2.png"
              alt="Carerity"
              className="h-16 w-auto object-contain sm:h-20"
            />
          </Link>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
              {
                stepLabel
              }
            </span>

            <Link
              href="/caregiver/dashboard"
              className="rounded-full border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Dashboard
            </Link>

            <button
              type="button"
              onClick={
                onSignOut
              }
              disabled={
                isSigningOut
              }
              className="rounded-full border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              {isSigningOut
                ? "Signing out..."
                : "Sign Out"}
            </button>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-2xl px-4 pb-10 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={
              backHref
            }
            className="text-sm font-semibold text-emerald-700 hover:underline"
          >
            ← Back
          </Link>

          <Link
            href="/caregiver/onboarding"
            className="text-sm font-semibold text-gray-600 hover:text-emerald-700 hover:underline"
          >
            Application Progress
          </Link>
        </div>

        <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          {
            children
          }
        </div>
      </section>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />

        <p className="mt-4 text-sm font-semibold text-gray-500">
          Loading your application...
        </p>
      </div>
    </main>
  );
}

/*
 * ============================================================
 * DATA HELPERS
 * ============================================================
 */

function parseDateOfBirth(
  value?:
    string
) {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return {
      year:
        "",
      month:
        "",
      day:
        "",
    };
  }

  const [
    year,
    month,
    day,
  ] =
    value.split(
      "-"
    );

  return {
    year,
    month,
    day,
  };
}

function buildDateOfBirth(
  year:
    string,

  month:
    string,

  day:
    string
) {
  if (
    !year ||
    !month ||
    !day
  ) {
    return "";
  }

  return `${year}-${month.padStart(
    2,
    "0"
  )}-${day.padStart(
    2,
    "0"
  )}`;
}

function validateDateOfBirth(
  value:
    string
): {
  valid:
    boolean;

  message:
    string;
} {
  if (
    !value
  ) {
    return {
      valid:
        false,

      message:
        "Select your month, day and year of birth.",
    };
  }

  const match =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (
    !match
  ) {
    return {
      valid:
        false,

      message:
        "Enter a valid date of birth.",
    };
  }

  const year =
    Number(
      match[1]
    );

  const month =
    Number(
      match[2]
    );

  const day =
    Number(
      match[3]
    );

  const date =
    new Date(
      year,
      month -
        1,
      day
    );

  const isRealDate =
    date.getFullYear() ===
      year &&
    date.getMonth() ===
      month -
        1 &&
    date.getDate() ===
      day;

  if (
    !isRealDate
  ) {
    return {
      valid:
        false,

      message:
        "This date of birth is not valid.",
    };
  }

  const today =
    new Date();

  if (
    date.getTime() >
    today.getTime()
  ) {
    return {
      valid:
        false,

      message:
        "Date of birth cannot be in the future.",
    };
  }

  const eighteenthBirthday =
    new Date(
      year +
        18,
      month -
        1,
      day
    );

  if (
    eighteenthBirthday.getTime() >
    today.getTime()
  ) {
    return {
      valid:
        false,

      message:
        "You must be at least 18 years old.",
    };
  }

  const age =
    today.getFullYear() -
    year;

  if (
    age >
    100
  ) {
    return {
      valid:
        false,

      message:
        "Check the selected year of birth.",
    };
  }

  return {
    valid:
      true,

    message:
      "",
  };
}

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

function normalizeCanadianPhone(
  value:
    string
) {
  const digits =
    value.replace(
      /\D/g,
      ""
    );

  if (
    digits.length ===
    10
  ) {
    return `+1${digits}`;
  }

  if (
    digits.length ===
      11 &&
    digits.startsWith(
      "1"
    )
  ) {
    return `+${digits}`;
  }

  return "";
}
