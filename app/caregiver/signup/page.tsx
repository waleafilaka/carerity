"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";

import PasswordField from "../../../components/ui/PasswordField";

import {
  getAuthCallbackUrl,
  getAuthErrorMessage,
  getUserRole,
  supabase,
} from "../../../lib/supabaseClient";

type NoticeTone =
  | "error"
  | "success";

export default function CaregiverLoginPage() {
  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    notice,
    setNotice,
  ] =
    useState("");

  const [
    noticeTone,
    setNoticeTone,
  ] =
    useState<NoticeTone>(
      "error"
    );

  const [
    showResend,
    setShowResend,
  ] =
    useState(false);

  const [
    isSigningIn,
    setIsSigningIn,
  ] =
    useState(false);

  const [
    isResending,
    setIsResending,
  ] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      isSigningIn
    ) {
      return;
    }

    setNotice("");
    setShowResend(
      false
    );

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    if (
      !cleanEmail ||
      !password
    ) {
      showError(
        "Enter your email and password."
      );

      return;
    }

    setIsSigningIn(
      true
    );

    try {
      /*
       * Sign in directly.
       *
       * We intentionally do NOT call
       * getUser() -> signOut() first.
       * That sequence can leave mobile
       * browsers waiting on multiple
       * Supabase auth operations.
       */
      const authResult =
        await withTimeout(
          supabase.auth.signInWithPassword({
            email:
              cleanEmail,
            password,
          }),
          15000
        );

      const {
        data,
        error,
      } =
        authResult;

      if (error) {
        throw error;
      }

      if (
        !data.user ||
        !data.session
      ) {
        throw new Error(
          "Unable to start your session."
        );
      }

      const role =
        getUserRole(
          data.user
        );

      /*
       * Caregiver portal must never
       * admit a customer account.
       */
      if (
        role !==
        "caregiver"
      ) {
        /*
         * Now that authentication is
         * complete, removing the wrong
         * account is safe.
         */
        await withTimeout(
          supabase.auth.signOut({
            scope:
              "local",
          }),
          8000
        ).catch(
          (signOutError) => {
            console.error(
              "Unable to clear incorrect role session:",
              signOutError
            );
          }
        );

        showError(
          "This account belongs to the customer portal. Please use customer sign in."
        );

        setIsSigningIn(
          false
        );

        return;
      }

      /*
       * Hard navigation is deliberate.
       * It ensures the caregiver
       * dashboard loads from a fresh
       * document after Supabase has
       * persisted the new session.
       */
      window.location.replace(
        "/caregiver/dashboard"
      );
    } catch (error) {
      console.error(
        "Caregiver sign in failed:",
        error
      );

      showError(
        getLoginErrorMessage(
          error
        )
      );

      if (
        isEmailConfirmationError(
          error
        )
      ) {
        setShowResend(
          true
        );
      }

      setIsSigningIn(
        false
      );
    }
  }

  async function handleResendConfirmation() {
    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    if (
      !cleanEmail
    ) {
      showError(
        "Enter your email first."
      );

      return;
    }

    if (
      isResending
    ) {
      return;
    }

    setIsResending(
      true
    );

    setNotice("");

    try {
      const redirectTo =
        getAuthCallbackUrl(
          "/caregiver/onboarding"
        );

      const resendResult =
        await withTimeout(
          supabase.auth.resend({
            type:
              "signup",

            email:
              cleanEmail,

            options: {
              emailRedirectTo:
                redirectTo ||
                undefined,
            },
          }),
          15000
        );

      if (
        resendResult.error
      ) {
        throw resendResult.error;
      }

      setNoticeTone(
        "success"
      );

      setNotice(
        `A new confirmation link was sent to ${cleanEmail}.`
      );
    } catch (error) {
      console.error(
        "Unable to resend caregiver confirmation:",
        error
      );

      showError(
        getAuthErrorMessage(
          error,
          "Unable to resend the confirmation email."
        )
      );
    } finally {
      setIsResending(
        false
      );
    }
  }

  function showError(
    message: string
  ) {
    setNoticeTone(
      "error"
    );

    setNotice(
      message
    );
  }

  return (
    <main className="min-h-[100dvh] bg-gray-50 text-gray-900">
      <nav className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
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

        <Link
          href="/login"
          className="min-h-[44px] touch-manipulation rounded-full border border-purple-300 bg-purple-50 px-4 py-2.5 text-sm font-semibold text-purple-700 transition hover:bg-purple-100 active:scale-[0.98]"
        >
          Customer Sign In
        </Link>
      </nav>

      <section className="mx-auto w-full max-w-md px-4 py-6 sm:py-12">
        <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-sm font-bold text-emerald-700">
            Caregiver Workspace
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Sign in
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Access your caregiver workspace.
          </p>

          <form
            onSubmit={
              handleSubmit
            }
            className="mt-6 space-y-4"
          >
            <label className="block">
              <span className="text-sm font-bold text-gray-900">
                Email
              </span>

              <input
                type="email"
                value={
                  email
                }
                onChange={(
                  event
                ) => {
                  setEmail(
                    event.target.value
                  );

                  setNotice(
                    ""
                  );

                  setShowResend(
                    false
                  );
                }}
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={
                  false
                }
                inputMode="email"
                required
                disabled={
                  isSigningIn
                }
                className="mt-2 min-h-[52px] w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-100"
              />
            </label>

            <PasswordField
              label="Password"
              value={
                password
              }
              onChange={(
                value
              ) => {
                setPassword(
                  value
                );

                setNotice(
                  ""
                );
              }}
              autoComplete="current-password"
              accent="emerald"
              disabled={
                isSigningIn
              }
            />

            <div className="flex justify-end">
              <Link
                href="/forgot-password?role=caregiver"
                className="min-h-[40px] touch-manipulation py-2 text-sm font-semibold text-emerald-700 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {notice && (
              <NoticeBox
                tone={
                  noticeTone
                }
                message={
                  notice
                }
              />
            )}

            {showResend && (
              <button
                type="button"
                onClick={
                  handleResendConfirmation
                }
                disabled={
                  isResending
                }
                className="min-h-[52px] w-full touch-manipulation rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isResending
                  ? "Sending..."
                  : "Resend Confirmation Email"}
              </button>
            )}

            <button
              type="submit"
              disabled={
                isSigningIn
              }
              className="min-h-[52px] w-full touch-manipulation rounded-xl bg-emerald-600 px-4 py-3.5 font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {isSigningIn
                ? "Signing in..."
                : "Sign In"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            New caregiver?{" "}
            <Link
              href="/caregiver/join"
              className="font-bold text-emerald-700 hover:underline"
            >
              Apply to Join
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function NoticeBox({
  tone,
  message,
}: {
  tone: NoticeTone;
  message: string;
}) {
  const classes =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div
      className={`rounded-xl border p-3 text-sm ${classes}`}
      role={
        tone ===
        "error"
          ? "alert"
          : "status"
      }
    >
      {message}
    </div>
  );
}

function isEmailConfirmationError(
  error: unknown
) {
  const message =
    getAuthErrorMessage(
      error,
      ""
    ).toLowerCase();

  return (
    message.includes(
      "email not confirmed"
    ) ||
    message.includes(
      "email_not_confirmed"
    )
  );
}

function getLoginErrorMessage(
  error: unknown
) {
  const original =
    getAuthErrorMessage(
      error,
      "We couldn't sign you in. Please try again."
    );

  const message =
    original.toLowerCase();

  if (
    message.includes(
      "request timed out"
    )
  ) {
    return "Sign in is taking too long. Check your connection and try again.";
  }

  if (
    message.includes(
      "email not confirmed"
    ) ||
    message.includes(
      "email_not_confirmed"
    )
  ) {
    return "Confirm your email before signing in.";
  }

  if (
    message.includes(
      "invalid login credentials"
    ) ||
    message.includes(
      "invalid credentials"
    )
  ) {
    return "Email or password is incorrect.";
  }

  if (
    message.includes(
      "rate limit"
    ) ||
    message.includes(
      "too many"
    )
  ) {
    return "Too many attempts. Please wait and try again.";
  }

  if (
    message.includes(
      "failed to fetch"
    ) ||
    message.includes(
      "network"
    )
  ) {
    return "Carerity couldn't reach the sign-in service. Check your connection and try again.";
  }

  return original;
}

async function withTimeout<T>(
  operation:
    | Promise<T>
    | PromiseLike<T>,
  milliseconds: number
): Promise<T> {
  let timer:
    | ReturnType<
        typeof setTimeout
      >
    | undefined;

  const timeout =
    new Promise<never>(
      (_resolve, reject) => {
        timer =
          setTimeout(
            () => {
              reject(
                new Error(
                  "Request timed out."
                )
              );
            },
            milliseconds
          );
      }
    );

  try {
    return await Promise.race([
      Promise.resolve(
        operation
      ),
      timeout,
    ]);
  } finally {
    if (timer) {
      clearTimeout(
        timer
      );
    }
  }
}
