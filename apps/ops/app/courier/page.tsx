import Link from "next/link";
import {SiteFooter,SiteHeader} from "@/components/public-site";
export default function CourierPage(){
  return <main className="public-page"><SiteHeader/><section className="partner-portal-hero courier-portal">
    <span className="section-eyebrow">E-DELIVERY COURIER NETWORK</span><h1>Κάθε διαδρομή<br/><span>με ξεκάθαρους όρους.</span></h1>
    <p>Το δίκτυο διανομής σχεδιάζεται για διαφανείς προσφορές, σαφείς πληροφορίες αποστολής και υποστήριξη κατά τη διαδρομή.</p>
    <div className="partner-portal-actions"><Link href="/" className="site-primary">Επιστροφή στην αρχική</Link><Link href="/merchant" className="site-secondary">Για επιχειρήσεις</Link></div>
    <div className="courier-status-note"><span className="status-pulse"/>Η δημόσια εγγραφή διανομέων και η διανομή της mobile εφαρμογής δεν έχουν ενεργοποιηθεί ακόμη. Δεν υπάρχει διαθέσιμος σύνδεσμος λήψης σε αυτό το στάδιο.</div>
  </section><SiteFooter/></main>;
}