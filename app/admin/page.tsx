"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { adminSupabase, checkCarerityAdminAccess } from "../../lib/supabaseClient";

const supabase = adminSupabase;

type ReviewQueueRow = {
  caregiver_id: string;
  user_id: string;
  caregiver_number: string | null;
  application_status: string | null;
  eligible_for_matching: boolean | null;
  approved_at: string | null;
  draft_application_status: string | null;
  current_section: string | null;
  application_updated_at: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  province: string | null;
  service_radius_km: string | null;
  submitted_at: string | null;
  document_count: number | null;
  verified_document_count: number | null;
  needs_review_document_count: number | null;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [adminRole, setAdminRole] = useState("");
  const [queue, setQueue] = useState<ReviewQueueRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        if (!active) return;
        if (userError || !currentUser) {
          router.replace("/admin/login");
          return;
        }
        const access = await checkCarerityAdminAccess(currentUser.id);
        if (!active) return;
        if (!access.authorized) {
          await supabase.auth.signOut({ scope: "local" });
          router.replace("/admin/login");
          return;
        }
        setUser(currentUser);
        setAdminRole(access.adminRole);
        const { data, error } = await supabase
          .from("admin_caregiver_review_queue")
          .select("*")
          .order("application_updated_at", { ascending: false });
        if (error) throw error;
        if (!active) return;
        setQueue((data || []) as ReviewQueueRow[]);
      } catch (error) {
        console.error("Unable to load admin dashboard:", error);
        if (active) setErrorMessage(getErrorMessage(error, "Unable to load the admin dashboard."));
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void loadDashboard();
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const stats = useMemo(() => ({
    submitted: queue.filter(item => item.application_status === "submitted").length,
    underReview: queue.filter(item => item.application_status === "under_review").length,
    needsAttention: queue.filter(item => item.application_status === "needs_attention").length,
    approved: queue.filter(item => item.application_status === "approved" || item.eligible_for_matching === true).length,
  }), [queue]);
  const recentApplications = useMemo(() => queue.slice(0, 5), [queue]);

  async function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      router.replace("/admin/login");
      router.refresh();
    } catch (error) {
      console.error("Unable to sign out:", error);
      setErrorMessage(getErrorMessage(error, "Unable to sign out. Please try again."));
      setIsSigningOut(false);
    }
  }

  if (isLoading) return <AdminLoadingScreen />;

  const displayName = getAdminDisplayName(user);
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "AD";

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="flex min-h-screen">
        <AdminSidebar onMobileMenuClose={() => setMobileMenuOpen(false)} />

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-gray-200 bg-gray-50/95 px-4 backdrop-blur sm:px-6 lg:px-8">
            <Link href="/admin" aria-label="Carerity Admin home" className="lg:hidden">
              <img src="/carerityblacklogo2.png" alt="Carerity" className="h-50 w-auto object-contain" />
            </Link>
            <div className="hidden lg:block">
              <p className="text-sm text-gray-500">Signed in as <strong className="text-gray-800">{displayName}</strong></p>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full bg-blue-50 px-3 py-2 text-xs font-bold capitalize text-blue-700 sm:inline-flex">
                {adminRole.replace(/_/g, " ") || "Admin"}
              </span>
              <div ref={profileMenuRef} className="relative hidden sm:block">
                <button type="button" onClick={() => setProfileMenuOpen(open => !open)} aria-haspopup="menu" aria-expanded={profileMenuOpen} className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-2.5 shadow-sm transition hover:border-blue-300">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">{initials}</span>
                  <span className="max-w-28 truncate text-sm font-semibold text-gray-800">{displayName}</span>
                  <span aria-hidden="true" className={`text-xs transition ${profileMenuOpen ? "rotate-180" : ""}`}>▾</span>
                </button>
                {profileMenuOpen && (
                  <div role="menu" className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                    <div className="border-b border-blue-100 bg-blue-50 p-4">
                      <p className="truncate text-sm font-bold text-gray-900">{displayName}</p>
                      <p className="mt-1 truncate text-xs text-gray-500">{user?.email || "Administrator"}</p>
                      <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-blue-700">Admin Workspace</p>
                    </div>
                    <div className="p-2">
                      <button type="button" role="menuitem" onClick={handleSignOut} disabled={isSigningOut} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60">
                        {isSigningOut ? "Signing out..." : "Sign Out"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Open admin menu" className="flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white shadow-sm lg:hidden">
                <span className="h-0.5 w-6 rounded-full bg-gray-800" />
                <span className="h-0.5 w-6 rounded-full bg-gray-800" />
                <span className="h-0.5 w-6 rounded-full bg-gray-800" />
              </button>
            </div>
          </header>

          <div className="px-4 py-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <div className="rounded-3xl bg-gradient-to-r from-blue-700 to-blue-600 p-6 text-white shadow-sm sm:p-8">
                <p className="text-sm font-semibold text-blue-100">Carerity Operations</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-blue-100">Review caregiver applications, verify documents and control caregiver eligibility for matching.</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/admin/matching-test" className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-50">Open Matching Test</Link>
                  <Link href="/admin/caregivers" className="rounded-xl border border-blue-300 bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500">Caregiver Review</Link>
                </div>
              </div>

              {errorMessage && <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{errorMessage}</div>}

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Submitted" value={stats.submitted} detail="Waiting for review" />
                <StatCard label="Under review" value={stats.underReview} detail="Currently being reviewed" />
                <StatCard label="Needs attention" value={stats.needsAttention} detail="Caregiver action required" />
                <StatCard label="Approved" value={stats.approved} detail="Eligible / approved" />
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_300px]">
                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Recent caregiver applications</h2>
                      <p className="mt-1 text-xs text-slate-500">Live data from the caregiver review queue.</p>
                    </div>
                    <Link href="/admin/caregivers" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700">View all</Link>
                  </div>
                  {recentApplications.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="font-bold text-slate-800">No caregiver applications yet</p>
                      <p className="mt-2 text-sm text-slate-500">Submitted applications will appear here.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {recentApplications.map(item => <ApplicationRow key={item.caregiver_id} item={item} />)}
                    </div>
                  )}
                </section>

                <section className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Vertical 1</p>
                  <h2 className="mt-2 text-lg font-bold text-slate-900">Caregiver eligibility</h2>
                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    <ProgressStep label="Application submitted" done={queue.length > 0} />
                    <ProgressStep label="Admin review queue" done />
                    <ProgressStep label="Document verification" done={queue.some(item => Number(item.verified_document_count || 0) > 0)} />
                    <ProgressStep label="Caregiver approval" done={stats.approved > 0} />
                    <ProgressStep label="Eligible for matching" done={queue.some(item => item.eligible_for_matching === true)} />
                  </div>
                </section>
              </div>
            </div>
          </div>
        </section>
      </div>
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
      )}
      {mobileMenuOpen && (
        <div className="fixed bottom-0 left-0 top-0 z-50 w-72 max-w-[85vw] overflow-y-auto bg-white shadow-xl lg:hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <Link href="/admin" onClick={() => setMobileMenuOpen(false)}><img src="/carerityblacklogo2.png" alt="Carerity" className="h-12 w-auto object-contain" /></Link>
            <button type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Close admin menu" className="rounded-lg px-3 py-2 text-xl text-gray-600">×</button>
          </div>
          <AdminNavigationLinks onNavigate={() => setMobileMenuOpen(false)} />
          <div className="border-t border-gray-100 p-4">
            <p className="mb-3 truncate text-xs text-gray-500">{user?.email}</p>
            <button type="button" onClick={handleSignOut} disabled={isSigningOut} className="w-full rounded-xl border border-red-200 px-4 py-3 text-left text-sm font-semibold text-red-600 disabled:opacity-60">{isSigningOut ? "Signing out..." : "Sign Out"}</button>
          </div>
        </div>
      )}
    </main>
  );
}

function AdminSidebar({ onMobileMenuClose }: { onMobileMenuClose: () => void }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white lg:flex">
      <Link href="/admin" aria-label="Carerity Admin home" className="flex h-20 items-center border-b border-gray-100 px-5">
        <img src="/carerityblacklogo2.png" alt="Carerity" className="h-14 w-auto max-w-full object-contain" />
      </Link>
      <AdminNavigationLinks onNavigate={onMobileMenuClose} />
      <div className="mt-auto p-4">
        <div className="rounded-2xl bg-blue-50 p-4">
          <p className="text-xs font-bold text-blue-800">Admin workspace</p>
          <p className="mt-1 text-xs leading-relaxed text-blue-700">Administrative actions are protected by Supabase RLS and the Carerity admin authorization table.</p>
        </div>
      </div>
    </aside>
  );
}

function AdminNavigationLinks({ onNavigate }: { onNavigate: () => void }) {
  return (
    <nav aria-label="Admin navigation" className="space-y-1 p-4">
      <p className="px-4 pb-2 pt-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Admin Workspace</p>
      <SidebarLink href="/admin" label="Dashboard" icon="▦" active onClick={onNavigate} />
      <SidebarLink href="/admin/caregivers" label="Caregiver review" icon="♙" onClick={onNavigate} />
      <SidebarLink href="/admin/caregivers" label="Verification queue" icon="✓" onClick={onNavigate} />
      <p className="px-4 pb-2 pt-5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Operations</p>
      <SidebarLink href="/admin/matching-test" label="Matching test" icon="◎" onClick={onNavigate} />
    </nav>
  );
}

function SidebarLink({ href, label, icon, active = false, onClick }: { href: string; label: string; icon: string; active?: boolean; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${active ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"}`}>
      <span aria-hidden="true" className="w-5 text-center text-lg">{icon}</span>{label}
    </Link>
  );
}

function StatCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function ApplicationRow({ item }: { item: ReviewQueueRow }) {
  const name = [item.first_name, item.last_name].filter(Boolean).join(" ") || "Caregiver applicant";
  return (
    <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold text-slate-900">{name}</p>
          <ApplicationStatusPill status={item.application_status} />
        </div>
        <p className="mt-1 text-xs text-slate-500">{item.caregiver_number || "Caregiver"} · {item.city || "Location not added"}{item.province ? `, ${item.province}` : ""}</p>
        <p className="mt-1 text-xs text-slate-500">{Number(item.verified_document_count || 0)} of {Number(item.document_count || 0)} documents verified</p>
      </div>
      <Link href="/admin/caregivers" className="shrink-0 text-sm font-bold text-blue-700 hover:underline">Review</Link>
    </div>
  );
}

function ApplicationStatusPill({ status }: { status: string | null }) {
  const normalized = status || "submitted";
  const classes = normalized === "approved" ? "bg-emerald-100 text-emerald-700" : normalized === "needs_attention" ? "bg-amber-100 text-amber-800" : normalized === "declined" ? "bg-red-100 text-red-700" : normalized === "under_review" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700";
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${classes}`}>{normalized.replace(/_/g, " ")}</span>;
}

function ProgressStep({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-blue-600 text-white" : "border border-blue-200 bg-white text-blue-400"}`}>{done ? "✓" : "•"}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

function AdminLoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
        <p className="mt-4 text-sm font-semibold text-gray-500">Loading Carerity Admin...</p>
      </div>
    </main>
  );
}

function getAdminDisplayName(user: User | null) {
  if (!user) return "Administrator";
  const metadata = user.user_metadata || {};
  const name = metadata.first_name || metadata.firstName || metadata.given_name || metadata.full_name || metadata.name;
  if (typeof name === "string" && name.trim()) return name.trim().split(/\s+/)[0];
  return user.email?.split("@")[0]?.split(/[._-]/)[0] || "Administrator";
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}
