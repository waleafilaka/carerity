import {
    CredentialRecord,
    CredentialStatus,
  } from "./caregiverOnboardingDraft";
  
  import {
    caregiverSupabase,
  } from "./supabaseClient";
  
  const supabase =
    caregiverSupabase;
  
  export const CAREGIVER_DOCUMENT_BUCKET =
    "caregiver-documents";
  
  export type CaregiverDocumentType =
    | "government_id"
    | "work_eligibility"
    | "qualification"
    | "vulnerable_sector_check"
    | "resume"
    | "cpr_first_aid"
    | "tb_evidence"
    | "covid_vaccination";
  
  export type CaregiverDocumentRow = {
    id: string;
    user_id: string;
    caregiver_id: string;
    document_type:
      CaregiverDocumentType;
    storage_bucket: string;
    storage_path: string;
    original_file_name: string;
    mime_type: string | null;
    file_size_bytes: number | null;
    document_status: string;
    issued_date: string | null;
    expiry_date: string | null;
    reference_number: string | null;
    review_note: string | null;
    verified_at: string | null;
    verified_by: string | null;
    created_at: string;
    updated_at: string;
  };
  
  export type UploadCaregiverDocumentOptions = {
    documentType:
      CaregiverDocumentType;
    file:
      File;
    existingRecord?:
      CredentialRecord;
    issuedDate?:
      string;
    expiryDate?:
      string;
    referenceNumber?:
      string;
  };
  
  export type CaregiverDocumentResult = {
    success: boolean;
    record?:
      CredentialRecord;
    row?:
      CaregiverDocumentRow;
    error?: string;
  };
  
  export type CaregiverDocumentListResult = {
    success: boolean;
    documents:
      CaregiverDocumentRow[];
    error?: string;
  };
  
  type CaregiverContext = {
    userId: string;
    caregiverId: string;
  };
  
  type ContextResult =
    | {
        success: true;
        context:
          CaregiverContext;
      }
    | {
        success: false;
        error: string;
      };
  
  async function getCaregiverContext():
    Promise<ContextResult> {
    try {
      const {
        data: {
          session,
        },
        error:
          sessionError,
      } =
        await supabase.auth
          .getSession();
  
      if (sessionError) {
        return {
          success: false,
          error: getErrorMessage(
            sessionError,
            "Unable to check your session."
          ),
        };
      }
  
      if (
        !session?.user
      ) {
        return {
          success: false,
          error:
            "Your caregiver session has expired. Sign in again.",
        };
      }
  
      const {
        data: {
          user,
        },
        error:
          userError,
      } =
        await supabase.auth
          .getUser();
  
      if (
        userError ||
        !user
      ) {
        return {
          success: false,
          error: getErrorMessage(
            userError,
            "Your caregiver session is no longer valid."
          ),
        };
      }
  
      const {
        data:
          caregiver,
        error:
          caregiverError,
      } =
        await supabase
          .from(
            "caregivers"
          )
          .select("id")
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();
  
      if (
        caregiverError
      ) {
        return {
          success: false,
          error: getErrorMessage(
            caregiverError,
            "Unable to find your caregiver profile."
          ),
        };
      }
  
      if (!caregiver) {
        return {
          success: false,
          error:
            "Your caregiver profile could not be found.",
        };
      }
  
      return {
        success: true,
        context: {
          userId:
            user.id,
          caregiverId:
            caregiver.id,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(
          error,
          "Unable to verify your caregiver account."
        ),
      };
    }
  }
  
  export async function uploadCaregiverDocument(
    options:
      UploadCaregiverDocumentOptions
  ): Promise<CaregiverDocumentResult> {
    const contextResult =
      await getCaregiverContext();
  
    if (
      !contextResult.success
    ) {
      return {
        success: false,
        error:
          contextResult.error,
      };
    }
  
    const {
      userId,
      caregiverId,
    } =
      contextResult.context;
  
    const {
      documentType,
      file,
      existingRecord,
      issuedDate,
      expiryDate,
      referenceNumber,
    } =
      options;
  
    const validation =
      validateCaregiverDocumentFile(
        file
      );
  
    if (
      !validation.success
    ) {
      return {
        success: false,
        error:
          validation.error,
      };
    }
  
    const storagePath =
      buildStoragePath(
        userId,
        documentType,
        file.name
      );
  
    try {
      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from(
            CAREGIVER_DOCUMENT_BUCKET
          )
          .upload(
            storagePath,
            file,
            {
              cacheControl:
                "3600",
              upsert: false,
              contentType:
                file.type ||
                undefined,
            }
          );
  
      if (
        uploadError
      ) {
        throw uploadError;
      }
  
      /*
       * A newly uploaded/replaced document is deliberately
       * reset to "uploaded" and loses the previous review
       * metadata. It must never inherit an old verification.
       */
      const metadata = {
        user_id:
          userId,
        caregiver_id:
          caregiverId,
        document_type:
          documentType,
        storage_bucket:
          CAREGIVER_DOCUMENT_BUCKET,
        storage_path:
          storagePath,
        original_file_name:
          file.name,
        mime_type:
          file.type ||
          null,
        file_size_bytes:
          file.size,
        document_status:
          "uploaded",
        issued_date:
          issuedDate ||
          null,
        expiry_date:
          expiryDate ||
          null,
        reference_number:
          referenceNumber?.trim() ||
          null,
        review_note:
          null,
        verified_at:
          null,
        verified_by:
          null,
      };
  
      let row:
        CaregiverDocumentRow;
  
      if (
        existingRecord
          ?.documentId
      ) {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "caregiver_documents"
            )
            .update(
              metadata
            )
            .eq(
              "id",
              existingRecord.documentId
            )
            .eq(
              "user_id",
              userId
            )
            .select("*")
            .single();
  
        if (error) {
          await safeRemoveStorageObject(
            storagePath
          );
          throw error;
        }
  
        row =
          data as
            CaregiverDocumentRow;
  
        const oldPath =
          existingRecord
            .storagePath;
  
        if (
          oldPath &&
          oldPath !== storagePath
        ) {
          await safeRemoveStorageObject(
            oldPath
          );
        }
      } else {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "caregiver_documents"
            )
            .insert(
              metadata
            )
            .select("*")
            .single();
  
        if (error) {
          await safeRemoveStorageObject(
            storagePath
          );
          throw error;
        }
  
        row =
          data as
            CaregiverDocumentRow;
      }
  
      return {
        success: true,
        row,
        record:
          documentRowToCredentialRecord(
            row
          ),
      };
    } catch (error) {
      console.error(
        "Caregiver document upload failed:",
        error
      );
  
      return {
        success: false,
        error: getErrorMessage(
          error,
          "Unable to upload this document."
        ),
      };
    }
  }
  
  export async function loadCaregiverDocuments():
    Promise<CaregiverDocumentListResult> {
    const contextResult =
      await getCaregiverContext();
  
    if (
      !contextResult.success
    ) {
      return {
        success: false,
        documents: [],
        error:
          contextResult.error,
      };
    }
  
    const {
      userId,
    } =
      contextResult.context;
  
    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "caregiver_documents"
          )
          .select("*")
          .eq(
            "user_id",
            userId
          )
          .order(
            "created_at",
            {
              ascending: true,
            }
          );
  
      if (error) {
        throw error;
      }
  
      return {
        success: true,
        documents:
          (
            data || []
          ) as
            CaregiverDocumentRow[],
      };
    } catch (error) {
      console.error(
        "Unable to load caregiver documents:",
        error
      );
  
      return {
        success: false,
        documents: [],
        error: getErrorMessage(
          error,
          "Unable to load your documents."
        ),
      };
    }
  }
  
  export async function deleteCaregiverDocument(
    record:
      CredentialRecord
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    const contextResult =
      await getCaregiverContext();
  
    if (
      !contextResult.success
    ) {
      return {
        success: false,
        error:
          contextResult.error,
      };
    }
  
    const {
      userId,
    } =
      contextResult.context;
  
    try {
      if (
        record.storagePath
      ) {
        const {
          error:
            storageError,
        } =
          await supabase.storage
            .from(
              record.storageBucket ||
                CAREGIVER_DOCUMENT_BUCKET
            )
            .remove([
              record.storagePath,
            ]);
  
        if (
          storageError
        ) {
          throw storageError;
        }
      }
  
      if (
        record.documentId
      ) {
        const {
          error:
            databaseError,
        } =
          await supabase
            .from(
              "caregiver_documents"
            )
            .delete()
            .eq(
              "id",
              record.documentId
            )
            .eq(
              "user_id",
              userId
            );
  
        if (
          databaseError
        ) {
          throw databaseError;
        }
      }
  
      return {
        success: true,
      };
    } catch (error) {
      console.error(
        "Unable to delete caregiver document:",
        error
      );
  
      return {
        success: false,
        error: getErrorMessage(
          error,
          "Unable to delete this document."
        ),
      };
    }
  }
  
  export async function createCaregiverDocumentViewUrl(
    record:
      CredentialRecord
  ): Promise<{
    success: boolean;
    url?: string;
    error?: string;
  }> {
    if (
      !record.storagePath
    ) {
      return {
        success: false,
        error:
          "This document does not have a stored file.",
      };
    }
  
    const contextResult =
      await getCaregiverContext();
  
    if (
      !contextResult.success
    ) {
      return {
        success: false,
        error:
          contextResult.error,
      };
    }
  
    try {
      const {
        data,
        error,
      } =
        await supabase.storage
          .from(
            record.storageBucket ||
              CAREGIVER_DOCUMENT_BUCKET
          )
          .createSignedUrl(
            record.storagePath,
            300
          );
  
      if (error) {
        throw error;
      }
  
      if (
        !data?.signedUrl
      ) {
        throw new Error(
          "Unable to create document preview."
        );
      }
  
      return {
        success: true,
        url:
          data.signedUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(
          error,
          "Unable to open this document."
        ),
      };
    }
  }
  
  export function documentRowToCredentialRecord(
    row:
      CaregiverDocumentRow
  ): CredentialRecord {
    return {
      documentId:
        row.id,
      storageBucket:
        row.storage_bucket,
      storagePath:
        row.storage_path,
      fileName:
        row.original_file_name,
      mimeType:
        row.mime_type ||
        undefined,
      fileSizeBytes:
        row.file_size_bytes ??
        undefined,
      status:
        normalizeCredentialStatus(
          row.document_status
        ),
      issuedDate:
        row.issued_date ||
        undefined,
      expiryDate:
        row.expiry_date ||
        undefined,
      referenceNumber:
        row.reference_number ||
        undefined,
      uploadedAt:
        row.created_at ||
        undefined,
    };
  }
  
  export function validateCaregiverDocumentFile(
    file: File
  ):
    | {
        success: true;
      }
    | {
        success: false;
        error: string;
      } {
    const allowedMimeTypes =
      new Set([
        "application/pdf",
        "image/jpeg",
        "image/png",
      ]);
  
    if (
      !allowedMimeTypes.has(
        file.type
      )
    ) {
      return {
        success: false,
        error:
          "Use a PDF, JPG, JPEG, or PNG file.",
      };
    }
  
    const maximumBytes =
      10 * 1024 * 1024;
  
    if (
      file.size >
      maximumBytes
    ) {
      return {
        success: false,
        error:
          "File must be 10 MB or smaller.",
      };
    }
  
    return {
      success: true,
    };
  }
  
  function buildStoragePath(
    userId: string,
    documentType:
      CaregiverDocumentType,
    originalFileName: string
  ) {
    const safeFileName =
      sanitizeFileName(
        originalFileName
      );
  
    const uniqueId =
      createUniqueId();
  
    return `${userId}/${documentType}/${uniqueId}-${safeFileName}`;
  }
  
  function sanitizeFileName(
    fileName: string
  ) {
    const trimmed =
      fileName
        .trim()
        .replace(
          /\s+/g,
          "-"
        )
        .replace(
          /[^a-zA-Z0-9._-]/g,
          ""
        );
  
    return (
      trimmed ||
      "document"
    );
  }
  
  function createUniqueId() {
    if (
      typeof crypto !==
        "undefined" &&
      typeof crypto.randomUUID ===
        "function"
    ) {
      return crypto.randomUUID();
    }
  
    return `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
  }
  
  async function safeRemoveStorageObject(
    storagePath: string
  ) {
    try {
      const {
        error,
      } =
        await supabase.storage
          .from(
            CAREGIVER_DOCUMENT_BUCKET
          )
          .remove([
            storagePath,
          ]);
  
      if (error) {
        console.error(
          "Unable to remove unused caregiver storage object:",
          error
        );
      }
    } catch (error) {
      console.error(
        "Unable to remove unused caregiver storage object:",
        error
      );
    }
  }
  
  function normalizeCredentialStatus(
    value: unknown
  ): CredentialStatus {
    switch (value) {
      case "uploaded":
      case "verified":
      case "expired":
      case "needs_review":
      case "not_added":
        return value;
  
      default:
        return "uploaded";
    }
  }
  
  function getErrorMessage(
    error: unknown,
    fallback: string
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
      "message" in error
    ) {
      const message =
        (
          error as {
            message?: unknown;
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

  