import Link from "next/link";
import {notFound} from "next/navigation";
import {SiteFooter,SiteHeader} from "@/components/public-site";
import {StorefrontClient} from "@/components/storefront-client";
import {createSupabaseServerClient} from "@/lib/supabase/server";

export const dynamic="force-dynamic";
export default async function StorePage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;const supabase=await createSupabaseServerClient();
  if(!supabase)return <main className="public-page"><SiteHeader/><section className="empty-catalog"><h1>Ο κατάλογος δεν είναι διαθέσιμος</h1><p>Η σύνδεση με τη βάση δεδομένων δεν έχει ρυθμιστεί.</p><Link className="site-primary" href="/explore">Πίσω στην ανακάλυψη</Link></section><SiteFooter/></main>;
  const {data:store}=await supabase.from("stores").select("id,name,description,city,region,address_line,postal_code,store_type,minimum_order_cents,base_delivery_fee_cents,platform_delivery_enabled,merchant_delivery_enabled,independent_delivery_enabled,service_postal_codes,prep_time_minutes,logo_image_path,cover_image_path").eq("id",id).eq("is_active",true).eq("accepts_orders",true).maybeSingle();
  if(!store)notFound();
  return <main className="public-page"><SiteHeader/><div className="store-page-intro"><Link href="/explore" className="back-link">← Όλες οι επιχειρήσεις</Link>
    <section className="storefront-cover" style={{ backgroundImage: `linear-gradient(90deg, rgba(17,17,17,.74), rgba(17,17,17,.08)), url("${store.cover_image_path && process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\\/$/, "")}/storage/v1/object/public/e-delivery-merchant-media/${store.cover_image_path.split("/").map(encodeURIComponent).join("/")}` : "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1400&q=85"}")` }}>
      <div className="storefront-cover-brand">{store.logo_image_path && process.env.NEXT_PUBLIC_SUPABASE_URL ? <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\\/$/, "")}/storage/v1/object/public/e-delivery-merchant-media/${store.logo_image_path.split("/").map(encodeURIComponent).join("/")}`} alt="" /> : <span>{store.name.trim().slice(0,1).toLocaleUpperCase("el-GR")}</span>}</div>
      <div><span className="section-eyebrow">{store.city} · {store.region}</span><h1>{store.name}</h1><p>{store.description??"Ανακάλυψε τον κατάλογο και τις διαθέσιμες επιλογές παράδοσης."}</p></div>
      {!store.cover_image_path ? <small className="storefront-photo-note">Ενδεικτική φωτογραφία κατηγορίας</small> : null}
    </section></div><StorefrontClient store={store}/><SiteFooter/></main>;
}