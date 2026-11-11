"use client";

import {
  ChangeEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import {
  CaregiverOnboardingDraft,
  CredentialRecord,
  getCaregiverOnboardingDraft,
  getCredentialsSectionStatus,
} from "../../../../lib/caregiverOnboardingDraft";

import {
  CaregiverDocumentRow,
  CaregiverDocumentType,
  createCaregiverDocumentViewUrl,
  deleteCaregiverDocument,
  documentRowToCredentialRecord,
  loadCaregiverDocuments,
  uploadCaregiverDocument,
  validateCaregiverDocumentFile,
} from "../../../../lib/caregiverDocumentStorage";

import {
  loadLatestCaregiverDraft,
  saveCaregiverDraftWithCloud,
} from "../../../../lib/caregiverOnboardingPersistence";

type CredentialKey =
  | "governmentId"
  | "workEligibility"
  | "vulnerableSectorCheck"
  | "resume"
  | "cprFirstAid"
  | "tbEvidence"
  | "covid19VaccinationEvidence";

type QualificationDocument =
  CredentialRecord & {
    localId:
      string;
  };

const ACCEPTED_FILE_TYPES =
  ".pdf,.jpg,.jpeg,.png";

export default function CaregiverCredentialsPage() {
  const router =
    useRouter();

  const [
    draft,
    setDraft,
  ] =
    useState<CaregiverOnboardingDraft>(
      {}
    );

  const [
    qualificationDocuments,
    setQualificationDocuments,
  ] =
    useState<
      QualificationDocument[]
    >([]);

  const [
    tbStatus,
    setTbStatus,
  ] =
    useState<
      CaregiverOnboardingDraft["tbStatus"]
    >(
      "not_added"
    );

  const [
    vaccinationNotes,
    setVaccinationNotes,
  ] =
    useState("");

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
    uploadingKey,
    setUploadingKey,
  ] =
    useState<string>(
      ""
    );

  const [
    deletingKey,
    setDeletingKey,
  ] =
    useState<string>(
      ""
    );

  const [
    openingKey,
    setOpeningKey,
  ] =
    useState<string>(
      ""
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    savedMessage,
    setSavedMessage,
  ] =
    useState("");

  /*
   * ============================================================
   * INITIAL LOAD
   * ============================================================
   */

  useEffect(() => {
    let mounted =
      true;

    async function loadPage() {
      /*
       * Load locally cached onboarding data first.
       */
      const local =
        getCaregiverOnboardingDraft();

      applyDraft(
        local
      );

      /*
       * Then restore the cloud onboarding draft.
       */
      const draftResult =
        await loadLatestCaregiverDraft();

      if (
        !mounted
      ) {
        return;
      }

      if (
        draftResult.success
      ) {
        applyDraft(
          draftResult.draft
        );
      }

      /*
       * The caregiver_documents table is the
       * source of truth for real uploaded files.
       */
      const documentResult =
        await loadCaregiverDocuments();

      if (
        !mounted
      ) {
        return;
      }

      if (
        documentResult.success
      ) {
        applyCloudDocuments(
          documentResult.documents
        );
      } else if (
        documentResult.error
      ) {
        setErrorMessage(
          documentResult.error
        );
      }

      setIsLoading(
        false
      );
    }

    loadPage();

    return () => {
      mounted =
        false;
    };
  }, []);

  function applyDraft(
    saved:
      CaregiverOnboardingDraft
  ) {
    setDraft(
      saved
    );

    setTbStatus(
      saved.tbStatus ||
        "not_added"
    );

    setVaccinationNotes(
      saved.vaccinationNotes ||
        ""
    );

    const savedQualifications =
      saved.qualificationDocuments ||
      (
        saved.qualification
          ? [
              saved.qualification,
            ]
          : []
      );

    setQualificationDocuments(
      savedQualifications.map(
        (
          record,
          index
        ) => ({
          ...record,

          localId:
            record.documentId ||
            `qualification-${index}-${record.fileName || "document"}`,
        })
      )
    );
  }

  function applyCloudDocuments(
    documents:
      CaregiverDocumentRow[]
  ) {
    const singleton = (
      type:
        CaregiverDocumentType
    ) => {
      const rows =
        documents.filter(
          (
            document
          ) =>
            document.document_type ===
            type
        );

      const row =
        rows[
          rows.length -
            1
        ];

      return row
        ? documentRowToCredentialRecord(
            row
          )
        : undefined;
    };

    const qualificationRows =
      documents.filter(
        (
          document
        ) =>
          document.document_type ===
          "qualification"
      );

    const qualifications =
      qualificationRows.map(
        (
          row
        ) => {
          const record =
            documentRowToCredentialRecord(
              row
            );

          return {
            ...record,

            localId:
              record.documentId ||
              row.id,
          };
        }
      );

    setDraft(
      (
        current
      ) => ({
        ...current,

        governmentId:
          singleton(
            "government_id"
          ) ||
          current.governmentId,

        workEligibility:
          singleton(
            "work_eligibility"
          ) ||
          current.workEligibility,

        vulnerableSectorCheck:
          singleton(
            "vulnerable_sector_check"
          ) ||
          current.vulnerableSectorCheck,

        resume:
          singleton(
            "resume"
          ) ||
          current.resume,

        cprFirstAid:
          singleton(
            "cpr_first_aid"
          ) ||
          current.cprFirstAid,

        tbEvidence:
          singleton(
            "tb_evidence"
          ) ||
          current.tbEvidence,

        covid19VaccinationEvidence:
          singleton(
            "covid_vaccination"
          ) ||
          current.covid19VaccinationEvidence,

        qualification:
          qualifications[
            0
          ] ||
          current.qualification,

        qualificationDocuments:
          qualifications.length >
          0
            ? qualifications.map(
                ({
                  localId:
                    _localId,
                  ...record
                }) =>
                  record
              )
            : current.qualificationDocuments,
      })
    );

    if (
      qualifications.length >
      0
    ) {
      setQualificationDocuments(
        qualifications
      );
    }
  }

  /*
   * ============================================================
   * EFFECTIVE DRAFT
   * ============================================================
   */

  const effectiveDraft =
    useMemo<CaregiverOnboardingDraft>(
      () => {
        const normalizedQualifications =
          qualificationDocuments.map(
            ({
              localId:
                _localId,
              ...record
            }) =>
              record
          );

        return {
          ...draft,

          qualification:
            normalizedQualifications[
              0
            ],

          qualificationDocuments:
            normalizedQualifications,

          tbStatus,

          /*
           * No separate TB date requirement.
           */
          tbTestDate:
            undefined,

          vaccinationInfoProvided:
            Boolean(
              draft
                .covid19VaccinationEvidence
            ),

          vaccinationNotes:
            vaccinationNotes.trim(),
        };
      },
      [
        draft,
        qualificationDocuments,
        tbStatus,
        vaccinationNotes,
      ]
    );

  const sectionStatus =
    useMemo(
      () =>
        getCredentialsSectionStatus(
          effectiveDraft
        ),
      [
        effectiveDraft,
      ]
    );

  const isValid =
    sectionStatus.complete;

  /*
   * ============================================================
   * GENERAL HELPERS
   * ============================================================
   */

  function clearMessages() {
    setErrorMessage(
      ""
    );

    setSavedMessage(
      ""
    );
  }

  function getCredential(
    key:
      CredentialKey
  ) {
    return draft[
      key
    ] as
      | CredentialRecord
      | undefined;
  }

  function updateCredential(
    key:
      CredentialKey,
    record:
      CredentialRecord
  ) {
    setDraft(
      (
        current
      ) => ({
        ...current,

        [key]:
          record,
      })
    );
  }

  function clearCredential(
    key:
      CredentialKey
  ) {
    setDraft(
      (
        current
      ) => ({
        ...current,

        [key]: {
          status:
            "not_added",
        },
      })
    );
  }

  /*
   * ============================================================
   * SINGLE DOCUMENT UPLOAD
   * ============================================================
   */

  async function handleSingleFile(
    key:
      CredentialKey,

    documentType:
      CaregiverDocumentType,

    event:
      ChangeEvent<HTMLInputElement>
  ) {
    clearMessages();

    const file =
      event.target
        .files?.[0];

    event.target.value =
      "";

    if (
      !file
    ) {
      return;
    }

    const validation =
      validateCaregiverDocumentFile(
        file
      );

    if (
      !validation.success
    ) {
      setErrorMessage(
        validation.error
      );

      return;
    }

    setUploadingKey(
      key
    );

    try {
      const existing =
        getCredential(
          key
        );

      const result =
        await uploadCaregiverDocument({
          documentType,

          file,

          existingRecord:
            existing,
        });

      if (
        !result.success ||
        !result.record
      ) {
        setErrorMessage(
          result.error ||
            "Unable to upload this document."
        );

        return;
      }

      updateCredential(
        key,
        result.record
      );

      setSavedMessage(
        "Document uploaded successfully."
      );
    } finally {
      setUploadingKey(
        ""
      );
    }
  }

  /*
   * ============================================================
   * QUALIFICATION DOCUMENTS
   * ============================================================
   */

  async function handleQualificationFiles(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    clearMessages();

    const files =
      Array.from(
        event.target
          .files ||
          []
      );

    event.target.value =
      "";

    if (
      files.length ===
      0
    ) {
      return;
    }

    for (
      const file
      of files
    ) {
      const validation =
        validateCaregiverDocumentFile(
          file
        );

      if (
        !validation.success
      ) {
        setErrorMessage(
          `${file.name}: ${validation.error}`
        );

        return;
      }
    }

    setUploadingKey(
      "qualification"
    );

    try {
      const uploaded:
        QualificationDocument[] =
        [];

      for (
        const file
        of files
      ) {
        const result =
          await uploadCaregiverDocument({
            documentType:
              "qualification",

            file,
          });

        if (
          !result.success ||
          !result.record
        ) {
          setErrorMessage(
            result.error ||
              `Unable to upload ${file.name}.`
          );

          return;
        }

        uploaded.push({
          ...result.record,

          localId:
            result.record.documentId ||
            `${Date.now()}-${file.name}`,
        });
      }

      setQualificationDocuments(
        (
          current
        ) => [
          ...current,
          ...uploaded,
        ]
      );

      setSavedMessage(
        uploaded.length ===
          1
          ? "Qualification document uploaded successfully."
          : `${uploaded.length} qualification documents uploaded successfully.`
      );
    } finally {
      setUploadingKey(
        ""
      );
    }
  }

  /*
   * ============================================================
   * DELETE SINGLE DOCUMENT
   * ============================================================
   */

  async function handleRemoveCredential(
    key:
      CredentialKey
  ) {
    clearMessages();

    const record =
      getCredential(
        key
      );

    if (
      !record
    ) {
      return;
    }

    /*
     * Legacy file-name-only drafts can be removed
     * locally even when there is no cloud object.
     */
    if (
      !record.documentId &&
      !record.storagePath
    ) {
      clearCredential(
        key
      );

      return;
    }

    setDeletingKey(
      key
    );

    try {
      const result =
        await deleteCaregiverDocument(
          record
        );

      if (
        !result.success
      ) {
        setErrorMessage(
          result.error ||
            "Unable to delete this document."
        );

        return;
      }

      clearCredential(
        key
      );

      setSavedMessage(
        "Document removed."
      );
    } finally {
      setDeletingKey(
        ""
      );
    }
  }

  /*
   * ============================================================
   * DELETE QUALIFICATION
   * ============================================================
   */

  async function handleRemoveQualification(
    document:
      QualificationDocument
  ) {
    clearMessages();

    setDeletingKey(
      document.localId
    );

    try {
      if (
        document.documentId ||
        document.storagePath
      ) {
        const result =
          await deleteCaregiverDocument(
            document
          );

        if (
          !result.success
        ) {
          setErrorMessage(
            result.error ||
              "Unable to remove this qualification document."
          );

          return;
        }
      }

      setQualificationDocuments(
        (
          current
        ) =>
          current.filter(
            (
              item
            ) =>
              item.localId !==
              document.localId
          )
      );

      setSavedMessage(
        "Qualification document removed."
      );
    } finally {
      setDeletingKey(
        ""
      );
    }
  }

  /*
   * ============================================================
   * VIEW DOCUMENT
   * ============================================================
   */

  async function handleViewDocument(
    record:
      CredentialRecord,
    key:
      string
  ) {
    clearMessages();

    if (
      !record.storagePath
    ) {
      setErrorMessage(
        "This older draft only contains the file name. Upload the file again to store it securely."
      );

      return;
    }

    setOpeningKey(
      key
    );

    try {
      const result =
        await createCaregiverDocumentViewUrl(
          record
        );

      if (
        !result.success ||
        !result.url
      ) {
        setErrorMessage(
          result.error ||
            "Unable to open this document."
        );

        return;
      }

      window.open(
        result.url,
        "_blank",
        "noopener,noreferrer"
      );
    } finally {
      setOpeningKey(
        ""
      );
    }
  }

  /*
   * ============================================================
   * SAVE ONBOARDING DRAFT
   * ============================================================
   */

  async function saveCredentials(
    requireComplete:
      boolean
  ) {
    if (
      isSaving
    ) {
      return false;
    }

    clearMessages();

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
        await saveCaregiverDraftWithCloud(
          "credentials",
          effectiveDraft
        );

      if (
        !result.success
      ) {
        setErrorMessage(
          result.error ||
            "Your documents could not be saved."
        );

        return false;
      }

      setDraft(
        result.draft
      );

      setSavedMessage(
        "Your document progress has been saved."
      );

      return true;
    } finally {
      setIsSaving(
        false
      );
    }
  }

  async function handleContinue() {
    const saved =
      await saveCredentials(
        true
      );

    if (
      !saved
    ) {
      return;
    }

    router.push(
      "/caregiver/onboarding/professional"
    );
  }

  async function handleSaveAndExit() {
    const saved =
      await saveCredentials(
        false
      );

    if (
      !saved
    ) {
      return;
    }

    router.push(
      "/caregiver/onboarding"
    );
  }

  /*
   * ============================================================
   * LOADING SCREEN
   * ============================================================
   */

  if (
    isLoading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />

          <p className="mt-4 text-sm font-semibold text-gray-500">
            Loading your documents...
          </p>
        </div>
      </main>
    );
  }

  return (
    <OnboardingShell>
      <div>
        <p className="text-sm font-bold text-emerald-700">
          Verification Documents
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Add your documents
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          Upload the documents needed to review your caregiver application.
        </p>

        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-900">
          Your files are stored privately. They are not public
          and are only used for caregiver verification and
          application review.
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <CredentialUploadCard
          title="Government-issued photo ID"
          description="Passport, driver’s licence, or another government-issued photo ID."
          required
          record={
            draft.governmentId
          }
          isUploading={
            uploadingKey ===
            "governmentId"
          }
          isDeleting={
            deletingKey ===
            "governmentId"
          }
          isOpening={
            openingKey ===
            "governmentId"
          }
          hasError={
            showErrors &&
            sectionStatus.missingFields.includes(
              "Government ID"
            )
          }
          onFile={(
            event
          ) =>
            handleSingleFile(
              "governmentId",
              "government_id",
              event
            )
          }
          onRemove={() =>
            handleRemoveCredential(
              "governmentId"
            )
          }
          onView={() => {
            if (
              draft.governmentId
            ) {
              handleViewDocument(
                draft.governmentId,
                "governmentId"
              );
            }
          }}
        />

        <CredentialUploadCard
          title="Proof of work eligibility"
          description="Upload proof that you are legally eligible to work in Canada, such as a valid work permit, permanent resident document, Canadian passport, citizenship certificate, or other accepted proof."
          required
          record={
            draft.workEligibility
          }
          isUploading={
            uploadingKey ===
            "workEligibility"
          }
          isDeleting={
            deletingKey ===
            "workEligibility"
          }
          isOpening={
            openingKey ===
            "workEligibility"
          }
          hasError={
            showErrors &&
            sectionStatus.missingFields.includes(
              "Proof of work eligibility"
            )
          }
          onFile={(
            event
          ) =>
            handleSingleFile(
              "workEligibility",
              "work_eligibility",
              event
            )
          }
          onRemove={() =>
            handleRemoveCredential(
              "workEligibility"
            )
          }
          onView={() => {
            if (
              draft.workEligibility
            ) {
              handleViewDocument(
                draft.workEligibility,
                "workEligibility"
              );
            }
          }}
        />

        <QualificationUploadCard
          documents={
            qualificationDocuments
          }
          isUploading={
            uploadingKey ===
            "qualification"
          }
          deletingKey={
            deletingKey
          }
          openingKey={
            openingKey
          }
          hasError={
            showErrors &&
            sectionStatus.missingFields.includes(
              "Qualification document"
            )
          }
          onFiles={
            handleQualificationFiles
          }
          onRemove={
            handleRemoveQualification
          }
          onView={(
            document
          ) =>
            handleViewDocument(
              document,
              document.localId
            )
          }
        />

        <CredentialUploadCard
          title="Vulnerable Sector Check"
          description="Upload a Vulnerable Sector Check issued within the last 12 months."
          required
          record={
            draft.vulnerableSectorCheck
          }
          isUploading={
            uploadingKey ===
            "vulnerableSectorCheck"
          }
          isDeleting={
            deletingKey ===
            "vulnerableSectorCheck"
          }
          isOpening={
            openingKey ===
            "vulnerableSectorCheck"
          }
          hasError={
            showErrors &&
            sectionStatus.missingFields.includes(
              "Vulnerable Sector Check"
            )
          }
          onFile={(
            event
          ) =>
            handleSingleFile(
              "vulnerableSectorCheck",
              "vulnerable_sector_check",
              event
            )
          }
          onRemove={() =>
            handleRemoveCredential(
              "vulnerableSectorCheck"
            )
          }
          onView={() => {
            if (
              draft.vulnerableSectorCheck
            ) {
              handleViewDocument(
                draft.vulnerableSectorCheck,
                "vulnerableSectorCheck"
              );
            }
          }}
        />

        <CredentialUploadCard
          title="Resume / CV"
          description="Upload your current resume or CV. Professional references may be included in your CV and are not separately required."
          required
          record={
            draft.resume
          }
          isUploading={
            uploadingKey ===
            "resume"
          }
          isDeleting={
            deletingKey ===
            "resume"
          }
          isOpening={
            openingKey ===
            "resume"
          }
          hasError={
            showErrors &&
            sectionStatus.missingFields.includes(
              "Resume / CV"
            )
          }
          onFile={(
            event
          ) =>
            handleSingleFile(
              "resume",
              "resume",
              event
            )
          }
          onRemove={() =>
            handleRemoveCredential(
              "resume"
            )
          }
          onView={() => {
            if (
              draft.resume
            ) {
              handleViewDocument(
                draft.resume,
                "resume"
              );
            }
          }}
        />

        <CredentialUploadCard
          title="CPR / First Aid certificate"
          description="Upload your current CPR / First Aid certificate."
          required
          record={
            draft.cprFirstAid
          }
          isUploading={
            uploadingKey ===
            "cprFirstAid"
          }
          isDeleting={
            deletingKey ===
            "cprFirstAid"
          }
          isOpening={
            openingKey ===
            "cprFirstAid"
          }
          hasError={
            showErrors &&
            sectionStatus.missingFields.includes(
              "CPR / First Aid certificate"
            )
          }
          onFile={(
            event
          ) =>
            handleSingleFile(
              "cprFirstAid",
              "cpr_first_aid",
              event
            )
          }
          onRemove={() =>
            handleRemoveCredential(
              "cprFirstAid"
            )
          }
          onView={() => {
            if (
              draft.cprFirstAid
            ) {
              handleViewDocument(
                draft.cprFirstAid,
                "cprFirstAid"
              );
            }
          }}
        />

        <TBScreeningCard
          status={
            tbStatus
          }
          evidence={
            draft.tbEvidence
          }
          isUploading={
            uploadingKey ===
            "tbEvidence"
          }
          isDeleting={
            deletingKey ===
            "tbEvidence"
          }
          isOpening={
            openingKey ===
            "tbEvidence"
          }
          statusError={
            showErrors &&
            sectionStatus.missingFields.includes(
              "TB screening status"
            )
          }
          evidenceError={
            showErrors &&
            sectionStatus.missingFields.includes(
              "TB screening evidence"
            )
          }
          onStatusChange={(
            value
          ) => {
            setTbStatus(
              value
            );

            clearMessages();
          }}
          onFile={(
            event
          ) =>
            handleSingleFile(
              "tbEvidence",
              "tb_evidence",
              event
            )
          }
          onRemove={() =>
            handleRemoveCredential(
              "tbEvidence"
            )
          }
          onView={() => {
            if (
              draft.tbEvidence
            ) {
              handleViewDocument(
                draft.tbEvidence,
                "tbEvidence"
              );
            }
          }}
        />

        <CovidEvidenceCard
          record={
            draft
              .covid19VaccinationEvidence
          }
          vaccinationNotes={
            vaccinationNotes
          }
          isUploading={
            uploadingKey ===
            "covid19VaccinationEvidence"
          }
          isDeleting={
            deletingKey ===
            "covid19VaccinationEvidence"
          }
          isOpening={
            openingKey ===
            "covid19VaccinationEvidence"
          }
          hasError={
            showErrors &&
            sectionStatus.missingFields.includes(
              "COVID-19 vaccination evidence"
            )
          }
          onNotesChange={(
            value
          ) => {
            setVaccinationNotes(
              value
            );

            clearMessages();
          }}
          onFile={(
            event
          ) =>
            handleSingleFile(
              "covid19VaccinationEvidence",
              "covid_vaccination",
              event
            )
          }
          onRemove={() =>
            handleRemoveCredential(
              "covid19VaccinationEvidence"
            )
          }
          onView={() => {
            const record =
              draft
                .covid19VaccinationEvidence;

            if (
              record
            ) {
              handleViewDocument(
                record,
                "covid19VaccinationEvidence"
              );
            }
          }}
        />

        {showErrors &&
          !isValid && (
            <div className="rounded-2xl border border-red-300 bg-red-50 p-4">
              <p className="text-sm font-bold text-red-900">
                Complete the highlighted requirements
              </p>

              <p className="mt-1 text-sm text-red-700">
                The items below are still required before you can continue.
              </p>

              <ul className="mt-3 space-y-1.5 text-sm font-semibold text-red-700">
                {sectionStatus
                  .missingFields
                  .map(
                    (
                      field
                    ) => (
                      <li
                        key={
                          field
                        }
                      >
                        •{" "}
                        {
                          field
                        }
                      </li>
                    )
                  )}
              </ul>
            </div>
          )}

        {errorMessage && (
          <div
            role="alert"
            className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-700"
          >
            {
              errorMessage
            }
          </div>
        )}

        {savedMessage && (
          <div
            role="status"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
          >
            ✓{" "}
            {
              savedMessage
            }
          </div>
        )}

        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900">
          Files are now uploaded to Carerity&apos;s private
          caregiver document storage. Document review status will
          later be managed from the Carerity admin workspace.
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={
              handleSaveAndExit
            }
            disabled={
              isSaving ||
              Boolean(
                uploadingKey
              ) ||
              Boolean(
                deletingKey
              )
            }
            className="min-h-[52px] w-full rounded-xl border border-emerald-300 bg-white px-4 py-3.5 font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving
              ? "Saving..."
              : "Save & Exit"}
          </button>

          <button
            type="button"
            onClick={
              handleContinue
            }
            disabled={
              isSaving ||
              Boolean(
                uploadingKey
              ) ||
              Boolean(
                deletingKey
              )
            }
            className="min-h-[52px] w-full rounded-xl bg-emerald-600 px-4 py-3.5 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
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
 * STANDARD DOCUMENT CARD
 * ============================================================
 */

function CredentialUploadCard({
  title,
  description,
  required,
  record,
  isUploading,
  isDeleting,
  isOpening,
  hasError,
  onFile,
  onRemove,
  onView,
}: {
  title:
    string;

  description:
    string;

  required?:
    boolean;

  record?:
    CredentialRecord;

  isUploading:
    boolean;

  isDeleting:
    boolean;

  isOpening:
    boolean;

  hasError:
    boolean;

  onFile:
    (
      event:
        ChangeEvent<HTMLInputElement>
    ) => void;

  onRemove:
    () => void;

  onView:
    () => void;
}) {
  const added =
    Boolean(
      record?.fileName
    ) &&
    (
      record?.status ===
        "uploaded" ||
      record?.status ===
        "verified" ||
      record?.status ===
        "needs_review"
    );

  return (
    <section
      className={`rounded-2xl border p-4 transition ${
        hasError
          ? "border-red-400 bg-red-50"
          : added
            ? "border-emerald-300 bg-emerald-50/60"
            : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold text-gray-900">
            {title}

            {required && (
              <span className="ml-1 text-red-500">
                *
              </span>
            )}
          </p>

          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            {
              description
            }
          </p>
        </div>

        <StatusPill
          added={
            added
          }
        />
      </div>

      {hasError && (
        <p className="mt-3 text-sm font-semibold text-red-600">
          Required before continuing.
        </p>
      )}

      {record?.fileName && (
        <UploadedDocument
          record={
            record
          }
          isDeleting={
            isDeleting
          }
          isOpening={
            isOpening
          }
          onRemove={
            onRemove
          }
          onView={
            onView
          }
        />
      )}

      <label className="mt-4 inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">
        {isUploading
          ? "Uploading..."
          : added
            ? "Replace file"
            : "Choose file"}

        <input
          type="file"
          className="hidden"
          accept={
            ACCEPTED_FILE_TYPES
          }
          disabled={
            isUploading ||
            isDeleting
          }
          onChange={
            onFile
          }
        />
      </label>
    </section>
  );
}

/*
 * ============================================================
 * QUALIFICATIONS
 * ============================================================
 */

function QualificationUploadCard({
  documents,
  isUploading,
  deletingKey,
  openingKey,
  hasError,
  onFiles,
  onRemove,
  onView,
}: {
  documents:
    QualificationDocument[];

  isUploading:
    boolean;

  deletingKey:
    string;

  openingKey:
    string;

  hasError:
    boolean;

  onFiles:
    (
      event:
        ChangeEvent<HTMLInputElement>
    ) => void;

  onRemove:
    (
      document:
        QualificationDocument
    ) => void;

  onView:
    (
      document:
        QualificationDocument
    ) => void;
}) {
  const added =
    documents.length >
    0;

  return (
    <section
      className={`rounded-2xl border p-4 ${
        hasError
          ? "border-red-400 bg-red-50"
          : added
            ? "border-emerald-300 bg-emerald-50/60"
            : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold text-gray-900">
            Qualification documents

            <span className="ml-1 text-red-500">
              *
            </span>
          </p>

          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            Upload your PSW certificate or other relevant care
            qualification documents.
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
            added
              ? "bg-emerald-100 text-emerald-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {added
            ? `${documents.length} added`
            : "Not added"}
        </span>
      </div>

      {hasError && (
        <p className="mt-3 text-sm font-semibold text-red-600">
          At least one qualification document is required.
        </p>
      )}

      {documents.length >
        0 && (
        <div className="mt-4 space-y-3">
          {documents.map(
            (
              document
            ) => (
              <UploadedDocument
                key={
                  document.localId
                }
                record={
                  document
                }
                isDeleting={
                  deletingKey ===
                  document.localId
                }
                isOpening={
                  openingKey ===
                  document.localId
                }
                onRemove={() =>
                  onRemove(
                    document
                  )
                }
                onView={() =>
                  onView(
                    document
                  )
                }
              />
            )
          )}
        </div>
      )}

      <label className="mt-4 inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
        {isUploading
          ? "Uploading..."
          : added
            ? "Add another"
            : "Choose file"}

        <input
          type="file"
          multiple
          className="hidden"
          accept={
            ACCEPTED_FILE_TYPES
          }
          disabled={
            isUploading
          }
          onChange={
            onFiles
          }
        />
      </label>
    </section>
  );
}

/*
 * ============================================================
 * TB
 * ============================================================
 */

function TBScreeningCard({
  status,
  evidence,
  isUploading,
  isDeleting,
  isOpening,
  statusError,
  evidenceError,
  onStatusChange,
  onFile,
  onRemove,
  onView,
}: {
  status:
    CaregiverOnboardingDraft["tbStatus"];

  evidence?:
    CredentialRecord;

  isUploading:
    boolean;

  isDeleting:
    boolean;

  isOpening:
    boolean;

  statusError:
    boolean;

  evidenceError:
    boolean;

  onStatusChange:
    (
      value:
        CaregiverOnboardingDraft["tbStatus"]
    ) => void;

  onFile:
    (
      event:
        ChangeEvent<HTMLInputElement>
    ) => void;

  onRemove:
    () => void;

  onView:
    () => void;
}) {
  return (
    <section
      className={`rounded-2xl border p-4 ${
        statusError ||
        evidenceError
          ? "border-red-400 bg-red-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <p className="font-bold text-gray-900">
        TB screening

        <span className="ml-1 text-red-500">
          *
        </span>
      </p>

      <p className="mt-1 text-xs leading-relaxed text-gray-500">
        Select your current TB screening or clearance status and
        upload supporting evidence. A separate test date is not
        required.
      </p>

      <label className="mt-4 block">
        <span className="text-sm font-bold text-gray-900">
          TB status

          <span className="ml-1 text-red-500">
            *
          </span>
        </span>

        <select
          value={
            status ||
            "not_added"
          }
          onChange={(
            event
          ) =>
            onStatusChange(
              event.target
                .value as
                CaregiverOnboardingDraft["tbStatus"]
            )
          }
          className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-100 ${
            statusError
              ? "border-red-400"
              : "border-gray-300 focus:border-emerald-400"
          }`}
        >
          <option value="not_added">
            Select status
          </option>

          <option value="negative">
            Negative screening / test
          </option>

          <option value="clearance_provided">
            Medical clearance provided
          </option>

          <option value="needs_review">
            Other / needs review
          </option>
        </select>

        {statusError && (
          <p className="mt-2 text-sm font-semibold text-red-600">
            Select your TB screening status.
          </p>
        )}
      </label>

      <div
        className={`mt-4 rounded-xl border p-3 ${
          evidenceError
            ? "border-red-300 bg-white"
            : "border-gray-200 bg-gray-50"
        }`}
      >
        <p className="text-sm font-bold text-gray-900">
          TB screening evidence

          <span className="ml-1 text-red-500">
            *
          </span>
        </p>

        <p className="mt-1 text-xs text-gray-500">
          Upload your screening result, medical clearance, or
          equivalent supporting document.
        </p>

        {evidence?.fileName && (
          <UploadedDocument
            record={
              evidence
            }
            isDeleting={
              isDeleting
            }
            isOpening={
              isOpening
            }
            onRemove={
              onRemove
            }
            onView={
              onView
            }
          />
        )}

        <label className="mt-3 inline-flex cursor-pointer rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
          {isUploading
            ? "Uploading..."
            : evidence?.fileName
              ? "Replace evidence"
              : "Upload evidence"}

          <input
            type="file"
            className="hidden"
            accept={
              ACCEPTED_FILE_TYPES
            }
            disabled={
              isUploading ||
              isDeleting
            }
            onChange={
              onFile
            }
          />
        </label>

        {evidenceError && (
          <p className="mt-2 text-sm font-semibold text-red-600">
            TB screening evidence is required.
          </p>
        )}
      </div>
    </section>
  );
}

/*
 * ============================================================
 * COVID-19
 * ============================================================
 */

function CovidEvidenceCard({
  record,
  vaccinationNotes,
  isUploading,
  isDeleting,
  isOpening,
  hasError,
  onNotesChange,
  onFile,
  onRemove,
  onView,
}: {
  record?:
    CredentialRecord;

  vaccinationNotes:
    string;

  isUploading:
    boolean;

  isDeleting:
    boolean;

  isOpening:
    boolean;

  hasError:
    boolean;

  onNotesChange:
    (
      value:
        string
    ) => void;

  onFile:
    (
      event:
        ChangeEvent<HTMLInputElement>
    ) => void;

  onRemove:
    () => void;

  onView:
    () => void;
}) {
  return (
    <section
      className={`rounded-2xl border p-4 ${
        hasError
          ? "border-red-400 bg-red-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <p className="font-bold text-gray-900">
        COVID-19 vaccination evidence

        <span className="ml-1 text-red-500">
          *
        </span>
      </p>

      <p className="mt-1 text-xs leading-relaxed text-gray-500">
        Upload your COVID-19 vaccination record or other accepted
        vaccination evidence. A separate vaccination date is not
        required.
      </p>

      {record?.fileName && (
        <UploadedDocument
          record={
            record
          }
          isDeleting={
            isDeleting
          }
          isOpening={
            isOpening
          }
          onRemove={
            onRemove
          }
          onView={
            onView
          }
        />
      )}

      <label className="mt-4 inline-flex cursor-pointer rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
        {isUploading
          ? "Uploading..."
          : record?.fileName
            ? "Replace evidence"
            : "Upload evidence"}

        <input
          type="file"
          className="hidden"
          accept={
            ACCEPTED_FILE_TYPES
          }
          disabled={
            isUploading ||
            isDeleting
          }
          onChange={
            onFile
          }
        />
      </label>

      {hasError && (
        <p className="mt-2 text-sm font-semibold text-red-600">
          COVID-19 vaccination evidence is required.
        </p>
      )}

      <label className="mt-4 block">
        <span className="text-sm font-bold text-gray-900">
          Note{" "}
          <span className="font-medium text-gray-400">
            (optional)
          </span>
        </span>

        <textarea
          value={
            vaccinationNotes
          }
          onChange={(
            event
          ) =>
            onNotesChange(
              event.target.value
            )
          }
          rows={
            3
          }
          placeholder="Add a brief note if necessary."
          className="mt-2 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />
      </label>
    </section>
  );
}

/*
 * ============================================================
 * UPLOADED FILE DISPLAY
 * ============================================================
 */

function UploadedDocument({
  record,
  isDeleting,
  isOpening,
  onRemove,
  onView,
}: {
  record:
    CredentialRecord;

  isDeleting:
    boolean;

  isOpening:
    boolean;

  onRemove:
    () => void;

  onView:
    () => void;
}) {
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-white p-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 font-bold text-emerald-700">
          ✓
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">
            {record.fileName ||
              "Uploaded document"}
          </p>

          <p className="mt-0.5 text-xs text-gray-500">
            {formatFileSize(
              record.fileSizeBytes
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {record.storagePath && (
          <button
            type="button"
            onClick={
              onView
            }
            disabled={
              isOpening
            }
            className="text-xs font-bold text-emerald-700 hover:underline disabled:opacity-50"
          >
            {isOpening
              ? "Opening..."
              : "View"}
          </button>
        )}

        <button
          type="button"
          onClick={
            onRemove
          }
          disabled={
            isDeleting
          }
          className="text-xs font-bold text-red-600 hover:underline disabled:opacity-50"
        >
          {isDeleting
            ? "Removing..."
            : "Remove"}
        </button>
      </div>
    </div>
  );
}

function StatusPill({
  added,
}: {
  added:
    boolean;
}) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
        added
          ? "bg-emerald-100 text-emerald-700"
          : "bg-gray-100 text-gray-600"
      }`}
    >
      {added
        ? "Uploaded"
        : "Not added"}
    </span>
  );
}

/*
 * ============================================================
 * PAGE SHELL
 * ============================================================
 */

function OnboardingShell({
  children,
}: {
  children:
    ReactNode;
}) {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/caregiver/onboarding"
          aria-label="Carerity caregiver application"
        >
          <img
            src="/carerityblacklogo2.png"
            alt="Carerity"
            className="h-16 w-auto object-contain sm:h-20"
          />
        </Link>

        <span className="text-sm font-semibold text-emerald-700">
          5 of 7
        </span>
      </nav>

      <section className="mx-auto max-w-2xl px-4 pb-10">
        <Link
          href="/caregiver/onboarding/availability"
          className="text-sm font-semibold text-emerald-700 hover:underline"
        >
          ← Back
        </Link>

        <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          {children}
        </div>
      </section>
    </main>
  );
}

function formatFileSize(
  value?:
    number
) {
  if (
    typeof value !==
      "number" ||
    value <=
      0
  ) {
    return "Securely stored";
  }

  if (
    value <
    1024
  ) {
    return `${value} bytes`;
  }

  if (
    value <
    1024 *
      1024
  ) {
    return `${Math.round(
      value /
        1024
    )} KB`;
  }

  return `${(
    value /
    (
      1024 *
      1024
    )
  ).toFixed(
    1
  )} MB`;
}
