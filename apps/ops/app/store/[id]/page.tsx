import Link from "next/link";
import {notFound} from "next/navigation";
import {SiteFooter,SiteHeader} from "@/components/public-site";
import {StorefrontClient} from "@/components/storefront-client";
import {createSupabaseServerClient} from "@/lib/supabase/server";

export const dynamic="force-dynamic";
export default async function StorePage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;const supabase=await createSupabaseServerClient();
  if(!supabase)return <main className="public-page"><SiteHeader/><section className="empty-catalog"><h1>Ο κατάλογος δεν είναι διαθέσιμος</h1><p>Η σύνδεση με τη βάση δεδομένων δεν έχει ρυθμιστεί.</p><Link className="site-primary" href="/explore">Πίσω στην ανακάλυψη</Link></section><SiteFooter/></main>;
  const {data:store}=await supabase.from("stores").select("id,name,description,city,region,address_line,postal_code,store_type,minimum_order_cents,base_delivery_fee_cents,platform_delivery_enabled,merchant_delivery_enabled,independent_delivery_enabled,service_postal_codes,prep_time_minutes").eq("id",id).eq("is_active",true).eq("accepts_orders",true).maybeSingle();
  if(!store)notFound();
  return <main className="public-page"><SiteHeader/><div className="store-page-intro"><Link href="/explore" className="back-link">← Όλες οι επιχειρήσεις</Link><span className="section-eyebrow">{store.city} · {store.region}</span><h1>{store.name}</h1><p>{store.description??"Ανακάλυψε τον κατάλογο και τις διαθέσιμες επιλογές παράδοσης."}</p></div><StorefrontClient store={store}/><SiteFooter/></main>;
}