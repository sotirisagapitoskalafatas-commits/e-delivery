import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/public-site";

const categories = [
  { title: "Φαγητό", sub: "Εστιατόρια, καφέ και φούρνοι", icon: "🍔", href: "/explore?category=food", tone: "red" },
  { title: "Supermarket", sub: "Τα καθημερινά σου, εύκολα", icon: "🛒", href: "/explore?category=groceries", tone: "yellow" },
  { title: "Καταστήματα", sub: "Αγορές από την περιοχή σου", icon: "🛍️", href: "/explore?category=shops", tone: "cream" },
  { title: "Express", sub: "Τοπικές αποστολές", icon: "🛵", href: "/courier", tone: "dark" },
  { title: "Υπηρεσίες", sub: "Τοπικοί επαγγελματίες", icon: "🧰", href: "/explore?category=shops", tone: "cream" }
];

export default function HomePage() {
  return <main className="public-page">
    <SiteHeader />
    <section className="customer-hero">
      <div className="hero-copy">
        <div className="hero-kicker"><span className="kicker-dot" /> Η ΤΟΠΙΚΗ ΣΟΥ ΑΓΟΡΑ, ΣΕ ΜΙΑ ΕΦΑΡΜΟΓΗ</div>
        <h1>Ό,τι χρειάζεσαι.<br/><span>Στο δρόμο για σένα.</span></h1>
        <p>Ανακάλυψε φαγητό, supermarket και αγαπημένα τοπικά καταστήματα. Δες τι εξυπηρετεί τη διεύθυνσή σου και παράγγειλε εύκολα.</p>
        <form className="hero-search" action="/explore" method="get">
          <span className="hero-search-pin">⌖</span>
          <input name="q" placeholder="Τι ψάχνεις σήμερα;" aria-label="Αναζήτηση καταστήματος" />
          <input name="postal_code" inputMode="numeric" maxLength={5} placeholder="Ταχυδρομικός κώδικας" aria-label="Ταχυδρομικός κώδικας" />
          <button type="submit">Ανακάλυψε <span>→</span></button>
        </form>
        <div className="hero-trust"><span><i>✓</i> Διαφανής χρέωση πριν την παραγγελία</span><span><i>✓</i> Επιλογές παράδοσης όπου διατίθενται</span></div>
      </div>
      <div className="hero-art" aria-label="Προεπισκόπηση εφαρμογής E-DELIVERY">
        <div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-yellow-disc"/><div className="art-red-disc"/>
        <div className="phone-preview"><div className="phone-speaker"/>
          <div className="phone-top"><b>e-delivery</b><span>⌖ Αθήνα</span></div>
          <div className="phone-greeting">Καλημέρα 👋<br/><strong>Τι θα ήθελες σήμερα;</strong></div>
          <div className="phone-search">⌕ Αναζήτηση καταστημάτων</div>
          <div className="phone-categories"><span>🍔<small>Φαγητό</small></span><span>🛒<small>Market</small></span><span>🛍️<small>Shops</small></span></div>
          <div className="phone-promo"><span>ΚΑΤΙ ΚΑΛΟ,</span><b>ΚΟΝΤΑ ΣΟΥ.</b><small>Ανακάλυψε την περιοχή σου</small></div>
          <div className="phone-listing"><i>🍕</i><span><b>Τοπικές επιλογές</b><small>Καταστήματα στην περιοχή σου</small></span><em>›</em></div>
          <div className="phone-listing"><i>🥐</i><span><b>Για κάθε στιγμή</b><small>Φαγητό και καθημερινές αγορές</small></span><em>›</em></div>
          <div className="phone-tabs"><span>⌂<small>Αρχική</small></span><span>▦<small>Ανακάλυψη</small></span><span>♡<small>Αγαπημένα</small></span><span>◯<small>Προφίλ</small></span></div>
        </div>
        <div className="floating-order-card"><span className="floating-order-icon">✓</span><div><b>Έτοιμο για ανακάλυψη</b><small>Οι επιλογές σου, σε ένα μέρος</small></div></div>
        <div className="hero-art-caption">ONE APP <span>·</span> LOCAL LIFE</div>
      </div>
    </section>
    <section className="category-section">
      <div className="section-heading"><div><span className="section-eyebrow">ΔΙΑΛΕΞΕ ΤΙ ΧΡΕΙΑΖΕΣΑΙ</span><h2>Η γειτονιά σου, <span>πιο κοντά.</span></h2></div><Link href="/explore" className="text-link">Όλες οι επιχειρήσεις <span>→</span></Link></div>
      <div className="category-grid">{categories.map((item) => <Link className={`category-card ${item.tone}`} href={item.href} key={item.title}><span className="category-icon">{item.icon}</span><span className="category-title">{item.title}</span><span className="category-subtitle">{item.sub}</span><span className="category-arrow">↗</span></Link>)}</div>
      <p className="availability-note">Οι επιχειρήσεις εμφανίζονται ανάλογα με την ενεργή κάλυψη της περιοχής σου.</p>
    </section>
    <section className="how-section" id="how-it-works">
      <div className="section-heading"><div><span className="section-eyebrow">ΑΠΛΑ ΚΑΙ ΚΑΘΑΡΑ</span><h2>Από την αναζήτηση <span>στην πόρτα σου.</span></h2></div></div>
      <div className="how-grid">
        <article><span>01</span><div className="how-icon">⌖</div><h3>Βρες την περιοχή σου</h3><p>Επίλεξε διεύθυνση και δες τις επιχειρήσεις που μπορούν πραγματικά να σε εξυπηρετήσουν.</p></article>
        <article><span>02</span><div className="how-icon">▦</div><h3>Διάλεξε αυτό που θέλεις</h3><p>Περιηγήσου σε καταστήματα και προϊόντα με καθαρές τιμές και πληροφορίες.</p></article>
        <article><span>03</span><div className="how-icon">↗</div><h3>Παράγγειλε με σιγουριά</h3><p>Δες το σύνολο πριν ολοκληρώσεις και κράτησε το ιστορικό σου στον λογαριασμό σου.</p></article>
      </div>
    </section>
    <section className="partner-band" id="partners">
      <div><span className="section-eyebrow">E-DELIVERY NETWORK</span><h2>Μαζί, δίνουμε<br/>περισσότερη αξία <span>σε κάθε διαδρομή.</span></h2><p>Συνεργαζόμαστε με τοπικές επιχειρήσεις και δίκτυα διανομής για να φέρνουμε περισσότερες επιλογές κοντά στους ανθρώπους.</p></div>
      <div className="partner-actions">
        <Link href="/merchant" className="partner-action"><span>🏪</span><b>Είμαι επιχείρηση</b><small>Πλατφόρμα συνεργατών</small><i>↗</i></Link>
        <Link href="/courier" className="partner-action"><span>🛵</span><b>Είμαι διανομέας</b><small>Δίκτυο διανομής</small><i>↗</i></Link>
        <Link href="/ops/login" className="partner-action"><span>⚙</span><b>Είσοδος OPS</b><small>Για εξουσιοδοτημένη ομάδα</small><i>↗</i></Link>
      </div>
    </section>
    <SiteFooter />
  </main>;
}