import Link from "next/link";
import { OrderActions } from "@/components/order-actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type OrderRow = {
  id: string;
  status: string;
  fulfillment_method: "platform" | "merchant" | "independent";
  total_cents: number;
  currency: string;
  created_at: string;
  store: { name: string } | null;
};
type ExpressRow = {
  id: string;
  status: string;
  quoted_fee_cents: number | null;
  parcel_description: string;
  parcel_size: string;
  created_at: string;
};
type ServiceRequestRow = {
  id: string;
  status: string;
  service_title: string;
  quoted_price_cents: number | null;
  created_at: string;
  store: { name: string } | null;
};

export const dynamic = "force-dynamic";

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency }).format(cents / 100);
}

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return <main className="setup-shell"><section className="setup-card">
      <span className="brand-mark">e-delivery<span> / OPS</span></span>
      <p className="eyebrow">PROJECT FOUNDATION</p>
      <h1>Το κέντρο λειτουργίας του delivery.</h1>
      <p className="muted">Η εφαρμογή συνδέεται με Supabase για αυθεντικοποίηση, παραγγελίες και δικαιώματα ανά ρόλο.</p>
      <div className="notice"><strong>Απαιτείται ρύθμιση</strong><br />Πρόσθεσε τα <code>NEXT_PUBLIC_SUPABASE_URL</code> και <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> στο <code>apps/ops/.env.local</code>.</div>
      <div className="feature-grid">
        <article><span>01</span><strong>Παραγγελίες</strong><p>Ζωντανή εικόνα της λειτουργίας.</p></article>
        <article><span>02</span><strong>Καταστήματα</strong><p>Κατάλογοι και διαχείριση συνεργατών.</p></article>
        <article><span>03</span><strong>Διανομείς</strong><p>Αναθέσεις και κατάσταση παράδοσης.</p></article>
      </div>
    </section></main>;
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return <main className="setup-shell"><section className="setup-card">
      <span className="brand-mark">e-delivery<span> / OPS</span></span>
      <p className="eyebrow">OPERATIONS</p><h1>Η λειτουργία, σε ένα σημείο.</h1>
      <p className="muted">Σύνδεση για εξουσιοδοτημένους συνεργάτες.</p>
      <Link className="primary-button inline-button" href="/ops/login">Σύνδεση</Link>
    </section></main>;
  }

  const [
    { data: profile },
    { data: orders, error: ordersError },
    { count: storeCount },
    { data: expressRequests, error: expressError },
    { data: serviceRequests, error: serviceError }
  ] = await Promise.all([
    supabase.from("profiles").select("full_name,role").eq("id", auth.user.id).maybeSingle(),
    supabase.from("orders").select("id,status,fulfillment_method,total_cents,currency,created_at,store:stores(name)").order("created_at", { ascending: false }).limit(12),
    supabase.from("stores").select("id", { count: "exact", head: true }),
    supabase.from("express_deliveries").select("id,status,quoted_fee_cents,parcel_description,parcel_size,created_at").order("created_at", { ascending: false }).limit(8),
    supabase.from("service_bookings").select("id,status,service_title,quoted_price_cents,created_at,store:stores(name)").order("created_at", { ascending: false }).limit(8)
  ]);

  const role = profile?.role ?? "customer";
  const authorized = ["ops_admin", "merchant_admin", "merchant_staff"].includes(role);
  const canManage = ["ops_admin", "merchant_admin", "merchant_staff"].includes(role);
  const canDispatch = role === "ops_admin";
  const rows = (orders ?? []) as unknown as OrderRow[];
  const expressRows = (expressRequests ?? []) as ExpressRow[];
  const serviceRows = (serviceRequests ?? []) as unknown as ServiceRequestRow[];
  const today = new Date().toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long" });

  if (!authorized) {
    return <main className="setup-shell"><section className="setup-card">
      <span className="brand-mark">e-delivery<span> / OPS</span></span>
      <p className="eyebrow">ACCESS CONTROL</p><h1>Δεν υπάρχει δικαίωμα πρόσβασης.</h1>
      <p className="muted">Ο λογαριασμός σου είναι συνδεδεμένος, αλλά δεν έχει ενεργό ρόλο καταστήματος ή λειτουργίας. Επικοινώνησε με τον διαχειριστή.</p>
      <p className="tiny-note">Account: {auth.user.email ?? auth.user.id}</p>
    </section></main>;
  }

  const pending = rows.filter((row) => ["pending_merchant", "accepted", "preparing", "ready_for_pickup", "courier_assigned", "picked_up"].includes(row.status)).length;

  return <main className="dashboard-shell">
    <aside className="sidebar">
      <Link className="brand-mark" href="/ops">e-delivery<span> / OPS</span></Link>
      <p className="sidebar-label">WORKSPACE</p>
      <a className="nav-item active" href="#overview">Επισκόπηση</a>
      <a className="nav-item" href="#orders">Παραγγελίες</a>
      <a className="nav-item" href="#stores">Καταστήματα</a>
      <a className="nav-item" href="#couriers">Διανομείς</a>
      {canDispatch ? <Link className="nav-item" href="/ops/applications">Αιτήσεις συνεργατών</Link> : null}
      <div className="sidebar-bottom"><span className="avatar">{(profile?.full_name ?? auth.user.email ?? "U").slice(0, 1).toUpperCase()}</span><div><strong>{profile?.full_name ?? "Χρήστης"}</strong><small>{role}</small></div></div>
    </aside>
    <section className="dashboard-main">
      <header className="topbar"><div><p className="eyebrow">GREECE OPERATIONS</p><h1>Καλημέρα{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.</h1><p className="muted capitalize">{today}</p></div><form action="/api/auth/signout" method="post"><button className="secondary-button" type="submit">Αποσύνδεση</button></form></header>
      <section className="metric-grid" id="overview">
        <article className="metric-card"><span>Πρόσφατες παραγγελίες</span><strong>{ordersError ? "—" : rows.length}</strong><small>Τελευταίες 12 εγγραφές που είναι ορατές με βάση το ρόλο</small></article>
        <article className="metric-card"><span>Καταστήματα</span><strong>{storeCount ?? "—"}</strong><small>Εγγραφές ορατές στον λογαριασμό</small></article>
        <article className="metric-card"><span>Ενεργές παραγγελίες</span><strong>{ordersError ? "—" : pending}</strong><small>Από τις πρόσφατες 12 παραγγελίες</small></article>
      </section>
      <section className="panel" id="orders">
        <div className="panel-heading"><div><p className="eyebrow">ORDER WORKFLOW</p><h2>Πρόσφατες παραγγελίες</h2></div><span className="live-dot">Συνδεδεμένα δεδομένα</span></div>
        {ordersError ? <div className="notice error">Δεν ήταν δυνατή η ανάγνωση παραγγελιών. Έλεγξε migration, grants και RLS.</div> : rows.length === 0 ? <div className="empty-state"><div className="empty-icon">↗</div><h3>Δεν υπάρχουν ακόμη παραγγελίες</h3><p>Όταν ολοκληρωθεί η πρώτη πραγματική παραγγελία, θα εμφανιστεί εδώ.</p></div> : <div className="table-wrap"><table><thead><tr><th>Παραγγελία</th><th>Κατάστημα</th><th>Κατάσταση</th><th>Fulfilment</th><th>Σύνολο</th><th>Ώρα</th><th>Ενέργειες</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td className="mono">#{row.id.slice(0, 8).toUpperCase()}</td><td>{row.store?.name ?? "—"}</td><td><span className="status-pill">{row.status.replaceAll("_", " ")}</span></td><td>{row.fulfillment_method === "platform" ? "Διανομέας πλατφόρμας" : row.fulfillment_method === "independent" ? "Ανεξάρτητος συνεργάτης" : "Διανομή καταστήματος"}</td><td>{money(row.total_cents, row.currency)}</td><td>{new Date(row.created_at).toLocaleString("el-GR", { dateStyle: "short", timeStyle: "short" })}</td><td><OrderActions orderId={row.id} status={row.status} fulfillmentMethod={row.fulfillment_method} canManage={canManage} canDispatch={canDispatch} /></td></tr>)}</tbody></table></div>}
      </section>
      <section className="lower-grid">
        {canDispatch ? <>
        <article className="panel" id="requests-express">
          <div className="panel-heading"><div><p className="eyebrow">EXPRESS REQUESTS</p><h2>Αιτήματα αποστολής</h2></div><span className="live-dot">Live records</span></div>
          {expressError ? <div className="notice error">Δεν ήταν δυνατή η ανάγνωση αιτημάτων express. Έλεγξε τις migrations και τα RLS policies.</div> : expressRows.length === 0 ? <div className="empty-state"><h3>Δεν υπάρχουν αιτήματα express</h3><p>Τα νέα αιτήματα αποστολής θα εμφανιστούν εδώ για έλεγχο και προσφορά.</p></div> : <div className="request-list">{expressRows.map((request) => <div className="request-row" key={request.id}><div><strong>#{request.id.slice(0,8).toUpperCase()}</strong><p>{request.parcel_description}</p><small>{request.parcel_size === "small" ? "Μικρό" : request.parcel_size === "medium" ? "Μεσαίο" : "Μεγάλο"} · {new Date(request.created_at).toLocaleString("el-GR", { dateStyle: "short", timeStyle: "short" })}</small></div><div className="request-meta"><span className="status-pill">{request.status.replaceAll("_"," ")}</span><small>{request.quoted_fee_cents == null ? "Χωρίς προσφορά" : money(request.quoted_fee_cents,"EUR")}</small></div></div>)}</div>}
        </article>
        </> : null}
        <article className="panel" id="requests-services">
          <div className="panel-heading"><div><p className="eyebrow">LOCAL SERVICES</p><h2>Αιτήματα υπηρεσιών</h2></div><span className="live-dot">Live records</span></div>
          {serviceError ? <div className="notice error">Δεν ήταν δυνατή η ανάγνωση αιτημάτων υπηρεσιών. Έλεγξε τις migrations και τα RLS policies.</div> : serviceRows.length === 0 ? <div className="empty-state"><h3>Δεν υπάρχουν αιτήματα υπηρεσιών</h3><p>Τα αιτήματα προς παρόχους υπηρεσιών θα εμφανιστούν εδώ.</p></div> : <div className="request-list">{serviceRows.map((request) => <div className="request-row" key={request.id}><div><strong>{request.store?.name ?? "Πάροχος υπηρεσίας"}</strong><p>{request.service_title}</p><small>{new Date(request.created_at).toLocaleString("el-GR", { dateStyle: "short", timeStyle: "short" })}</small></div><div className="request-meta"><span className="status-pill">{request.status.replaceAll("_"," ")}</span><small>{request.quoted_price_cents == null ? "Χωρίς προσφορά" : money(request.quoted_price_cents,"EUR")}</small></div></div>)}</div>}
        </article>
      </section>
      <section className="lower-grid">
        <article className="panel" id="stores"><p className="eyebrow">MERCHANT NETWORK</p><h2>Καταστήματα</h2><p className="muted">Εγγραφή, επαλήθευση, καταστήματα και κάλυψη ανά περιοχή.</p><Link className="subtle-link" href="/catalog">Άνοιγμα καταλόγου</Link></article>
        <article className="panel" id="couriers"><p className="eyebrow">DELIVERY FLEET</p><h2>Διανομείς</h2><p className="muted">Οι αναθέσεις πραγματοποιούνται μόνο σε εγκεκριμένους διανομείς και καταγράφονται στο ιστορικό παραγγελίας.</p><span className="subtle-link">Dispatch, online status και ανεξάρτητα partner networks</span></article>
      </section>
      <footer className="footer-note">E-DELIVERY · Operational data only · Η διαθεσιμότητα εμφανίζεται μόνο σε επιβεβαιωμένες ζώνες εξυπηρέτησης.</footer>
    </section>
  </main>;
}
