"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import PasswordField from "../../../components/ui/PasswordField";

import {
  caregiverSupabase,
  getAuthCallbackUrl,
  getAuthErrorMessage,
  resolveCarerityUserRole,
} from "../../../lib/supabaseClient";

type NoticeTone =
  | "error"
  | "success";

const REMEMBERED_CAREGIVER_EMAIL_KEY =
  "carerityRememberedCaregiverEmail";

const supabase =
  caregiverSupabase;

export default function CaregiverLoginPage() {
  const router =
    useRouter();

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
    rememberEmail,
    setRememberEmail,
  ] =
    useState(true);

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

  const [
    checkingSession,
    setCheckingSession,
  ] =
    useState(true);

  /*
   * ============================================================
   * EXISTING CAREGIVER SESSION
   * ============================================================
   */

  useEffect(() => {
    try {
      const rememberedEmail =
        window.localStorage.getItem(
          REMEMBERED_CAREGIVER_EMAIL_KEY
        );

      if (
        rememberedEmail
      ) {
        setEmail(
          rememberedEmail
        );

        setRememberEmail(
          true
        );
      }
    } catch (
      error
    ) {
      console.error(
        "Unable to load remembered caregiver email:",
        error
      );
    }

    let mounted =
      true;

    async function checkSession() {
      try {
        const {
          data: {
            session,
          },
          error,
        } =
          await supabase.auth.getSession();

        if (
          !mounted
        ) {
          return;
        }

        if (
          error
        ) {
          console.error(
            "Unable to check caregiver session:",
            error
          );
        }

        const user =
          session?.user ||
          null;

        if (
          !user
        ) {
          return;
        }

        const role =
          await resolveCarerityUserRole(
            user,
            caregiverSupabase
          );

        if (
          !mounted
        ) {
          return;
        }

        if (
          role ===
          "caregiver"
        ) {
          window.location.replace(
            "/caregiver/dashboard"
          );

          return;
        }

        /*
         * A non-caregiver account should not remain
         * authenticated inside the caregiver namespace.
         */

        await supabase.auth.signOut({
          scope:
            "local",
        });

        if (
          mounted
        ) {
          showError(
            "This account is not a caregiver account."
          );
        }
      } catch (
        error
      ) {
        console.error(
          "Unable to check caregiver session:",
          error
        );
      } finally {
        if (
          mounted
        ) {
          setCheckingSession(
            false
          );
        }
      }
    }

    checkSession();

    return () => {
      mounted =
        false;
    };
  }, []);

  /*
   * ============================================================
   * SIGN IN
   * ============================================================
   */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
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
       * Only clear an existing CAREGIVER session.
       *
       * Customer and admin sessions are stored under
       * separate namespaces and remain untouched.
       */

      const {
        data: {
          session:
            existingSession,
        },
      } =
        await supabase.auth.getSession();

      if (
        existingSession
      ) {
        const {
          error:
            signOutError,
        } =
          await supabase.auth.signOut({
            scope:
              "local",
          });

        if (
          signOutError
        ) {
          throw signOutError;
        }
      }

      const {
        data,
        error,
      } =
        await supabase.auth.signInWithPassword({
          email:
            cleanEmail,

          password,
        });

      if (
        error
      ) {
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
        await resolveCarerityUserRole(
          data.user,
          caregiverSupabase
        );

      /*
       * Remember email only.
       */

      try {
        if (
          rememberEmail
        ) {
          window.localStorage.setItem(
            REMEMBERED_CAREGIVER_EMAIL_KEY,
            cleanEmail
          );
        } else {
          window.localStorage.removeItem(
            REMEMBERED_CAREGIVER_EMAIL_KEY
          );
        }
      } catch (
        storageError
      ) {
        console.error(
          "Unable to update remembered caregiver email:",
          storageError
        );
      }

      if (
        role ===
        "caregiver"
      ) {
        window.location.replace(
          "/caregiver/dashboard"
        );

        return;
      }

      /*
       * The credential may be valid, but this account does not
       * belong in the caregiver namespace.
       */

      await supabase.auth.signOut({
        scope:
          "local",
      });

      if (
        role ===
        "customer"
      ) {
        showError(
          "This is a family account. Please use Family Sign In."
        );

        return;
      }

      if (
        role ===
        "admin"
      ) {
        showError(
          "This is an administrator account. Please use Admin Sign In."
        );

        return;
      }

      showError(
        "This account does not have a valid caregiver profile."
      );
    } catch (
      error
    ) {
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
    } finally {
      setIsSigningIn(
        false
      );
    }
  }

  /*
   * ============================================================
   * RESEND CONFIRMATION
   * ============================================================
   */

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

    setIsResending(
      true
    );

    setNotice("");
    setShowResend(
      false
    );

    try {
      const redirectTo =
        getAuthCallbackUrl(
          "/caregiver/onboarding"
        );

      const {
        error,
      } =
        await supabase.auth.resend({
          type:
            "signup",

          email:
            cleanEmail,

          options: {
            emailRedirectTo:
              redirectTo ||
              undefined,
          },
        });

      if (
        error
      ) {
        throw error;
      }

      setNoticeTone(
        "success"
      );

      setNotice(
        `A new confirmation link was sent to ${cleanEmail}.`
      );
    } catch (
      error
    ) {
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

  function handleRememberEmailChange(
    checked:
      boolean
  ) {
    setRememberEmail(
      checked
    );

    if (
      !checked
    ) {
      try {
        window.localStorage.removeItem(
          REMEMBERED_CAREGIVER_EMAIL_KEY
        );
      } catch (
        error
      ) {
        console.error(
          "Unable to clear remembered caregiver email:",
          error
        );
      }
    }
  }

  function showError(
    message:
      string
  ) {
    setNoticeTone(
      "error"
    );

    setNotice(
      message
    );
  }

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (
    checkingSession
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />

          <p className="mt-4 text-sm font-semibold text-gray-500">
            Checking your account...
          </p>
        </div>
      </main>
    );
  }

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="flex min-h-[92px] w-full items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-7 lg:px-10 xl:px-14">
        <Link
          href="/"
          aria-label="Carerity home"
          className="shrink-0"
        >
          <img
            src="/carerityblacklogo2.png"
            alt="Carerity"
            className="h-16 w-auto object-contain sm:h-20"
          />
        </Link>

        <Link
          href="/login"
          className="rounded-full border border-purple-300 bg-purple-50 px-4 py-2.5 text-sm font-semibold text-purple-700 transition hover:bg-purple-100"
        >
          Family Sign In
        </Link>
      </nav>

      <section className="mx-auto max-w-md px-4 py-8 sm:py-12">
        <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-sm font-bold text-emerald-700">
            Caregiver Workspace
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Welcome back
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            Sign in to manage your application, profile and care opportunities.
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

                  setNotice("");

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
                required
                disabled={
                  isSigningIn
                }
                placeholder="you@example.com"
                className="mt-2 min-h-[52px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-100"
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

                setNotice("");
              }}
              autoComplete="current-password"
              accent="emerald"
              disabled={
                isSigningIn
              }
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={
                    rememberEmail
                  }
                  onChange={(
                    event
                  ) =>
                    handleRememberEmailChange(
                      event.target.checked
                    )
                  }
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />

                <span className="text-sm font-medium text-gray-700">
                  Remember my email
                </span>
              </label>

              <Link
                href="/forgot-password?role=caregiver"
                className="text-sm font-semibold text-emerald-700 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <p className="text-xs leading-relaxed text-gray-500">
              For your security, Carerity remembers only your email address,
              never your password.
            </p>

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
                className="min-h-[52px] w-full rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
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
              className="min-h-[52px] w-full rounded-xl bg-emerald-600 py-3.5 font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {isSigningIn
                ? "Signing in..."
                : "Sign In"}
            </button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-5">
            <p className="text-center text-sm text-gray-500">
              New caregiver?{" "}
              <Link
                href="/caregiver/join"
                className="font-bold text-emerald-700 hover:underline"
              >
                Apply to Join
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-5 text-center text-xs leading-relaxed text-gray-400">
          Your caregiver application and saved progress become available after
          you sign in.
        </p>
      </section>
    </main>
  );
}

function NoticeBox({
  tone,
  message,
}: {
  tone:
    NoticeTone;

  message:
    string;
}) {
  const classes =
    tone ===
    "success"
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
      {
        message
      }
    </div>
  );
}

function isEmailConfirmationError(
  error:
    unknown
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
  error:
    unknown
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

  return original;
}
