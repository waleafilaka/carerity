"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

import {
  getAuthErrorMessage,
  getUserRole,
  sanitizeInternalPath,
  supabase,
} from "../../../lib/supabaseClient";

type CallbackState =
  | "loading"
  | "success"
  | "error";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const callbackStarted =
    useRef(false);

  const [status, setStatus] =
    useState<CallbackState>(
      "loading"
    );

  const [message, setMessage] =
    useState(
      "Confirming your account..."
    );

  useEffect(() => {
    if (
      callbackStarted.current
    ) {
      return;
    }

    callbackStarted.current =
      true;

    let mounted = true;

    async function completeAuthentication() {
      try {
        const urlError =
          readAuthErrorFromUrl(
            searchParams
          );

        if (urlError) {
          throw new Error(
            urlError
          );
        }

        const user =
          await waitForAuthenticatedUser();

        if (!user) {
          throw new Error(
            "Your email may already be confirmed, but this browser could not start your session. Please sign in."
          );
        }

        if (!mounted) return;

        setStatus("success");

        setMessage(
          "Your email is confirmed. Opening Carerity..."
        );

        const requestedPath =
          sanitizeInternalPath(
            searchParams.get(
              "next"
            ),
            ""
          );

        const role =
          getUserRole(user);

        const defaultDestination =
          role === "caregiver"
            ? "/caregiver/onboarding"
            : "/dashboard";

        const destination =
          getRoleSafeDestination(
            requestedPath ||
              defaultDestination,
            role
          );

        window.setTimeout(() => {
          router.replace(
            destination
          );
          router.refresh();
        }, 500);
      } catch (error) {
        console.error(
          "Authentication callback failed:",
          error
        );

        if (!mounted) return;

        setStatus("error");

        setMessage(
          getCallbackErrorMessage(
            error
          )
        );
      }
    }

    completeAuthentication();

    return () => {
      mounted = false;
    };
  }, [
    router,
    searchParams,
  ]);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="flex items-center px-4 py-3 sm:px-6">
        <Link
          href="/"
          aria-label="Carerity home"
          className="touch-manipulation"
        >
          <img
            src="/carerityblacklogo2.png"
            alt="Carerity"
            className="h-16 w-auto object-contain sm:h-20"
          />
        </Link>
      </nav>

      <section className="mx-auto max-w-md px-4 py-10 sm:py-16">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-8">
          {status ===
            "loading" && (
            <>
              <div
                className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-purple-100 border-t-purple-600"
                aria-hidden="true"
              />

              <p className="mt-5 text-sm font-bold text-purple-700">
                Email Confirmation
              </p>

              <h1 className="mt-1 text-2xl font-bold">
                Confirming your account
              </h1>

              <p
                className="mt-3 text-sm text-gray-600"
                aria-live="polite"
              >
                {message}
              </p>
            </>
          )}

          {status ===
            "success" && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl font-bold text-emerald-700">
                ✓
              </div>

              <p className="mt-5 text-sm font-bold text-emerald-700">
                Email Confirmed
              </p>

              <h1 className="mt-1 text-2xl font-bold">
                You&apos;re all set
              </h1>

              <p
                className="mt-3 text-sm text-gray-600"
                aria-live="polite"
              >
                {message}
              </p>
            </>
          )}

          {status ===
            "error" && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-2xl font-bold text-red-700">
                !
              </div>

              <p className="mt-5 text-sm font-bold text-red-700">
                Confirmation Issue
              </p>

              <h1 className="mt-1 text-2xl font-bold">
                We couldn&apos;t complete sign-in
              </h1>

              <p
                className="mt-3 text-sm leading-relaxed text-gray-600"
                aria-live="assertive"
              >
                {message}
              </p>

              <div className="mt-6 space-y-3">
                <Link
                  href="/login"
                  className="block min-h-[52px] w-full touch-manipulation rounded-xl bg-purple-600 py-3.5 font-semibold text-white transition hover:bg-purple-700"
                >
                  Family Sign In
                </Link>

                <Link
                  href="/caregiver/login"
                  className="block min-h-[52px] w-full touch-manipulation rounded-xl border border-emerald-300 bg-emerald-50 py-3.5 font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  Caregiver Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function readAuthErrorFromUrl(
  searchParams: {
    get: (
      name: string
    ) => string | null;
  }
) {
  const queryError =
    searchParams.get(
      "error_description"
    ) ||
    searchParams.get(
      "error"
    );

  if (queryError) {
    return safeDecode(
      queryError
    );
  }

  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  const hashParams =
    new URLSearchParams(
      window.location.hash.replace(
        /^#/,
        ""
      )
    );

  const hashError =
    hashParams.get(
      "error_description"
    ) ||
    hashParams.get(
      "error"
    );

  return hashError
    ? safeDecode(hashError)
    : "";
}

async function waitForAuthenticatedUser(): Promise<User | null> {
  const immediate =
    await supabase.auth.getUser();

  if (immediate.data.user) {
    return immediate.data.user;
  }

  return new Promise(
    (resolve) => {
      let completed = false;

      const finish = (
        user: User | null
      ) => {
        if (completed) return;

        completed = true;

        window.clearTimeout(
          timeout
        );

        subscription.unsubscribe();

        resolve(user);
      };

      const {
        data: {
          subscription,
        },
      } =
        supabase.auth.onAuthStateChange(
          (
            _event,
            session
          ) => {
            if (
              session?.user
            ) {
              finish(
                session.user
              );
            }
          }
        );

      const timeout =
        window.setTimeout(
          async () => {
            try {
              const {
                data: { user },
              } =
                await supabase.auth.getUser();

              finish(
                user || null
              );
            } catch {
              finish(null);
            }
          },
          5000
        );
    }
  );
}

function getRoleSafeDestination(
  destination: string,
  role: unknown
) {
  if (role === "caregiver") {
    if (
      destination.startsWith(
        "/dashboard"
      ) ||
      destination.startsWith(
        "/find-care"
      )
    ) {
      return "/caregiver/onboarding";
    }

    return destination;
  }

  if (
    destination.startsWith(
      "/caregiver"
    )
  ) {
    return "/dashboard";
  }

  return destination;
}

function safeDecode(
  value: string
) {
  try {
    return decodeURIComponent(
      value
    );
  } catch {
    return value;
  }
}

function getCallbackErrorMessage(
  error: unknown
) {
  const original =
    getAuthErrorMessage(
      error,
      "The confirmation link could not be completed."
    );

  const message =
    original.toLowerCase();

  if (
    message.includes("expired") ||
    message.includes(
      "otp_expired"
    )
  ) {
    return "This confirmation link has expired. Please request a new confirmation email.";
  }

  if (
    message.includes("invalid")
  ) {
    return "This confirmation link is invalid or has already been used. Please sign in or request another confirmation email.";
  }

  if (
    message.includes("session") ||
    message.includes("sign in")
  ) {
    return "Your email may already be confirmed. Please sign in with your email and password.";
  }

  return original;
}
