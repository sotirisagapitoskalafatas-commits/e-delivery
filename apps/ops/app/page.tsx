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

const fallbackStoreKind = { label: "Τοπική επιχείρηση", icon: "🏪", tone: "retail" };
const storeKinds: Record<string, typeof fallbackStoreKind> = {
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
  other: fallbackStoreKind
};

const euro = (cents: number) =>
  new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(cents / 100);

function MarketplaceIcon({ type, className }: { type: string; className?: string }) {
  let shape;
  switch (type) {
    case "cafe":
      shape = <><path d="M5 9h13v6.5A4.5 4.5 0 0 1 13.5 20h-4A4.5 4.5 0 0 1 5 15.5V9Z"/><path d="M18 11h2a2.5 2.5 0 0 1 0 5h-2M8 5c0 1.2 1 1.2 1 2.4M13 5c0 1.2 1 1.2 1 2.4"/></>;
      break;
    case "restaurant":
      shape = <><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3.5"/><path d="M3 4v6M1.5 7h3M21 4v16M19 8c0-2.2.7-4 2-4"/></>;
      break;
    case "bakery":
      shape = <><path d="M4 15c0-4.4 3.6-8 8-8 1.5 0 2.9.4 4.1 1.1 2.4.2 4.4 2.2 4.4 4.7 0 2.6-2 4.7-4.6 4.9H7.7A3.7 3.7 0 0 1 4 15Z"/><path d="M9 8.2 7.8 15M13 7.2l-1 10M17 9l-1 8"/></>;
      break;
    case "supermarket":
    case "convenience":
      shape = <><path d="M3 5h2l2.1 10.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 1.9-1.4L21 9H6"/><circle cx="10" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/></>;
      break;
    case "pharmacy":
      shape = <><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></>;
      break;
    case "flower_shop":
      shape = <><circle cx="12" cy="10" r="2.1"/><path d="M12 7.8C7 2 4 7 8.9 10c-6.5.7-4.4 6.8.7 4.1-1.7 6.2 4.5 7.1 4.5 1.1 4.6 4.4 8.5-.6 3-4.1 5.2-3.3 1-8.7-3.1-4.2Z"/><path d="M12 16v5M12 19c-2.5-2-4.1-1.3-4.9-.4"/></>;
      break;
    case "pet_shop":
      shape = <><path d="M12 20c-3.7 0-6.2-2.3-6.2-5.1 0-2.1 1.5-3.6 3.2-3.6 1.2 0 2.1.6 3 1.7.9-1.1 1.8-1.7 3-1.7 1.7 0 3.2 1.5 3.2 3.6C18.2 17.7 15.7 20 12 20Z"/><circle cx="6.5" cy="7.5" r="1.8"/><circle cx="11" cy="5.5" r="1.8"/><circle cx="16" cy="6" r="1.8"/><circle cx="20" cy="9" r="1.6"/></>;
      break;
    case "parcel_point":
      shape = <><path d="m12 3 8 4.2v9.6L12 21l-8-4.2V7.2L12 3Z"/><path d="m4.5 7.5 7.5 4 7.5-4M12 11.5V21M8 5.1l8 4.2"/></>;
      break;
    case "service_provider":
      shape = <><path d="M14.5 6.5a5 5 0 0 0-6.8 6.8L3 18l3 3 4.7-4.7a5 5 0 0 0 6.8-6.8l-3.1 3.1-3.1-3.1 3.2-3Z"/></>;
      break;
    default:
      shape = <><path d="M3 10.5 12 4l9 6.5"/><path d="M5 9.5V20h14V9.5M9 20v-6h6v6"/></>;
  }
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shape}</svg>;
}

function StoreCard({ store, isNew = false }: { store: StoreRow; isNew?: boolean }) {
  const kind = storeKinds[store.store_type] ?? fallbackStoreKind;
  return (
    <Link href={`/store/${store.id}`} className="market-store-card">
      <div className={`market-store-art ${kind.tone} market-store-art--${store.store_type}`}>
        <div className="market-store-art-top">
          <span className="market-store-kind">{kind.label}</span>
          {isNew ? <span className="market-new-badge">Νέο</span> : null}
        </div>
        <div className="market-store-art-center">
          <span className="market-store-icon"><MarketplaceIcon type={store.store_type} /></span>
          <span className="market-store-monogram">{store.name.trim().slice(0, 1).toLocaleUpperCase("el-GR")}</span>
        </div>
        <span className="market-store-art-caption">E-DELIVERY · LOCAL PICKS</span>
      </div>
      <div className="market-store-body">
        <div className="market-store-heading">
          <h3>{store.name}</h3>
          <span className="market-store-arrow" aria-hidden="true">↗</span>
        </div>
        <p className="market-store-location">{store.city}{store.region ? `, ${store.region}` : ""}</p>
        {store.description ? <p className="market-store-description">{store.description}</p> : null}
        <div className="market-store-status"><i /> Δέχεται παραγγελίες</div>
        <div className="market-store-meta">
          <span>Προετοιμασία ~{store.prep_time_minutes}′</span>
          <span>Ελάχιστη {euro(store.minimum_order_cents)}</span>
        </div>
        <div className="market-store-delivery">Κόστος παράδοσης <strong>{euro(store.base_delivery_fee_cents)}</strong></div>
      </div>
    </Link>
  );
}

const categoryLinks = [
  { label: "Εστιατόρια", detail: "Γεύματα και αγαπημένες γεύσεις", type: "restaurant", tone: "red" },
  { label: "Καφέδες", detail: "Ο καφές της ημέρας", type: "cafe", tone: "yellow" },
  { label: "Αρτοποιήματα", detail: "Φρέσκα από τον φούρνο", type: "bakery", tone: "cream" },
  { label: "Supermarket", detail: "Όσα χρειάζεσαι στο σπίτι", type: "supermarket", tone: "yellow" },
  { label: "Mini market", detail: "Μικρές καθημερινές αγορές", type: "convenience", tone: "cream" },
  { label: "Καταστήματα", detail: "Ανακάλυψε την αγορά σου", type: "retail", tone: "dark" },
  { label: "Φαρμακεία", detail: "Τοπικά φαρμακεία", type: "pharmacy", tone: "cream" },
  { label: "Ανθοπωλεία", detail: "Λουλούδια και δώρα", type: "flower_shop", tone: "yellow" },
  { label: "Pet shops", detail: "Για τους μικρούς σου φίλους", type: "pet_shop", tone: "cream" }
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

  const visibleCategories = categoryLinks;
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
            <h1 aria-label="Ανακάλυψε φαγητό, καφέ, αγορές και προϊόντα στη γειτονιά σου. Όλα πιο κοντά.">
              Βρες <span className="market-hero-word-rotator" aria-hidden="true">
                <span>φαγητό</span><span>καφέ</span><span>αγορές</span><span>προϊόντα</span>
              </span><br />στη γειτονιά σου.<br /><span>Όλα πιο κοντά.</span>
            </h1>
            <p>Φαγητό, καφές, ψώνια και καθημερινές αγορές από τοπικές επιχειρήσεις. Βάλε τον ταχυδρομικό σου κώδικα και δες τι εξυπηρετεί πραγματικά την περιοχή σου.</p>
            <form className="market-search" action="/explore" method="get">
              <label className="market-search-field">
                <span aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.7"/><path d="m16 16 4.5 4.5"/></svg></span>
                <input name="q" placeholder="Κατάστημα, προϊόν ή περιοχή" aria-label="Αναζήτηση καταστήματος, προϊόντος ή περιοχής" />
              </label>
              <label className="market-search-field postcode">
                <span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M19 10.2c0 5-7 10.2-7 10.2S5 15.2 5 10.2a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.2"/></svg></span>
                <input name="postal_code" inputMode="numeric" pattern="[0-9]{5}" minLength={5} maxLength={5} placeholder="Τ.Κ. 5 ψηφίων" aria-label="Ταχυδρομικός κώδικας 5 ψηφίων" />
              </label>
              <button type="submit">Βρες καταστήματα <span aria-hidden="true">→</span></button>
            </form>
            <div className="market-hero-shortcuts" aria-label="Γρήγορη επιλογή κατηγορίας">
              <Link href="/explore?category=food"><MarketplaceIcon type="restaurant" /> Φαγητό & καφές</Link>
              <Link href="/explore?category=groceries"><MarketplaceIcon type="supermarket" /> Supermarket</Link>
              <Link href="/explore?category=shops"><MarketplaceIcon type="retail" /> Καταστήματα</Link>
            </div>
            <div className="market-hero-facts">
              {activeCount !== null ? <span><b>{activeCount.toLocaleString("el-GR")}</b> ενεργά καταστήματα</span> : <span><b>5ψήφιος Τ.Κ.</b> για σωστή κάλυψη</span>}
              <span><i /> Μόνο ενεργές επιλογές</span>
            </div>
          </div>
          <div className="market-hero-visual" aria-hidden="true">
            <div className="market-visual-halo" />
            <div className="market-visual-window">
              <div className="market-visual-window-top">
                <span className="market-visual-brand-mark"><svg viewBox="0 0 40 40"><path d="M12 16.5h16l-1.5 17h-13z" fill="white"/><path d="M16 17v-3a4 4 0 0 1 8 0v3" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><path d="m21 20-4 6h4l-1 4 5-7h-4l1-3z" fill="#FFC928"/></svg></span>
                <span><b>E-DELIVERY</b><small>Η ΑΓΟΡΑ ΤΗΣ ΓΕΙΤΟΝΙΑΣ ΣΟΥ</small></span>
                <i>● ● ●</i>
              </div>
              <div className="market-visual-window-copy">
                <span>ΜΙΑ ΑΝΑΖΗΤΗΣΗ. ΠΟΛΛΕΣ ΕΠΙΛΟΓΕΣ.</span>
                <strong>Η γειτονιά σου,<br /><em>σε ένα μέρος.</em></strong>
                <small>Ανακάλυψε όσα χρειάζεσαι καθημερινά.</small>
              </div>
              <div className="market-visual-category-list">
                <div><span className="visual-icon food"><MarketplaceIcon type="restaurant" /></span><b>Φαγητό</b><small>Εστιατόρια</small></div>
                <div><span className="visual-icon coffee"><MarketplaceIcon type="cafe" /></span><b>Καφές</b><small>Καφέ & φούρνοι</small></div>
                <div><span className="visual-icon market"><MarketplaceIcon type="supermarket" /></span><b>Αγορές</b><small>Supermarket</small></div>
              </div>
              <div className="market-visual-window-bottom"><span className="visual-route-mark">↗</span><span><b>Ξεκίνα από τον Τ.Κ. σου</b><small>Διαθεσιμότητα ανά περιοχή</small></span><span className="visual-route-arrow">→</span></div>
            </div>
            <div className="market-visual-float market-visual-float-top"><span className="visual-float-check">✓</span><span><b>Τοπικές επιχειρήσεις</b><small>Σε μία πλατφόρμα</small></span></div>
            <div className="market-visual-float market-visual-float-bottom"><span className="visual-float-pin">⌖</span><span><b>Η περιοχή σου</b><small>Με βάση τον Τ.Κ.</small></span></div>
          </div>
        </div>
      </section>

      <section className="market-payment-strip" aria-label="Τρόποι πληρωμής">
        <div className="market-payment-inner">
          <span className="payment-shield">✓</span>
          <div><strong>Πληρωμή κατά την παράδοση.</strong><small>Επίλεξε τα προϊόντα σου και πλήρωσε με μετρητά όταν παραλάβεις.</small></div>
          <span className="payment-method active">Μετρητά · COD</span>
        </div>
      </section>

      <section className="market-section market-categories-section">
        <div className="market-section-heading">
          <div><span className="market-section-kicker">ΑΝΑΚΑΛΥΨΕ</span><h2>Για τι έχεις όρεξη <span>σήμερα;</span></h2></div>
          <Link href="/explore" className="market-text-link">Όλες οι κατηγορίες <span>→</span></Link>
        </div>
        {visibleCategories.length > 0 ? (
          <div className="market-category-grid">{visibleCategories.map((item) => <Link key={item.type} href={`/explore?type=${item.type}`} className={`market-category-tile ${item.tone}`}><span className="market-category-icon"><MarketplaceIcon type={item.type} /></span><strong>{item.label}</strong><small>{item.detail}</small><i>↗</i></Link>)}</div>
        ) : (
          <div className="market-category-empty">Οι κατηγορίες θα ενεργοποιηθούν μαζί με τα πρώτα διαθέσιμα καταστήματα.</div>
        )}
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

      {latestStores.length > 0 && !catalogError ? (
        <section className="market-section market-new-section">
          <div className="market-section-heading">
            <div><span className="market-section-kicker">ΚΑΛΩΣ ΗΡΘΑΝ</span><h2>Νέα καταστήματα <span>στο E-DELIVERY.</span></h2></div>
            <Link href="/explore" className="market-text-link">Περισσότερα <span>→</span></Link>
          </div>
          <div className="market-store-grid">{latestStores.slice(0, 6).map((store) => <StoreCard key={store.id} store={store} isNew />)}</div>
        </section>
      ) : null}

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

      <section className="market-section market-how-section" id="how-it-works">
        <div className="market-section-heading">
          <div><span className="market-section-kicker">ΑΠΛΑ ΚΑΙ ΚΑΘΑΡΑ</span><h2>Από την αναζήτηση <span>στην παράδοση.</span></h2></div>
          <span className="market-section-note">Ξέρεις από πριν τι προσφέρει κάθε κατάστημα και ποια επιλογή παράδοσης είναι διαθέσιμη.</span>
        </div>
        <div className="market-how-grid">
          <article className="market-how-card">
            <span className="market-how-number">01</span>
            <span className="market-how-icon" aria-hidden="true">⌖</span>
            <h3>Επίλεξε περιοχή</h3>
            <p>Βάλε τον 5ψήφιο ταχυδρομικό κώδικά σου για να δεις ενεργά καταστήματα που εξυπηρετούν την περιοχή σου.</p>
          </article>
          <article className="market-how-card">
            <span className="market-how-number">02</span>
            <span className="market-how-icon" aria-hidden="true">▦</span>
            <h3>Ανακάλυψε τον κατάλογο</h3>
            <p>Δες διαθέσιμα προϊόντα, τιμές, ελάχιστη παραγγελία και κόστος παράδοσης πριν προσθέσεις στο καλάθι.</p>
          </article>
          <article className="market-how-card">
            <span className="market-how-number">03</span>
            <span className="market-how-icon" aria-hidden="true">➜</span>
            <h3>Ολοκλήρωσε με σιγουριά</h3>
            <p>Συνδέσου, επίλεξε διεύθυνση και έναν από τους τρόπους παράδοσης που υποστηρίζει το κατάστημα. Πληρώνεις με μετρητά κατά την παράδοση.</p>
          </article>
        </div>
        <div className="market-how-action"><Link href="/explore" className="market-cta-button">Βρες καταστήματα <span>→</span></Link></div>
      </section>

      <section className="market-section market-faq-section" id="faq">
        <div className="market-faq-intro">
          <span className="market-section-kicker">ΧΡΗΣΙΜΕΣ ΠΛΗΡΟΦΟΡΙΕΣ</span>
          <h2>Έχεις απορίες;<br /><span>Ξεκίνα από εδώ.</span></h2>
          <p>Οι βασικές απαντήσεις για κάλυψη περιοχών, παραγγελίες και πληρωμές.</p>
          <Link href="/explore" className="market-text-link">Ανακάλυψε καταστήματα <span>→</span></Link>
        </div>
        <div className="market-faq-list">
          <details className="market-faq-item">
            <summary>Πώς ξέρω αν εξυπηρετείται ο Τ.Κ. μου;</summary>
            <p>Συμπλήρωσε τον 5ψήφιο ταχυδρομικό κώδικα στην αναζήτηση. Θα εμφανιστούν μόνο τα ενεργά καταστήματα που έχουν δηλώσει κάλυψη για τον συγκεκριμένο Τ.Κ.</p>
          </details>
          <details className="market-faq-item">
            <summary>Πώς γίνεται η πληρωμή;</summary>
            <p>Αυτή τη στιγμή οι online παραγγελίες του E-DELIVERY υποστηρίζουν πληρωμή με μετρητά κατά την παράδοση. Οι online πληρωμές δεν είναι ακόμη διαθέσιμες.</p>
          </details>
          <details className="market-faq-item">
            <summary>Ποιος παραδίδει την παραγγελία;</summary>
            <p>Ανάλογα με το κατάστημα, μπορεί να είναι διαθέσιμο το δίκτυο E-DELIVERY, η διανομή του καταστήματος ή ανεξάρτητος συνεργάτης. Στο checkout εμφανίζονται μόνο οι ενεργές επιλογές.</p>
          </details>
          <details className="market-faq-item">
            <summary>Χρειάζεται να δημιουργήσω λογαριασμό;</summary>
            <p>Ναι. Για να ολοκληρώσεις την παραγγελία, συνδέεσαι στον λογαριασμό σου και επιλέγεις ή προσθέτεις διεύθυνση παράδοσης.</p>
          </details>
          <details className="market-faq-item">
            <summary>Υπάρχει ελάχιστη αξία παραγγελίας;</summary>
            <p>Κάθε κατάστημα μπορεί να ορίζει το δικό του ελάχιστο καλάθι. Το ποσό εμφανίζεται πριν ολοκληρώσεις την παραγγελία και ελέγχεται ξανά στο checkout.</p>
          </details>
        </div>
      </section>

      <section className="market-partner-cta">
        <div><span className="market-section-kicker">E-DELIVERY PARTNERS</span><h2>Έχεις κατάστημα;<br /><span>Γίνε μέρος της διαδρομής.</span></h2><p>Γνώρισε την πλατφόρμα συνεργατών και διαχειρίσου τα προϊόντα και τις παραγγελίες του καταστήματός σου.</p></div>
        <Link href="/merchant" className="market-cta-button">Συνεργάσου μαζί μας <span>↗</span></Link>
      </section>
      <SiteFooter />
    </main>
  );
}