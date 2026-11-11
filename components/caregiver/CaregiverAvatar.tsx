"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  CaregiverProfilePhoto,
} from "../../lib/caregiverOnboardingDraft";

import {
  caregiverSupabase,
} from "../../lib/supabaseClient";

type CaregiverAvatarProps = {
  photo?:
    CaregiverProfilePhoto;

  firstName?:
    string;

  lastName?:
    string;

  size?:
    | "small"
    | "medium"
    | "large";
};

export default function CaregiverAvatar({
  photo,
  firstName = "",
  lastName = "",
  size = "medium",
}: CaregiverAvatarProps) {
  const [
    imageUrl,
    setImageUrl,
  ] =
    useState("");

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(false);

  useEffect(() => {
    let mounted =
      true;

    async function loadPhoto() {
      /*
       * Always clear the previous image first.
       *
       * This is important when switching between
       * different caregiver accounts in the same browser.
       */
      if (
        mounted
      ) {
        setImageUrl("");
      }

      if (
        !photo?.storagePath ||
        !photo?.storageBucket
      ) {
        return;
      }

      setIsLoading(
        true
      );

      try {
        /*
         * CRITICAL:
         *
         * Profile photos belong to the caregiver workspace.
         * Use caregiverSupabase so the signed URL is created
         * using the authenticated caregiver session.
         *
         * Do NOT use the generic "supabase" export here.
         * That generic client belongs to the customer workspace.
         */
        const {
          data,
          error,
        } =
          await caregiverSupabase.storage
            .from(
              photo.storageBucket
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
          setImageUrl(
            data?.signedUrl ||
              ""
          );
        }
      } catch (
        error
      ) {
        console.error(
          "Unable to load caregiver avatar:",
          error
        );

        if (
          mounted
        ) {
          setImageUrl("");
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

    void loadPhoto();

    return () => {
      mounted =
        false;
    };
  }, [
    photo?.storageBucket,
    photo?.storagePath,
  ]);

  const classes =
    size ===
    "large"
      ? "h-20 w-20 text-xl"
      : size ===
          "small"
        ? "h-10 w-10 text-xs"
        : "h-14 w-14 text-sm";

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-100 font-bold text-emerald-700 ${classes}`}
    >
      {imageUrl ? (
        <img
          src={
            imageUrl
          }
          alt="Caregiver profile"
          className="h-full w-full object-cover"
        />
      ) : (
        <span>
          {
            getInitials(
              firstName,
              lastName
            )
          }
        </span>
      )}

      {isLoading &&
        !imageUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
          </div>
        )}
    </div>
  );
}

function getInitials(
  firstName:
    string,

  lastName:
    string
) {
  const firstInitial =
    firstName
      .trim()
      .charAt(
        0
      );

  const lastInitial =
    lastName
      .trim()
      .charAt(
        0
      );

  const initials =
    `${firstInitial}${lastInitial}`
      .toUpperCase();

  return (
    initials ||
    "CG"
  );
}
