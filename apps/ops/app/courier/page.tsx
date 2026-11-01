import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/public-site";
import { PartnerApplicationForm } from "@/components/partner-application-form";

const steps = [
  { number: "01", title: "Υποβάλλεις ενδιαφέρον", text: "Συμπληρώνεις τα στοιχεία επικοινωνίας, την περιοχή σου και το όχημα που χρησιμοποιείς." },
  { number: "02", title: "Ελέγχουμε την αίτηση", text: "Η ομάδα μας επικοινωνεί μαζί σου για διαθεσιμότητα, έγγραφα και το κατάλληλο μοντέλο συνεργασίας." },
  { number: "03", title: "Ολοκληρώνεις την ένταξη", text: "Πριν από οποιαδήποτε ενεργοποίηση, ενημερώνεσαι για τους όρους, τις διαδικασίες και τις απαιτήσεις του δικτύου." },
  { number: "04", title: "Ξεκινάς μετά την έγκριση", text: "Η πρόσβαση σε εργασίες και εργαλεία διανομής ενεργοποιείται μόνο αφού ολοκληρωθεί η διαδικασία ένταξης." }
];

export default function CourierPage() {
  return (
    <main className="public-page partner-page courier-partner-page">
      <SiteHeader />
      <section className="partner-hero courier-hero">
        <div className="partner-hero-copy">
          <span className="partner-eyebrow"><i /> E-DELIVERY DELIVERY NETWORK</span>
          <h1>Οι δρόμοι της πόλης.<br /><span>Οι δικές σου διαδρομές.</span></h1>
          <p>Γίνε μέλος του δικτύου διανομής E-DELIVERY. Δήλωσε ενδιαφέρον για συνεργασία και ενημερώσου για τις διαθέσιμες επιλογές στην περιοχή σου.</p>
          <div className="partner-hero-actions">
            <a className="partner-action-primary" href="#apply">Ξεκίνα την αίτησή σου <span>↓</span></a>
            <Link className="partner-action-secondary" href="/merchant">Έχεις επιχείρηση; ↗</Link>
          </div>
          <div className="partner-hero-proof"><span>✓ Σαφή βήματα ένταξης</span><span>✓ Ενημέρωση πριν από την ενεργοποίηση</span></div>
        </div>
        <div className="partner-visual courier-visual" aria-hidden="true">
          <div className="courier-route route-one" /><div className="courier-route route-two" />
          <div className="courier-sun-disc" /><div className="courier-red-disc" />
          <div className="courier-rider-card"><span className="rider-helmet">⛑</span><b>DELIVERY NETWORK</b><strong>Η επόμενη<br /><em>διαδρομή</em></strong><small>Τοπικές παραδόσεις · Ελλάδα</small><div className="rider-card-route"><i>⌖</i><span>Παραλαβή</span><b>→</b><span>Παράδοση</span></div></div>
          <div className="partner-float-chip courier-chip">🛵 <span>Στο δίκτυο E-DELIVERY</span></div>
        </div>
      </section>

      <section className="partner-benefit-strip courier-benefit-strip">
        <div><span>01</span><b>Πολλαπλά δίκτυα</b><small>Πλατφόρμα, ανεξάρτητοι συνεργάτες και στόλοι επιχειρήσεων.</small></div>
        <div><span>02</span><b>Καθαρή διαδικασία</b><small>Γνωρίζεις τα βήματα και τους όρους πριν από την έναρξη.</small></div>
        <div><span>03</span><b>Τοπική κάλυψη</b><small>Ενεργοποίηση ανά περιοχή με βάση πραγματικές ανάγκες.</small></div>
      </section>

      <section className="partner-content-section">
        <div className="partner-section-heading"><span className="partner-eyebrow">ΠΩΣ ΛΕΙΤΟΥΡΓΕΙ</span><h2>Από την αίτηση<br /><span>στην πρώτη διαδρομή.</span></h2></div>
        <div className="partner-steps-grid">{steps.map(step => <article key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.text}</p></article>)}</div>
      </section>

      <section className="courier-requirements-section">
        <div><span className="partner-eyebrow">ΠΡΙΝ ΥΠΟΒΑΛΕΙΣ ΑΙΤΗΣΗ</span><h2>Τι θα χρειαστείς<br /><span>για την αξιολόγηση.</span></h2><p>Τα οριστικά κριτήρια εξαρτώνται από το μοντέλο συνεργασίας και το όχημα. Επιβεβαιώνονται από την ομάδα μας πριν από οποιαδήποτε ενεργοποίηση.</p></div>
        <div className="courier-requirement-list"><article><i>📱</i><span><b>Smartphone</b><small>Για επικοινωνία και χρήση των εργαλείων διανομής.</small></span></article><article><i>🚲</i><span><b>Κατάλληλο όχημα</b><small>Ποδήλατο, μηχανή ή αυτοκίνητο, ανάλογα με τις ανάγκες της περιοχής.</small></span></article><article><i>🪪</i><span><b>Νόμιμα έγγραφα</b><small>Άδεια οδήγησης και λοιπά δικαιολογητικά όπου απαιτούνται για το όχημα και το μοντέλο συνεργασίας.</small></span></article><article><i>✓</i><span><b>Έλεγχος επιλεξιμότητας</b><small>Η ηλικία, η ταυτοποίηση και οι λοιπές προϋποθέσεις επιβεβαιώνονται πριν από την ένταξη.</small></span></article></div>
      </section>

      <section className="partner-application-section courier-application-section" id="apply">
        <div className="partner-application-intro"><span className="partner-eyebrow">ΓΙΝΕ ΜΕΛΟΣ ΤΟΥ ΔΙΚΤΥΟΥ</span><h2>Ξεκίνα με μια<br /><span>αίτηση ενδιαφέροντος.</span></h2><p>Πες μας σε ποια περιοχή κινείσαι, τι όχημα χρησιμοποιείς και ποιο μοντέλο συνεργασίας σε ενδιαφέρει.</p><ul><li>Δεν ζητάμε έγγραφα ταυτότητας ή τραπεζικά στοιχεία σε αυτή τη φόρμα.</li><li>Δεν δημιουργείται αυτόματα λογαριασμός διανομέα.</li><li>Θα ενημερωθείς για τους όρους πριν από την ενεργοποίηση.</li></ul><small>Η υποβολή ενδιαφέροντος δεν αποτελεί προσφορά εργασίας ή εγγύηση συνεργασίας.</small></div>
        <PartnerApplicationForm kind="courier" />
      </section>
      <section className="partner-bottom-cta"><div><span className="partner-eyebrow">ΕΧΕΙΣ ΕΠΙΧΕΙΡΗΣΗ;</span><h2>Διαχειρίσου τον δικό σου στόλο.</h2><p>Δήλωσε τα μοντέλα παράδοσης που μπορεί να υποστηρίξει το κατάστημά σου.</p></div><Link href="/merchant">Συνεργασία επιχείρησης ↗</Link></section>
      <SiteFooter />
    </main>
  );
}