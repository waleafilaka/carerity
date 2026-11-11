"use client";

import {
  FormEvent,
  useState,
} from "react";
import Link from "next/link";
import {
  useSearchParams,
} from "next/navigation";

import {
  getAuthErrorMessage,
  getPasswordResetUrl,
  supabase,
} from "../../lib/supabaseClient";

export default function ForgotPasswordPage() {
  const searchParams =
    useSearchParams();

  const requestedRole =
    searchParams.get("role");

  const role =
    requestedRole === "caregiver"
      ? "caregiver"
      : "customer";

  const caregiver =
    role === "caregiver";

  const [email, setEmail] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [sending, setSending] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanEmail =
      email.trim().toLowerCase();

    setError("");
    setSuccess("");

    if (!isValidEmail(cleanEmail)) {
      setError(
        "Enter a valid email address."
      );
      return;
    }

    setSending(true);

    try {
      const redirectTo =
        getPasswordResetUrl(role);

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo:
              redirectTo || undefined,
          }
        );

      if (error) {
        throw error;
      }

      setSuccess(
        `If an account exists for ${cleanEmail}, a password reset email has been sent.`
      );
    } catch (error) {
      console.error(
        "Password reset request failed:",
        error
      );

      setError(
        getAuthErrorMessage(
          error,
          "Unable to send the password reset email."
        )
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="flex items-center justify-between px-4 py-3 sm:px-6">
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
          href={
            caregiver
              ? "/caregiver/login"
              : "/login"
          }
          className={`rounded-full border px-4 py-2.5 text-sm font-semibold ${
            caregiver
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-purple-300 bg-purple-50 text-purple-700"
          }`}
        >
          Back to Sign In
        </Link>
      </nav>

      <section className="mx-auto max-w-md px-4 py-8 sm:py-12">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p
            className={`text-sm font-bold ${
              caregiver
                ? "text-emerald-700"
                : "text-purple-700"
            }`}
          >
            Password Recovery
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Reset your password
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            Enter the email address connected to your Carerity account.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-4"
          >
            <label className="block">
              <span className="text-sm font-bold">
                Email
              </span>

              <input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(
                    event.target.value
                  );
                  setError("");
                  setSuccess("");
                }}
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                required
                className={`mt-2 min-h-[52px] w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:ring-2 ${
                  caregiver
                    ? "focus:border-emerald-400 focus:ring-emerald-100"
                    : "focus:border-purple-400 focus:ring-purple-100"
                }`}
              />
            </label>

            {error && (
              <NoticeBox
                tone="error"
                message={error}
              />
            )}

            {success && (
              <NoticeBox
                tone="success"
                message={success}
              />
            )}

            <button
              type="submit"
              disabled={sending}
              className={`min-h-[52px] w-full touch-manipulation rounded-xl py-3.5 font-semibold text-white disabled:opacity-60 ${
                caregiver
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              {sending
                ? "Sending..."
                : "Send Reset Link"}
            </button>
          </form>
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
    | "error"
    | "success";
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
        tone === "error"
          ? "alert"
          : "status"
      }
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
