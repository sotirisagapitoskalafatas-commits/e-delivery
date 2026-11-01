import Link from "next/link";
import {SiteFooter,SiteHeader} from "@/components/public-site";
import {createSupabaseServerClient} from "@/lib/supabase/server";

type StoreRow={id:string;name:string;description:string|null;city:string;region:string;store_type:string;minimum_order_cents:number;base_delivery_fee_cents:number;service_postal_codes:string[]};
const types:Record<string,string[]>={food:["restaurant","cafe","bakery"],groceries:["supermarket","convenience"],shops:["retail","pharmacy","flower_shop","pet_shop","other"]};
const labels:Record<string,string>={food:"Φαγητό",groceries:"Supermarket",shops:"Καταστήματα",all:"Όλες οι επιχειρήσεις"};
const storeTypes:Record<string,string>={restaurant:"Εστιατόριο",cafe:"Καφέ",bakery:"Φούρνος",supermarket:"Supermarket",convenience:"Mini market",retail:"Κατάστημα",pharmacy:"Φαρμακείο",flower_shop:"Ανθοπωλείο",pet_shop:"Κατάστημα κατοικιδίων",other:"Τοπική επιχείρηση"};
const euro=(cents:number)=>new Intl.NumberFormat("el-GR",{style:"currency",currency:"EUR"}).format(cents/100);
export const dynamic="force-dynamic";

export default async function ExplorePage({searchParams}:{searchParams:Promise<{category?:string;q?:string;postal_code?:string}>}){
  const params=await searchParams;
  const category=types[params.category??""]?params.category!:"all";
  const query=(params.q??"").trim().toLocaleLowerCase("el-GR");
  const postalCode=(params.postal_code??"").replace(/\D/g,"").slice(0,5);
  const supabase=await createSupabaseServerClient();
  let stores:StoreRow[]=[];let loadError=false;
  if(supabase){
    const {data,error}=await supabase.from("stores").select("id,name,description,city,region,store_type,minimum_order_cents,base_delivery_fee_cents,service_postal_codes").eq("is_active",true).eq("accepts_orders",true).order("name").limit(100);
    loadError=Boolean(error);stores=(data??[]) as StoreRow[];
  }else loadError=true;
  const visible=stores.filter(store=>{
    const matchCategory=category==="all"||(types[category]??[]).includes(store.store_type);
    const haystack=`${store.name} ${store.description??""} ${store.city} ${store.region}`.toLocaleLowerCase("el-GR");
    return matchCategory&&(!query||haystack.includes(query))&&(!postalCode||store.service_postal_codes?.includes(postalCode));
  });
  return <main className="public-page"><SiteHeader/>
    <section className="explore-hero"><span className="section-eyebrow">ΑΝΑΚΑΛΥΨΕ ΤΗΝ ΠΕΡΙΟΧΗ ΣΟΥ</span><h1>Τι θα ήθελες <span>σήμερα;</span></h1><p>Βρες τις επιχειρήσεις που έχουν ενεργοποιήσει εξυπηρέτηση στην περιοχή σου.</p>
      <form className="explore-search" action="/explore" method="get"><input type="hidden" name="category" value={category}/><input name="q" defaultValue={params.q??""} placeholder="Αναζήτηση καταστήματος ή πόλης" aria-label="Αναζήτηση"/><input name="postal_code" defaultValue={postalCode} inputMode="numeric" maxLength={5} placeholder="Τ.Κ." aria-label="Ταχυδρομικός κώδικας"/><button className="site-primary" type="submit">Αναζήτηση</button></form>
    </section>
    <section className="explore-content">
      <div className="explore-filters">{Object.entries(labels).map(([key,label])=><Link key={key} className={category===key?"filter-chip active":"filter-chip"} href={key==="all"?"/explore":`/explore?category=${key}`}>{label}</Link>)}</div>
      <div className="section-heading explore-heading"><div><span className="section-eyebrow">{labels[category]}</span><h2>{visible.length? `${visible.length} διαθέσιμες επιλογές`:"Επιλογές στην περιοχή σου"}</h2></div><span className="result-hint">Εμφανίζονται μόνο ενεργά καταστήματα</span></div>
      {loadError?<div className="empty-catalog"><span>⌁</span><h3>Ο κατάλογος δεν είναι συνδεδεμένος</h3><p>Η σύνδεση του δημόσιου καταλόγου με τη βάση δεδομένων δεν έχει ολοκληρωθεί ακόμη.</p><Link href="/register" className="site-primary">Δημιουργία λογαριασμού</Link></div>:
       visible.length===0?<div className="empty-catalog"><span>⌖</span><h3>Δεν βρέθηκαν ενεργές επιχειρήσεις</h3><p>{postalCode?`Δεν υπάρχει ακόμη επιβεβαιωμένη κάλυψη για τον Τ.Κ. ${postalCode}. `:"Δεν υπάρχουν ακόμη επιχειρήσεις στα φίλτρα σου. "}Δοκίμασε άλλη περιοχή ή αφαίρεσε τα φίλτρα.</p><Link href="/explore" className="text-link">Προβολή όλων →</Link></div>:
       <div className="store-grid">{visible.map(store=><Link href={`/store/${store.id}`} className="public-store-card" key={store.id}>
         <div className={`store-card-art type-${store.store_type}`}><span>{["restaurant","cafe"].includes(store.store_type)?"🍽️":store.store_type==="bakery"?"🥐":["supermarket","convenience"].includes(store.store_type)?"🛒":store.store_type==="pharmacy"?"💊":store.store_type==="flower_shop"?"💐":store.store_type==="pet_shop"?"🐾":"🛍️"}</span><small>{storeTypes[store.store_type]??"Τοπική επιχείρηση"}</small></div>
         <div className="store-card-body"><h3>{store.name}</h3><p>{store.description??`${store.city}, ${store.region}`}</p><div><span>Ελάχιστη {euro(store.minimum_order_cents)}</span><span>Παράδοση {euro(store.base_delivery_fee_cents)}</span></div></div>
       </Link>)}</div>}
    </section><SiteFooter/></main>;
}