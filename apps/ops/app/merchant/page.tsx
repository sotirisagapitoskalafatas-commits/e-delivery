import Link from "next/link";
import {SiteFooter,SiteHeader} from "@/components/public-site";
export default function MerchantPage(){
  return <main className="public-page"><SiteHeader/><section className="partner-portal-hero merchant-portal">
    <span className="section-eyebrow">E-DELIVERY FOR BUSINESS</span><h1>Η επιχείρησή σου.<br/><span>Πιο κοντά σε νέους πελάτες.</span></h1>
    <p>Διαχειρίσου τον κατάλογο και τις παραγγελίες σου μέσα από ένα ενιαίο επαγγελματικό περιβάλλον. Οι συνεργασίες ενεργοποιούνται μετά από έλεγχο και έγκριση.</p>
    <div className="partner-portal-actions"><Link href="/merchant/login" className="site-primary">Σύνδεση εμπόρου</Link><Link href="/explore" className="site-secondary">Προβολή marketplace</Link></div>
    <div className="portal-feature-grid"><article><b>01</b><h3>Κατάλογος</h3><p>Προϊόντα, τιμές και διαθεσιμότητα.</p></article><article><b>02</b><h3>Παραγγελίες</h3><p>Ενημέρωση και διαχείριση ροής.</p></article><article><b>03</b><h3>Επιχειρηματική εικόνα</h3><p>Εργαλεία για την καθημερινή λειτουργία.</p></article></div>
  </section><SiteFooter/></main>;
}