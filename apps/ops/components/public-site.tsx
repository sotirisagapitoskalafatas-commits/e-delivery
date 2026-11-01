import Link from "next/link";

export function SiteHeader() {
  return <header className="site-header">
    <Link className="site-brand" href="/" aria-label="E-DELIVERY αρχική"><span className="site-brand-symbol">e</span><span>e-delivery</span></Link>
    <nav className="site-nav" aria-label="Κύρια πλοήγηση">
      <Link href="/explore?category=food">Φαγητό</Link><Link href="/explore?category=groceries">Supermarket</Link><Link href="/explore?category=shops">Καταστήματα</Link><a href="#how-it-works">Πώς λειτουργεί</a>
    </nav>
    <div className="site-header-actions"><Link className="site-partner-link" href="/merchant">Για συνεργάτες</Link><Link className="site-login-link" href="/login">Σύνδεση</Link><Link className="site-primary small" href="/register">Εγγραφή</Link></div>
  </header>;
}
export function SiteFooter() {
  return <footer className="site-footer"><div className="site-footer-top">
    <div><Link className="site-brand footer-brand" href="/"><span className="site-brand-symbol">e</span><span>e-delivery</span></Link><p>Ό,τι χρειάζεσαι. Παραδίδεται.</p><small>Μία πλατφόρμα για τοπικές επιχειρήσεις και καθημερινές ανάγκες.</small></div>
    <div className="footer-links"><strong>Ανακάλυψε</strong><Link href="/explore">Όλες οι επιχειρήσεις</Link><Link href="/explore?category=food">Φαγητό</Link><Link href="/explore?category=groceries">Supermarket</Link><Link href="/explore?category=shops">Τοπικά καταστήματα</Link></div>
    <div className="footer-links"><strong>Λογαριασμός</strong><Link href="/login">Σύνδεση πελάτη</Link><Link href="/register">Δημιουργία λογαριασμού</Link><Link href="/account">Οι παραγγελίες μου</Link></div>
    <div className="footer-links"><strong>Συνεργάτες</strong><Link href="/merchant">Πλατφόρμα εμπόρων</Link><Link href="/ops/login">OPS / Διαχείριση</Link><Link href="/courier">Διανομείς</Link></div>
  </div><div className="site-footer-bottom"><span>© {new Date().getFullYear()} E-DELIVERY</span><span>Η διαθεσιμότητα εξαρτάται από την ενεργή κάλυψη κάθε περιοχής.</span></div></footer>;
}