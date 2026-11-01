import Link from "next/link";
import { SiteFooter,SiteHeader } from "@/components/public-site";
import { CustomerAuthForm } from "@/components/customer-auth-form";

export default async function CustomerLoginPage({searchParams}:{searchParams:Promise<{next?:string}>}) {
  const params=await searchParams;
  const nextPath=params.next?.startsWith("/")&&!params.next.startsWith("//")?params.next:"/account";
  return <main className="public-page"><SiteHeader/><section className="customer-auth-page">
    <div className="customer-auth-aside"><span className="section-eyebrow">E-DELIVERY ACCOUNT</span><h1>Όλα όσα αγαπάς,<br/><span>λίγο πιο κοντά.</span></h1><p>Συνδέσου για να παραγγείλεις, να κρατήσεις τις διευθύνσεις σου και να παρακολουθείς τις παραγγελίες σου.</p><div className="auth-aside-stamp">e</div></div>
    <div className="customer-auth-card"><span className="section-eyebrow">ΚΑΛΩΣ ΗΡΘΕΣ ΠΙΣΩ</span><h2>Σύνδεση</h2><p>Συνέχισε από εκεί που σταμάτησες.</p><CustomerAuthForm mode="login" nextPath={nextPath}/></div>
  </section><SiteFooter/></main>;
}