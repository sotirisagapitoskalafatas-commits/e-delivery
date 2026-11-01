import Link from "next/link";
import { redirect } from "next/navigation";
import { CatalogManager } from "@/components/catalog-manager";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import "./catalog.css";

type StoreRow = { id: string; name: string; city: string; logo_image_path: string | null; cover_image_path: string | null };

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <main className="setup-shell"><section className="setup-card"><h1>Απαιτείται ρύθμιση Supabase</h1><p className="muted">Συμπλήρωσε τα environment variables της εφαρμογής ops.</p></section></main>;

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/merchant/login");

  const [{ data: profile }, { data: storeRows, error }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle(),
    supabase.from("stores").select("id,name,city,logo_image_path,cover_image_path").order("name")
  ]);

  const role = profile?.role ?? "customer";
  if (!["ops_admin", "merchant_admin", "merchant_staff"].includes(role)) {
    return <main className="setup-shell"><section className="setup-card"><p className="eyebrow">ACCESS CONTROL</p><h1>Δεν υπάρχει δικαίωμα πρόσβασης.</h1><p className="muted">Ο λογαριασμός δεν διαθέτει ρόλο διαχείρισης καταστήματος.</p><Link className="primary-button inline-button" href="/">Επιστροφή</Link></section></main>;
  }

  const stores = (storeRows ?? []) as StoreRow[];
  return <main className="catalog-page">
    <header className="catalog-page-header">
      <div><Link className="brand-mark" href="/merchant">e-delivery<span> / MERCHANT</span></Link><p className="eyebrow">MERCHANT WORKSPACE</p><h1>Διαχείριση καταλόγου</h1><p className="muted">Πρόσθεσε και ενημέρωσε τα προϊόντα των καταστημάτων που διαχειρίζεσαι.</p></div>
      <Link className="secondary-button" href="/ops">Πίσω στις παραγγελίες</Link>
    </header>
    {error ? <p className="catalog-message">Δεν ήταν δυνατή η φόρτωση καταστημάτων. Έλεγξε RLS και membership.</p> : null}
    <CatalogManager stores={stores} canManage={role === "ops_admin" || role === "merchant_admin"} />
  </main>;
}
