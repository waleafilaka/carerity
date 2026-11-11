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

import DashboardLayout from "../../../components/DashboardLayout";

import AddressAutocomplete, {
  AddressResult,
} from "../../../components/ui/AddressAutocomplete";

import {
  replaceBookingDraft,
} from "../../../lib/bookingDraft";

import {
  CustomerCareProfile,
  loadCustomerCareProfileFromSupabase,
  saveCustomerCareProfileToSupabase,
} from "../../../lib/customerCareProfile";

import {
  ACTIVE_CARE_CONTEXT,
  ACTIVE_CARE_NEEDS,
  getCareContextLabel,
  getCareNeedLabel,
  normalizeCareContextId,
  normalizeCareNeedId,
} from "../../../lib/careTaxonomy";

const CANADIAN_PROVINCES = [
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

const LANGUAGE_OPTIONS = [
  "English",
  "French",
  "Arabic",
  "Cantonese",
  "Mandarin",
  "Farsi",
  "Hindi",
  "Italian",
  "Korean",
  "Portuguese",
  "Punjabi",
  "Spanish",
  "Tagalog",
  "Tamil",
  "Urdu",
  "Yoruba",
  "Other",
];

type EditableSection =
  | "recipient"
  | "location"
  | "needs"
  | "context"
  | "languages"
  | "continuity"
  | null;

export default function CustomerCareProfilePage() {
  const router =
    useRouter();

  const [
    profile,
    setProfile,
  ] =
    useState<CustomerCareProfile>(
      {}
    );

  const [
    editableProfile,
    setEditableProfile,
  ] =
    useState<CustomerCareProfile>(
      {}
    );

  const [
    editingSection,
    setEditingSection,
  ] =
    useState<EditableSection>(
      null
    );

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
    loadError,
    setLoadError,
  ] =
    useState("");

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

    async function loadProfile() {
      try {
        const result =
          await loadCustomerCareProfileFromSupabase();

        if (
          !mounted
        ) {
          return;
        }

        if (
          !result.authenticated
        ) {
          router.replace(
            "/login"
          );

          return;
        }

        setProfile(
          result.profile
        );

        setEditableProfile(
          result.profile
        );

        if (
          !result.success &&
          result.error
        ) {
          setLoadError(
            result.error
          );
        }
      } catch (
        error
      ) {
        console.error(
          "Unable to load care profile:",
          error
        );

        if (
          mounted
        ) {
          setLoadError(
            "We couldn't load your care profile."
          );
        }
      } finally {
        if (
          mounted
        ) {
          setIsLoading(
            false
          );
        }
      }
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
   * DERIVED VALUES
   * ============================================================
   */

  const recipientName =
    profile.careRecipientName ||
    "Not added";

  const locationDisplay =
    useMemo(
      () =>
        getLocationDisplay(
          profile
        ),
      [
        profile,
      ]
    );

  const hasLocation =
    Boolean(
      profile.address &&
      profile.city &&
      profile.province
    );

  const hasVerifiedLocation =
    typeof profile.latitude ===
      "number" &&
    Number.isFinite(
      profile.latitude
    ) &&
    typeof profile.longitude ===
      "number" &&
    Number.isFinite(
      profile.longitude
    );

  const selectedNeeds =
    profile.selectedNeeds ||
    [];

  const selectedContext =
    profile.selectedContext ||
    [];

  /*
   * ============================================================
   * EDITING
   * ============================================================
   */

  function beginEditing(
    section:
      Exclude<
        EditableSection,
        null
      >
  ) {
    const nextEditableProfile:
      CustomerCareProfile = {
      ...profile,
    };

    /*
     * Normalize older visible-label values into the
     * canonical taxonomy IDs before editing.
     *
     * This lets an older saved value such as
     * "Companionship" behave exactly like the new
     * canonical value "companionship".
     */
    if (
      section ===
      "needs"
    ) {
      nextEditableProfile.selectedNeeds =
        normalizeNeedSelectionsForEditor(
          profile.selectedNeeds ||
            []
        );
    }

    if (
      section ===
      "context"
    ) {
      nextEditableProfile.selectedContext =
        normalizeContextSelectionsForEditor(
          profile.selectedContext ||
            []
        );
    }

    setEditableProfile(
      nextEditableProfile
    );

    setEditingSection(
      section
    );

    setSaveError("");
    setSavedMessage("");
  }

  function cancelEditing() {
    setEditableProfile(
      profile
    );

    setEditingSection(
      null
    );

    setSaveError("");
    setSavedMessage("");
  }

  /*
   * ============================================================
   * SAVE SECTION
   * ============================================================
   */

  async function saveSection() {
    if (
      !editingSection ||
      isSaving
    ) {
      return;
    }

    setSaveError("");
    setSavedMessage("");

    const validationError =
      validateSection(
        editingSection,
        editableProfile
      );

    if (
      validationError
    ) {
      setSaveError(
        validationError
      );

      return;
    }

    setIsSaving(
      true
    );

    try {
      const update =
        buildSectionUpdate(
          editingSection,
          editableProfile
        );

      const result =
        await saveCustomerCareProfileToSupabase(
          update
        );

      if (
        !result.authenticated
      ) {
        router.replace(
          "/login"
        );

        return;
      }

      if (
        !result.success
      ) {
        setSaveError(
          result.error ||
          "Unable to save your changes."
        );

        return;
      }

      setProfile(
        result.profile
      );

      setEditableProfile(
        result.profile
      );

      setEditingSection(
        null
      );

      setSavedMessage(
        "Care profile updated."
      );
    } finally {
      setIsSaving(
        false
      );
    }
  }

  /*
   * ============================================================
   * ADDRESS
   * ============================================================
   */

  function handleAddressSelected(
    result:
      AddressResult
  ) {
    setEditableProfile(
      (
        current
      ) => ({
        ...current,

        address:
          result.address,

        city:
          result.city,

        province:
          result.province ||
          "Ontario",

        postalCode:
          formatCanadianPostalCode(
            result.postalCode
          ),

        country:
          "Canada",

        latitude:
          result.latitude,

        longitude:
          result.longitude,

        googlePlaceId:
          result.placeId,
      })
    );

    clearMessages();
  }

  function handleManualAddressChange(
    value:
      string
  ) {
    setEditableProfile(
      (
        current
      ) => ({
        ...current,

        address:
          value,

        latitude:
          undefined,

        longitude:
          undefined,

        googlePlaceId:
          undefined,
      })
    );

    clearMessages();
  }

  function invalidateLocation() {
    setEditableProfile(
      (
        current
      ) => ({
        ...current,

        latitude:
          undefined,

        longitude:
          undefined,

        googlePlaceId:
          undefined,
      })
    );
  }

  /*
   * ============================================================
   * ARRAY TOGGLES
   * ============================================================
   */

  function toggleNeed(
    value:
      string
  ) {
    const current =
      editableProfile.selectedNeeds ||
      [];

    const next =
      current.includes(
        value
      )
        ? current.filter(
            (
              item
            ) =>
              item !==
              value
          )
        : [
            ...current,
            value,
          ];

    setEditableProfile(
      (
        existing
      ) => ({
        ...existing,

        selectedNeeds:
          next,
      })
    );

    clearMessages();
  }

  function toggleContext(
    value:
      string
  ) {
    const current =
      editableProfile.selectedContext ||
      [];

    const next =
      current.includes(
        value
      )
        ? current.filter(
            (
              item
            ) =>
              item !==
              value
          )
        : [
            ...current,
            value,
          ];

    setEditableProfile(
      (
        existing
      ) => ({
        ...existing,

        selectedContext:
          next,
      })
    );

    clearMessages();
  }

  function clearMessages() {
    if (
      saveError
    ) {
      setSaveError("");
    }

    if (
      savedMessage
    ) {
      setSavedMessage("");
    }
  }

  /*
   * ============================================================
   * START NEW CARE REQUEST
   * ============================================================
   *
   * A signed-in customer already has an account. Starting a new
   * care request from Care Profile must therefore NOT send them
   * back through account creation.
   *
   * We create a fresh booking draft from the reusable Care
   * Profile. This also prevents details from an older paid or
   * confirmed booking from leaking into the new request.
   */

  function handleBookNewCare() {
    const normalizedNeeds =
      normalizeNeedSelectionsForEditor(
        profile.selectedNeeds ||
          []
      );

    const normalizedContext =
      normalizeContextSelectionsForEditor(
        profile.selectedContext ||
          []
      );

    replaceBookingDraft({
      bookingFor:
        profile.bookingFor,

      careRecipientName:
        profile.careRecipientName,

      recipientName:
        profile.careRecipientName,

      country:
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

      placeId:
        profile.googlePlaceId,

      googlePlaceId:
        profile.googlePlaceId,

      selectedNeeds:
        normalizedNeeds,

      selectedContext:
        normalizedContext,

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

      requestStatus:
        "draft",

      paymentMethodStatus:
        "not_set",

      paymentStatus:
        "not_set",
    });

    const locationReady =
      Boolean(
        profile.address?.trim() &&
        profile.city?.trim() &&
        profile.province?.trim() &&
        profile.postalCode?.trim()
      ) &&
      typeof profile.latitude ===
        "number" &&
      Number.isFinite(
        profile.latitude
      ) &&
      typeof profile.longitude ===
        "number" &&
      Number.isFinite(
        profile.longitude
      );

    /*
     * If the reusable profile already has a verified location,
     * the customer can go straight to booking-specific needs.
     * Otherwise we send them to the location step — never the
     * account-creation step.
     */
    router.push(
      locationReady
        ? "/find-care/needs"
        : "/find-care/location"
    );
  }

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  if (
    isLoading
  ) {
    return (
      <DashboardLayout
        activeItem="Care Profile"
        role="customer"
      >
        <CareProfileSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      activeItem="Care Profile"
      role="customer"
    >
      <div className="mx-auto max-w-5xl">
        <section className="mb-6">
          <p className="text-sm font-semibold text-purple-600">
            My Care
          </p>

          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
            Care Profile
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500 sm:text-base">
            Keep your care preferences up to date. These details can be used to pre-fill future care requests and improve caregiver matching.
          </p>
        </section>

        <section className="mb-6 rounded-3xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-purple-700">
                Reusable care preferences
              </p>

              <h2 className="mt-2 text-xl font-bold text-gray-900">
                Your default care information
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
                Updates here apply to future care requests. Confirmed or paid bookings keep the details that were agreed when that booking was created.
              </p>
            </div>

            <button
              type="button"
              onClick={
                handleBookNewCare
              }
              className="shrink-0 rounded-xl bg-purple-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-purple-700"
            >
              Book New Care
            </button>
          </div>
        </section>

        {loadError && (
          <NoticeBox
            tone="warning"
            message={
              loadError
            }
          />
        )}

        {saveError && (
          <div className="mb-5">
            <NoticeBox
              tone="error"
              message={
                saveError
              }
            />
          </div>
        )}

        {savedMessage && (
          <div className="mb-5">
            <NoticeBox
              tone="success"
              message={
                `✓ ${savedMessage}`
              }
            />
          </div>
        )}

        <div className="space-y-5">
          {/* ==================================================
              CARE RECIPIENT
          ================================================== */}

          <ProfileCard
            title="Care recipient"
            subtitle="Who usually receives care?"
            icon="👤"
            editing={
              editingSection ===
              "recipient"
            }
            onEdit={() =>
              beginEditing(
                "recipient"
              )
            }
          >
            {editingSection ===
            "recipient" ? (
              <EditorShell
                onCancel={
                  cancelEditing
                }
                onSave={
                  saveSection
                }
                isSaving={
                  isSaving
                }
              >
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      Who is care usually for?
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <ChoiceButton
                        selected={
                          editableProfile.bookingFor ===
                          "myself"
                        }
                        label="Myself"
                        onClick={() => {
                          setEditableProfile(
                            (
                              current
                            ) => ({
                              ...current,
                              bookingFor:
                                "myself",
                            })
                          );

                          clearMessages();
                        }}
                      />

                      <ChoiceButton
                        selected={
                          editableProfile.bookingFor ===
                          "someoneElse"
                        }
                        label="Someone else"
                        onClick={() => {
                          setEditableProfile(
                            (
                              current
                            ) => ({
                              ...current,
                              bookingFor:
                                "someoneElse",
                            })
                          );

                          clearMessages();
                        }}
                      />
                    </div>
                  </div>

                  <TextField
                    label="Care recipient name"
                    value={
                      editableProfile.careRecipientName ||
                      ""
                    }
                    onChange={(
                      value
                    ) => {
                      setEditableProfile(
                        (
                          current
                        ) => ({
                          ...current,

                          careRecipientName:
                            value,
                        })
                      );

                      clearMessages();
                    }}
                    placeholder="Enter name"
                  />
                </div>
              </EditorShell>
            ) : (
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {
                    recipientName
                  }
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {profile.bookingFor ===
                  "myself"
                    ? "Care for myself"
                    : profile.bookingFor ===
                        "someoneElse"
                      ? "Care for someone else"
                      : "Relationship not specified"}
                </p>
              </div>
            )}
          </ProfileCard>

          {/* ==================================================
              LOCATION
          ================================================== */}

          <ProfileCard
            title="Care location"
            subtitle="Default location used for proximity matching."
            icon="📍"
            editing={
              editingSection ===
              "location"
            }
            onEdit={() =>
              beginEditing(
                "location"
              )
            }
          >
            {editingSection ===
            "location" ? (
              <EditorShell
                onCancel={
                  cancelEditing
                }
                onSave={
                  saveSection
                }
                isSaving={
                  isSaving
                }
              >
                <div className="space-y-4">
                  <AddressAutocomplete
                    label="Street address"
                    value={
                      editableProfile.address ||
                      ""
                    }
                    onChange={
                      handleManualAddressChange
                    }
                    onAddressSelected={
                      handleAddressSelected
                    }
                    accent="purple"
                    placeholder="Start typing the care address"
                    helperText="Select the correct Google address so Carerity can calculate caregiver proximity accurately."
                  />

                  <TextField
                    label="Apartment / Unit"
                    value={
                      editableProfile.unit ||
                      ""
                    }
                    onChange={(
                      value
                    ) => {
                      setEditableProfile(
                        (
                          current
                        ) => ({
                          ...current,

                          unit:
                            value,
                        })
                      );

                      clearMessages();
                    }}
                    optional
                  />

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <TextField
                      label="City"
                      value={
                        editableProfile.city ||
                        ""
                      }
                      onChange={(
                        value
                      ) => {
                        setEditableProfile(
                          (
                            current
                          ) => ({
                            ...current,

                            city:
                              value,
                          })
                        );

                        invalidateLocation();
                        clearMessages();
                      }}
                    />

                    <SelectField
                      label="Province"
                      value={
                        editableProfile.province ||
                        "Ontario"
                      }
                      onChange={(
                        value
                      ) => {
                        setEditableProfile(
                          (
                            current
                          ) => ({
                            ...current,

                            province:
                              value,
                          })
                        );

                        invalidateLocation();
                        clearMessages();
                      }}
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
                    value={
                      editableProfile.postalCode ||
                      ""
                    }
                    onChange={(
                      value
                    ) => {
                      setEditableProfile(
                        (
                          current
                        ) => ({
                          ...current,

                          postalCode:
                            formatCanadianPostalCode(
                              value
                            ),
                        })
                      );

                      invalidateLocation();
                      clearMessages();
                    }}
                    placeholder="A1A 1A1"
                    maxLength={
                      7
                    }
                  />

                  <SelectField
                    label="Country"
                    value="Canada"
                    onChange={() => {
                      setEditableProfile(
                        (
                          current
                        ) => ({
                          ...current,

                          country:
                            "Canada",
                        })
                      );
                    }}
                  >
                    <option value="Canada">
                      Canada
                    </option>
                  </SelectField>
                </div>
              </EditorShell>
            ) : (
              <div>
                <p className="font-bold text-gray-900">
                  {hasLocation
                    ? locationDisplay
                    : "No default care location added"}
                </p>

                {hasVerifiedLocation && (
                  <div className="mt-3 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                    ✓ Verified for proximity matching
                  </div>
                )}
              </div>
            )}
          </ProfileCard>

          {/* ==================================================
              CARE NEEDS
          ================================================== */}

          <ProfileCard
            title="Care needs"
            subtitle="The support normally required."
            icon="♡"
            editing={
              editingSection ===
              "needs"
            }
            onEdit={() =>
              beginEditing(
                "needs"
              )
            }
          >
            {editingSection ===
            "needs" ? (
              <EditorShell
                onCancel={
                  cancelEditing
                }
                onSave={
                  saveSection
                }
                isSaving={
                  isSaving
                }
              >
                <EditableChipList
                  options={
                    ACTIVE_CARE_NEEDS.map(
                      (
                        item
                      ) => ({
                        value:
                          item.id,

                        label:
                          item.label,

                        description:
                          item.description,
                      })
                    )
                  }
                  values={
                    editableProfile.selectedNeeds ||
                    []
                  }
                  onToggle={
                    toggleNeed
                  }
                  selectionHint="Select all care needs that apply. Selected options are purple; available options remain grey and can always be selected."
                />

                <div className="mt-4">
                  <TextField
                    label="Other care need"
                    value={
                      editableProfile.otherNeed ||
                      ""
                    }
                    onChange={(
                      value
                    ) => {
                      setEditableProfile(
                        (
                          current
                        ) => ({
                          ...current,

                          otherNeed:
                            value,
                        })
                      );

                      clearMessages();
                    }}
                    optional
                  />
                </div>
              </EditorShell>
            ) : (
              <TagSummary
                values={
                  selectedNeeds
                }
                emptyMessage="No default care needs saved."
                otherValue={
                  profile.otherNeed
                }
                getLabel={
                  getCareNeedLabel
                }
              />
            )}
          </ProfileCard>

          {/* ==================================================
              CARE CONTEXT
          ================================================== */}

          <ProfileCard
            title="Care context"
            subtitle="Conditions or home factors that can influence matching."
            icon="📋"
            editing={
              editingSection ===
              "context"
            }
            onEdit={() =>
              beginEditing(
                "context"
              )
            }
          >
            {editingSection ===
            "context" ? (
              <EditorShell
                onCancel={
                  cancelEditing
                }
                onSave={
                  saveSection
                }
                isSaving={
                  isSaving
                }
              >
                <EditableChipList
                  options={
                    ACTIVE_CARE_CONTEXT.map(
                      (
                        item
                      ) => ({
                        value:
                          item.id,

                        label:
                          item.label,

                        description:
                          item.description,
                      })
                    )
                  }
                  values={
                    editableProfile.selectedContext ||
                    []
                  }
                  onToggle={
                    toggleContext
                  }
                  selectionHint="Select any care context that should influence caregiver matching. Selected options are purple; available options remain grey."
                />

                <div className="mt-4">
                  <TextField
                    label="Other care context"
                    value={
                      editableProfile.otherContext ||
                      ""
                    }
                    onChange={(
                      value
                    ) => {
                      setEditableProfile(
                        (
                          current
                        ) => ({
                          ...current,

                          otherContext:
                            value,
                        })
                      );

                      clearMessages();
                    }}
                    optional
                  />
                </div>
              </EditorShell>
            ) : (
              <TagSummary
                values={
                  selectedContext
                }
                emptyMessage="No default care context saved."
                otherValue={
                  profile.otherContext
                }
                getLabel={
                  getCareContextLabel
                }
              />
            )}
          </ProfileCard>

          {/* ==================================================
              LANGUAGES
          ================================================== */}

          <ProfileCard
            title="Languages"
            subtitle="Language preferences Carerity can consider when matching."
            icon="💬"
            editing={
              editingSection ===
              "languages"
            }
            onEdit={() =>
              beginEditing(
                "languages"
              )
            }
          >
            {editingSection ===
            "languages" ? (
              <EditorShell
                onCancel={
                  cancelEditing
                }
                onSave={
                  saveSection
                }
                isSaving={
                  isSaving
                }
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <SelectField
                    label="Primary language"
                    value={
                      editableProfile.primaryLanguage ||
                      ""
                    }
                    onChange={(
                      value
                    ) => {
                      setEditableProfile(
                        (
                          current
                        ) => ({
                          ...current,

                          primaryLanguage:
                            value ||
                            undefined,
                        })
                      );

                      clearMessages();
                    }}
                  >
                    <option value="">
                      Select language
                    </option>

                    {LANGUAGE_OPTIONS.map(
                      (
                        language
                      ) => (
                        <option
                          key={
                            language
                          }
                          value={
                            language
                          }
                        >
                          {
                            language
                          }
                        </option>
                      )
                    )}
                  </SelectField>

                  <SelectField
                    label="Secondary language"
                    value={
                      editableProfile.secondaryLanguage ||
                      ""
                    }
                    onChange={(
                      value
                    ) => {
                      setEditableProfile(
                        (
                          current
                        ) => ({
                          ...current,

                          secondaryLanguage:
                            value ||
                            undefined,
                        })
                      );

                      clearMessages();
                    }}
                  >
                    <option value="">
                      None
                    </option>

                    {LANGUAGE_OPTIONS.map(
                      (
                        language
                      ) => (
                        <option
                          key={
                            language
                          }
                          value={
                            language
                          }
                        >
                          {
                            language
                          }
                        </option>
                      )
                    )}
                  </SelectField>
                </div>
              </EditorShell>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SummaryValue
                  label="Primary"
                  value={
                    profile.primaryLanguage ||
                    "Not specified"
                  }
                />

                <SummaryValue
                  label="Secondary"
                  value={
                    profile.secondaryLanguage ||
                    "None selected"
                  }
                />
              </div>
            )}
          </ProfileCard>

          {/* ==================================================
              CONTINUITY
          ================================================== */}

          <ProfileCard
            title="Care continuity"
            subtitle="How Carerity should approach repeat care."
            icon="↻"
            editing={
              editingSection ===
              "continuity"
            }
            onEdit={() =>
              beginEditing(
                "continuity"
              )
            }
          >
            {editingSection ===
            "continuity" ? (
              <EditorShell
                onCancel={
                  cancelEditing
                }
                onSave={
                  saveSection
                }
                isSaving={
                  isSaving
                }
              >
                <button
                  type="button"
                  onClick={() => {
                    setEditableProfile(
                      (
                        current
                      ) => ({
                        ...current,

                        preferSameCaregiver:
                          !current.preferSameCaregiver,
                      })
                    );

                    clearMessages();
                  }}
                  className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition ${
                    editableProfile.preferSameCaregiver
                      ? "border-purple-400 bg-purple-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <span>
                    <span className="block font-bold text-gray-900">
                      Prefer the same caregiver
                    </span>

                    <span className="mt-1 block text-xs leading-relaxed text-gray-500">
                      Carerity will prioritize continuity when practical and when the caregiver remains suitable and available.
                    </span>
                  </span>

                  <ToggleIndicator
                    enabled={
                      Boolean(
                        editableProfile.preferSameCaregiver
                      )
                    }
                  />
                </button>
              </EditorShell>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-gray-900">
                    Prefer same caregiver
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {profile.preferSameCaregiver
                      ? "Carerity should prioritize continuity when practical."
                      : "Flexible caregiver matching is acceptable."}
                  </p>
                </div>

                <StatusPill
                  active={
                    Boolean(
                      profile.preferSameCaregiver
                    )
                  }
                  activeLabel="Preferred"
                  inactiveLabel="Flexible"
                />
              </div>
            )}
          </ProfileCard>
        </div>

        <section className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-sm font-bold text-blue-900">
            About existing bookings
          </p>

          <p className="mt-2 text-sm leading-relaxed text-blue-800">
            Changes to this Care Profile do not automatically change a confirmed, paid or in-progress visit. Changes to an existing booking must be handled through that booking&apos;s change or cancellation rules.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard/care"
              className="rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              View Current Care
            </Link>

            <Link
              href="/dashboard/recurring-care"
              className="rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              Manage Recurring Care
            </Link>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

/*
 * ============================================================
 * PROFILE CARD
 * ============================================================
 */

function ProfileCard({
  title,
  subtitle,
  icon,
  editing,
  onEdit,
  children,
}: {
  title:
    string;

  subtitle:
    string;

  icon:
    string;

  editing:
    boolean;

  onEdit:
    () => void;

  children:
    React.ReactNode;
}) {
  return (
    <section
      className={`rounded-3xl border bg-white shadow-sm transition ${
        editing
          ? "border-purple-300"
          : "border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-4 sm:p-5">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-lg text-purple-700">
            {
              icon
            }
          </div>

          <div>
            <h2 className="font-bold text-gray-900">
              {
                title
              }
            </h2>

            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              {
                subtitle
              }
            </p>
          </div>
        </div>

        {!editing && (
          <button
            type="button"
            onClick={
              onEdit
            }
            className="shrink-0 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700 transition hover:bg-purple-100"
          >
            Edit
          </button>
        )}
      </div>

      <div className="p-4 sm:p-5">
        {
          children
        }
      </div>
    </section>
  );
}

/*
 * ============================================================
 * EDITOR SHELL
 * ============================================================
 */

function EditorShell({
  children,
  onCancel,
  onSave,
  isSaving,
}: {
  children:
    React.ReactNode;

  onCancel:
    () => void;

  onSave:
    () => void;

  isSaving:
    boolean;
}) {
  return (
    <div>
      {
        children
      }

      <div className="mt-5 flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={
            onCancel
          }
          disabled={
            isSaving
          }
          className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={
            onSave
          }
          disabled={
            isSaving
          }
          className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:bg-purple-300"
        >
          {isSaving
            ? "Saving..."
            : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

/*
 * ============================================================
 * BASIC FIELDS
 * ============================================================
 */

function TextField({
  label,
  value,
  onChange,
  placeholder,
  optional =
    false,
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

  placeholder?:
    string;

  optional?:
    boolean;

  maxLength?:
    number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-gray-900">
        {
          label
        }

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
        placeholder={
          placeholder
        }
        maxLength={
          maxLength
        }
        className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
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
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-gray-900">
        {
          label
        }
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
        className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
      >
        {
          children
        }
      </select>
    </label>
  );
}

function ChoiceButton({
  selected,
  label,
  onClick,
}: {
  selected:
    boolean;

  label:
    string;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
        selected
          ? "border-purple-500 bg-purple-50 text-purple-800"
          : "border-gray-200 bg-white text-gray-700 hover:border-purple-300"
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

/*
 * ============================================================
 * CARE NEED / CONTEXT EDITING
 * ============================================================
 *
 * IMPORTANT:
 *
 * The values already stored from onboarding are shown
 * directly instead of inventing a second vocabulary here.
 *
 * Later we will centralize the canonical need/context
 * vocabulary and matching taxonomy.
 * ============================================================
 */

function EditableChipList({
  options,
  values,
  onToggle,
  selectionHint,
}: {
  options:
    Array<{
      value: string;
      label: string;
      description?: string;
    }>;

  values:
    string[];

  onToggle:
    (
      value:
        string
    ) => void;

  selectionHint?:
    string;
}) {
  const selectedSet =
    new Set(
      values
    );


  return (
    <div>
      {selectionHint && (
        <p className="mb-3 text-xs leading-relaxed text-gray-500">
          {
            selectionHint
          }
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map(
          (
            option
          ) => {
            const selected =
              selectedSet.has(
                option.value
              );


            return (
              <button
                key={
                  option.value
                }
                type="button"
                onClick={() => {
                  onToggle(
                    option.value
                  );
                }}
                aria-pressed={
                  selected
                }
                className={`rounded-2xl border p-3 text-left transition ${
                  selected
                    ? "border-purple-500 bg-purple-50 text-purple-900 shadow-sm"
                    : "border-gray-200 bg-gray-50 text-gray-700 hover:border-purple-300 hover:bg-purple-50/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${
                      selected
                        ? "border-purple-600 bg-purple-600 text-white"
                        : "border-gray-300 bg-white text-transparent"
                    }`}
                  >
                    ✓
                  </span>

                  <span className="min-w-0">
                    <span className="block text-xs font-bold">
                      {
                        option.label
                      }
                    </span>

                    {option.description && (
                      <span
                        className={`mt-1 block text-[11px] leading-relaxed ${
                          selected
                            ? "text-purple-700"
                            : "text-gray-500"
                        }`}
                      >
                        {
                          option.description
                        }
                      </span>
                    )}
                  </span>
                </div>
              </button>
            );
          }
        )}
      </div>

    </div>
  );
}

function TagSummary({
  values,
  emptyMessage,
  otherValue,
  getLabel = (
    value
  ) => value,
}: {
  values:
    string[];

  emptyMessage:
    string;

  otherValue?:
    string;

  getLabel?:
    (
      value:
        string
    ) => string;
}) {
  if (
    values.length ===
      0 &&
    !otherValue
  ) {
    return (
      <p className="text-sm text-gray-500">
        {
          emptyMessage
        }
      </p>
    );
  }

  return (
    <div>
      {values.length >
        0 && (
        <div className="flex flex-wrap gap-2">
          {values.map(
            (
              value
            ) => (
              <span
                key={
                  value
                }
                className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700"
              >
                ✓{" "}
                {
                  getLabel(
                    value
                  )
                }
              </span>
            )
          )}
        </div>
      )}

      {otherValue && (
        <p className="mt-3 text-sm text-gray-600">
          <strong>
            Other:
          </strong>{" "}
          {
            otherValue
          }
        </p>
      )}
    </div>
  );
}

function SummaryValue({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
      <p className="text-xs font-semibold text-gray-500">
        {
          label
        }
      </p>

      <p className="mt-1 text-sm font-bold text-gray-900">
        {
          value
        }
      </p>
    </div>
  );
}

function ToggleIndicator({
  enabled,
}: {
  enabled:
    boolean;
}) {
  return (
    <span
      className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition ${
        enabled
          ? "bg-purple-600"
          : "bg-gray-300"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
          enabled
            ? "left-6"
            : "left-1"
        }`}
      />
    </span>
  );
}

function StatusPill({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active:
    boolean;

  activeLabel:
    string;

  inactiveLabel:
    string;
}) {
  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
        active
          ? "bg-purple-100 text-purple-700"
          : "bg-gray-100 text-gray-600"
      }`}
    >
      {active
        ? activeLabel
        : inactiveLabel}
    </span>
  );
}

/*
 * ============================================================
 * NOTICES
 * ============================================================
 */

function NoticeBox({
  tone,
  message,
}: {
  tone:
    | "success"
    | "error"
    | "warning";

  message:
    string;
}) {
  const classes =
    tone ===
    "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone ===
          "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-red-200 bg-red-50 text-red-700";

  return (
    <div
      className={`rounded-2xl border p-4 text-sm ${classes}`}
      role={
        tone ===
        "error"
          ? "alert"
          : "status"
      }
    >
      {
        message
      }
    </div>
  );
}

/*
 * ============================================================
 * SKELETON
 * ============================================================
 */

function CareProfileSkeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse">
      <div className="h-4 w-24 rounded bg-gray-200" />

      <div className="mt-3 h-10 w-60 rounded bg-gray-200" />

      <div className="mt-3 h-4 w-full max-w-2xl rounded bg-gray-200" />

      <div className="mt-6 h-40 rounded-3xl bg-gray-200" />

      <div className="mt-5 space-y-4">
        {[
          1,
          2,
          3,
          4,
          5,
          6,
        ].map(
          (
            item
          ) => (
            <div
              key={
                item
              }
              className="h-36 rounded-3xl bg-gray-200"
            />
          )
        )}
      </div>
    </div>
  );
}

/*
 * ============================================================
 * VALIDATION
 * ============================================================
 */

function validateSection(
  section:
    Exclude<
      EditableSection,
      null
    >,

  profile:
    CustomerCareProfile
) {
  switch (
    section
  ) {
    case "recipient":
      if (
        profile.bookingFor !==
          "myself" &&
        profile.bookingFor !==
          "someoneElse"
      ) {
        return "Select who care is usually for.";
      }

      if (
        !profile.careRecipientName?.trim()
      ) {
        return "Enter the care recipient's name.";
      }

      return "";

    case "location":
      if (
        !profile.address?.trim()
      ) {
        return "Enter the care address.";
      }

      if (
        !profile.city?.trim()
      ) {
        return "Enter the city.";
      }

      if (
        !profile.province?.trim()
      ) {
        return "Select the province.";
      }

      if (
        !profile.postalCode ||
        !isValidCanadianPostalCode(
          profile.postalCode
        )
      ) {
        return "Enter a valid Canadian postal code.";
      }

      if (
        typeof profile.latitude !==
          "number" ||
        typeof profile.longitude !==
          "number"
      ) {
        return "Select the address from the Google suggestions so proximity can be calculated accurately.";
      }

      return "";

    case "needs":
    case "context":
    case "languages":
    case "continuity":
      return "";
  }
}

/*
 * ============================================================
 * SECTION SAVE PAYLOAD
 * ============================================================
 */

function buildSectionUpdate(
  section:
    Exclude<
      EditableSection,
      null
    >,

  profile:
    CustomerCareProfile
): Partial<CustomerCareProfile> {
  switch (
    section
  ) {
    case "recipient":
      return {
        bookingFor:
          profile.bookingFor,

        careRecipientName:
          profile.careRecipientName?.trim(),
      };

    case "location":
      return {
        country:
          "Canada",

        address:
          profile.address?.trim(),

        unit:
          profile.unit?.trim(),

        city:
          profile.city?.trim(),

        province:
          profile.province,

        postalCode:
          profile.postalCode
            ? formatCanadianPostalCode(
                profile.postalCode
              )
            : undefined,

        latitude:
          profile.latitude,

        longitude:
          profile.longitude,

        googlePlaceId:
          profile.googlePlaceId,
      };

    case "needs":
      return {
        selectedNeeds:
          profile.selectedNeeds,

        otherNeed:
          profile.otherNeed?.trim(),
      };

    case "context":
      return {
        selectedContext:
          profile.selectedContext,

        otherContext:
          profile.otherContext?.trim(),
      };

    case "languages":
      return {
        primaryLanguage:
          profile.primaryLanguage,

        secondaryLanguage:
          profile.secondaryLanguage,
      };

    case "continuity":
      return {
        preferSameCaregiver:
          Boolean(
            profile.preferSameCaregiver
          ),
      };
  }
}

/*
 * ============================================================
 * TAXONOMY NORMALIZATION HELPERS
 * ============================================================
 */

function normalizeNeedSelectionsForEditor(
  values:
    string[]
) {
  return Array.from(
    new Set(
      values.map(
        (
          value
        ) =>
          normalizeCareNeedId(
            value
          ) ||
          value
      )
    )
  );
}

function normalizeContextSelectionsForEditor(
  values:
    string[]
) {
  return Array.from(
    new Set(
      values.map(
        (
          value
        ) =>
          normalizeCareContextId(
            value
          ) ||
          value
      )
    )
  );
}

/*
 * ============================================================
 * LOCATION HELPERS
 * ============================================================
 */

function getLocationDisplay(
  profile:
    CustomerCareProfile
) {
  const firstLine =
    [
      profile.address,
      profile.unit,
    ]
      .filter(
        Boolean
      )
      .join(
        ", "
      );

  const secondLine =
    [
      profile.city,
      profile.province,
      profile.postalCode,
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
  ]
    .filter(
      Boolean
    )
    .join(
      " · "
    ) ||
    "Not added";
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
