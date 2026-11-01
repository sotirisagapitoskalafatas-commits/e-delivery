import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SiteFooter, SiteHeader } from "@/components/public-site";

type StoreRow = {
  id: string;
  name: string;
  description: string | null;
  store_type: string;
  city: string;
  region: string;
  minimum_order_cents: number;
  base_delivery_fee_cents: number;
  prep_time_minutes: number;
  created_at: string;
};

const storeKinds: Record<string, { label: string; icon: string; tone: string }> = {
  restaurant: { label: "Εστιατόριο", icon: "🍽️", tone: "food" },
  cafe: { label: "Καφέ", icon: "☕", tone: "coffee" },
  bakery: { label: "Αρτοποιείο", icon: "🥐", tone: "bakery" },
  supermarket: { label: "Supermarket", icon: "🛒", tone: "market" },
  convenience: { label: "Mini market", icon: "🥛", tone: "market" },
  retail: { label: "Κατάστημα", icon: "🛍️", tone: "retail" },
  pharmacy: { label: "Φαρμακείο", icon: "💊", tone: "retail" },
  flower_shop: { label: "Ανθοπωλείο", icon: "💐", tone: "retail" },
  pet_shop: { label: "Pet shop", icon: "🐾", tone: "retail" },
  parcel_point: { label: "Σημείο αποστολών", icon: "📦", tone: "retail" },
  service_provider: { label: "Τοπική υπηρεσία", icon: "🧰", tone: "retail" },
  other: { label: "Τοπική επιχείρηση", icon: "🏪", tone: "retail" }
};

const euro = (cents: number) =>
  new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(cents / 100);

function StoreCard({ store, isNew = false }: { store: StoreRow; isNew?: boolean }) {
  const kind = storeKinds[store.store_type] ?? storeKinds.other;
  return (
    <Link href={`/store/${store.id}`} className="market-store-card">
      <div className={`market-store-art ${kind.tone}`}>
        <span className="market-store-icon">{kind.icon}</span>
        {isNew ? <span className="market-new-badge">Νέο</span> : null}
        <span className="market-store-kind">{kind.label}</span>
      </div>
      <div className="market-store-body">
        <div className="market-store-heading">
          <h3>{store.name}</h3>
          <span className="market-store-arrow" aria-hidden="true">↗</span>
        </div>
        <p className="market-store-location">{store.city}{store.region ? `, ${store.region}` : ""}</p>
        {store.description ? <p className="market-store-description">{store.description}</p> : null}
        <div className="market-store-meta">
          <span>◷ Προετοιμασία ~{store.prep_time_minutes}′</span>
          <span>Ελάχιστη {euro(store.minimum_order_cents)}</span>
        </div>
        <div className="market-store-delivery">Παράδοση {euro(store.base_delivery_fee_cents)}</div>
      </div>
    </Link>
  );
}

const categoryLinks = [
  { label: "Εστιατόρια", detail: "Γεύματα και αγαπημένες γεύσεις", icon: "🍽️", type: "restaurant", tone: "red" },
  { label: "Καφέδες", detail: "Ο καφές της ημέρας", icon: "☕", type: "cafe", tone: "yellow" },
  { label: "Αρτοποιήματα", detail: "Φρέσκα από τον φούρνο", icon: "🥐", type: "bakery", tone: "cream" },
  { label: "Supermarket", detail: "Όσα χρειάζεσαι στο σπίτι", icon: "🛒", type: "supermarket", tone: "yellow" },
  { label: "Mini market", detail: "Μικρές καθημερινές αγορές", icon: "🥛", type: "convenience", tone: "cream" },
  { label: "Καταστήματα", detail: "Ανακάλυψε την αγορά σου", icon: "🛍️", type: "retail", tone: "dark" },
  { label: "Φαρμακεία", detail: "Τοπικά φαρμακεία", icon: "💊", type: "pharmacy", tone: "cream" },
  { label: "Ανθοπωλεία", detail: "Λουλούδια και δώρα", icon: "💐", type: "flower_shop", tone: "yellow" },
  { label: "Pet shops", detail: "Για τους μικρούς σου φίλους", icon: "🐾", type: "pet_shop", tone: "cream" }
];

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  let stores: StoreRow[] = [];
  let newStores: StoreRow[] = [];
  let activeCount: number | null = null;
  let catalogError = false;

  if (supabase) {
    const selectFields = "id,name,description,store_type,city,region,minimum_order_cents,base_delivery_fee_cents,prep_time_minutes,created_at";
    const [storeResult, newStoreResult, countResult] = await Promise.all([
      supabase.from("stores").select(selectFields).eq("is_active", true).eq("accepts_orders", true).order("name").limit(18),
      supabase.from("stores").select(selectFields).eq("is_active", true).eq("accepts_orders", true).order("created_at", { ascending: false }).limit(6),
      supabase.from("stores").select("id", { count: "exact", head: true }).eq("is_active", true).eq("accepts_orders", true)
    ]);
    catalogError = Boolean(storeResult.error || newStoreResult.error || countResult.error);
    stores = (storeResult.data ?? []) as StoreRow[];
    newStores = (newStoreResult.data ?? []) as StoreRow[];
    activeCount = countResult.count ?? null;
  } else {
    catalogError = true;
  }

  const availableTypes = new Set(stores.map((store) => store.store_type));
  const visibleCategories = categoryLinks.filter((item) => availableTypes.has(item.type));
  const storeIds = new Set(stores.map((store) => store.id));
  const additionalNewStores = newStores.filter((store) => !storeIds.has(store.id));
  const latestStores = additionalNewStores.length > 0 ? additionalNewStores : newStores;

  return (
    <main className="public-page market-home">
      <SiteHeader />
      <section className="market-hero">
        <div className="market-hero-inner">
          <div className="market-hero-copy">
            <div className="market-eyebrow"><span /> E-DELIVERY · Η ΑΓΟΡΑ ΤΗΣ ΓΕΙΤΟΝΙΑΣ ΣΟΥ</div>
            <h1>Ο καφές σου.<br />Το φαγητό σου.<br /><span>Όλα πιο κοντά.</span></h1>
            <p>Ανακάλυψε συνεργαζόμενα καταστήματα στην περιοχή σου. Δες κόστος παράδοσης, ελάχιστη παραγγελία και χρόνο προετοιμασίας πριν επιλέξεις.</p>
            <form className="market-search" action="/explore" method="get">
              <label className="market-search-field">
                <span aria-hidden="true">⌕</span>
                <input name="q" placeholder="Τι ψάχνεις σήμερα;" aria-label="Αναζήτηση καταστήματος ή περιοχής" />
              </label>
              <label className="market-search-field postcode">
                <span aria-hidden="true">⌖</span>
                <input name="postal_code" inputMode="numeric" maxLength={5} placeholder="Τ.Κ." aria-label="Ταχυδρομικός κώδικας" />
              </label>
              <button type="submit">Βρες καταστήματα <span aria-hidden="true">→</span></button>
            </form>
            <div className="market-hero-facts">
              <span><b>{activeCount === null ? "Τοπικά" : activeCount.toLocaleString("el-GR")}</b> ενεργά καταστήματα</span>
              <span><i /> Εμφάνιση βάσει διαθεσιμότητας</span>
            </div>
          </div>
          <div className="market-hero-visual" aria-hidden="true">
            <div className="market-hero-orbit orbit-a" />
            <div className="market-hero-orbit orbit-b" />
            <div className="market-yellow-shape" />
            <div className="market-red-shape" />
            <div className="market-hero-card">
              <span className="market-card-kicker">ΣΗΜΕΡΑ, ΤΙ ΘΑ ΠΑΡΑΓΓΕΙΛΕΙΣ;</span>
              <div className="market-hero-emoji-row"><span>☕</span><span>🍕</span><span>🛒</span></div>
              <strong>Από τα αγαπημένα σου<br />καταστήματα.</strong>
              <small>Μία αναζήτηση. Πολλές επιλογές.</small>
              <div className="market-hero-card-footer"><span>e</span> e-delivery <i>● ● ●</i></div>
            </div>
            <div className="market-float-pill float-top">☕ Καφές</div>
            <div className="market-float-pill float-bottom">🛍️ Τοπικές αγορές</div>
          </div>
        </div>
      </section>

      <section className="market-payment-strip" aria-label="Τρόποι πληρωμής">
        <div className="market-payment-inner">
          <span className="payment-shield">✓</span>
          <div><strong>Πλήρωσε όπως σε εξυπηρετεί.</strong><small>Αυτή τη στιγμή υποστηρίζεται πληρωμή με μετρητά κατά την παράδοση.</small></div>
          <span className="payment-method active">Μετρητά κατά την παράδοση</span>
          <span className="payment-method pending">Online πληρωμές · Σύντομα</span>
        </div>
      </section>

      <section className="market-section market-offers-section">
        <div className="market-section-heading">
          <div><span className="market-section-kicker">ΓΙΑ ΣΕΝΑ</span><h2>Προσφορές που <span>έρχονται κοντά.</span></h2></div>
          <span className="market-section-note">Οι προσφορές θα εμφανίζονται εδώ μόλις ενεργοποιηθούν από τα συνεργαζόμενα καταστήματα.</span>
        </div>
        <div className="market-offer-empty">
          <div className="market-offer-mark">%</div>
          <div><strong>Ετοιμάζουμε τις πρώτες προσφορές.</strong><p>Σύντομα θα ανακαλύπτεις ειδικές τιμές και επιλογές από τα καταστήματα της περιοχής σου.</p></div>
          <Link href="/explore" className="market-text-link">Ανακάλυψε καταστήματα <span>→</span></Link>
        </div>
      </section>

      <section className="market-section market-partners-section">
        <div className="market-section-heading">
          <div><span className="market-section-kicker">ΣΥΝΕΡΓΑΖΟΜΕΝΑ ΚΑΤΑΣΤΗΜΑΤΑ</span><h2>Βρες το επόμενο <span>αγαπημένο σου.</span></h2></div>
          <Link href="/explore" className="market-text-link">Όλα τα καταστήματα <span>→</span></Link>
        </div>
        {catalogError ? (
          <div className="market-catalog-state"><span>⌁</span><h3>Ο κατάλογος συνδέεται σύντομα.</h3><p>Οι διαθέσιμες επιχειρήσεις θα εμφανίζονται εδώ μόλις ενεργοποιηθεί η βάση δεδομένων E-DELIVERY.</p></div>
        ) : stores.length === 0 ? (
          <div className="market-catalog-state"><span>⌖</span><h3>Οι πρώτοι συνεργάτες έρχονται.</h3><p>Μόλις ενεργοποιηθούν καταστήματα στην περιοχή σου, θα τα βρεις συγκεντρωμένα εδώ.</p><Link href="/merchant" className="market-text-link">Έχεις επιχείρηση; Συνεργάσου μαζί μας →</Link></div>
        ) : (
          <div className="market-store-grid">{stores.slice(0, 9).map((store) => <StoreCard key={store.id} store={store} />)}</div>
        )}
      </section>

      <section className="market-section market-categories-section">
        <div className="market-section-heading">
          <div><span className="market-section-kicker">ΑΝΑΚΑΛΥΨΕ</span><h2>Για τι έχεις όρεξη <span>σήμερα;</span></h2></div>
          <Link href="/explore" className="market-text-link">Όλες οι κατηγορίες <span>→</span></Link>
        </div>
        {visibleCategories.length > 0 ? (
          <div className="market-category-grid">{visibleCategories.map((item) => <Link key={item.type} href={`/explore?type=${item.type}`} className={`market-category-tile ${item.tone}`}><span>{item.icon}</span><strong>{item.label}</strong><small>{item.detail}</small><i>↗</i></Link>)}</div>
        ) : (
          <div className="market-category-empty">Οι κατηγορίες θα ενεργοποιηθούν μαζί με τα πρώτα διαθέσιμα καταστήματα.</div>
        )}
      </section>

      {latestStores.length > 0 && !catalogError ? (
        <section className="market-section market-new-section">
          <div className="market-section-heading">
            <div><span className="market-section-kicker">ΚΑΛΩΣ ΗΡΘΑΝ</span><h2>Νέα καταστήματα <span>στο E-DELIVERY.</span></h2></div>
            <Link href="/explore" className="market-text-link">Περισσότερα <span>→</span></Link>
          </div>
          <div className="market-store-grid">{latestStores.slice(0, 6).map((store) => <StoreCard key={store.id} store={store} isNew />)}</div>
        </section>
      ) : null}

      <section className="market-partner-cta">
        <div><span className="market-section-kicker">E-DELIVERY PARTNERS</span><h2>Έχεις κατάστημα;<br /><span>Γίνε μέρος της διαδρομής.</span></h2><p>Γνώρισε την πλατφόρμα συνεργατών και διαχειρίσου τα προϊόντα και τις παραγγελίες του καταστήματός σου.</p></div>
        <Link href="/merchant" className="market-cta-button">Συνεργάσου μαζί μας <span>↗</span></Link>
      </section>
      <SiteFooter />
    </main>
  );
}