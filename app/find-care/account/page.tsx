"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import ProgressHeader from "../../../components/ui/ProgressHeader";
import PasswordField from "../../../components/ui/PasswordField";

import {
  getBookingDraft,
  saveBookingDraft,
} from "../../../lib/bookingDraft";

import {
  getAuthCallbackUrl,
  customerSupabase,
} from "../../../lib/supabaseClient";

type BookingFor = "myself" | "someoneElse" | "";
type UnknownRecord = Record<string, unknown>;

export default function AccountPage() {
  const [bookingFor, setBookingFor] = useState<BookingFor>("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showErrors, setShowErrors] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [success, setSuccess] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isCheckingConfirmation, setIsCheckingConfirmation] =
    useState(false);

  const [awaitingConfirmation, setAwaitingConfirmation] =
    useState(false);

  useEffect(() => {
    const draft = getBookingDraft();

    setBookingFor(draft.bookingFor || "");
    setFirstName(draft.firstName || "");
    setLastName(draft.lastName || "");
    setEmail(draft.email || "");
    setPhone(draft.phone || "");

    const pendingEmail = sessionStorage.getItem(
      "carerityPendingCustomerEmail"
    );

    if (pendingEmail) {
      setEmail(pendingEmail);
      setAwaitingConfirmation(true);
    }
  }, []);

  const cleanEmail = email.trim().toLowerCase();
  const normalizedPhone = normalizePhoneNumber(phone);

  const isFirstNameValid = firstName.trim() !== "";
  const isLastNameValid = lastName.trim() !== "";
  const isEmailValid = isValidEmail(cleanEmail);
  const isPhoneValid = normalizedPhone !== "";

  const isPasswordValid =
    password.length >= 8 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password);

  const passwordsMatch =
    password !== "" &&
    password === confirmPassword;

  const formValid =
    isFirstNameValid &&
    isLastNameValid &&
    isEmailValid &&
    isPhoneValid &&
    isPasswordValid &&
    passwordsMatch;

  async function handleContinue() {
    setShowErrors(true);
    setAccountError("");
    setSuccess("");

    if (!formValid || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const redirectTo = getAuthCallbackUrl(
        "/find-care/location"
      );

      /*
       * IMPORTANT:
       * This is explicitly the CUSTOMER-scoped Supabase client.
       * Carerity maintains separate browser sessions for
       * customer/caregiver/admin users.
       */
      const { data, error } =
        await customerSupabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: redirectTo || undefined,
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              phone: normalizedPhone,
              role: "family",
            },
          },
        });

      if (error) {
        throw error;
      }

      /*
       * Supabase may return an empty identities array for an
       * already-existing email when email-enumeration protection
       * is enabled.
       */
      if (
        data.user &&
        Array.isArray(data.user.identities) &&
        data.user.identities.length === 0
      ) {
        setAccountError(
          "An account with this email already exists. Sign in instead."
        );
        return;
      }

      saveCustomerDraft();

      /*
       * If confirmation is disabled, a live session is returned
       * immediately.
       */
      if (data.session) {
        sessionStorage.removeItem(
          "carerityPendingCustomerEmail"
        );

        window.location.href = "/find-care/location";
        return;
      }

      /*
       * Normal email-confirmation path.
       */
      sessionStorage.setItem(
        "carerityPendingCustomerEmail",
        cleanEmail
      );

      setAwaitingConfirmation(true);

      setSuccess(
        `We sent a confirmation link to ${cleanEmail}.`
      );
    } catch (error) {
      /*
       * Do not stringify the raw error into the UI.
       * Some Supabase/PostgREST errors render as "{}".
       * Keep the original error in DevTools and normalize the
       * useful fields for the customer-facing notice.
       */
      console.error(
        "Customer account creation failed:",
        error
      );

      console.error(
        "Normalized signup error:",
        normalizeUnknownError(error)
      );

      setAccountError(
        getSignupErrorMessage(error)
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmedContinue() {
    if (!cleanEmail || !password) {
      setAccountError(
        "Enter the password you created, then continue."
      );
      return;
    }

    setAccountError("");
    setSuccess("");
    setIsCheckingConfirmation(true);

    try {
      const {
        data,
        error: signInError,
      } =
        await customerSupabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (signInError) {
        throw signInError;
      }

      if (!data.session || !data.user) {
        throw new Error("Unable to start your session.");
      }

      saveCustomerDraft();

      sessionStorage.removeItem(
        "carerityPendingCustomerEmail"
      );

      window.location.href = "/find-care/location";
    } catch (error) {
      console.error(
        "Customer confirmation check failed:",
        error
      );

      if (isEmailConfirmationError(error)) {
        setAccountError(
          "Your email is not confirmed yet. Open the confirmation link, then try again."
        );
      } else {
        setAccountError(
          getSignupErrorMessage(error)
        );
      }
    } finally {
      setIsCheckingConfirmation(false);
    }
  }

  async function handleResendConfirmation() {
    if (!isEmailValid) {
      setAccountError("Enter a valid email address.");
      return;
    }

    setAccountError("");
    setSuccess("");
    setIsResending(true);

    try {
      const redirectTo = getAuthCallbackUrl(
        "/find-care/location"
      );

      const { error } =
        await customerSupabase.auth.resend({
          type: "signup",
          email: cleanEmail,
          options: {
            emailRedirectTo: redirectTo || undefined,
          },
        });

      if (error) {
        throw error;
      }

      setSuccess(
        `A new confirmation link was sent to ${cleanEmail}.`
      );
    } catch (error) {
      console.error(
        "Unable to resend customer confirmation:",
        error
      );

      setAccountError(
        getSignupErrorMessage(error)
      );
    } finally {
      setIsResending(false);
    }
  }

  function saveCustomerDraft() {
    saveBookingDraft({
      bookingFor: bookingFor || undefined,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: cleanEmail,
      phone: normalizedPhone,
    });
  }

  if (awaitingConfirmation) {
    return (
      <ConfirmationPage
        email={cleanEmail}
        password={password}
        onPasswordChange={(value) => {
          setPassword(value);
          setAccountError("");
        }}
        error={accountError}
        success={success}
        isChecking={isCheckingConfirmation}
        isResending={isResending}
        onContinue={handleConfirmedContinue}
        onResend={handleResendConfirmation}
      />
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-5 text-gray-900 sm:px-6">
      <section className="mx-auto w-full max-w-xl rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <ProgressHeader
          backHref="/find-care"
          stage="1 of 4"
          progress="w-[25%]"
          title="Create your account"
          subtitle="Save your care request and return anytime."
        />

        <div className="flex flex-col gap-3">
          <TextField
            type="text"
            placeholder="First name"
            value={firstName}
            onChange={(value) => {
              setFirstName(value);
              setAccountError("");
            }}
            autoComplete="given-name"
            error={
              showErrors && !isFirstNameValid
                ? "First name is required."
                : ""
            }
          />

          <TextField
            type="text"
            placeholder="Last name"
            value={lastName}
            onChange={(value) => {
              setLastName(value);
              setAccountError("");
            }}
            autoComplete="family-name"
            error={
              showErrors && !isLastNameValid
                ? "Last name is required."
                : ""
            }
          />

          <TextField
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(value) => {
              setEmail(value);
              setAccountError("");
            }}
            autoComplete="email"
            error={
              showErrors && !isEmailValid
                ? "Enter a valid email address."
                : ""
            }
          />

          <TextField
            type="tel"
            placeholder="Phone number"
            value={phone}
            onChange={(value) => {
              setPhone(value);
              setAccountError("");
            }}
            autoComplete="tel"
            error={
              showErrors && !isPhoneValid
                ? "Enter a valid Canada/US phone number."
                : ""
            }
          />

          <PasswordField
            label="Password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              setAccountError("");
            }}
            autoComplete="new-password"
            placeholder="Create a password"
            accent="purple"
            showRequirements
            error={
              showErrors && !isPasswordValid
                ? "Use at least 8 characters with a letter and number."
                : ""
            }
          />

          <PasswordField
            label="Confirm password"
            value={confirmPassword}
            onChange={(value) => {
              setConfirmPassword(value);
              setAccountError("");
            }}
            autoComplete="new-password"
            placeholder="Re-enter password"
            accent="purple"
            error={
              showErrors && !passwordsMatch
                ? "Passwords do not match."
                : ""
            }
          />

          {accountError && (
            <NoticeBox
              tone="error"
              message={accountError}
            />
          )}

          {success && (
            <NoticeBox
              tone="success"
              message={success}
            />
          )}

          <p className="text-xs leading-relaxed text-gray-500">
            By continuing, you agree to Carerity&apos;s Terms
            of Service and Privacy Policy.
          </p>

          <button
            type="button"
            onClick={handleContinue}
            disabled={isSubmitting}
            className={`w-full rounded-xl py-3 text-center font-semibold shadow-sm transition-all active:scale-[0.98] ${
              formValid && !isSubmitting
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : "border border-purple-300 bg-purple-100 text-purple-700"
            }`}
          >
            {isSubmitting
              ? "Creating account..."
              : formValid
                ? "Continue"
                : "Complete details to continue"}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-purple-700 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function ConfirmationPage({
  email,
  password,
  onPasswordChange,
  error,
  success,
  isChecking,
  isResending,
  onContinue,
  onResend,
}: {
  email: string;
  password: string;
  onPasswordChange: (value: string) => void;
  error: string;
  success: string;
  isChecking: boolean;
  isResending: boolean;
  onContinue: () => void;
  onResend: () => void;
}) {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="flex items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" aria-label="Carerity home">
          <img
            src="/carerityblacklogo2.png"
            alt="Carerity"
            className="h-16 w-auto object-contain sm:h-20"
          />
        </Link>
      </nav>

      <section className="mx-auto max-w-md px-4 py-8 sm:py-12">
        <div className="rounded-3xl border border-purple-200 bg-white p-6 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-2xl">
            ✉
          </div>

          <p className="mt-5 text-sm font-bold text-purple-700">
            Check Your Email
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Confirm your account
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            We sent a confirmation link to{" "}
            <strong>{email}</strong>. Open the link, then
            return here.
          </p>

          <div className="mt-6">
            <PasswordField
              label="Your password"
              value={password}
              onChange={onPasswordChange}
              autoComplete="current-password"
              placeholder="Enter the password you created"
              accent="purple"
              disabled={isChecking}
            />
          </div>

          {error && (
            <div className="mt-4">
              <NoticeBox tone="error" message={error} />
            </div>
          )}

          {success && (
            <div className="mt-4">
              <NoticeBox tone="success" message={success} />
            </div>
          )}

          <button
            type="button"
            onClick={onContinue}
            disabled={isChecking}
            className="mt-5 w-full rounded-xl bg-purple-600 py-3.5 font-semibold text-white transition hover:bg-purple-700 disabled:bg-purple-300"
          >
            {isChecking
              ? "Checking..."
              : "I’ve Confirmed My Email — Continue"}
          </button>

          <button
            type="button"
            onClick={onResend}
            disabled={isResending}
            className="mt-3 w-full rounded-xl border border-purple-300 bg-white py-3 font-semibold text-purple-700 transition hover:bg-purple-50 disabled:opacity-60"
          >
            {isResending
              ? "Sending..."
              : "Resend Confirmation Email"}
          </button>
        </div>
      </section>
    </main>
  );
}

function TextField({
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
  error,
}: {
  type: "text" | "email" | "tel";
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  error?: string;
}) {
  return (
    <div>
      <input
        type={type}
        inputMode={
          type === "email"
            ? "email"
            : type === "tel"
              ? "tel"
              : undefined
        }
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        autoCapitalize="none"
        className={`w-full rounded-xl border p-3 outline-none focus:ring-2 focus:ring-purple-200 ${
          error
            ? "border-red-500"
            : "border-purple-300"
        }`}
      />

      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function NoticeBox({
  tone,
  message,
}: {
  tone: "error" | "success";
  message: string;
}) {
  const classes =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div
      className={`rounded-xl border p-3 text-sm ${classes}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {message}
    </div>
  );
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizePhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (
    digits.length === 11 &&
    digits.startsWith("1")
  ) {
    return `+${digits}`;
  }

  return "";
}

function isEmailConfirmationError(error: unknown) {
  const normalized = normalizeUnknownError(error);
  const message = normalized.message.toLowerCase();
  const code = normalized.code.toLowerCase();

  return (
    message.includes("email not confirmed") ||
    message.includes("email_not_confirmed") ||
    code.includes("email_not_confirmed")
  );
}

function getSignupErrorMessage(error: unknown) {
  const normalized = normalizeUnknownError(error);

  const rawMessage = normalized.message.trim();
  const message = rawMessage.toLowerCase();
  const code = normalized.code.toLowerCase();

  if (
    message.includes("already registered") ||
    message.includes("already been registered") ||
    message.includes("user already") ||
    code.includes("user_already_exists")
  ) {
    return "An account with this email already exists. Sign in instead.";
  }

  if (
    message.includes("email not confirmed") ||
    message.includes("email_not_confirmed") ||
    code.includes("email_not_confirmed")
  ) {
    return "Confirm your email before continuing.";
  }

  if (
    message.includes("rate limit") ||
    message.includes("too many") ||
    code.includes("over_email_send_rate_limit")
  ) {
    return "Too many attempts. Please wait and try again.";
  }

  if (
    message.includes("invalid api key") ||
    message.includes("invalid api")
  ) {
    return "Customer account service is using an invalid Supabase API key.";
  }

  if (
    message.includes("database error saving new user") ||
    message.includes("error saving new user")
  ) {
    if (normalized.details) {
      return `Account creation reached Supabase, but the user profile could not be saved: ${normalized.details}`;
    }

    return "Account creation reached Supabase, but the user profile could not be saved. Check the Supabase signup trigger/profile insert.";
  }

  if (
    rawMessage &&
    rawMessage !== "{}" &&
    rawMessage !== "[object Object]"
  ) {
    return rawMessage;
  }

  if (normalized.details) {
    return normalized.details;
  }

  if (normalized.code) {
    return `Unable to create your account. Supabase error: ${normalized.code}.`;
  }

  return "Unable to create your account. Check the browser console for the Supabase signup error.";
}

function normalizeUnknownError(
  error: unknown
): {
  message: string;
  code: string;
  details: string;
  status: string;
} {
  if (error instanceof Error) {
    const errorRecord = error as Error & UnknownRecord;

    return {
      message: safeString(error.message),
      code: safeString(errorRecord.code),
      details: firstUsefulString(
        errorRecord.details,
        errorRecord.hint,
        errorRecord.error_description,
        errorRecord.description
      ),
      status: safeString(errorRecord.status),
    };
  }

  if (isRecord(error)) {
    return {
      message: firstUsefulString(
        error.message,
        error.error_description,
        error.description,
        error.error
      ),
      code: firstUsefulString(
        error.code,
        error.error_code
      ),
      details: firstUsefulString(
        error.details,
        error.hint,
        error.reason
      ),
      status: firstUsefulString(
        error.status,
        error.statusCode
      ),
    };
  }

  if (typeof error === "string") {
    return {
      message: error,
      code: "",
      details: "",
      status: "",
    };
  }

  return {
    message: "",
    code: "",
    details: "",
    status: "",
  };
}

function isRecord(
  value: unknown
): value is UnknownRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function firstUsefulString(
  ...values: unknown[]
) {
  for (const value of values) {
    const result = safeString(value);

    if (
      result &&
      result !== "{}" &&
      result !== "[object Object]"
    ) {
      return result;
    }
  }

  return "";
}

function safeString(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return "";
}

