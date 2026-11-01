import {SiteFooter,SiteHeader} from "@/components/public-site";
import {CustomerAuthForm} from "@/components/customer-auth-form";

export default function RegisterPage(){
  return <main className="public-page"><SiteHeader/><section className="customer-auth-page">
    <div className="customer-auth-aside"><span className="section-eyebrow">JOIN E-DELIVERY</span><h1>Η επόμενη<br/><span>αγαπημένη σου επιλογή.</span></h1><p>Δημιούργησε λογαριασμό για να αποθηκεύεις διευθύνσεις και να βλέπεις το ιστορικό των παραγγελιών σου.</p><div className="auth-aside-stamp">e</div></div>
    <div className="customer-auth-card"><span className="section-eyebrow">ΝΕΟΣ ΛΟΓΑΡΙΑΣΜΟΣ</span><h2>Γίνε μέλος</h2><p>Χρειάζονται μόνο λίγα στοιχεία για να ξεκινήσεις.</p><CustomerAuthForm mode="register"/></div>
  </section><SiteFooter/></main>;
}