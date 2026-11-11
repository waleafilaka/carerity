"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import PasswordField from "../../components/ui/PasswordField";
import {
  getAuthErrorMessage,
  supabase,
} from "../../lib/supabaseClient";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const role =
    searchParams.get("role") ===
    "caregiver"
      ? "caregiver"
      : "customer";

  const caregiver =
    role === "caregiver";

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [error, setError] =
    useState("");

  const [checking, setChecking] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    validRecoverySession,
    setValidRecoverySession,
  ] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const session =
          await waitForRecoverySession();

        if (!mounted) return;

        setValidRecoverySession(
          Boolean(session)
        );
      } catch (error) {
        console.error(
          "Unable to establish password recovery session:",
          error
        );

        if (mounted) {
          setValidRecoverySession(
            false
          );
        }
      } finally {
        if (mounted) {
          setChecking(false);
        }
      }
    }

    checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  const passwordValid =
    password.length >= 8 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password);

  const passwordsMatch =
    password !== "" &&
    password ===
      confirmPassword;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!passwordValid) {
      setError(
        "Use at least 8 characters with a letter and number."
      );
      return;
    }

    if (!passwordsMatch) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    setSaving(true);

    try {
      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) {
        throw error;
      }

      router.replace(
        caregiver
          ? "/caregiver/login"
          : "/login"
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Password update failed:",
        error
      );

      setError(
        getAuthErrorMessage(
          error,
          "Unable to update your password."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div
          className={`h-10 w-10 animate-spin rounded-full border-4 ${
            caregiver
              ? "border-emerald-100 border-t-emerald-600"
              : "border-purple-100 border-t-purple-600"
          }`}
        />
      </main>
    );
  }

  if (!validRecoverySession) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-md rounded-3xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl font-bold text-red-700">
            !
          </div>

          <h1 className="mt-4 text-2xl font-bold">
            Reset link unavailable
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            This reset link may have expired or already been used.
          </p>

          <Link
            href={`/forgot-password?role=${role}`}
            className={`mt-5 block min-h-[52px] rounded-xl py-3.5 font-semibold text-white ${
              caregiver
                ? "bg-emerald-600"
                : "bg-purple-600"
            }`}
          >
            Request Another Link
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="px-4 py-3 sm:px-6">
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
      </nav>

      <section className="mx-auto max-w-md px-4 py-8">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
        >
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
            Create a new password
          </h1>

          <div className="mt-6 space-y-4">
            <PasswordField
              label="New password"
              value={password}
              onChange={(value) => {
                setPassword(value);
                setError("");
              }}
              autoComplete="new-password"
              accent={
                caregiver
                  ? "emerald"
                  : "purple"
              }
              showRequirements
            />

            <PasswordField
              label="Confirm new password"
              value={confirmPassword}
              onChange={(value) => {
                setConfirmPassword(
                  value
                );
                setError("");
              }}
              autoComplete="new-password"
              accent={
                caregiver
                  ? "emerald"
                  : "purple"
              }
              error={
                confirmPassword &&
                !passwordsMatch
                  ? "Passwords do not match."
                  : ""
              }
            />

            {error && (
              <div
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                role="alert"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className={`min-h-[52px] w-full touch-manipulation rounded-xl py-3.5 font-semibold text-white disabled:opacity-60 ${
                caregiver
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              {saving
                ? "Updating..."
                : "Update Password"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

async function waitForRecoverySession() {
  const immediate =
    await supabase.auth.getSession();

  if (
    immediate.data.session
  ) {
    return immediate.data.session;
  }

  return new Promise<
    Awaited<
      ReturnType<
        typeof supabase.auth.getSession
      >
    >["data"]["session"]
  >((resolve) => {
    let finished = false;

    const finish = (
      session:
        | Awaited<
            ReturnType<
              typeof supabase.auth.getSession
            >
          >["data"]["session"]
        | null
    ) => {
      if (finished) return;

      finished = true;

      window.clearTimeout(
        timeout
      );

      subscription.unsubscribe();

      resolve(session);
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
          if (session) {
            finish(session);
          }
        }
      );

    const timeout =
      window.setTimeout(
        async () => {
          const {
            data,
          } =
            await supabase.auth.getSession();

          finish(
            data.session
          );
        },
        5000
      );
  });
}
