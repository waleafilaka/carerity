"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  adminSupabase,
  checkCarerityAdminAccess,
} from "../../../../lib/supabaseClient";

const supabase =
  adminSupabase;

const REQUIRED_DOCUMENT_TYPES = [
  "government_id",
  "work_eligibility",
  "qualification",
  "vulnerable_sector_check",
  "resume",
  "cpr_first_aid",
  "tb_evidence",
  "covid_vaccination",
] as const;

type CaregiverRow = {
  id:
    string;

  user_id:
    string;

  caregiver_number:
    string | null;

  application_status:
    string | null;

  eligible_for_matching:
    boolean;

  approved_at:
    string | null;

  approved_by:
    string | null;

  review_note:
    string | null;
};

type CaregiverDocument = {
  id:
    string;

  caregiver_id:
    string;

  document_type:
    string;

  storage_bucket:
    string;

  storage_path:
    string;

  original_file_name:
    string;

  mime_type:
    string | null;

  file_size_bytes:
    number | null;

  document_status:
    string;

  issued_date:
    string | null;

  expiry_date:
    string | null;

  reference_number:
    string | null;

  review_note:
    string | null;

  verified_at:
    string | null;

  verified_by:
    string | null;

  created_at:
    string;

  updated_at:
    string;
};

type DraftData = {
  firstName?:
    string;

  lastName?:
    string;

  sex?:
    | "male"
    | "female"
    | "prefer_not_to_say";

  email?:
    string;

  phone?:
    string;

  dateOfBirth?:
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

  authorizedToWorkInCanada?:
    boolean;

  qualificationType?:
    string;

  qualificationTypes?:
    string[];

  qualificationOther?:
    string;

  yearsExperience?:
    number;

  experienceCategories?:
    string[];

  otherExperienceCategory?:
    string;

  languages?:
    Array<{
      language?:
        string;

      fluency?:
        string;
    }>;

  availableForWork?:
    boolean;

  serviceRadiusKm?:
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

  applicationStatus?:
    string;

  submittedAt?:
    string;
};

type AdminContext = {
  userId:
    string;

  adminRole:
    string;
};

export default function AdminCaregiverReviewPage() {
  const router =
    useRouter();

  const params =
    useParams<{
      caregiver_id:
        string;
    }>();

  const caregiverId =
    Array.isArray(
      params.caregiver_id
    )
      ? params.caregiver_id[0]
      : params.caregiver_id;

  const [
    admin,
    setAdmin,
  ] =
    useState<AdminContext | null>(
      null
    );

  const [
    caregiver,
    setCaregiver,
  ] =
    useState<CaregiverRow | null>(
      null
    );

  const [
    draft,
    setDraft,
  ] =
    useState<DraftData>(
      {}
    );

  const [
    documents,
    setDocuments,
  ] =
    useState<
      CaregiverDocument[]
    >(
      []
    );

  const [
    documentNotes,
    setDocumentNotes,
  ] =
    useState<
      Record<
        string,
        string
      >
    >(
      {}
    );

  const [
    applicationNote,
    setApplicationNote,
  ] =
    useState("");

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  const [
    openingDocumentId,
    setOpeningDocumentId,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    savingDocumentId,
    setSavingDocumentId,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    isApproving,
    setIsApproving,
  ] =
    useState(false);

  const [
    isSavingNote,
    setIsSavingNote,
  ] =
    useState(false);

  const [
    isNeedsAttention,
    setIsNeedsAttention,
  ] =
    useState(false);

  /*
   * ============================================================
   * LOAD
   * ============================================================
   */

  useEffect(() => {
    let active =
      true;

    async function loadPage() {
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
          router.replace(
            "/admin/login"
          );

          return;
        }

        const access =
          await checkCarerityAdminAccess(
            user.id,
            adminSupabase
          );

        if (
          !active
        ) {
          return;
        }

        if (
          !access.authorized
        ) {
          await supabase.auth.signOut({
            scope:
              "local",
          });

          router.replace(
            "/admin/login"
          );

          return;
        }

        setAdmin({
          userId:
            user.id,

          adminRole:
            access.adminRole,
        });

        const [
          caregiverResult,
          draftResult,
          documentsResult,
        ] =
          await Promise.all([
            supabase
              .from(
                "caregivers"
              )
              .select(
                `
                id,
                user_id,
                caregiver_number,
                application_status,
                eligible_for_matching,
                approved_at,
                approved_by,
                review_note
                `
              )
              .eq(
                "id",
                caregiverId
              )
              .single(),

            supabase
              .from(
                "caregiver_onboarding_drafts"
              )
              .select(
                `
                draft_data,
                application_status,
                current_section,
                updated_at
                `
              )
              .eq(
                "caregiver_id",
                caregiverId
              )
              .maybeSingle(),

            supabase
              .from(
                "caregiver_documents"
              )
              .select(
                "*"
              )
              .eq(
                "caregiver_id",
                caregiverId
              )
              .order(
                "created_at",
                {
                  ascending:
                    true,
                }
              ),
          ]);

        if (
          caregiverResult.error
        ) {
          throw caregiverResult.error;
        }

        if (
          draftResult.error
        ) {
          throw draftResult.error;
        }

        if (
          documentsResult.error
        ) {
          throw documentsResult.error;
        }

        if (
          !active
        ) {
          return;
        }

        const caregiverRow =
          caregiverResult.data as
            CaregiverRow;

        const rawDraft =
          draftResult.data
            ?.draft_data;

        const draftData:
          DraftData =
          isRecord(
            rawDraft
          )
            ? rawDraft as
                DraftData
            : {};

        const documentRows =
          (
            documentsResult.data ||
            []
          ) as
            CaregiverDocument[];

        setCaregiver(
          caregiverRow
        );

        setDraft(
          draftData
        );

        setDocuments(
          documentRows
        );

        setApplicationNote(
          caregiverRow.review_note ||
            ""
        );

        setDocumentNotes(
          documentRows.reduce<
            Record<
              string,
              string
            >
          >(
            (
              result,
              document
            ) => {
              result[
                document.id
              ] =
                document.review_note ||
                "";

              return result;
            },
            {}
          )
        );

        /*
         * First Admin opening a newly submitted application
         * moves it into under review.
         */
        if (
          caregiverRow.application_status ===
          "submitted"
        ) {
          await synchronizeApplicationStatus({
            caregiverId,
            nextStatus:
              "under_review",
            currentDraft:
              draftData,
            eligibleForMatching:
              false,
          });

          await supabase
            .from(
              "caregiver_review_audit"
            )
            .insert({
              caregiver_id:
                caregiverId,

              document_id:
                null,

              admin_user_id:
                user.id,

              action:
                "application_under_review",

              previous_status:
                "submitted",

              new_status:
                "under_review",

              note:
                "Application opened for administrator review.",
            });

          setCaregiver({
            ...caregiverRow,

            application_status:
              "under_review",

            eligible_for_matching:
              false,
          });

          setDraft({
            ...draftData,

            applicationStatus:
              "under_review",
          });
        }
      } catch (
        error
      ) {
        console.error(
          "Unable to load caregiver review:",
          error
        );

        if (
          active
        ) {
          setErrorMessage(
            getErrorMessage(
              error,
              "Unable to load this caregiver application."
            )
          );
        }
      } finally {
        if (
          active
        ) {
          setIsLoading(
            false
          );
        }
      }
    }

    if (
      caregiverId
    ) {
      loadPage();
    }

    return () => {
      active =
        false;
    };
  }, [
    caregiverId,
    router,
  ]);

  /*
   * ============================================================
   * EXPERIENCE / PROFILE SUMMARY
   * ============================================================
   */

  const qualifications =
    useMemo(
      () => {
        const values =
          draft.qualificationTypes &&
          draft.qualificationTypes.length >
            0
            ? draft.qualificationTypes
            : draft.qualificationType
              ? [
                  draft.qualificationType,
                ]
              : [];

        const cleaned =
          values
            .map(
              (
                item
              ) => {
                if (
                  item ===
                    "Other" &&
                  draft.qualificationOther?.trim()
                ) {
                  return draft.qualificationOther.trim();
                }

                return item.trim();
              }
            )
            .filter(
              Boolean
            );

        return Array.from(
          new Set(
            cleaned
          )
        );
      },
      [
        draft.qualificationType,
        draft.qualificationTypes,
        draft.qualificationOther,
      ]
    );

  const experienceAreas =
    useMemo(
      () => {
        const base =
          (
            draft.experienceCategories ||
            []
          )
            .map(
              (
                item
              ) =>
                item.trim()
            )
            .filter(
              Boolean
            );

        if (
          draft.otherExperienceCategory?.trim()
        ) {
          base.push(
            draft.otherExperienceCategory.trim()
          );
        }

        return Array.from(
          new Set(
            base
          )
        );
      },
      [
        draft.experienceCategories,
        draft.otherExperienceCategory,
      ]
    );

  const languages =
    useMemo(
      () =>
        (
          draft.languages ||
          []
        ).filter(
          (
            item
          ) =>
            Boolean(
              item.language?.trim()
            )
        ),
      [
        draft.languages,
      ]
    );

  const careArrangements =
    useMemo(
      () => {
        const items:
          string[] = [];

        if (
          draft.acceptsLiveOut
        ) {
          items.push(
            "Live-out"
          );
        }

        if (
          draft.acceptsLiveIn
        ) {
          items.push(
            "Live-in"
          );
        }

        if (
          draft.acceptsOvernight
        ) {
          items.push(
            "Overnight"
          );
        }

        return items;
      },
      [
        draft.acceptsLiveOut,
        draft.acceptsLiveIn,
        draft.acceptsOvernight,
      ]
    );

  /*
   * ============================================================
   * DOCUMENT SUMMARY
   * ============================================================
   */

  const documentSummary =
    useMemo(
      () => {
        const required =
          REQUIRED_DOCUMENT_TYPES.map(
            (
              type
            ) => {
              const matching =
                documents.filter(
                  (
                    document
                  ) =>
                    document.document_type ===
                    type
                );

              const verified =
                matching.some(
                  (
                    document
                  ) =>
                    document.document_status ===
                    "verified"
                );

              const problem =
                matching.some(
                  (
                    document
                  ) =>
                    document.document_status ===
                      "needs_review" ||
                    document.document_status ===
                      "expired"
                );

              return {
                type,

                present:
                  matching.length >
                  0,

                verified,

                problem,
              };
            }
          );

        return {
          required,

          total:
            required.length,

          verified:
            required.filter(
              (
                item
              ) =>
                item.verified
            ).length,

          allVerified:
            required.every(
              (
                item
              ) =>
                item.verified
            ),

          hasProblem:
            required.some(
              (
                item
              ) =>
                item.problem
            ),
        };
      },
      [
        documents,
      ]
    );

  const canApprove =
    documentSummary.allVerified &&
    !documentSummary.hasProblem;

  const fullName =
    [
      draft.firstName,
      draft.lastName,
    ]
      .filter(
        Boolean
      )
      .join(
        " "
      ) ||
    "Caregiver applicant";

  /*
   * ============================================================
   * RELOAD DOCUMENTS
   * ============================================================
   */

  async function reloadDocuments() {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "caregiver_documents"
        )
        .select(
          "*"
        )
        .eq(
          "caregiver_id",
          caregiverId
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          }
        );

    if (
      error
    ) {
      throw error;
    }

    const rows =
      (
        data ||
        []
      ) as
        CaregiverDocument[];

    setDocuments(
      rows
    );

    setDocumentNotes(
      rows.reduce<
        Record<
          string,
          string
        >
      >(
        (
          result,
          document
        ) => {
          result[
            document.id
          ] =
            document.review_note ||
            "";

          return result;
        },
        {}
      )
    );
  }

  /*
   * ============================================================
   * VIEW DOCUMENT
   * ============================================================
   */

  async function handleViewDocument(
    document:
      CaregiverDocument
  ) {
    setOpeningDocumentId(
      document.id
    );

    setErrorMessage(
      ""
    );

    setSuccessMessage(
      ""
    );

    try {
      const {
        data,
        error,
      } =
        await supabase.storage
          .from(
            document.storage_bucket ||
              "caregiver-documents"
          )
          .createSignedUrl(
            document.storage_path,
            300
          );

      if (
        error
      ) {
        throw error;
      }

      if (
        !data?.signedUrl
      ) {
        throw new Error(
          "Unable to create document preview."
        );
      }

      window.open(
        data.signedUrl,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (
      error
    ) {
      setErrorMessage(
        getErrorMessage(
          error,
          "Unable to open this document."
        )
      );
    } finally {
      setOpeningDocumentId(
        null
      );
    }
  }

  /*
   * ============================================================
   * DOCUMENT REVIEW
   * ============================================================
   */

  async function saveDocumentDecision(
    document:
      CaregiverDocument,

    nextStatus:
      | "verified"
      | "needs_review"
      | "expired"
  ) {
    if (
      !admin
    ) {
      return;
    }

    setSavingDocumentId(
      document.id
    );

    setErrorMessage(
      ""
    );

    setSuccessMessage(
      ""
    );

    try {
      const note =
        documentNotes[
          document.id
        ]?.trim() ||
        null;

      const verified =
        nextStatus ===
        "verified";

      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            "caregiver_documents"
          )
          .update({
            document_status:
              nextStatus,

            review_note:
              note,

            verified_at:
              verified
                ? new Date().toISOString()
                : null,

            verified_by:
              verified
                ? admin.userId
                : null,
          })
          .eq(
            "id",
            document.id
          );

      if (
        updateError
      ) {
        throw updateError;
      }

      const action =
        nextStatus ===
          "verified"
          ? "document_verified"
          : nextStatus ===
              "expired"
            ? "document_expired"
            : "document_needs_review";

      const {
        error:
          auditError,
      } =
        await supabase
          .from(
            "caregiver_review_audit"
          )
          .insert({
            caregiver_id:
              caregiverId,

            document_id:
              document.id,

            admin_user_id:
              admin.userId,

            action,

            previous_status:
              document.document_status,

            new_status:
              nextStatus,

            note,
          });

      if (
        auditError
      ) {
        console.error(
          "Unable to write review audit:",
          auditError
        );
      }

      if (
        nextStatus ===
          "needs_review" ||
        nextStatus ===
          "expired"
      ) {
        await synchronizeApplicationStatus({
          caregiverId,

          nextStatus:
            "needs_attention",

          currentDraft:
            draft,

          eligibleForMatching:
            false,
        });

        setCaregiver(
          (
            current
          ) =>
            current
              ? {
                  ...current,

                  application_status:
                    "needs_attention",

                  eligible_for_matching:
                    false,
                }
              : current
        );

        setDraft(
          (
            current
          ) => ({
            ...current,

            applicationStatus:
              "needs_attention",
          })
        );
      }

      await reloadDocuments();

      setSuccessMessage(
        `${getDocumentLabel(
          document.document_type
        )} updated successfully.`
      );
    } catch (
      error
    ) {
      setErrorMessage(
        getErrorMessage(
          error,
          "Unable to save this document review."
        )
      );
    } finally {
      setSavingDocumentId(
        null
      );
    }
  }

  /*
   * ============================================================
   * APPLICATION NOTE
   * ============================================================
   */

  async function saveApplicationNote() {
    setIsSavingNote(
      true
    );

    setErrorMessage(
      ""
    );

    setSuccessMessage(
      ""
    );

    try {
      const {
        error,
      } =
        await supabase
          .from(
            "caregivers"
          )
          .update({
            review_note:
              applicationNote.trim() ||
              null,
          })
          .eq(
            "id",
            caregiverId
          );

      if (
        error
      ) {
        throw error;
      }

      setCaregiver(
        (
          current
        ) =>
          current
            ? {
                ...current,

                review_note:
                  applicationNote.trim() ||
                  null,
              }
            : current
      );

      setSuccessMessage(
        "Application review note saved."
      );
    } catch (
      error
    ) {
      setErrorMessage(
        getErrorMessage(
          error,
          "Unable to save the review note."
        )
      );
    } finally {
      setIsSavingNote(
        false
      );
    }
  }

  /*
   * ============================================================
   * NEEDS ATTENTION
   * ============================================================
   */

  async function markNeedsAttention() {
    if (
      !admin ||
      !caregiver
    ) {
      return;
    }

    setIsNeedsAttention(
      true
    );

    setErrorMessage(
      ""
    );

    setSuccessMessage(
      ""
    );

    try {
      const previousStatus =
        caregiver.application_status ||
        "under_review";

      const note =
        applicationNote.trim() ||
        null;

      await synchronizeApplicationStatus({
        caregiverId,

        nextStatus:
          "needs_attention",

        currentDraft:
          draft,

        eligibleForMatching:
          false,

        reviewNote:
          note,
      });

      const {
        error:
          auditError,
      } =
        await supabase
          .from(
            "caregiver_review_audit"
          )
          .insert({
            caregiver_id:
              caregiverId,

            document_id:
              null,

            admin_user_id:
              admin.userId,

            action:
              "caregiver_needs_attention",

            previous_status:
              previousStatus,

            new_status:
              "needs_attention",

            note,
          });

      if (
        auditError
      ) {
        console.error(
          "Unable to write review audit:",
          auditError
        );
      }

      setCaregiver({
        ...caregiver,

        application_status:
          "needs_attention",

        eligible_for_matching:
          false,

        review_note:
          note,
      });

      setDraft({
        ...draft,

        applicationStatus:
          "needs_attention",
      });

      setSuccessMessage(
        "Application marked as needing caregiver attention."
      );
    } catch (
      error
    ) {
      setErrorMessage(
        getErrorMessage(
          error,
          "Unable to update this application."
        )
      );
    } finally {
      setIsNeedsAttention(
        false
      );
    }
  }

  /*
   * ============================================================
   * APPROVE
   * ============================================================
   */

  async function approveCaregiver() {
    if (
      !admin ||
      !caregiver ||
      !canApprove
    ) {
      return;
    }

    setIsApproving(
      true
    );

    setErrorMessage(
      ""
    );

    setSuccessMessage(
      ""
    );

    try {
      const approvedAt =
        new Date().toISOString();

      const previousStatus =
        caregiver.application_status ||
        "under_review";

      const note =
        applicationNote.trim() ||
        null;

      const {
        error:
          caregiverError,
      } =
        await supabase
          .from(
            "caregivers"
          )
          .update({
            application_status:
              "approved",

            eligible_for_matching:
              true,

            approved_at:
              approvedAt,

            approved_by:
              admin.userId,

            review_note:
              note,
          })
          .eq(
            "id",
            caregiverId
          );

      if (
        caregiverError
      ) {
        throw caregiverError;
      }

      /*
       * Synchronize BOTH onboarding status fields:
       *
       * application_status column
       * draft_data.applicationStatus
       */
      const nextDraft:
        DraftData = {
        ...draft,

        applicationStatus:
          "approved",
      };

      const {
        error:
          draftError,
      } =
        await supabase
          .from(
            "caregiver_onboarding_drafts"
          )
          .update({
            application_status:
              "approved",

            draft_data:
              nextDraft,
          })
          .eq(
            "caregiver_id",
            caregiverId
          );

      if (
        draftError
      ) {
        throw draftError;
      }

      const {
        error:
          auditError,
      } =
        await supabase
          .from(
            "caregiver_review_audit"
          )
          .insert({
            caregiver_id:
              caregiverId,

            document_id:
              null,

            admin_user_id:
              admin.userId,

            action:
              "caregiver_approved",

            previous_status:
              previousStatus,

            new_status:
              "approved",

            note,
          });

      if (
        auditError
      ) {
        console.error(
          "Unable to write approval audit:",
          auditError
        );
      }

      setCaregiver({
        ...caregiver,

        application_status:
          "approved",

        eligible_for_matching:
          true,

        approved_at:
          approvedAt,

        approved_by:
          admin.userId,

        review_note:
          note,
      });

      setDraft(
        nextDraft
      );

      setSuccessMessage(
        "Caregiver approved and is now eligible for matching."
      );
    } catch (
      error
    ) {
      setErrorMessage(
        getErrorMessage(
          error,
          "Unable to approve this caregiver."
        )
      );
    } finally {
      setIsApproving(
        false
      );
    }
  }

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (
    isLoading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

          <p className="mt-4 text-sm font-semibold text-slate-500">
            Loading caregiver review...
          </p>
        </div>
      </main>
    );
  }

  if (
    !caregiver
  ) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-white p-6">
          <h1 className="text-xl font-bold">
            Caregiver application unavailable
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            {errorMessage ||
              "Unable to find this caregiver application."}
          </p>

          <Link
            href="/admin/caregivers"
            className="mt-5 inline-block rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white"
          >
            Back to Review Queue
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-blue-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/admin"
          >
            <img
              src="/carerityblacklogo2.png"
              alt="Carerity"
              className="h-14 w-auto object-contain sm:h-16"
            />
          </Link>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-bold capitalize text-blue-700">
              {admin?.adminRole
                ?.replaceAll(
                  "_",
                  " "
                ) ||
                "Admin"}
            </span>

            <Link
              href="/admin/caregivers"
              className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-50"
            >
              ← Review Queue
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* HEADER */}

        <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold text-blue-700">
                Caregiver Review
              </p>

              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold">
                  {
                    fullName
                  }
                </h1>

                <StatusPill
                  status={
                    caregiver.application_status
                  }
                />

                {caregiver.eligible_for_matching && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                    Eligible for matching
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm text-slate-500">
                {caregiver.caregiver_number ||
                  "Caregiver"}{" "}
                ·{" "}
                {draft.email ||
                  "No email"}{" "}
                ·{" "}
                {draft.city ||
                  "No city"}
                {draft.province
                  ? `, ${draft.province}`
                  : ""}
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50 px-5 py-4">
              <p className="text-xs font-semibold text-blue-700">
                Required verification
              </p>

              <p className="mt-1 text-2xl font-bold text-blue-950">
                {
                  documentSummary.verified
                }
                {" / "}
                {
                  documentSummary.total
                }
              </p>

              <p className="mt-1 text-xs text-blue-700">
                required documents verified
              </p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <Notice
            tone="error"
            message={
              errorMessage
            }
          />
        )}

        {successMessage && (
          <Notice
            tone="success"
            message={
              successMessage
            }
          />
        )}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_350px]">
          <div className="space-y-6">
            {/* APPLICATION OVERVIEW */}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-lg font-bold">
                  Application overview
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Core personal and work information submitted by the caregiver.
                </p>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Info
                  label="Sex"
                  value={
                    formatSex(
                      draft.sex
                    )
                  }
                />

                <Info
                  label="Phone"
                  value={
                    draft.phone ||
                    "—"
                  }
                />

                <Info
                  label="Date of birth"
                  value={
                    formatDate(
                      draft.dateOfBirth
                    )
                  }
                />

                <Info
                  label="Service radius"
                  value={
                    typeof draft.serviceRadiusKm ===
                    "number"
                      ? `${draft.serviceRadiusKm} km`
                      : "—"
                  }
                />

                <Info
                  label="Years of experience"
                  value={
                    typeof draft.yearsExperience ===
                    "number"
                      ? `${draft.yearsExperience} ${
                          draft.yearsExperience ===
                          1
                            ? "year"
                            : "years"
                        }`
                      : "—"
                  }
                />

                <Info
                  label="Available for work"
                  value={
                    yesNo(
                      draft.availableForWork
                    )
                  }
                />

                <Info
                  label="Can drive"
                  value={
                    yesNo(
                      draft.canDrive
                    )
                  }
                />

                <Info
                  label="Own vehicle"
                  value={
                    yesNo(
                      draft.ownsVehicle
                    )
                  }
                />

                <Info
                  label="Transport client"
                  value={
                    yesNo(
                      draft.willingToTransportClient
                    )
                  }
                />

                <Info
                  label="Work eligibility declared"
                  value={
                    yesNo(
                      draft.authorizedToWorkInCanada
                    )
                  }
                />
              </div>
            </section>

            {/* PROFESSIONAL EXPERIENCE */}

            <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                  Professional fit
                </p>

                <h2 className="mt-1 text-lg font-bold">
                  Care experience
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Use this information together with verified documents when making the final approval decision.
                </p>
              </div>

              <div className="mt-5 grid gap-6 lg:grid-cols-2">
                <ExperiencePanel
                  title="Qualifications"
                  emptyText="No qualification information submitted."
                >
                  <TagList
                    values={
                      qualifications
                    }
                  />
                </ExperiencePanel>

                <ExperiencePanel
                  title="Core care experience"
                  emptyText="No care experience areas submitted."
                >
                  <TagList
                    values={
                      experienceAreas
                    }
                  />
                </ExperiencePanel>

                <ExperiencePanel
                  title="Languages"
                  emptyText="No languages submitted."
                >
                  {languages.length >
                  0 ? (
                    <div className="space-y-2">
                      {languages.map(
                        (
                          item,
                          index
                        ) => (
                          <div
                            key={`${item.language}-${index}`}
                            className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
                          >
                            <span className="text-sm font-bold text-slate-800">
                              {item.language ||
                                "Language"}
                            </span>

                            <span className="text-xs font-semibold text-blue-700">
                              {item.fluency ||
                                "—"}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  ) : null}
                </ExperiencePanel>

                <ExperiencePanel
                  title="Care arrangements"
                  emptyText="No care arrangement selected."
                >
                  <TagList
                    values={
                      careArrangements
                    }
                  />
                </ExperiencePanel>
              </div>
            </section>

            {/* DOCUMENTS */}

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="text-lg font-bold">
                  Verification documents
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Review the original private file before recording a verification decision.
                </p>
              </div>

              {documents.length ===
              0 ? (
                <div className="p-8 text-center">
                  <p className="font-semibold text-slate-700">
                    No caregiver documents found.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {documents.map(
                    (
                      document
                    ) => (
                      <article
                        key={
                          document.id
                        }
                        className="p-6"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold">
                                {getDocumentLabel(
                                  document.document_type
                                )}
                              </h3>

                              <DocumentStatus
                                status={
                                  document.document_status
                                }
                              />
                            </div>

                            <p className="mt-2 break-all text-sm text-slate-700">
                              {
                                document.original_file_name
                              }
                            </p>

                            <p className="mt-2 text-xs text-slate-500">
                              Uploaded{" "}
                              {formatDate(
                                document.created_at
                              )}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleViewDocument(
                                document
                              )
                            }
                            disabled={
                              openingDocumentId ===
                              document.id
                            }
                            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                          >
                            {openingDocumentId ===
                            document.id
                              ? "Opening..."
                              : "View document"}
                          </button>
                        </div>

                        <textarea
                          value={
                            documentNotes[
                              document.id
                            ] ||
                            ""
                          }
                          onChange={(
                            event
                          ) =>
                            setDocumentNotes(
                              (
                                current
                              ) => ({
                                ...current,

                                [
                                  document.id
                                ]:
                                  event.target.value,
                              })
                            )
                          }
                          rows={
                            2
                          }
                          placeholder="Optional admin review note..."
                          className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />

                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                          <button
                            type="button"
                            disabled={
                              savingDocumentId ===
                              document.id
                            }
                            onClick={() =>
                              saveDocumentDecision(
                                document,
                                "verified"
                              )
                            }
                            className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            ✓ Verified
                          </button>

                          <button
                            type="button"
                            disabled={
                              savingDocumentId ===
                              document.id
                            }
                            onClick={() =>
                              saveDocumentDecision(
                                document,
                                "needs_review"
                              )
                            }
                            className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                          >
                            Needs review
                          </button>

                          <button
                            type="button"
                            disabled={
                              savingDocumentId ===
                              document.id
                            }
                            onClick={() =>
                              saveDocumentDecision(
                                document,
                                "expired"
                              )
                            }
                            className="rounded-xl border border-red-300 bg-red-50 px-3 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            Expired
                          </button>
                        </div>
                      </article>
                    )
                  )}
                </div>
              )}
            </section>
          </div>

          {/* DECISION PANEL */}

          <aside className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold">
                Application decision
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                All required documents must be verified before approval.
              </p>

              <div className="mt-4 space-y-2">
                {documentSummary.required.map(
                  (
                    item
                  ) => (
                    <div
                      key={
                        item.type
                      }
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5"
                    >
                      <span className="text-xs font-semibold text-slate-700">
                        {getDocumentLabel(
                          item.type
                        )}
                      </span>

                      <span
                        className={`text-xs font-bold ${
                          item.verified
                            ? "text-emerald-700"
                            : item.problem
                              ? "text-amber-700"
                              : item.present
                                ? "text-blue-700"
                                : "text-red-700"
                        }`}
                      >
                        {item.verified
                          ? "Verified"
                          : item.problem
                            ? "Attention"
                            : item.present
                              ? "Uploaded"
                              : "Missing"}
                      </span>
                    </div>
                  )
                )}
              </div>

              <textarea
                value={
                  applicationNote
                }
                onChange={(
                  event
                ) =>
                  setApplicationNote(
                    event.target.value
                  )
                }
                rows={
                  4
                }
                placeholder="Overall application review note..."
                className="mt-5 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />

              <button
                type="button"
                onClick={
                  saveApplicationNote
                }
                disabled={
                  isSavingNote
                }
                className="mt-3 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
              >
                {isSavingNote
                  ? "Saving..."
                  : "Save review note"}
              </button>

              <button
                type="button"
                onClick={
                  markNeedsAttention
                }
                disabled={
                  isNeedsAttention
                }
                className="mt-3 w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
              >
                {isNeedsAttention
                  ? "Updating..."
                  : "Needs caregiver attention"}
              </button>

              <button
                type="button"
                onClick={
                  approveCaregiver
                }
                disabled={
                  !canApprove ||
                  isApproving ||
                  caregiver.application_status ===
                    "approved"
                }
                className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {caregiver.application_status ===
                "approved"
                  ? "Caregiver approved"
                  : isApproving
                    ? "Approving..."
                    : "Approve caregiver"}
              </button>

              {!canApprove &&
                caregiver.application_status !==
                  "approved" && (
                  <p className="mt-3 text-xs leading-relaxed text-slate-500">
                    Approval becomes available after every required document has been verified.
                  </p>
                )}
            </section>

            <section className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                Matching readiness
              </p>

              <p className="mt-2 text-lg font-bold">
                {caregiver.eligible_for_matching
                  ? "Eligible"
                  : "Not yet eligible"}
              </p>

              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                A caregiver only enters the Carerity matching pool after administrator approval.
              </p>

              {caregiver.approved_at && (
                <p className="mt-3 text-xs font-semibold text-blue-800">
                  Approved{" "}
                  {formatDate(
                    caregiver.approved_at
                  )}
                </p>
              )}
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

/*
 * ============================================================
 * STATUS SYNCHRONIZATION
 * ============================================================
 */

async function synchronizeApplicationStatus({
  caregiverId,
  nextStatus,
  currentDraft,
  eligibleForMatching,
  reviewNote,
}: {
  caregiverId:
    string;

  nextStatus:
    string;

  currentDraft:
    DraftData;

  eligibleForMatching:
    boolean;

  reviewNote?:
    string | null;
}) {
  const caregiverUpdate:
    Record<
      string,
      unknown
    > = {
    application_status:
      nextStatus,

    eligible_for_matching:
      eligibleForMatching,
  };

  if (
    reviewNote !==
    undefined
  ) {
    caregiverUpdate.review_note =
      reviewNote;
  }

  const {
    error:
      caregiverError,
  } =
    await supabase
      .from(
        "caregivers"
      )
      .update(
        caregiverUpdate
      )
      .eq(
        "id",
        caregiverId
      );

  if (
    caregiverError
  ) {
    throw caregiverError;
  }

  const nextDraft:
    DraftData = {
    ...currentDraft,

    applicationStatus:
      nextStatus,
  };

  const {
    error:
      draftError,
  } =
    await supabase
      .from(
        "caregiver_onboarding_drafts"
      )
      .update({
        application_status:
          nextStatus,

        draft_data:
          nextDraft,
      })
      .eq(
        "caregiver_id",
        caregiverId
      );

  if (
    draftError
  ) {
    throw draftError;
  }
}

/*
 * ============================================================
 * UI HELPERS
 * ============================================================
 */

function Info({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500">
        {
          label
        }
      </p>

      <p className="mt-1 text-sm font-bold text-slate-900">
        {
          value
        }
      </p>
    </div>
  );
}

function ExperiencePanel({
  title,
  emptyText,
  children,
}: {
  title:
    string;

  emptyText:
    string;

  children:
    React.ReactNode;
}) {
  const hasContent =
    Boolean(
      children
    );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-bold text-slate-900">
        {
          title
        }
      </h3>

      <div className="mt-3">
        {hasContent
          ? children
          : (
              <p className="text-xs text-slate-500">
                {
                  emptyText
                }
              </p>
            )}
      </div>
    </div>
  );
}

function TagList({
  values,
}: {
  values:
    string[];
}) {
  if (
    values.length ===
    0
  ) {
    return (
      <p className="text-xs text-slate-500">
        No information submitted.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {values.map(
        (
          value
        ) => (
          <span
            key={
              value
            }
            className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800"
          >
            {
              value
            }
          </span>
        )
      )}
    </div>
  );
}

function StatusPill({
  status,
}: {
  status:
    | string
    | null;
}) {
  const value =
    status ||
    "submitted";

  const className =
    value ===
    "approved"
      ? "bg-emerald-100 text-emerald-700"
      : value ===
          "needs_attention"
        ? "bg-amber-100 text-amber-800"
        : value ===
            "declined"
          ? "bg-red-100 text-red-700"
          : value ===
              "under_review"
            ? "bg-violet-100 text-violet-700"
            : "bg-blue-100 text-blue-700";

  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${className}`}
    >
      {value.replaceAll(
        "_",
        " "
      )}
    </span>
  );
}

function DocumentStatus({
  status,
}: {
  status:
    string;
}) {
  const classes =
    status ===
    "verified"
      ? "bg-emerald-100 text-emerald-700"
      : status ===
          "needs_review"
        ? "bg-amber-100 text-amber-800"
        : status ===
            "expired"
          ? "bg-red-100 text-red-700"
          : "bg-blue-100 text-blue-700";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${classes}`}
    >
      {status.replaceAll(
        "_",
        " "
      )}
    </span>
  );
}

function Notice({
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
      className={`mt-5 rounded-2xl border p-4 text-sm font-semibold ${
        tone ===
        "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {
        message
      }
    </div>
  );
}

/*
 * ============================================================
 * DATA HELPERS
 * ============================================================
 */

function formatSex(
  value:
    DraftData["sex"]
) {
  switch (
    value
  ) {
    case "male":
      return "Male";

    case "female":
      return "Female";

    case "prefer_not_to_say":
      return "Prefer not to say";

    default:
      return "—";
  }
}

function getDocumentLabel(
  type:
    string
) {
  switch (
    type
  ) {
    case "government_id":
      return "Government ID";

    case "work_eligibility":
      return "Proof of work eligibility";

    case "qualification":
      return "Qualification";

    case "vulnerable_sector_check":
      return "Vulnerable Sector Check";

    case "resume":
      return "Resume / CV";

    case "cpr_first_aid":
      return "CPR / First Aid";

    case "tb_evidence":
      return "TB screening evidence";

    case "covid_vaccination":
      return "COVID-19 vaccination";

    default:
      return type.replaceAll(
        "_",
        " "
      );
  }
}

function yesNo(
  value:
    boolean | undefined
) {
  if (
    value ===
    true
  ) {
    return "Yes";
  }

  if (
    value ===
    false
  ) {
    return "No";
  }

  return "—";
}

function formatDate(
  value:
    string | null | undefined
) {
  if (
    !value
  ) {
    return "—";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      year:
        "numeric",

      month:
        "short",

      day:
        "numeric",
    }
  ).format(
    date
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
      return message;
    }
  }

  if (
    typeof error ===
      "string" &&
    error.trim()
  ) {
    return error.trim();
  }

  return fallback;
}