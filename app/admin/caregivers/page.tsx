"use client";
import { useEffect, useMemo, useState, } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminSupabase, checkCarerityAdminAccess, } from "../../../lib/supabaseClient";
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
type QueueFilter = "all" | "submitted" | "under_review" | "needs_attention" | "approved" | "declined";
export default function AdminCaregiversPage() { const router = useRouter();
 const [queue, setQueue,] = useState<ReviewQueueRow[]>([]);
 const [search, setSearch,] = useState("");
 const [filter, setFilter,] = useState<QueueFilter>("all");
 const [isLoading, setIsLoading,] = useState(true);
 const [errorMessage, setErrorMessage,] = useState("");
 useEffect(() => { let active = true;
 async function loadQueue() { try {
    const { data: { user, }, error: userError, } = await supabase.auth.getUser();
    if (userError || !user) {
        router.replace("/admin/login");
        return;
    }
    const access = await checkCarerityAdminAccess(user.id, adminSupabase);
    if (!active) {
        return;
    }
    if (!access.authorized) {
        await supabase.auth.signOut({ scope: "local", });
        router.replace("/admin/login");
        return;
    }
    const { data, error, } = await supabase.from("admin_caregiver_review_queue").select("*").order("application_updated_at", { ascending: false, });
    if (error) {
        throw error;
    }
    if (active) {
        setQueue((data || []) as ReviewQueueRow[]);
    }
}
catch (error) {
    console.error("Unable to load caregiver review queue:", error);
    if (active) {
        setErrorMessage(getErrorMessage(error, "Unable to load caregiver applications."));
    }
}
finally {
    if (active) {
        setIsLoading(false);
    }
} } loadQueue();
 return () => { active = false;
 };
 }, [router,]);
 const filteredQueue = useMemo(() => { const normalizedSearch = search.trim().toLowerCase();
 return queue.filter((item) => { if (filter !== "all" && item.application_status !== filter) {
    return false;
} if (!normalizedSearch) {
    return true;
} const haystack = [item.first_name, item.last_name, item.caregiver_number, item.email, item.city, item.province,].filter(Boolean).join(" ").toLowerCase();
 return haystack.includes(normalizedSearch);
 });
 }, [queue, search, filter,]);
 if (isLoading) {
    return (<AdminLoadingScreen />);
} return (<main className="min-h-screen bg-slate-50 text-slate-900">       <header className="border-b border-blue-100 bg-white">         <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">           <Link href="/admin">             <img src="/carerityblacklogo2.png" alt="Carerity" className="h-14 w-auto object-contain sm:h-16"/>           </Link>            <Link href="/admin" className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-50">             ← Dashboard           </Link>         </div>       </header>        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">         <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7">           <p className="text-sm font-bold text-blue-700">             Caregiver Operations           </p>            <div className="mt-1 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">             <div>               <h1 className="text-3xl font-bold tracking-tight">                 Caregiver Review Queue               </h1>                <p className="mt-2 text-sm text-slate-500">                 Review submitted applications and caregiver verification progress.               </p>             </div>              <div className="rounded-2xl bg-blue-50 px-4 py-3">               <p className="text-xs font-semibold text-blue-700">                 Applications               </p>                <p className="text-2xl font-bold text-blue-900">                 {queue.length}               </p>             </div>           </div>         </div>          {errorMessage && (<div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">             {errorMessage}           </div>)}          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">           <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search caregiver name, number, email or city" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"/>            <select value={filter} onChange={(event) => setFilter(event.target.value as QueueFilter)} className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">             <option value="all">               All statuses             </option>              <option value="submitted">               Submitted             </option>              <option value="under_review">               Under review             </option>              <option value="needs_attention">               Needs attention             </option>              <option value="approved">               Approved             </option>              <option value="declined">               Declined             </option>           </select>         </div>          <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">           {filteredQueue.length === 0 ? (<div className="p-10 text-center">               <p className="font-bold text-slate-800">                 No matching caregiver applications               </p>                <p className="mt-2 text-sm text-slate-500">                 Try another search or status filter.               </p>             </div>) : (<div className="divide-y divide-slate-100">               {filteredQueue.map((item) => (<CaregiverQueueCard key={item.caregiver_id} item={item}/>))}             </div>)}         </div>       </section>     </main>);
 }
function CaregiverQueueCard({ item, }: {
    item: ReviewQueueRow;
}) { const fullName = [item.first_name, item.last_name,].filter(Boolean).join(" ") || "Caregiver applicant";
 const documentCount = Number(item.document_count || 0);
 const verifiedCount = Number(item.verified_document_count || 0);
 const needsReviewCount = Number(item.needs_review_document_count || 0);
 const percentage = documentCount > 0 ? Math.round((verifiedCount / documentCount) * 100) : 0;
 return (<article className="p-5 sm:p-6">       <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">         <div className="min-w-0 flex-1">           <div className="flex flex-wrap items-center gap-2">             <h2 className="text-lg font-bold text-slate-950">               {fullName}             </h2>              <ApplicationStatusPill status={item.application_status}/>              {item.eligible_for_matching && (<span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">                 Eligible for matching               </span>)}           </div>            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">             <span>               {item.caregiver_number || "No caregiver number"}             </span>              <span>               {item.email || "No email"}             </span>              <span>               {item.city || "No city"}               {item.province ? `, ${item.province}` : ""}             </span>              <span>               Radius:{" "}               {item.service_radius_km || "—"}{" "}               km             </span>           </div>            <div className="mt-4 max-w-xl">             <div className="flex items-center justify-between gap-3 text-xs">               <span className="font-semibold text-slate-600">                 Document verification               </span>                <span className="font-bold text-slate-800">                 {verifiedCount} /{" "}                 {documentCount}               </span>             </div>              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">               <div className="h-full rounded-full bg-blue-600" style={{ width: `${percentage}%`, }}/>             </div>              {needsReviewCount > 0 && (<p className="mt-2 text-xs font-semibold text-amber-700">                 {needsReviewCount} document                 {needsReviewCount === 1 ? "" : "s"}{" "}                 need attention.               </p>)}           </div>         </div>          <div className="flex shrink-0 flex-col gap-2 sm:flex-row xl:flex-col">           <Link href={`/admin/caregivers/${item.caregiver_id}`} className="rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-blue-700">             Review application           </Link>            <p className="text-center text-[11px] text-slate-400">             Submitted{" "}             {formatDate(item.submitted_at)}           </p>         </div>       </div>     </article>); }
function ApplicationStatusPill({ status, }: {
    status: string | null;
}) { const normalized = status || "submitted"; const classes = normalized === "approved" ? "bg-emerald-100 text-emerald-700" : normalized === "needs_attention" ? "bg-amber-100 text-amber-800" : normalized === "declined" ? "bg-red-100 text-red-700" : normalized === "under_review" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"; return (<span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${classes}`}>       {normalized.replace("_", " ")}     </span>); }
function formatDate(value: string | null) { if (!value) {
    return "—";
} const date = new Date(value); if (Number.isNaN(date.getTime())) {
    return "—";
} return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "short", day: "numeric", }).format(date); }
function AdminLoadingScreen() { return (<main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">       <div className="text-center">         <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600"/>          <p className="mt-4 text-sm font-semibold text-slate-500">           Loading caregiver applications...         </p>       </div>     </main>); }
function getErrorMessage(error: unknown, fallback: string) { if (error instanceof Error && error.message) {
    return error.message;
} if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as {
        message?: unknown;
    }).message;
    if (typeof message === "string" && message.trim()) {
        return message;
    }
} return fallback; }
