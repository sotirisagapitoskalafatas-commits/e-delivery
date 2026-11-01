import Link from "next/link";
import {SignInForm} from "@/components/sign-in-form";
export default function MerchantLoginPage(){
  return <main className="auth-shell"><section className="auth-card">
    <Link className="brand-mark" href="/merchant">e-delivery<span> / MERCHANT</span></Link>
    <p className="eyebrow">MERCHANT WORKSPACE</p><h1>Καλώς ήρθες πίσω.</h1>
    <p className="muted">Σύνδεση για εγκεκριμένους εμπόρους και μέλη καταστημάτων.</p>
    <SignInForm redirectTo="/catalog"/>
    <p className="tiny-note">Η πρόσβαση εξαρτάται από τον ρόλο και τη σύνδεση του λογαριασμού σου με εγκεκριμένο κατάστημα.</p>
  </section></main>;
}