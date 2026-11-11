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
  getCaregiverOnboardingDraft,
  saveCaregiverOnboardingDraft,
} from "../../../lib/caregiverOnboardingDraft";

import {
  getAuthCallbackUrl,
  getAuthErrorMessage,
  supabase,
} from "../../../lib/supabaseClient";

type ConfirmationState = {
  waiting: boolean;
  email: string;
};

export default function CaregiverSignupPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    accepted,
    setAccepted,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    isResending,
    setIsResending,
  ] = useState(false);

  const [
    isCheckingConfirmation,
    setIsCheckingConfirmation,
  ] = useState(false);

  const [
    resendCooldown,
    setResendCooldown,
  ] = useState(0);

  const [
    confirmation,
    setConfirmation,
  ] =
    useState<ConfirmationState>({
      waiting: false,
      email: "",
    });

  useEffect(() => {
    const existing =
      getCaregiverOnboardingDraft();

    setEmail(
      existing.email || ""
    );

    setPhone(
      existing.phone || ""
    );

    const pendingEmail =
      sessionStorage.getItem(
        "carerityPendingCaregiverEmail"
      );

    if (pendingEmail) {
      setEmail(
        pendingEmail
      );

      setConfirmation({
        waiting: true,
        email: pendingEmail,
      });
    }
  }, []);

  useEffect(() => {
    if (
      resendCooldown <= 0
    ) {
      return;
    }

    const timer =
      window.setInterval(() => {
        setResendCooldown(
          (current) => {
            if (
              current <= 1
            ) {
              window.clearInterval(
                timer
              );

              return 0;
            }

            return (
              current - 1
            );
          }
        );
      }, 1000);

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    resendCooldown,
  ]);

  const cleanEmail =
    email
      .trim()
      .toLowerCase();

  const cleanPhone =
    normalizePhone(
      phone
    );

  const emailValid =
    isValidEmail(
      cleanEmail
    );

  const phoneValid =
    Boolean(
      cleanPhone
    );

  const passwordValid =
    password.length >= 8 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password);

  const passwordsMatch =
    password !== "" &&
    password ===
      confirmPassword;

  const formValid =
    emailValid &&
    phoneValid &&
    passwordValid &&
    passwordsMatch &&
    accepted;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError("");
    setSuccess("");

    if (!emailValid) {
      setError(
        "Enter a valid email address."
      );

      return;
    }

    if (!phoneValid) {
      setError(
        "Enter a valid Canada/US phone number."
      );

      return;
    }

    if (!passwordValid) {
      setError(
        "Use at least 8 characters, including a letter and a number."
      );

      return;
    }

    if (!passwordsMatch) {
      setError(
        "Passwords do not match."
      );

      return;
    }

    if (!accepted) {
      setError(
        "Confirm that you are applying as an independent care provider."
      );

      return;
    }

    setIsSubmitting(
      true
    );

    try {
      /*
       * Signup is an explicit account action.
       *
       * Remove any existing local browser
       * session first so an existing customer
       * session cannot interfere with creating
       * a caregiver account.
       */
      const {
        data: {
          user: existingUser,
        },
      } =
        await supabase.auth.getUser();

      if (existingUser) {
        const {
          error:
            signOutError,
        } =
          await supabase.auth.signOut({
            scope: "local",
          });

        if (signOutError) {
          throw signOutError;
        }
      }

      const redirectTo =
        getAuthCallbackUrl(
          "/caregiver/onboarding"
        );

      console.log(
        "Starting caregiver signup",
        {
          email:
            cleanEmail,
          redirectTo,
          origin:
            typeof window !==
            "undefined"
              ? window
                  .location
                  .origin
              : "",
        }
      );

      const {
        data,
        error:
          signUpError,
      } =
        await supabase.auth.signUp({
          email:
            cleanEmail,

          password,

          options: {
            emailRedirectTo:
              redirectTo ||
              undefined,

            data: {
              phone:
                cleanPhone,

              role:
                "caregiver",
            },
          },
        });

      console.log(
        "Caregiver signup response",
        {
          hasUser:
            Boolean(
              data.user
            ),

          hasSession:
            Boolean(
              data.session
            ),

          identities:
            data.user
              ?.identities
              ?.length,

          error:
            signUpError,
        }
      );

      if (signUpError) {
        throw signUpError;
      }

      /*
       * Supabase can return a user object
       * with zero identities when the email
       * already exists.
       */
      if (
        data.user &&
        Array.isArray(
          data.user.identities
        ) &&
        data.user.identities.length ===
          0
      ) {
        setError(
          "An account with this email already exists. Sign in instead."
        );

        return;
      }

      saveCaregiverOnboardingDraft({
        email:
          cleanEmail,

        phone:
          cleanPhone,

        accountCreated:
          true,

        applicationStatus:
          "draft",
      });

      /*
       * If email confirmation is disabled,
       * Supabase may immediately create
       * the session.
       */
      if (data.session) {
        sessionStorage.removeItem(
          "carerityPendingCaregiverEmail"
        );

        router.replace(
          "/caregiver/onboarding"
        );

        router.refresh();

        return;
      }

      /*
       * Email confirmation required.
       */
      sessionStorage.setItem(
        "carerityPendingCaregiverEmail",
        cleanEmail
      );

      setConfirmation({
        waiting: true,
        email:
          cleanEmail,
      });

      setSuccess(
        `We sent a confirmation email to ${cleanEmail}. Check your inbox and spam or junk folder.`
      );

      /*
       * Prevent rapid resend attempts.
       */
      setResendCooldown(
        30
      );
    } catch (signupError) {
      console.error(
        "Caregiver signup failed:",
        signupError
      );

      setError(
        getSignupErrorMessage(
          signupError
        )
      );
    } finally {
      setIsSubmitting(
        false
      );
    }
  }

  async function handleConfirmedContinue() {
    const confirmationEmail =
      (
        confirmation.email ||
        cleanEmail
      )
        .trim()
        .toLowerCase();

    if (
      !confirmationEmail
    ) {
      setError(
        "We could not determine which email you are confirming."
      );

      return;
    }

    if (!password) {
      setError(
        "Enter the password you created, then continue."
      );

      return;
    }

    if (
      isCheckingConfirmation
    ) {
      return;
    }

    setError("");
    setSuccess("");

    setIsCheckingConfirmation(
      true
    );

    try {
      /*
       * Remove an unrelated session before
       * checking this caregiver account.
       */
      const {
        data: {
          user: existingUser,
        },
      } =
        await supabase.auth.getUser();

      if (
        existingUser &&
        existingUser.email
          ?.toLowerCase() !==
          confirmationEmail
      ) {
        const {
          error:
            signOutError,
        } =
          await supabase.auth.signOut({
            scope: "local",
          });

        if (signOutError) {
          throw signOutError;
        }
      }

      const {
        data,
        error:
          signInError,
      } =
        await supabase.auth.signInWithPassword({
          email:
            confirmationEmail,

          password,
        });

      if (signInError) {
        throw signInError;
      }

      if (
        !data.session ||
        !data.user
      ) {
        throw new Error(
          "Unable to start your session."
        );
      }

      const role =
        data.user
          .user_metadata
          ?.role;

      /*
       * Caregiver credentials must not
       * enter the customer dashboard.
       */
      if (
        role !==
        "caregiver"
      ) {
        await supabase.auth.signOut({
          scope: "local",
        });

        throw new Error(
          "This email belongs to a customer account. Use a different email or sign in through the customer portal."
        );
      }

      sessionStorage.removeItem(
        "carerityPendingCaregiverEmail"
      );

      setSuccess(
        "Email confirmed. Opening your caregiver application..."
      );

      router.replace(
        "/caregiver/onboarding"
      );

      router.refresh();
    } catch (
      confirmationError
    ) {
      console.error(
        "Caregiver confirmation check failed:",
        confirmationError
      );

      if (
        isEmailConfirmationError(
          confirmationError
        )
      ) {
        setError(
          "Your email is not confirmed yet. Open the confirmation email, tap the confirmation link, then return here."
        );
      } else {
        setError(
          getSignupErrorMessage(
            confirmationError
          )
        );
      }
    } finally {
      setIsCheckingConfirmation(
        false
      );
    }
  }

  async function handleResendConfirmation() {
    const confirmationEmail =
      (
        confirmation.email ||
        cleanEmail
      )
        .trim()
        .toLowerCase();

    if (
      !confirmationEmail
    ) {
      setError(
        "We could not find the email address for this application. Use a different email and try again."
      );

      return;
    }

    if (
      !isValidEmail(
        confirmationEmail
      )
    ) {
      setError(
        "The saved email address is not valid. Use a different email and try again."
      );

      return;
    }

    if (
      isResending ||
      resendCooldown > 0
    ) {
      return;
    }

    setError("");
    setSuccess("");

    setIsResending(
      true
    );

    try {
      const redirectTo =
        getAuthCallbackUrl(
          "/caregiver/onboarding"
        );

      console.log(
        "Resending caregiver confirmation",
        {
          email:
            confirmationEmail,

          redirectTo,

          origin:
            typeof window !==
            "undefined"
              ? window
                  .location
                  .origin
              : "",
        }
      );

      const {
        data,
        error:
          resendError,
      } =
        await supabase.auth.resend({
          type: "signup",

          email:
            confirmationEmail,

          options: {
            emailRedirectTo:
              redirectTo ||
              undefined,
          },
        });

      console.log(
        "Caregiver resend response",
        {
          data,
          error:
            resendError,
        }
      );

      if (resendError) {
        throw resendError;
      }

      /*
       * Keep this email explicitly marked
       * as pending confirmation.
       */
      sessionStorage.setItem(
        "carerityPendingCaregiverEmail",
        confirmationEmail
      );

      setConfirmation({
        waiting: true,
        email:
          confirmationEmail,
      });

      setSuccess(
        `A new confirmation email was requested for ${confirmationEmail}. Check your inbox and spam or junk folder.`
      );

      /*
       * Avoid repeated requests and make the
       * interaction clear on mobile.
       */
      setResendCooldown(
        60
      );
    } catch (
      resendError
    ) {
      console.error(
        "Unable to resend caregiver confirmation:",
        resendError
      );

      const originalMessage =
        getAuthErrorMessage(
          resendError,
          "Unable to resend the confirmation email."
        );

      const normalizedMessage =
        originalMessage.toLowerCase();

      if (
        normalizedMessage.includes(
          "rate limit"
        ) ||
        normalizedMessage.includes(
          "too many"
        ) ||
        normalizedMessage.includes(
          "security purposes"
        )
      ) {
        setError(
          "A confirmation email was requested recently. Please wait before requesting another one."
        );

        setResendCooldown(
          60
        );

        return;
      }

      if (
        normalizedMessage.includes(
          "already confirmed"
        ) ||
        normalizedMessage.includes(
          "already been confirmed"
        )
      ) {
        setError(
          "This email appears to already be confirmed. Try signing in instead."
        );

        return;
      }

      if (
        normalizedMessage.includes(
          "redirect"
        ) ||
        normalizedMessage.includes(
          "url"
        )
      ) {
        setError(
          "The confirmation email could not be sent because the confirmation address is not allowed. Check the Supabase Auth redirect URL configuration."
        );

        return;
      }

      setError(
        `Confirmation email could not be resent: ${originalMessage}`
      );
    } finally {
      setIsResending(
        false
      );
    }
  }

  function handleUseDifferentEmail() {
    /*
     * Clear only this pending signup state.
     * Do not delete the entire caregiver
     * onboarding draft.
     */
    sessionStorage.removeItem(
      "carerityPendingCaregiverEmail"
    );

    setConfirmation({
      waiting: false,
      email: "",
    });

    setEmail("");
    setPhone("");

    setPassword("");
    setConfirmPassword("");

    setAccepted(
      false
    );

    setError("");
    setSuccess("");

    setResendCooldown(
      0
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
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
          href="/caregiver/login"
          className="touch-manipulation rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 active:scale-[0.98]"
        >
          Sign In
        </Link>
      </nav>

      <section className="mx-auto max-w-md px-4 py-8 sm:py-12">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          {confirmation.waiting ? (
            <ConfirmationPanel
              email={
                confirmation.email
              }
              password={
                password
              }
              onPasswordChange={(
                value
              ) => {
                setPassword(
                  value
                );

                setError(
                  ""
                );
              }}
              error={
                error
              }
              success={
                success
              }
              isChecking={
                isCheckingConfirmation
              }
              isResending={
                isResending
              }
              resendCooldown={
                resendCooldown
              }
              onContinue={
                handleConfirmedContinue
              }
              onResend={
                handleResendConfirmation
              }
              onUseDifferentEmail={
                handleUseDifferentEmail
              }
            />
          ) : (
            <>
              <p className="text-sm font-bold text-emerald-700">
                Join Carerity
              </p>

              <h1 className="mt-1 text-3xl font-bold">
                Create your account
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Start your caregiver application.
              </p>

              <form
                onSubmit={
                  handleSubmit
                }
                className="mt-6 space-y-4"
              >
                <Field
                  label="Email"
                  type="email"
                  value={
                    email
                  }
                  onChange={(
                    value
                  ) => {
                    setEmail(
                      value
                    );

                    setError(
                      ""
                    );

                    setSuccess(
                      ""
                    );
                  }}
                  autoComplete="email"
                />

                <Field
                  label="Phone"
                  type="tel"
                  value={
                    phone
                  }
                  onChange={(
                    value
                  ) => {
                    setPhone(
                      value
                    );

                    setError(
                      ""
                    );

                    setSuccess(
                      ""
                    );
                  }}
                  autoComplete="tel"
                />

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

                    setError(
                      ""
                    );

                    setSuccess(
                      ""
                    );
                  }}
                  autoComplete="new-password"
                  placeholder="Create a password"
                  accent="emerald"
                  showRequirements
                />

                <PasswordField
                  label="Confirm password"
                  value={
                    confirmPassword
                  }
                  onChange={(
                    value
                  ) => {
                    setConfirmPassword(
                      value
                    );

                    setError(
                      ""
                    );

                    setSuccess(
                      ""
                    );
                  }}
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  accent="emerald"
                  error={
                    confirmPassword &&
                    !passwordsMatch
                      ? "Passwords do not match."
                      : ""
                  }
                />

                <label className="flex min-h-[56px] cursor-pointer touch-manipulation items-start gap-3 rounded-2xl border border-gray-200 p-4">
                  <input
                    type="checkbox"
                    checked={
                      accepted
                    }
                    onChange={(
                      event
                    ) => {
                      setAccepted(
                        event
                          .target
                          .checked
                      );

                      setError(
                        ""
                      );

                      setSuccess(
                        ""
                      );
                    }}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />

                  <span className="text-sm leading-relaxed text-gray-700">
                    I&apos;m applying to join Carerity as an independent care provider.
                  </span>
                </label>

                {error && (
                  <NoticeBox
                    tone="error"
                    message={
                      error
                    }
                  />
                )}

                {success && (
                  <NoticeBox
                    tone="success"
                    message={
                      success
                    }
                  />
                )}

                <button
                  type="submit"
                  disabled={
                    isSubmitting
                  }
                  className={`min-h-[52px] w-full touch-manipulation rounded-xl py-3.5 font-semibold transition active:scale-[0.99] ${
                    formValid &&
                    !isSubmitting
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "border border-emerald-300 bg-emerald-50 text-emerald-700"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {isSubmitting
                    ? "Creating account..."
                    : formValid
                      ? "Continue"
                      : "Complete details to continue"}
                </button>

                <p className="text-center text-sm text-gray-500">
                  Already registered?{" "}
                  <Link
                    href="/caregiver/login"
                    className="font-bold text-emerald-700 hover:underline"
                  >
                    Sign In
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function ConfirmationPanel({
  email,
  password,
  onPasswordChange,
  error,
  success,
  isChecking,
  isResending,
  resendCooldown,
  onContinue,
  onResend,
  onUseDifferentEmail,
}: {
  email: string;

  password: string;

  onPasswordChange: (
    value: string
  ) => void;

  error: string;

  success: string;

  isChecking: boolean;

  isResending: boolean;

  resendCooldown: number;

  onContinue: () => void;

  onResend: () => void;

  onUseDifferentEmail: () => void;
}) {
  const resendDisabled =
    isResending ||
    isChecking ||
    resendCooldown > 0;

  return (
    <>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
        ✉
      </div>

      <p className="mt-5 text-sm font-bold text-emerald-700">
        Check Your Email
      </p>

      <h1 className="mt-1 text-3xl font-bold">
        Confirm your account
      </h1>

      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        We sent a confirmation email to{" "}
        <strong>
          {email}
        </strong>
        . Open the email and tap the confirmation link, then return here.
      </p>

      <div className="mt-6">
        <PasswordField
          label="Your password"
          value={
            password
          }
          onChange={
            onPasswordChange
          }
          autoComplete="current-password"
          placeholder="Enter the password you created"
          accent="emerald"
          disabled={
            isChecking
          }
        />
      </div>

      {error && (
        <div className="mt-4">
          <NoticeBox
            tone="error"
            message={
              error
            }
          />
        </div>
      )}

      {success && (
        <div className="mt-4">
          <NoticeBox
            tone="success"
            message={
              success
            }
          />
        </div>
      )}

      <button
        type="button"
        onClick={
          onContinue
        }
        disabled={
          isChecking
        }
        className="mt-5 min-h-[52px] w-full touch-manipulation rounded-xl bg-emerald-600 px-4 py-3.5 font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-emerald-300"
      >
        {isChecking
          ? "Checking..."
          : "I’ve Confirmed My Email — Continue"}
      </button>

      <button
        type="button"
        onClick={
          onResend
        }
        disabled={
          resendDisabled
        }
        className="mt-3 min-h-[52px] w-full touch-manipulation rounded-xl border border-emerald-300 bg-white px-4 py-3 font-semibold text-emerald-700 transition hover:bg-emerald-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 disabled:opacity-70"
      >
        {isResending
          ? "Sending confirmation..."
          : resendCooldown > 0
            ? `Resend available in ${resendCooldown}s`
            : "Resend Confirmation Email"}
      </button>

      <p className="mt-2 text-center text-xs leading-relaxed text-gray-500">
        If you do not see the email, check your spam or junk folder.
      </p>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />

        <span className="text-xs text-gray-400">
          or
        </span>

        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <button
        type="button"
        onClick={
          onUseDifferentEmail
        }
        disabled={
          isChecking ||
          isResending
        }
        className="min-h-[48px] w-full touch-manipulation rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        Use a Different Email
      </button>

      <Link
        href="/caregiver/login"
        className="mt-4 block touch-manipulation py-2 text-center text-sm font-semibold text-gray-500 hover:text-emerald-700"
      >
        Already confirmed? Sign in
      </Link>
    </>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
}: {
  label: string;

  type:
    | "email"
    | "tel";

  value: string;

  onChange: (
    value: string
  ) => void;

  autoComplete:
    | "email"
    | "tel";
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-gray-900">
        {label}
      </span>

      <input
        type={
          type
        }
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
        required
        autoComplete={
          autoComplete
        }
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={
          false
        }
        inputMode={
          type ===
          "email"
            ? "email"
            : "tel"
        }
        className="mt-2 min-h-[52px] w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}

function NoticeBox({
  tone,
  message,
}: {
  tone:
    | "error"
    | "success";

  message: string;
}) {
  const classes =
    tone ===
    "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div
      className={`rounded-xl border p-3 text-sm leading-relaxed ${classes}`}
      role={
        tone ===
        "error"
          ? "alert"
          : "status"
      }
      aria-live="polite"
    >
      {message}
    </div>
  );
}

function isValidEmail(
  value: string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

function normalizePhone(
  value: string
) {
  const digits =
    value.replace(
      /\D/g,
      ""
    );

  if (
    digits.length ===
    10
  ) {
    return `+1${digits}`;
  }

  if (
    digits.length ===
      11 &&
    digits.startsWith(
      "1"
    )
  ) {
    return `+${digits}`;
  }

  return "";
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

function getSignupErrorMessage(
  error: unknown
) {
  const original =
    getAuthErrorMessage(
      error,
      "Unable to create your account."
    );

  const message =
    original.toLowerCase();

  if (
    message.includes(
      "already registered"
    ) ||
    message.includes(
      "already been registered"
    ) ||
    message.includes(
      "user already"
    )
  ) {
    return "An account with this email already exists. Sign in instead.";
  }

  if (
    message.includes(
      "email not confirmed"
    ) ||
    message.includes(
      "email_not_confirmed"
    )
  ) {
    return "Confirm your email before continuing.";
  }

  if (
    message.includes(
      "rate limit"
    ) ||
    message.includes(
      "too many"
    ) ||
    message.includes(
      "security purposes"
    )
  ) {
    return "Too many attempts. Please wait before trying again.";
  }

  return original;
}
