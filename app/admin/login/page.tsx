"use client";
import { FormEvent, useEffect, useState, } from "react";
import Link from "next/link";
import { useRouter, } from "next/navigation";
import { adminSupabase, checkCarerityAdminAccess, getAuthErrorMessage, } from "../../../lib/supabaseClient";
 /*  * ============================================================  * ADMIN SUPABASE  * ============================================================  *  * IMPORTANT:  *  * The Admin workspace has its own browser Supabase session.  *  * It must NEVER use the generic `supabase` export because  * generic `supabase` intentionally points to customerSupabase.  *  * Customer:  * customerSupabase  *  * Caregiver:  * caregiverSupabase  *  * Admin:  * adminSupabase  * ============================================================  */
const supabase = adminSupabase;
export default function AdminLoginPage() { const router = useRouter();
 const [email, setEmail,] = useState("");
 const [password, setPassword,] = useState("");
 const [errorMessage, setErrorMessage,] = useState("");
 const [isSigningIn, setIsSigningIn,] = useState(false);
 const [isCheckingSession, setIsCheckingSession,] = useState(true);
 /*    * ============================================================    * EXISTING ADMIN SESSION    * ============================================================    *    * Only inspect the ADMIN namespace.    *    * A customer or caregiver session must have absolutely no    * effect on this page.    * ============================================================    */ /*    * ============================================================    * EXISTING ADMIN SESSION    * ============================================================    *    * Only inspect the ADMIN namespace.    *    * A customer or caregiver session must have absolutely no    * effect on this page.    * ============================================================    */ useEffect(() => { let active = true;
 async function checkSession() { try {
    const { data: { session, }, error: sessionError, } = await supabase.auth.getSession();
    if (!active) {
        return;
    }
    if (sessionError) {
        console.error("Unable to check administrator session:", sessionError);
        setIsCheckingSession(false);
        return;
    } /*          * No ADMIN session.          *          * This is normal even if Customer or Caregiver          * is currently signed in in another workspace.          */
    if (!session?.user) {
        setIsCheckingSession(false);
        return;
    } /*          * Verify the admin user using the SAME client that owns          * this admin session.          */
    const adminAccess = await checkCarerityAdminAccess(session.user.id, adminSupabase);
    if (!active) {
        return;
    }
    if (adminAccess.authorized) {
        window.location.replace("/admin");
        return;
    } /*          * There is an Admin-namespace Supabase session,          * but it is not authorized in admin_users.          *          * Clear ONLY the ADMIN session.          */
    const { error: signOutError, } = await supabase.auth.signOut({ scope: "local", });
    if (signOutError) {
        console.error("Unable to clear unauthorized administrator session:", signOutError);
    }
    if (active) {
        setErrorMessage(adminAccess.error || "This account is not authorized for the Carerity admin workspace.");
        setIsCheckingSession(false);
    }
}
catch (error) {
    console.error("Unable to check administrator session:", error);
    if (active) {
        setErrorMessage(getAdminLoginMessage(error));
        setIsCheckingSession(false);
    }
} } void checkSession();
 return () => { active = false;
 };
 }, []);
 /*    * ============================================================    * ADMIN SIGN IN    * ============================================================    */ /*    * ============================================================    * ADMIN SIGN IN    * ============================================================    */ async function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault();
 if (isSigningIn) {
    return;
} setErrorMessage("");
 const cleanEmail = email.trim().toLowerCase();
 if (!cleanEmail || !password) {
    setErrorMessage("Enter your admin email and password.");
    return;
} setIsSigningIn(true);
 try { /*        * ========================================================        * CLEAR ONLY OLD ADMIN SESSION        * ========================================================        *        * Never sign out customerSupabase.        * Never sign out caregiverSupabase.        */
    const { data: { session: existingSession, }, error: existingSessionError, } = await supabase.auth.getSession();
    if (existingSessionError) {
        console.error("Unable to inspect existing administrator session:", existingSessionError);
    }
    if (existingSession) {
        const { error: signOutError, } = await supabase.auth.signOut({ scope: "local", });
        if (signOutError) {
            throw signOutError;
        }
    } /*        * ========================================================        * SIGN IN USING ADMIN CLIENT        * ========================================================        */
    const { data, error, } = await supabase.auth.signInWithPassword({ email: cleanEmail, password, });
    if (error) {
        throw error;
    }
    if (!data.user || !data.session) {
        throw new Error("Unable to start the administrator session.");
    } /*        * ========================================================        * VERIFY SESSION        * ========================================================        *        * getUser() verifies the newly-created ADMIN session        * against Supabase.        */
    const { data: { user: verifiedUser, }, error: userError, } = await supabase.auth.getUser();
    if (userError || !verifiedUser) {
        throw (userError || new Error("Unable to verify the administrator session."));
    } /*        * ========================================================        * AUTHORIZE ADMIN        * ========================================================        *        * CRITICAL:        *        * adminSupabase performs this query while holding the        * same authenticated admin session.        *        * That means RLS can evaluate auth.uid() correctly.        */
    const adminAccess = await checkCarerityAdminAccess(verifiedUser.id, adminSupabase);
    if (!adminAccess.authorized) { /*          * Invalid Admin workspace account.          *          * Clear ONLY the ADMIN namespace.          */
        await supabase.auth.signOut({ scope: "local", });
        setErrorMessage(adminAccess.error || "This account is not authorized for the Carerity admin workspace.");
        return;
    } /*        * ========================================================        * SUCCESS        * ========================================================        */
    window.location.replace("/admin");
}
catch (error) {
    console.error("Admin sign in failed:", error);
    setErrorMessage(getAdminLoginMessage(error));
}
finally {
    setIsSigningIn(false);
} } /*    * ============================================================    * LOADING    * ============================================================    */ /*    * ============================================================    * LOADING    * ============================================================    */ if (isCheckingSession) {
    return (<main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">         <div className="text-center">           <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600"/>            <p className="mt-4 text-sm font-semibold text-gray-500">             Checking administrator session...           </p>         </div>       </main>);
} /*    * ============================================================    * PAGE    * ============================================================    */ /*    * ============================================================    * PAGE    * ============================================================    */ return (<main className="min-h-screen bg-gray-50 text-gray-900">       <header className="border-b border-gray-200 bg-white">         <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">           <Link href="/" aria-label="Carerity home" className="shrink-0">             <img src="/carerityblacklogo2.png" alt="Carerity" className="h-16 w-auto object-contain sm:h-20"/>           </Link>            <div className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2">             <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">               Admin Workspace             </p>           </div>         </div>       </header>        <section className="mx-auto flex min-h-[calc(100vh-105px)] max-w-6xl items-start justify-center px-4 py-8 sm:py-12">         <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">           <div className="border-b border-gray-100 bg-gradient-to-br from-blue-50 to-white p-6 sm:p-8">             <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">               Carerity Admin             </p>              <h1 className="mt-2 text-3xl font-bold text-gray-900">               Sign in             </h1>              <p className="mt-2 text-sm leading-relaxed text-gray-500">               Authorized Carerity administrators only.             </p>           </div>            <form onSubmit={handleSubmit} className="space-y-5 p-6 sm:p-8">             <label className="block">               <span className="text-sm font-bold text-gray-900">                 Admin email               </span>                <input type="email" value={email} onChange={(event) => { setEmail(event.target.value);
 setErrorMessage("");
 }} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} disabled={isSigningIn} required className="mt-2 min-h-[54px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100" placeholder="admin\@example.com"/>             </label>              <label className="block">               <span className="text-sm font-bold text-gray-900">                 Password               </span>                <input type="password" value={password} onChange={(event) => { setPassword(event.target.value);
 setErrorMessage("");
 }} autoComplete="current-password" disabled={isSigningIn} required className="mt-2 min-h-[54px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"/>             </label>              {errorMessage && (<div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4">                 <p className="text-sm font-semibold leading-relaxed text-red-700">                   {errorMessage}                 </p>               </div>)}              <button type="submit" disabled={isSigningIn} className="min-h-[54px] w-full rounded-xl bg-blue-600 px-5 py-3.5 text-base font-semibold text-white transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-blue-300">               {isSigningIn ? "Signing in..." : "Sign in to Admin"}             </button>              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">               <p className="text-xs leading-relaxed text-blue-800">                 Admin access is separately authorized by Carerity. Family and                 caregiver accounts cannot use this workspace.               </p>             </div>           </form>         </div>       </section>     </main>);
 } /*  * ============================================================  * ERROR MESSAGE  * ============================================================  */
function getAdminLoginMessage(error: unknown) { const original = getAuthErrorMessage(error, "Unable to sign in to the administrator workspace.");
 const normalized = original.trim().toLowerCase();
 if (normalized.includes("invalid login credentials") || normalized.includes("invalid credentials")) {
    return "The admin email or password is incorrect.";
} if (normalized.includes("email not confirmed") || normalized.includes("email_not_confirmed")) {
    return "Confirm the administrator email before signing in.";
} if (normalized.includes("too many") || normalized.includes("rate limit")) {
    return "Too many sign-in attempts. Wait a moment and try again.";
} return original;
 }
 