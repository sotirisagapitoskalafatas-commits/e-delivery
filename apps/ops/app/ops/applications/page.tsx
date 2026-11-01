import Link from "next/link";
import { redirect } from "next/navigation";
import { PartnerApplicationsTable, type PartnerApplication } from "@/components/partner-applications-table";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PartnerApplicationsPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <main className="setup-shell"><section className="setup-card"><h1>Απαιτείται σύνδεση Supabase</h1><p className="muted">Η διαχείριση αιτήσεων συνεργατών χρειάζεται την production βάση E-DELIVERY.</p></section></main>;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/ops/login");
  const { data: profile } = await supabase.from("profiles").select("role,full_name").eq("id", auth.user.id).maybeSingle();
  if (profile?.role !== "ops_admin") return <main className="setup-shell"><section className="setup-card"><p className="eyebrow">ACCESS CONTROL</p><h1>Δεν υπάρχει δικαίωμα πρόσβασης.</h1><p className="muted">Μόνο OPS administrators μπορούν να βλέπουν τις αιτήσεις συνεργατών.</p><Link className="primary-button inline-button" href="/ops">Επιστροφή στο OPS</Link></section></main>;

  const { data, error } = await supabase.from("partner_applications")
    .select("id,application_type,status,first_name,last_name,email,phone,city,business_name,business_type,address_line,postal_code,fulfillment_interests,vehicle_type,courier_network_preference,age_confirmed,has_valid_driver_license,has_smartphone,internal_note,created_at")
    .order("created_at", { ascending: false }).limit(200);
  return <main className="partner-applications-admin">
    <header className="partner-admin-header"><div><Link className="brand-mark" href="/ops">e-delivery<span> / OPS</span></Link><p className="eyebrow">PARTNER ACQUISITION</p><h1>Αιτήσεις συνεργατών</h1><p className="muted">Αιτήσεις καταστημάτων και διανομέων. Η έγκριση εδώ δεν δημιουργεί αυτόματα λογαριασμό.</p></div><Link className="secondary-button" href="/ops">Επιστροφή στο OPS</Link></header>
    {error ? <div className="notice error">Δεν ήταν δυνατή η ανάγνωση αιτήσεων. Εφάρμοσε πρώτα τη migration partner applications και επιβεβαίωσε τα RLS policies.</div> : <PartnerApplicationsTable applications={(data ?? []) as PartnerApplication[]} />}
  </main>;
}