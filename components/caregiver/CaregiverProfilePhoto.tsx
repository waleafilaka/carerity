"use client";

import {
  ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  CaregiverProfilePhoto,
} from "../../lib/caregiverOnboardingDraft";

import {
  supabase,
} from "../../lib/supabaseClient";

type CaregiverProfilePhotoProps = {
  photo?:
    CaregiverProfilePhoto;

  firstName?:
    string;

  lastName?:
    string;

  disabled?:
    boolean;

  onChange:
    (
      photo:
        CaregiverProfilePhoto |
        undefined
    ) => void;
};

const PROFILE_PHOTO_BUCKET =
  "caregiver-profile-photos";

const MAX_FILE_SIZE_BYTES =
  5 * 1024 * 1024;

const ALLOWED_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

export default function CaregiverProfilePhotoTile({
  photo,
  firstName,
  lastName,
  disabled =
    false,
  onChange,
}: CaregiverProfilePhotoProps) {
  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [
    previewUrl,
    setPreviewUrl,
  ] =
    useState("");

  const [
    isLoadingPhoto,
    setIsLoadingPhoto,
  ] =
    useState(false);

  const [
    isUploading,
    setIsUploading,
  ] =
    useState(false);

  const [
    isRemoving,
    setIsRemoving,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  /*
   * ============================================================
   * LOAD EXISTING PRIVATE PHOTO
   * ============================================================
   */

  useEffect(() => {
    let mounted =
      true;

    async function loadExistingPhoto() {
      if (
        !photo?.storagePath
      ) {
        setPreviewUrl(
          ""
        );

        return;
      }

      setIsLoadingPhoto(
        true
      );

      try {
        const bucket =
          photo.storageBucket ||
          PROFILE_PHOTO_BUCKET;

        const {
          data,
          error,
        } =
          await supabase.storage
            .from(
              bucket
            )
            .createSignedUrl(
              photo.storagePath,
              60 * 60
            );

        if (
          error
        ) {
          throw error;
        }

        if (
          mounted
        ) {
          setPreviewUrl(
            data?.signedUrl ||
              ""
          );
        }
      } catch (
        error
      ) {
        console.error(
          "Unable to load caregiver profile photo:",
          error
        );

        if (
          mounted
        ) {
          setPreviewUrl(
            ""
          );

          setErrorMessage(
            "We couldn't load your current photo."
          );
        }
      } finally {
        if (
          mounted
        ) {
          setIsLoadingPhoto(
            false
          );
        }
      }
    }

    loadExistingPhoto();

    return () => {
      mounted =
        false;
    };
  }, [
    photo?.storageBucket,
    photo?.storagePath,
  ]);

  /*
   * ============================================================
   * CHOOSE FILE
   * ============================================================
   */

  function openFilePicker() {
    if (
      disabled ||
      isUploading ||
      isRemoving
    ) {
      return;
    }

    fileInputRef.current?.click();
  }

  async function handleFileChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    /*
     * Let the same file be selected again later.
     */
    event.target.value =
      "";

    if (
      !file
    ) {
      return;
    }

    setErrorMessage(
      ""
    );

    if (
      !ALLOWED_TYPES.has(
        file.type
      )
    ) {
      setErrorMessage(
        "Use a JPG, PNG or WebP image."
      );

      return;
    }

    if (
      file.size >
      MAX_FILE_SIZE_BYTES
    ) {
      setErrorMessage(
        "Profile photos must be 5 MB or smaller."
      );

      return;
    }

    await uploadPhoto(
      file
    );
  }

  /*
   * ============================================================
   * UPLOAD
   * ============================================================
   */

  async function uploadPhoto(
    file:
      File
  ) {
    setIsUploading(
      true
    );

    setErrorMessage(
      ""
    );

    let temporaryPreviewUrl =
      "";

    try {
      const {
        data: {
          session,
        },
        error:
          sessionError,
      } =
        await supabase.auth.getSession();

      if (
        sessionError
      ) {
        throw sessionError;
      }

      const user =
        session?.user;

      if (
        !user
      ) {
        throw new Error(
          "Your caregiver session has expired. Sign in again."
        );
      }

      /*
       * Immediate browser preview.
       */
      temporaryPreviewUrl =
        URL.createObjectURL(
          file
        );

      setPreviewUrl(
        temporaryPreviewUrl
      );

      const extension =
        getExtension(
          file
        );

      /*
       * One stable profile-photo path per caregiver.
       *
       * upsert: true means a new photo simply replaces
       * the old one instead of creating unnecessary files.
       */
      const storagePath =
        `${user.id}/profile.${extension}`;

      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from(
            PROFILE_PHOTO_BUCKET
          )
          .upload(
            storagePath,
            file,
            {
              upsert:
                true,

              contentType:
                file.type,

              cacheControl:
                "3600",
            }
          );

      if (
        uploadError
      ) {
        throw uploadError;
      }

      const uploadedPhoto:
        CaregiverProfilePhoto = {
        storageBucket:
          PROFILE_PHOTO_BUCKET,

        storagePath,

        fileName:
          file.name,

        mimeType:
          file.type,

        fileSizeBytes:
          file.size,

        uploadedAt:
          new Date().toISOString(),
      };

      /*
       * Notify parent profile page.
       *
       * The parent will persist this object inside
       * caregiver_onboarding_drafts when Save / Continue
       * is used.
       */
      onChange(
        uploadedPhoto
      );

      /*
       * Replace temporary object URL with
       * a private Supabase signed URL.
       */
      const {
        data:
          signedUrlData,
        error:
          signedUrlError,
      } =
        await supabase.storage
          .from(
            PROFILE_PHOTO_BUCKET
          )
          .createSignedUrl(
            storagePath,
            60 * 60
          );

      if (
        signedUrlError
      ) {
        console.error(
          "Unable to create profile photo signed URL:",
          signedUrlError
        );
      } else if (
        signedUrlData?.signedUrl
      ) {
        setPreviewUrl(
          signedUrlData.signedUrl
        );
      }
    } catch (
      error
    ) {
      console.error(
        "Unable to upload caregiver profile photo:",
        error
      );

      setErrorMessage(
        getErrorMessage(
          error,
          "We couldn't upload your photo."
        )
      );

      /*
       * Restore existing image if upload fails.
       */
      if (
        photo?.storagePath
      ) {
        try {
          const {
            data,
          } =
            await supabase.storage
              .from(
                photo.storageBucket ||
                  PROFILE_PHOTO_BUCKET
              )
              .createSignedUrl(
                photo.storagePath,
                60 * 60
              );

          setPreviewUrl(
            data?.signedUrl ||
              ""
          );
        } catch {
          setPreviewUrl(
            ""
          );
        }
      } else {
        setPreviewUrl(
          ""
        );
      }
    } finally {
      if (
        temporaryPreviewUrl
      ) {
        URL.revokeObjectURL(
          temporaryPreviewUrl
        );
      }

      setIsUploading(
        false
      );
    }
  }

  /*
   * ============================================================
   * REMOVE PHOTO
   * ============================================================
   */

  async function handleRemovePhoto() {
    if (
      disabled ||
      isUploading ||
      isRemoving
    ) {
      return;
    }

    setIsRemoving(
      true
    );

    setErrorMessage(
      ""
    );

    try {
      if (
        photo?.storagePath
      ) {
        const bucket =
          photo.storageBucket ||
          PROFILE_PHOTO_BUCKET;

        const {
          error,
        } =
          await supabase.storage
            .from(
              bucket
            )
            .remove([
              photo.storagePath,
            ]);

        if (
          error
        ) {
          throw error;
        }
      }

      setPreviewUrl(
        ""
      );

      onChange(
        undefined
      );
    } catch (
      error
    ) {
      console.error(
        "Unable to remove caregiver profile photo:",
        error
      );

      setErrorMessage(
        getErrorMessage(
          error,
          "We couldn't remove your photo."
        )
      );
    } finally {
      setIsRemoving(
        false
      );
    }
  }

  const initials =
    getInitials(
      firstName,
      lastName
    );

  const hasPhoto =
    Boolean(
      previewUrl
    );

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-gray-900">
            Profile photo
          </p>

          <span className="text-xs font-medium text-gray-400">
            Optional
          </span>
        </div>

        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          Add a clear, friendly photo to personalize your caregiver profile.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-emerald-200 bg-emerald-50">
          {hasPhoto ? (
            <img
              src={
                previewUrl
              }
              alt="Caregiver profile"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-2xl font-bold text-emerald-700">
              {
                initials
              }
            </span>
          )}

          {(isUploading ||
            isLoadingPhoto) && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/75">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">
            {hasPhoto
              ? "Your profile photo"
              : "No profile photo added"}
          </p>

          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            Use a recent head-and-shoulders photo with your face clearly visible.
          </p>

          <p className="mt-1 text-xs text-gray-400">
            JPG, PNG or WebP · maximum 5 MB
          </p>

          <input
            ref={
              fileInputRef
            }
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={
              handleFileChange
            }
            disabled={
              disabled ||
              isUploading ||
              isRemoving
            }
            className="hidden"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={
                openFilePicker
              }
              disabled={
                disabled ||
                isUploading ||
                isRemoving
              }
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {isUploading
                ? "Uploading..."
                : hasPhoto
                  ? "Change photo"
                  : "Add photo"}
            </button>

            {hasPhoto && (
              <button
                type="button"
                onClick={
                  handleRemovePhoto
                }
                disabled={
                  disabled ||
                  isUploading ||
                  isRemoving
                }
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
              >
                {isRemoving
                  ? "Removing..."
                  : "Remove"}
              </button>
            )}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-semibold text-red-700">
            {
              errorMessage
            }
          </p>
        </div>
      )}

      {photo?.uploadedAt &&
        !errorMessage && (
          <p className="mt-4 text-xs text-gray-400">
            Photo added{" "}
            {
              formatDate(
                photo.uploadedAt
              )
            }
          </p>
        )}
    </section>
  );
}

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function getExtension(
  file:
    File
) {
  switch (
    file.type
  ) {
    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    case "image/jpeg":
    default:
      return "jpg";
  }
}

function getInitials(
  firstName?:
    string,

  lastName?:
    string
) {
  const first =
    firstName
      ?.trim()
      .charAt(
        0
      ) ||
    "";

  const last =
    lastName
      ?.trim()
      .charAt(
        0
      ) ||
    "";

  const initials =
    `${first}${last}`
      .toUpperCase();

  return (
    initials ||
    "CG"
  );
}

function formatDate(
  value:
    string
) {
  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
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
