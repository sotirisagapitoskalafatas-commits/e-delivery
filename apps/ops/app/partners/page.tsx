import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/public-site";

export default function PartnersPage() {
  return (
    <main className="public-page partner-hub-page">
      <SiteHeader />
      <section className="partner-hub-hero">
        <span className="partner-eyebrow"><i /> E-DELIVERY PARTNERS</span>
        <h1>Η συνεργασία ξεκινά<br /><span>από τη γειτονιά.</span></h1>
        <p>Είτε έχεις επιχείρηση είτε θέλεις να συμμετέχεις στο δίκτυο διανομής, βρες την κατάλληλη διαδρομή για να συνεργαστούμε.</p>
      </section>
      <section className="partner-hub-grid">
        <article className="partner-hub-card merchant-hub-card"><span className="hub-icon">🏪</span><span className="partner-eyebrow">ΓΙΑ ΕΠΙΧΕΙΡΗΣΕΙΣ</span><h2>Έχεις κατάστημα;</h2><p>Δήλωσε ενδιαφέρον για να παρουσιάσεις προϊόντα και υπηρεσίες στο marketplace και να διαχειρίζεσαι τη ροή του καταστήματός σου.</p><Link href="/merchant">Γίνε συνεργαζόμενο κατάστημα ↗</Link></article>
        <article className="partner-hub-card courier-hub-card"><span className="hub-icon">🛵</span><span className="partner-eyebrow">ΓΙΑ ΔΙΑΝΟΜΕΙΣ</span><h2>Θέλεις να διανέμεις;</h2><p>Μάθε για το δίκτυο διανομής, τα βήματα ένταξης και υπέβαλε αίτηση ενδιαφέροντος.</p><Link href="/courier">Γίνε μέλος του δικτύου ↗</Link></article>
      </section>
      <div className="partner-hub-note">Κάθε συνεργασία εξετάζεται ξεχωριστά. Οι ενεργοποιήσεις πραγματοποιούνται ανά περιοχή και μετά την ολοκλήρωση των απαραίτητων ελέγχων και συμφωνιών.</div>
      <SiteFooter />
    </main>
  );
}