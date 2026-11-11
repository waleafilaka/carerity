"use client";
import { ReactNode, useEffect, useRef, useState, } from "react";
import Link from "next/link";
import { useRouter, } from "next/navigation";
import type { User, } from "@supabase/supabase-js";
import CustomerDashboardNavigation from "./CustomerDashboardNavigation";
import CaregiverNavigation from "./CaregiverNavigation";
import { caregiverSupabase, customerSupabase, resolveCarerityUserRole, } from "../lib/supabaseClient";
type DashboardRole = "customer" | "caregiver";
type DashboardLayoutProps = {
    children: ReactNode;
    activeItem: string;
    role?: DashboardRole;
    messageCount?: number;
    notificationCount?: number;
};
const CAREGIVER_EMAIL_KEY = "carerityRememberedCaregiverEmail";
const CUSTOMER_EMAIL_KEY = "carerityRememberedCustomerEmail";
export default function DashboardLayout({ children, activeItem, role = "customer", messageCount = 0, notificationCount = 0, }: DashboardLayoutProps) { const router = useRouter();
 const profileMenuRef = useRef<HTMLDivElement | null>(null);
 const [mobileMenuOpen, setMobileMenuOpen,] = useState(false);
 const [profileMenuOpen, setProfileMenuOpen,] = useState(false);
 const [user, setUser,] = useState<User | null>(null);
 const [isAuthLoading, setIsAuthLoading,] = useState(true);
 const [authorized, setAuthorized,] = useState(false);
 const [isSigningOut, setIsSigningOut,] = useState(false);
 const isCaregiver = role === "caregiver";
 /*    * ==========================================================    * WORKSPACE-SPECIFIC AUTH CLIENT    * ==========================================================    */ /*    * ==========================================================    * WORKSPACE-SPECIFIC AUTH CLIENT    * ==========================================================    */ const supabase = isCaregiver ? caregiverSupabase : customerSupabase;
 const loginHref = isCaregiver ? "/caregiver/login" : "/login";
 const messagesHref = isCaregiver ? "/caregiver/messages" : "/dashboard/messages";
 const accountHref = isCaregiver ? "/caregiver/profile" : "/dashboard/account";
 const firstName = getUserFirstName(user);
 const fullName = getUserFullName(user);
 const initials = getUserInitials(user);
 const accent = isCaregiver ? { border: "hover:border-emerald-300", badge: "bg-emerald-600", panel: "bg-emerald-50", text: "text-emerald-700", } : { border: "hover:border-purple-300", badge: "bg-purple-600", panel: "bg-purple-50", text: "text-purple-700", };
 /*    * ============================================================    * AUTHORIZATION    * ============================================================    */ /*    * ============================================================    * AUTHORIZATION    * ============================================================    */ useEffect(() => { let mounted = true;
 let validationSequence = 0;
 function finishSignedOutState() { if (!mounted) {
    return;
} setUser(null);
 setAuthorized(false);
 setIsAuthLoading(false);
 } function beginAuthorizationCheck() { if (!mounted) {
    return;
} setAuthorized(false);
 setIsAuthLoading(true);
 } async function clearWrongWorkspaceSession() { try {
    await supabase.auth.signOut({ scope: "local" });
}
catch (error) {
    console.error("Unable to clear incorrect workspace session:", error);
} if (!mounted) {
    return;
} finishSignedOutState();
 window.location.replace(loginHref);
 } async function applyAuthenticatedUser(authenticatedUser: User) { const sequence = ++validationSequence;
 beginAuthorizationCheck();
 const actualRole = await resolveCarerityUserRole(authenticatedUser, supabase);
 if (!mounted || sequence !== validationSequence) {
    return;
} /*        * ========================================================        * CAREGIVER WORKSPACE        * ========================================================        */ /*        * ========================================================        * CAREGIVER WORKSPACE        * ========================================================        */ if (role === "caregiver") {
    if (actualRole === "caregiver") {
        setUser(authenticatedUser);
        setAuthorized(true);
        setIsAuthLoading(false);
        return;
    }
    setUser(authenticatedUser);
    setAuthorized(false);
    setIsAuthLoading(false);
    if (actualRole === "") {
        await supabase.auth.signOut({ scope: "local", });
        router.replace("/caregiver/login");
        return;
    }
    await clearWrongWorkspaceSession();
    return;
} /*        * ========================================================        * CUSTOMER WORKSPACE        * ========================================================        */ /*        * ========================================================        * CUSTOMER WORKSPACE        * ========================================================        */ if (role === "customer") {
    if (actualRole === "customer") {
        setUser(authenticatedUser);
        setAuthorized(true);
        setIsAuthLoading(false);
        return;
    }
    setUser(authenticatedUser);
    setAuthorized(false);
    setIsAuthLoading(false);
    if (actualRole === "") {
        await supabase.auth.signOut({ scope: "local", });
        router.replace("/login");
        return;
    }
    await clearWrongWorkspaceSession();
} } async function validateAccess() { try {
    const { data: { session, }, error, } = await supabase.auth.getSession();
    if (!mounted) {
        return;
    }
    if (error) {
        console.error("Unable to read dashboard session:", error);
        finishSignedOutState();
        window.location.replace(loginHref);
        return;
    }
    const authenticatedUser = session?.user || null;
    if (!authenticatedUser) {
        finishSignedOutState();
        window.location.replace(loginHref);
        return;
    }
    await applyAuthenticatedUser(authenticatedUser);
}
catch (error) {
    console.error("Dashboard authentication check failed:", error);
    if (!mounted) {
        return;
    }
    finishSignedOutState();
    window.location.replace(loginHref);
} } validateAccess();
 const { data: { subscription, }, } = supabase.auth.onAuthStateChange((event, session) => { if (!mounted) {
    return;
} if (event === "SIGNED_OUT" || !session?.user) {
    finishSignedOutState();
    return;
} void applyAuthenticatedUser(session.user);
 });
 return () => { mounted = false;
 validationSequence += 1;
 subscription.unsubscribe();
 };
 }, [loginHref, role, router, supabase,]);
 /*    * ============================================================    * PROFILE MENU    * ============================================================    */ /*    * ============================================================    * PROFILE MENU    * ============================================================    */ useEffect(() => { function handleOutsideClick(event: MouseEvent) { if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
    setProfileMenuOpen(false);
} } function handleEscape(event: KeyboardEvent) { if (event.key === "Escape") {
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);
} } document.addEventListener("mousedown", handleOutsideClick);
 document.addEventListener("keydown", handleEscape);
 return () => { document.removeEventListener("mousedown", handleOutsideClick);
 document.removeEventListener("keydown", handleEscape);
 };
 }, []);
 /*    * ============================================================    * SIGN OUT    * ============================================================    */ /*    * ============================================================    * SIGN OUT    * ============================================================    */ async function handleSignOut() { if (isSigningOut) {
    return;
} setIsSigningOut(true);
 setProfileMenuOpen(false);
 setMobileMenuOpen(false);
 try {
    if (user?.email && typeof window !== "undefined") {
        const storageKey = isCaregiver ? CAREGIVER_EMAIL_KEY : CUSTOMER_EMAIL_KEY;
        window.localStorage.setItem(storageKey, user.email.trim().toLowerCase());
    }
}
catch (error) {
    console.warn("Unable to remember sign-in email:", error);
} try {
    const { error, } = await supabase.auth.signOut({ scope: "local", });
    if (error) {
        throw error;
    }
    setUser(null);
    setAuthorized(false);
    window.location.assign(loginHref);
}
catch (error) {
    console.error("Unable to sign out:", error);
    setIsSigningOut(false);
    window.alert("We couldn't sign you out. Please try again.");
} } /*    * ============================================================    * AUTH LOADING    * ============================================================    */ /*    * ============================================================    * AUTH LOADING    * ============================================================    */ if (isAuthLoading) {
    return (<FullPageAuthLoader caregiver={isCaregiver} message="Checking your account..."/>);
} if (!authorized || !user) {
    return (<FullPageAuthLoader caregiver={isCaregiver} message="Taking you to the correct workspace..."/>);
} /*    * ============================================================    * DASHBOARD    * ============================================================    */ /*    * ============================================================    * DASHBOARD    * ============================================================    */ return (<main className="min-h-screen bg-gray-50 text-gray-900">       <div className="flex min-h-screen">         {isCaregiver ? (<CaregiverNavigation activeItem={activeItem} mobileMenuOpen={mobileMenuOpen} onMobileMenuClose={() => setMobileMenuOpen(false)}/>) : (<CustomerDashboardNavigation activeItem={activeItem} mobileMenuOpen={mobileMenuOpen} onMobileMenuClose={() => setMobileMenuOpen(false)}/>)}          <section className="min-w-0 flex-1">           <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-gray-200 bg-gray-50/95 px-4 backdrop-blur sm:px-6 lg:px-8">             <Link href="/" aria-label="Go to Carerity home" className="touch-manipulation lg:hidden">               <img src="/carerityblacklogo2.png" alt="Carerity" className="h-14 w-auto object-contain"/>             </Link>              <div className="hidden lg:block">               <p className="text-sm text-gray-500">                 Signed in as{" "}                 <strong className="text-gray-800">                   {firstName || "Carerity user"}                 </strong>               </p>             </div>              <div className="flex items-center gap-2">               <HeaderIcon label="Notifications" icon="🔔" count={notificationCount} accentClass={accent.badge} hoverClass={accent.border}/>                <Link href={messagesHref} aria-label="Messages" className={`relative flex h-11 w-11 touch-manipulation items-center justify-center rounded-xl border border-gray-200 bg-white text-lg shadow-sm transition ${accent.border}`}>                 💬                  {messageCount > 0 && (<CountBadge count={messageCount} className={accent.badge}/>)}               </Link>                <div ref={profileMenuRef} className="relative hidden sm:block">                 <button type="button" onClick={() => setProfileMenuOpen((current) => !current)} aria-haspopup="menu" aria-expanded={profileMenuOpen} className={`flex h-11 touch-manipulation items-center gap-2 rounded-xl border border-gray-200 bg-white px-2.5 shadow-sm transition ${accent.border}`}>                   <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white ${accent.badge}`}>                     {initials}                   </span>                    <span className="max-w-28 truncate text-sm font-semibold text-gray-800">                     {firstName || "Account"}                   </span>                    <span aria-hidden="true" className={`text-xs transition ${profileMenuOpen ? "rotate-180" : ""}`}>                     ▾                   </span>                 </button>                  {profileMenuOpen && (<div role="menu" className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">                     <div className={`border-b border-gray-100 p-4 ${accent.panel}`}>                       <p className="truncate text-sm font-bold text-gray-900">                         {fullName || firstName || "Carerity User"}                       </p>                        <p className="mt-1 truncate text-xs text-gray-500">                         {user.email}                       </p>                        <p className={`mt-2 text-[11px] font-bold uppercase tracking-wider ${accent.text}`}>                         {isCaregiver ? "Caregiver Workspace" : "Family Care Portal"}                       </p>                     </div>                      <div className="p-2">                       <Link href={accountHref} role="menuitem" onClick={() => setProfileMenuOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">                         Account                         &amp;                         Profile                       </Link>                        <div className="my-2 border-t border-gray-100"/>                        <button type="button" role="menuitem" onClick={handleSignOut} disabled={isSigningOut} className="block w-full touch-manipulation rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60">                         {isSigningOut ? "Signing out..." : "Sign Out"}                       </button>                     </div>                   </div>)}               </div>                <button type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Open dashboard menu" className="flex h-11 w-11 touch-manipulation flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white shadow-sm transition active:scale-[0.97] lg:hidden">                 <span className="h-0.5 w-6 rounded-full bg-gray-800"/>                  <span className="h-0.5 w-6 rounded-full bg-gray-800"/>                  <span className="h-0.5 w-6 rounded-full bg-gray-800"/>               </button>             </div>           </header>            <div className="px-4 py-5 sm:px-6 lg:px-8">             {children}           </div>         </section>       </div>     </main>); } /*  * ============================================================  * LOADER  * ============================================================  */
function FullPageAuthLoader({ caregiver, message, }: {
    caregiver: boolean;
    message: string;
}) { return (<main className="flex min-h-screen items-center justify-center bg-gray-50">       <div className="text-center">         <div className={`mx-auto h-11 w-11 animate-spin rounded-full border-4 ${caregiver ? "border-emerald-100 border-t-emerald-600" : "border-purple-100 border-t-purple-600"}`}/>          <p className="mt-4 text-sm font-semibold text-gray-500">           {message}         </p>       </div>     </main>); }
function HeaderIcon({ label, icon, count, accentClass, hoverClass, }: {
    label: string;
    icon: string;
    count: number;
    accentClass: string;
    hoverClass: string;
}) { return (<button type="button" aria-label={label} className={`relative flex h-11 w-11 touch-manipulation items-center justify-center rounded-xl border border-gray-200 bg-white text-lg shadow-sm transition ${hoverClass}`}>       {icon}        {count > 0 && (<CountBadge count={count} className={accentClass}/>)}     </button>); }
function CountBadge({ count, className, }: {
    count: number;
    className: string;
}) { return (<span className={`absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${className}`}>       {count > 99 ? "99+" : count}     </span>); } /*  * ============================================================  * USER DISPLAY HELPERS  * ============================================================  */
function getUserFirstName(user: User | null) { if (!user) {
    return "";
} const metadata = user.user_metadata || {}; const firstName = metadata.first_name || metadata.firstName || metadata.given_name || (typeof metadata.name === "string" ? metadata.name.split(" ")[0] : ""); if (typeof firstName === "string" && firstName.trim()) {
    return formatName(firstName);
} const emailName = user.email?.split("@")[0]?.split(/[._-]/)[0] || ""; return formatName(emailName); }
function getUserFullName(user: User | null) { if (!user) {
    return "";
} const metadata = user.user_metadata || {}; const firstName = metadata.first_name || metadata.firstName || metadata.given_name || ""; const lastName = metadata.last_name || metadata.lastName || metadata.family_name || ""; const combined = [firstName, lastName,].filter((value) => typeof value === "string" && value.trim()).map((value) => formatName(String(value))).join(" "); if (combined) {
    return combined;
} if (typeof metadata.full_name === "string") {
    return (metadata.full_name.trim());
} if (typeof metadata.name === "string") {
    return (metadata.name.trim());
} return ""; }
function getUserInitials(user: User | null) { const fullName = getUserFullName(user); if (fullName) {
    const names = fullName.split(/\s+/).filter(Boolean);
    if (names.length === 1) {
        return names[0].slice(0, 2).toUpperCase();
    }
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
} const firstName = getUserFirstName(user); return firstName ? firstName.slice(0, 2).toUpperCase() : "CA"; }
function formatName(value: string) { const trimmed = value.trim(); if (!trimmed) {
    return "";
} return (trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()); }
