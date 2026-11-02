import Link from "next/link";
import { redirect } from "next/navigation";
import { SupportDesk, type SupportDeskTicket } from "@/components/support-desk";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import "./support.css";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <main className="setup-shell"><section className="setup-card"><h1>Απαιτείται σύνδεση Supabase</h1><p className="muted">Το inbox υποστήριξης χρειάζεται τη βάση E-DELIVERY.</p></section></main>;

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/ops/login");

  const { data: profile } = await supabase.from("profiles").select("role,full_name").eq("id", auth.user.id).maybeSingle();
  if (!profile || !["ops_admin", "support"].includes(profile.role)) {
    return <main className="setup-shell"><section className="setup-card"><p className="eyebrow">ACCESS CONTROL</p><h1>Δεν υπάρχει δικαίωμα πρόσβασης.</h1><p className="muted">Το inbox υποστήριξης είναι διαθέσιμο μόνο στους ρόλους support και ops_admin.</p><Link href="/ops" className="primary-button inline-button">Επιστροφή στο OPS</Link></section></main>;
  }

  const { data, error } = await supabase.from("support_tickets")
    .select("id,customer_id,order_id,category,subject,status,priority,assigned_to,created_at,updated_at,customer:profiles(full_name,phone)")
    .order("updated_at", { ascending: false })
    .limit(300);

  return <main className="support-page">
    <header className="support-page-header">
      <div><Link className="brand-mark" href="/ops">e-delivery<span> / OPS</span></Link><p className="eyebrow">CUSTOMER CARE</p><h1>Υποστήριξη πελατών</h1><p className="muted">Ιδιωτικές συνομιλίες πελατών και διαχείριση αιτημάτων.</p></div>
      <div className="support-page-actions"><span>{profile.full_name || auth.user.email || "Support"}</span><Link className="secondary-button" href="/ops">Επιστροφή στο OPS</Link></div>
    </header>
    {error ? <div className="notice error">Δεν ήταν δυνατή η φόρτωση αιτημάτων. Έλεγξε τη migration 010, τα grants και τα RLS policies.</div> : <SupportDesk initialTickets={(data ?? []) as unknown as SupportDeskTicket[]} currentUserId={auth.user.id} />}
  </main>;
}
