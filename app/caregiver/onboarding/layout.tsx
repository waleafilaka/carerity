"use client";

import {
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import type {
  User,
} from "@supabase/supabase-js";

import {
  signOutCarerity,
} from "../../../lib/caregiverOnboardingPersistence";

import {
  getUserRole,
  supabase,
} from "../../../lib/supabaseClient";

type CaregiverOnboardingLayoutProps = {
  children: ReactNode;
};

export default function CaregiverOnboardingLayout({
  children,
}: CaregiverOnboardingLayoutProps) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const [
    user,
    setUser,
  ] =
    useState<User | null>(
      null
    );

  const [
    authLoading,
    setAuthLoading,
  ] =
    useState(true);

  const [
    isSigningOut,
    setIsSigningOut,
  ] =
    useState(false);

  useEffect(() => {
    let mounted =
      true;

    async function loadSession() {
      try {
        const {
          data: {
            session,
          },
        } =
          await supabase.auth.getSession();

        if (
          !mounted
        ) {
          return;
        }

        setUser(
          session?.user ||
            null
        );
      } finally {
        if (
          mounted
        ) {
          setAuthLoading(
            false
          );
        }
      }
    }

    loadSession();

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
            !mounted
          ) {
            return;
          }

          setUser(
            session?.user ||
              null
          );

          setAuthLoading(
            false
          );
        }
      );

    return () => {
      mounted =
        false;

      subscription.unsubscribe();
    };
  }, []);

  const stepLabel =
    useMemo(
      () =>
        getStepLabel(
          pathname
        ),
      [
        pathname,
      ]
    );

  const dashboardHref =
    useMemo(() => {
      if (!user) {
        return "/caregiver/login";
      }

      const role =
        getUserRole(
          user
        );

      return role ===
        "caregiver"
        ? "/caregiver/dashboard"
        : "/dashboard";
    }, [
      user,
    ]);

  async function handleSignOut() {
    if (
      isSigningOut
    ) {
      return;
    }

    setIsSigningOut(
      true
    );

    const result =
      await signOutCarerity(
        "caregiver",
        user?.email ||
          undefined
      );

    router.replace(
      result.redirectTo
    );

    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="flex min-h-[92px] w-full items-center justify-between gap-4 px-4 sm:px-7 lg:px-10 xl:px-14">
          <Link
            href="/caregiver/onboarding"
            aria-label="Carerity caregiver application"
            className="shrink-0"
          >
            <img
              src="/carerityblacklogo2.png"
              alt="Carerity"
              className="h-16 w-auto object-contain sm:h-20"
            />
          </Link>

          <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
            <span className="hidden rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 sm:inline">
              {stepLabel}
            </span>

            {!authLoading && (
              <>
                <Link
                  href={
                    dashboardHref
                  }
                  className="rounded-full border border-gray-300 bg-white px-3 py-2.5 text-xs font-semibold text-gray-800 transition hover:border-emerald-300 hover:bg-emerald-50 sm:px-4 sm:text-sm"
                >
                  Dashboard
                </Link>

                {user ? (
                  <button
                    type="button"
                    onClick={
                      handleSignOut
                    }
                    disabled={
                      isSigningOut
                    }
                    className="rounded-full border border-red-200 bg-white px-3 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:text-sm"
                  >
                    {isSigningOut
                      ? "Signing out..."
                      : "Sign Out"}
                  </button>
                ) : (
                  <Link
                    href="/caregiver/login"
                    className="rounded-full border border-emerald-300 bg-white px-3 py-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 sm:px-4 sm:text-sm"
                  >
                    Sign In
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/*
       * Your current onboarding pages already contain
       * their own <main><nav>...</nav>...
       *
       * We hide ONLY that old page-level nav.
       * The page forms and Back links remain untouched.
       */}
      <div className="[&>main>nav]:hidden [&>main]:min-h-0">
        {children}
      </div>
    </div>
  );
}

function getStepLabel(
  pathname: string
) {
  if (
    pathname.endsWith(
      "/profile"
    )
  ) {
    return "1 of 7";
  }

  if (
    pathname.endsWith(
      "/experience"
    )
  ) {
    return "2 of 7";
  }

  if (
    pathname.endsWith(
      "/preferences"
    )
  ) {
    return "3 of 7";
  }

  if (
    pathname.endsWith(
      "/availability"
    )
  ) {
    return "4 of 7";
  }

  if (
    pathname.endsWith(
      "/credentials"
    )
  ) {
    return "5 of 7";
  }

  if (
    pathname.endsWith(
      "/professional"
    )
  ) {
    return "6 of 7";
  }

  if (
    pathname.endsWith(
      "/background-check"
    )
  ) {
    return "7 of 7";
  }

  if (
    pathname.endsWith(
      "/review"
    )
  ) {
    return "Review";
  }

  if (
    pathname.endsWith(
      "/submitted"
    )
  ) {
    return "Submitted";
  }

  return "Application Progress";
}
