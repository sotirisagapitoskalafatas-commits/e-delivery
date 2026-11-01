import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/public-site";
import { PartnerApplicationForm } from "@/components/partner-application-form";

const steps = [
  { number: "01", title: "Στείλε το ενδιαφέρον σου", text: "Μοιράσου τα βασικά στοιχεία της επιχείρησης και τον τρόπο παράδοσης που σε εξυπηρετεί." },
  { number: "02", title: "Επικοινωνούμε μαζί σου", text: "Η ομάδα συνεργατών εξετάζει την αίτηση και συζητά μαζί σου κάλυψη, εμπορικούς όρους και επόμενα βήματα." },
  { number: "03", title: "Στήνουμε το κατάστημα", text: "Μετά την έγκριση, οργανώνουμε προφίλ, προϊόντα, τιμές, διαθεσιμότητα και τρόπο εκτέλεσης παραγγελιών." },
  { number: "04", title: "Ενεργοποίηση", text: "Το κατάστημα εμφανίζεται στην αγορά μόνο όταν ολοκληρωθούν οι απαραίτητοι έλεγχοι και η προετοιμασία." }
];

export default function MerchantPage() {
  return (
    <main className="public-page partner-page merchant-partner-page">
      <SiteHeader />
      <section className="partner-hero merchant-hero">
        <div className="partner-hero-copy">
          <span className="partner-eyebrow"><i /> E-DELIVERY ΓΙΑ ΕΠΙΧΕΙΡΗΣΕΙΣ</span>
          <h1>Η επιχείρησή σου.<br /><span>Περισσότερο κοντά στον πελάτη.</span></h1>
          <p>Σύνδεσε το κατάστημά σου με μια ενιαία πλατφόρμα για τοπικές παραγγελίες, προϊόντα και επιλογές παράδοσης. Ξεκινάμε με μια απλή αίτηση ενδιαφέροντος.</p>
          <div className="partner-hero-actions">
            <a className="partner-action-primary" href="#apply">Καταχώριση ενδιαφέροντος <span>↓</span></a>
            <Link className="partner-action-secondary" href="/merchant/login">Είμαι ήδη συνεργάτης ↗</Link>
          </div>
          <div className="partner-hero-proof"><span>✓ Έλεγχος πριν από την ενεργοποίηση</span><span>✓ Συμφωνία όρων πριν από την έναρξη</span></div>
        </div>
        <div className="partner-visual merchant-visual" aria-hidden="true">
          <div className="partner-visual-backdrop" />
          <div className="merchant-visual-board">
            <div className="visual-topline"><span className="visual-brand-dot">e</span><b>MERCHANT SPACE</b><i>● ● ●</i></div>
            <div className="visual-welcome">Η επιχείρησή σου,<br /><strong>σε ένα σημείο.</strong></div>
            <div className="visual-metric-row"><span><small>ΚΑΤΑΛΟΓΟΣ</small><b>Προϊόντα</b></span><span><small>ΠΑΡΑΓΓΕΛΙΕΣ</small><b>Ροή εργασίας</b></span></div>
            <div className="visual-order-row"><i>✓</i><span><b>Νέα παραγγελία</b><small>Έτοιμη για διαχείριση</small></span><em>↗</em></div>
            <div className="visual-order-row muted-row"><i>▦</i><span><b>Κατάλογος προϊόντων</b><small>Τιμές και διαθεσιμότητα</small></span><em>›</em></div>
          </div>
          <div className="partner-float-chip merchant-chip">🏪 <span>Η τοπική σου αγορά</span></div>
        </div>
      </section>

      <section className="partner-benefit-strip merchant-benefit-strip">
        <div><span>01</span><b>Νέοι τρόποι ανακάλυψης</b><small>Η επιχείρησή σου στο ψηφιακό marketplace.</small></div>
        <div><span>02</span><b>Έλεγχος καταλόγου</b><small>Προϊόντα, τιμές και διαθεσιμότητα.</small></div>
        <div><span>03</span><b>Επιλογές εκτέλεσης</b><small>Διανομή καταστήματος ή διαθέσιμα δίκτυα.</small></div>
      </section>

      <section className="partner-content-section">
        <div className="partner-section-heading"><span className="partner-eyebrow">ΠΩΣ ΘΑ ΣΥΝΕΡΓΑΣΤΟΥΜΕ</span><h2>Από την πρώτη επικοινωνία<br /><span>στην πρώτη παραγγελία.</span></h2></div>
        <div className="partner-steps-grid">{steps.map(step => <article key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.text}</p></article>)}</div>
      </section>

      <section className="merchant-tools-section">
        <div><span className="partner-eyebrow">MERCHANT WORKSPACE</span><h2>Τα βασικά εργαλεία<br />της καθημερινής λειτουργίας.</h2><p>Η συνεργασία συνδέεται με το Merchant Workspace, όπου οι εγκεκριμένοι χρήστες μπορούν να διαχειρίζονται τον κατάλογο και να προετοιμάζονται για τη ροή παραγγελιών.</p><Link href="/merchant/login" className="partner-inline-link">Σύνδεση συνεργάτη ↗</Link></div>
        <div className="merchant-tool-list"><article><i>▦</i><span><b>Κατάλογος προϊόντων</b><small>Οργάνωση προϊόντων, τιμών και διαθεσιμότητας.</small></span></article><article><i>↗</i><span><b>Ροή παραγγελιών</b><small>Εργαλεία διαχείρισης για εγκεκριμένα καταστήματα.</small></span></article><article><i>⌖</i><span><b>Επιλογές παράδοσης</b><small>Δήλωσε ποια μοντέλα fulfillment σε ενδιαφέρουν.</small></span></article></div>
      </section>

      <section className="partner-application-section" id="apply">
        <div className="partner-application-intro"><span className="partner-eyebrow">ΓΙΝΕ ΣΥΝΕΡΓΑΤΗΣ</span><h2>Πες μας λίγα πράγματα<br /><span>για την επιχείρησή σου.</span></h2><p>Η αρχική αίτηση διαρκεί λίγα λεπτά. Δεν χρειάζεται να ανεβάσεις έγγραφα σε αυτό το στάδιο. Θα επικοινωνήσουμε για τα απαραίτητα στοιχεία και τους όρους συνεργασίας.</p><ul><li>Στοιχεία επιχείρησης και υπευθύνου</li><li>Περιοχή και διεύθυνση καταστήματος</li><li>Τρόποι παράδοσης που σε ενδιαφέρουν</li></ul><small>Η υποβολή ενδιαφέροντος δεν σημαίνει αυτόματη αποδοχή ή δημιουργία λογαριασμού.</small></div>
        <PartnerApplicationForm kind="merchant" />
      </section>
      <section className="partner-bottom-cta"><div><span className="partner-eyebrow">ΕΧΕΙΣ ΗΔΗ ΛΟΓΑΡΙΑΣΜΟ;</span><h2>Συνέχισε στο Merchant Workspace.</h2><p>Η πρόσβαση παρέχεται σε εγκεκριμένους συνεργάτες.</p></div><Link href="/merchant/login">Σύνδεση συνεργάτη ↗</Link></section>
      <SiteFooter />
    </main>
  );
}