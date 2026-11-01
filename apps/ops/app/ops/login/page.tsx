import Link from "next/link";
import {SignInForm} from "@/components/sign-in-form";
export default function OpsLoginPage(){
  return <main className="auth-shell"><section className="auth-card">
    <Link className="brand-mark" href="/"><span className="site-brand-symbol">e</span> e-delivery<span> / OPS</span></Link>
    <p className="eyebrow">SECURE WORKSPACE</p><h1>Καλώς ήρθες πίσω.</h1>
    <p className="muted">Σύνδεση για εξουσιοδοτημένους συνεργάτες και διαχειριστές.</p>
    <SignInForm redirectTo="/ops"/>
    <p className="tiny-note">Οι νέοι λογαριασμοί ξεκινούν ως πελάτες. Η πρόσβαση OPS αποδίδεται μόνο από εξουσιοδοτημένο διαχειριστή.</p>
  </section></main>;
}