import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

function BrandMark() {
  return (
    <span className="market-brand-mark" aria-hidden="true">
      <svg viewBox="0 0 40 40" focusable="false">
        <path d="M12 16.5h16l-1.5 17h-13z" fill="white" />
        <path d="M16 17v-3a4 4 0 0 1 8 0v3" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <path d="m21 20-4 6h4l-1 4 5-7h-4l1-3z" fill="#FFC928" />
      </svg>
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="market-header">
      <div className="market-header-inner">
        <Link className="market-brand" href="/" aria-label="E-DELIVERY αρχική">
          <BrandMark />
          <span className="market-brand-word">E-DELIVERY</span>
        </Link>
        <Link className="market-location-link" href="/explore" aria-label="Αναζήτησε καταστήματα στην περιοχή σου">
          <span className="market-location-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M19 10.2c0 5-7 10.2-7 10.2S5 15.2 5 10.2a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.2" /></svg>
          </span>
          <span className="market-location-copy"><small>ΑΝΑΖΗΤΗΣΗ ΠΕΡΙΟΧΗΣ</small><strong>Βρες καταστήματα</strong></span>
          <span className="market-location-chevron" aria-hidden="true">⌄</span>
        </Link>
        <nav className="market-nav" aria-label="Κύρια πλοήγηση">
          <Link href="/explore?category=food">Φαγητό & καφές</Link>
          <Link href="/explore?category=groceries">Supermarket</Link>
          <Link href="/explore?category=shops">Καταστήματα</Link>
          <Link href="/#how-it-works">Πώς λειτουργεί</Link>
        </nav>
        <div className="market-header-actions">
          <ThemeToggle />
          <Link className="market-partner-link" href="/partners">Συνεργάσου μαζί μας</Link>
          <span className="market-language" title="Γλώσσα: Ελληνικά">GR</span>
          <Link className="market-signin-link" href="/login">Σύνδεση</Link>
          <Link className="market-register-link" href="/register">Εγγραφή</Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="market-footer">
      <div className="market-footer-main">
        <div className="market-footer-brand">
          <Link className="market-brand footer-market-brand" href="/"><BrandMark /><span className="market-brand-word">E-DELIVERY</span></Link>
          <p>Η αγορά της γειτονιάς σου.</p>
          <small>Μία πλατφόρμα για φαγητό, καθημερινές αγορές και τοπικές επιχειρήσεις.</small>
        </div>
        <div className="market-footer-links"><strong>Ανακάλυψε</strong><Link href="/explore">Όλα τα καταστήματα</Link><Link href="/explore?category=food">Φαγητό & καφές</Link><Link href="/explore?category=groceries">Supermarket</Link><Link href="/explore?category=shops">Καταστήματα</Link><Link href="/#how-it-works">Πώς λειτουργεί</Link><Link href="/#faq">Συχνές ερωτήσεις</Link></div>
        <div className="market-footer-links"><strong>Ο λογαριασμός μου</strong><Link href="/login">Σύνδεση πελάτη</Link><Link href="/register">Δημιουργία λογαριασμού</Link><Link href="/account">Οι παραγγελίες μου</Link></div>
        <div className="market-footer-links"><strong>Συνεργάτες</strong><Link href="/merchant">Έχεις κατάστημα;</Link><Link href="/courier">Γίνε διανομέας</Link><Link href="/ops/login">Είσοδος OPS</Link></div>
      </div>
      <div className="market-footer-bottom"><span>© {new Date().getFullYear()} E-DELIVERY</span><span>Η διαθεσιμότητα εξαρτάται από την ενεργή κάλυψη κάθε περιοχής.</span></div>
    </footer>
  );
}
