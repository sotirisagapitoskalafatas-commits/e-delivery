import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="market-header">
      <div className="market-header-inner">
        <Link className="market-brand" href="/" aria-label="E-DELIVERY αρχική">
          <span className="market-brand-mark">e</span><span>e-delivery</span>
        </Link>
        <Link className="market-location-link" href="/explore">
          <span aria-hidden="true">⌖</span><span><small>ΠΑΡΑΔΟΣΗ ΣΤΗΝ ΠΕΡΙΟΧΗ ΣΟΥ</small><strong>Επίλεξε περιοχή</strong></span><i>⌄</i>
        </Link>
        <nav className="market-nav" aria-label="Κύρια πλοήγηση">
          <Link href="/explore?category=food">Φαγητό</Link>
          <Link href="/explore?category=groceries">Supermarket</Link>
          <Link href="/explore?category=shops">Καταστήματα</Link>
        </nav>
        <div className="market-header-actions">
          <ThemeToggle />
          <Link className="market-partner-link" href="/partners">Συνεργάσου μαζί μας</Link>
          <span className="market-language" title="Γλώσσα: Ελληνικά">GR <span>⌄</span></span>
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
          <Link className="market-brand footer-market-brand" href="/"><span className="market-brand-mark">e</span><span>e-delivery</span></Link>
          <p>Ό,τι χρειάζεσαι. Παραδίδεται.</p>
          <small>Μία πλατφόρμα για τοπικές επιχειρήσεις και καθημερινές ανάγκες.</small>
        </div>
        <div className="market-footer-links"><strong>Ανακάλυψε</strong><Link href="/explore">Όλα τα καταστήματα</Link><Link href="/explore?category=food">Φαγητό</Link><Link href="/explore?category=groceries">Supermarket</Link><Link href="/explore?category=shops">Καταστήματα</Link></div>
        <div className="market-footer-links"><strong>Ο λογαριασμός μου</strong><Link href="/login">Σύνδεση πελάτη</Link><Link href="/register">Δημιουργία λογαριασμού</Link><Link href="/account">Οι παραγγελίες μου</Link></div>
        <div className="market-footer-links"><strong>Συνεργάτες</strong><Link href="/merchant">Έχεις κατάστημα;</Link><Link href="/courier">Γίνε διανομέας</Link><Link href="/ops/login">Είσοδος OPS</Link></div>
      </div>
      <div className="market-footer-bottom"><span>© {new Date().getFullYear()} E-DELIVERY</span><span>Η διαθεσιμότητα εξαρτάται από την ενεργή κάλυψη κάθε περιοχής.</span></div>
    </footer>
  );
}