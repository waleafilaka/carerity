"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import PasswordField from "../../components/ui/PasswordField";

import {
  getKeepSignedInPreference,
  getRememberedLoginEmail,
  rememberLoginEmail,
  setKeepSignedInPreference,
} from "../../lib/authPreferences";

import {
  customerSupabase,
  getAuthCallbackUrl,
  getAuthErrorMessage,
  resolveCarerityUserRole,
} from "../../lib/supabaseClient";

const supabase =
  customerSupabase;

type NoticeTone =
  | "error"
  | "success";

export default function CustomerLoginPage() {
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
    keepSignedIn,
    setKeepSignedIn,
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
   * LOAD SAVED PREFERENCES
   * ============================================================
   */

  useEffect(() => {
    setEmail(
      getRememberedLoginEmail(
        "customer"
      )
    );

    setKeepSignedIn(
      getKeepSignedInPreference()
    );
  }, []);

  /*
   * ============================================================
   * EXISTING SESSION
   * ============================================================
   */

  useEffect(() => {
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
            "Unable to check family session:",
            error
          );
        }

        const authenticatedUser =
          session?.user ||
          null;

        if (
          !authenticatedUser
        ) {
          return;
        }

        const role =
          await resolveCarerityUserRole(
            authenticatedUser,
            customerSupabase
          );

        if (
          !mounted
        ) {
          return;
        }

        if (
          role ===
          "customer"
        ) {
          window.location.replace(
            "/dashboard"
          );

          return;
        }

        /*
         * This session belongs to the CUSTOMER namespace.
         *
         * If the credentials belong to another workspace,
         * clear only this customer copy. Never redirect an
         * isolated customer session into caregiver/admin.
         */
        await supabase.auth.signOut({
          scope:
            "local",
        });

        if (
          mounted
        ) {
          if (
            role ===
            "caregiver"
          ) {
            showError(
              "This is a caregiver account. Please use Caregiver Sign In."
            );
          } else if (
            role ===
            "admin"
          ) {
            showError(
              "This is an administrator account. Please use Admin Sign In."
            );
          } else {
            showError(
              "This account could not be opened in the family workspace."
            );
          }
        }
      } catch (
        error
      ) {
        console.error(
          "Unable to check family session:",
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
  }, [
    router,
  ]);

  /*
   * ============================================================
   * LOGIN
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
       * Set the storage preference BEFORE Supabase
       * creates the new authenticated session.
       */
      setKeepSignedInPreference(
        keepSignedIn
      );

      /*
       * IMPORTANT:
       *
       * Carerity has two user workspaces.
       * If another account is already authenticated
       * in this browser, remove that local session first.
       *
       * This prevents stale caregiver/customer sessions
       * from fighting with the new login.
       */
      const {
        data: {
          session:
            existingSession,
        },
        error:
          existingSessionError,
      } =
        await supabase.auth.getSession();

      if (
        existingSessionError
      ) {
        console.warn(
          "Unable to inspect existing session:",
          existingSessionError
        );
      }

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

      /*
       * Authenticate.
       */
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

      /*
       * Verify that Supabase can immediately read
       * the session it just created.
       */
      const {
        data: {
          session:
            verifiedSession,
        },
        error:
          verifySessionError,
      } =
        await supabase.auth.getSession();

      if (
        verifySessionError
      ) {
        throw verifySessionError;
      }

      if (
        !verifiedSession?.user
      ) {
        throw new Error(
          "Your sign-in was accepted, but the browser session could not be saved."
        );
      }

      rememberLoginEmail(
        "customer",
        cleanEmail
      );

      const role =
        await resolveCarerityUserRole(
          verifiedSession.user,
          customerSupabase
        );

      if (
        role ===
        "customer"
      ) {
        /*
         * Hard navigation is deliberate.
         *
         * It lets the destination page start with
         * the completed customerSupabase session.
         */
        window.location.replace(
          "/dashboard"
        );

        return;
      }

      /*
       * Valid credentials can belong to another Carerity
       * workspace. Clear only the CUSTOMER namespace copy.
       */

      await supabase.auth.signOut({
        scope:
          "local",
      });

      if (
        role ===
        "caregiver"
      ) {
        showError(
          "This is a caregiver account. Please use Caregiver Sign In."
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
        "This account could not be opened in the family workspace."
      );
    } catch (
      error
    ) {
      console.error(
        "Family sign in failed:",
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
          "/dashboard"
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
        "Unable to resend family confirmation:",
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
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-purple-100 border-t-purple-600" />

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
      <nav className="flex items-center justify-between px-4 py-3 sm:px-7 lg:px-10">
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

        <Link
          href="/caregiver/login"
          className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
        >
          Caregiver Sign In
        </Link>
      </nav>

      <section className="mx-auto max-w-md px-4 py-8 sm:py-12">
        <div className="rounded-3xl border border-purple-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-sm font-bold text-purple-700">
            Family Care Portal
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Sign in
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Access your care dashboard.
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
                className="mt-2 min-h-[52px] w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100 disabled:bg-gray-100"
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
              accent="purple"
              disabled={
                isSigningIn
              }
            />

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <input
                type="checkbox"
                checked={
                  keepSignedIn
                }
                onChange={(
                  event
                ) => {
                  setKeepSignedIn(
                    event.target.checked
                  );
                }}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />

              <span>
                <span className="block text-sm font-bold text-gray-900">
                  Keep me signed in
                </span>

                <span className="mt-0.5 block text-xs leading-relaxed text-gray-500">
                  Stay signed in on this device. Your password is never stored by Carerity.
                </span>
              </span>
            </label>

            <div className="flex justify-end">
              <Link
                href="/forgot-password?role=customer"
                className="py-1 text-sm font-semibold text-purple-700 hover:underline"
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
                className="min-h-[52px] w-full rounded-xl border border-purple-300 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-700 transition hover:bg-purple-100 disabled:opacity-60"
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
              className="min-h-[52px] w-full rounded-xl bg-purple-600 py-3.5 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
            >
              {isSigningIn
                ? "Signing in..."
                : "Sign In"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Need care?{" "}
            <Link
              href="/find-care"
              className="font-bold text-purple-700 hover:underline"
            >
              Find Care
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
