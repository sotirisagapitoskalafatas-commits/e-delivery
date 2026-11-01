import Link from "next/link";
import {redirect} from "next/navigation";
import {SiteFooter,SiteHeader} from "@/components/public-site";
import {createSupabaseServerClient} from "@/lib/supabase/server";

const euro=(cents:number)=>new Intl.NumberFormat("el-GR",{style:"currency",currency:"EUR"}).format(cents/100);
export const dynamic="force-dynamic";
export default async function AccountPage(){
  const supabase=await createSupabaseServerClient();
  if(!supabase)return <main className="public-page"><SiteHeader/><section className="empty-catalog"><h1>Οι λογαριασμοί ενεργοποιούνται σύντομα</h1><p>Η σύνδεση πελατών δεν έχει ρυθμιστεί ακόμη.</p><Link className="site-primary" href="/">Αρχική</Link></section><SiteFooter/></main>;
  const {data:auth}=await supabase.auth.getUser();if(!auth.user)redirect("/login?next=%2Faccount");
  const {data:profile}=await supabase.from("profiles").select("full_name,role").eq("id",auth.user.id).maybeSingle();
  if(profile?.role==="ops_admin")redirect("/ops");
  if(profile?.role==="merchant_admin"||profile?.role==="merchant_staff")redirect("/catalog");
  if(profile?.role==="courier")redirect("/courier");
  const [{data:orders,error:ordersError},{data:expressRows,error:expressError},{data:serviceRows,error:serviceError}]=await Promise.all([
    supabase.from("orders").select("id,status,total_cents,currency,created_at,store:stores(name)").order("created_at",{ascending:false}).limit(30),
    supabase.from("express_deliveries").select("id,status,quoted_fee_cents,parcel_description,created_at").order("created_at",{ascending:false}).limit(20),
    supabase.from("service_bookings").select("id,status,quoted_price_cents,service_title,created_at,store:stores(name)").order("created_at",{ascending:false}).limit(20)
  ]);
  return <main className="public-page"><SiteHeader/><section className="account-header"><span className="section-eyebrow">Ο ΛΟΓΑΡΙΑΣΜΟΣ ΣΟΥ</span><h1>Καλώς ήρθες{profile?.full_name?`, ${profile.full_name.split(" ")[0]}`:""}.</h1><p>Οι παραγγελίες και τα αιτήματά σου σε ένα σημείο.</p><form action="/api/auth/signout" method="post"><button className="site-secondary">Αποσύνδεση</button></form></section>
    <section className="account-content"><div className="section-heading"><div><span className="section-eyebrow">MARKETPLACE</span><h2>Οι παραγγελίες μου</h2></div><Link href="/explore" className="text-link">Νέα ανακάλυψη →</Link></div>
      {ordersError?<div className="empty-catalog"><h3>Δεν ήταν δυνατή η φόρτωση</h3><p>Έλεγξε τη σύνδεση δεδομένων και τις πολιτικές πρόσβασης.</p></div>:(orders??[]).length===0?<div className="empty-catalog"><h3>Δεν έχεις ακόμη παραγγελίες</h3><p>Όταν ολοκληρώσεις την πρώτη παραγγελία σου, θα εμφανιστεί εδώ.</p><Link href="/explore" className="site-primary">Ανακάλυψε καταστήματα</Link></div>:<div className="account-record-list">{(orders??[]).map(order=><article className="account-record" key={order.id}><div><strong>{order.store?.name??"E-DELIVERY"}</strong><small>#{order.id.slice(0,8).toUpperCase()} · {new Date(order.created_at).toLocaleString("el-GR",{dateStyle:"medium",timeStyle:"short"})}</small></div><div><span className="record-status">{order.status.replaceAll("_"," ")}</span><b>{euro(order.total_cents)}</b></div></article>)}</div>}
      <div className="section-heading account-subheading"><div><span className="section-eyebrow">EXTRA SERVICES</span><h2>Άλλα αιτήματα</h2></div></div>
      <div className="account-two-column"><article className="account-panel"><h3>Express αποστολές</h3>{expressError?<p>Δεν ήταν δυνατή η φόρτωση των αιτημάτων express.</p>:(expressRows??[]).length?(expressRows??[]).map(row=><div className="account-mini-record" key={row.id}><b>#{row.id.slice(0,8).toUpperCase()}</b><span>{row.parcel_description}</span><small>{row.status.replaceAll("_"," ")} · {row.quoted_fee_cents==null?"Αναμονή προσφοράς":euro(row.quoted_fee_cents)}</small></div>):<p>Δεν υπάρχουν αιτήματα express.</p>}</article>
      <article className="account-panel"><h3>Τοπικές υπηρεσίες</h3>{serviceError?<p>Δεν ήταν δυνατή η φόρτωση των αιτημάτων υπηρεσιών.</p>:(serviceRows??[]).length?(serviceRows??[]).map(row=><div className="account-mini-record" key={row.id}><b>{row.store?.name??"Πάροχος υπηρεσίας"}</b><span>{row.service_title}</span><small>{row.status.replaceAll("_"," ")} · {row.quoted_price_cents==null?"Αναμονή προσφοράς":euro(row.quoted_price_cents)}</small></div>):<p>Δεν υπάρχουν αιτήματα υπηρεσιών.</p>}</article></div>
    </section><SiteFooter/></main>;
}