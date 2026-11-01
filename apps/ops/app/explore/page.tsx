import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/public-site";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type StoreRow = { id: string; name: string; description: string | null; city: string; region: string; store_type: string; minimum_order_cents: number; base_delivery_fee_cents: number; service_postal_codes: string[]; logo_image_path: string | null; cover_image_path: string | null };
const categoryTypes: Record<string, string[]> = {
  food: ["restaurant", "cafe", "bakery"],
  groceries: ["supermarket", "convenience"],
  shops: ["retail", "pharmacy", "flower_shop", "pet_shop", "parcel_point", "other"]
};
const categoryNames: Record<string, string> = { food: "Φαγητό", groceries: "Supermarket", shops: "Καταστήματα", all: "Όλες οι επιχειρήσεις" };
const typeNames: Record<string, string> = {
  restaurant: "Εστιατόρια", cafe: "Καφέδες", bakery: "Αρτοποιήματα", supermarket: "Supermarket",
  convenience: "Mini market", retail: "Καταστήματα", pharmacy: "Φαρμακεία",
  flower_shop: "Ανθοπωλεία", pet_shop: "Pet shops", parcel_point: "Σημεία αποστολών",
  service_provider: "Τοπικές υπηρεσίες", other: "Τοπικές επιχειρήσεις"
};
const MEDIA_BUCKET = "e-delivery-merchant-media";
const photos: Record<string, string> = {
  restaurant: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=85",
  cafe: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1000&q=85",
  bakery: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1000&q=85",
  supermarket: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=85",
  convenience: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1000&q=85",
  pharmacy: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1000&q=85",
  flower_shop: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1000&q=85",
  pet_shop: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1000&q=85",
  retail: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1000&q=85"
};
function publicMediaUrl(path: string | null | undefined) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !path) return null;
  return `${base.replace(/\\/$/, "")}/storage/v1/object/public/${MEDIA_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
const euro = (cents: number) => new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(cents / 100);
const validTypes = new Set(Object.keys(typeNames));
export const dynamic = "force-dynamic";

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ category?: string; type?: string; q?: string; postal_code?: string }> }) {
  const params = await searchParams;
  const category = categoryTypes[params.category ?? ""] ? params.category! : "all";
  const selectedType = params.type && validTypes.has(params.type) ? params.type : null;
  const query = (params.q ?? "").trim().toLocaleLowerCase("el-GR");
  const postalCode = (params.postal_code ?? "").replace(/\D/g, "").slice(0, 5);
  const supabase = await createSupabaseServerClient();
  let stores: StoreRow[] = [];
  let loadError = false;

  if (supabase) {
    const { data, error } = await supabase.from("stores")
      .select("id,name,description,city,region,store_type,minimum_order_cents,base_delivery_fee_cents,service_postal_codes,logo_image_path,cover_image_path")
      .eq("is_active", true).eq("accepts_orders", true).order("name").limit(200);
    loadError = Boolean(error);
    stores = (data ?? []) as StoreRow[];
  } else loadError = true;

  const visible = stores.filter((store) => {
    const matchesType = selectedType ? store.store_type === selectedType : category === "all" || (categoryTypes[category] ?? []).includes(store.store_type);
    const searchable = `${store.name} ${store.description ?? ""} ${store.city} ${store.region}`.toLocaleLowerCase("el-GR");
    return matchesType && (!query || searchable.includes(query)) && (!postalCode || store.service_postal_codes?.includes(postalCode));
  });
  const heading = selectedType ? typeNames[selectedType] : categoryNames[category];

  return <main className="public-page market-public-page">
    <SiteHeader />
    <section className="explore-hero"><span className="section-eyebrow">ΑΝΑΚΑΛΥΨΕ ΤΗΝ ΠΕΡΙΟΧΗ ΣΟΥ</span><h1>Τι θα ήθελες <span>σήμερα;</span></h1><p>Δες τις επιχειρήσεις που εξυπηρετούν την περιοχή σου.</p>
      <form className="explore-search" action="/explore" method="get">
        {selectedType ? <input type="hidden" name="type" value={selectedType} /> : <input type="hidden" name="category" value={category} />}
        <input name="q" defaultValue={params.q ?? ""} placeholder="Αναζήτηση καταστήματος ή πόλης" aria-label="Αναζήτηση" />
        <input name="postal_code" defaultValue={postalCode} inputMode="numeric" maxLength={5} placeholder="Τ.Κ." aria-label="Ταχυδρομικός κώδικας" />
        <button className="site-primary" type="submit">Αναζήτηση</button>
      </form>
    </section>
    <section className="explore-content">
      <div className="explore-filters">
        {Object.entries(categoryNames).map(([key, label]) => <Link key={key} className={!selectedType && category === key ? "filter-chip active" : "filter-chip"} href={key === "all" ? "/explore" : `/explore?category=${key}`}>{label}</Link>)}
        {Object.entries(typeNames).map(([key, label]) => <Link key={key} className={selectedType === key ? "filter-chip active" : "filter-chip"} href={`/explore?type=${key}`}>{label}</Link>)}
      </div>
      <div className="section-heading explore-heading"><div><span className="section-eyebrow">{heading}</span><h2>{visible.length ? `${visible.length} διαθέσιμες επιλογές` : "Επιλογές στην περιοχή σου"}</h2></div><span className="result-hint">Εμφανίζονται μόνο ενεργά καταστήματα</span></div>
      {loadError ? <div className="empty-catalog"><span>⌁</span><h3>Ο κατάλογος δεν είναι συνδεδεμένος</h3><p>Η σύνδεση του δημόσιου καταλόγου δεν έχει ολοκληρωθεί ακόμη.</p><Link href="/register" className="site-primary">Δημιουργία λογαριασμού</Link></div> :
       visible.length === 0 ? <div className="empty-catalog"><span>⌖</span><h3>Δεν βρέθηκαν ενεργές επιχειρήσεις</h3><p>{postalCode ? `Δεν υπάρχει ακόμη επιβεβαιωμένη κάλυψη για τον Τ.Κ. ${postalCode}. ` : "Δεν υπάρχουν ακόμη επιχειρήσεις στα φίλτρα σου. "}Δοκίμασε άλλη περιοχή ή αφαίρεσε τα φίλτρα.</p><Link href="/explore" className="text-link">Προβολή όλων →</Link></div> :
       <div className="store-grid">{visible.map((store) => <Link href={`/store/${store.id}`} className="public-store-card" key={store.id}>
         <div className={`store-card-art type-${store.store_type}`} style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.02), rgba(0,0,0,.48)), url("${publicMediaUrl(store.cover_image_path) ?? photos[store.store_type] ?? photos.retail}")` }}>{publicMediaUrl(store.logo_image_path) ? <img className="store-card-logo" src={publicMediaUrl(store.logo_image_path)!} alt="" /> : <span aria-hidden="true">{store.store_type === "restaurant" ? "🍽️" : store.store_type === "cafe" ? "☕" : store.store_type === "bakery" ? "🥐" : ["supermarket","convenience"].includes(store.store_type) ? "🛒" : store.store_type === "pharmacy" ? "💊" : store.store_type === "flower_shop" ? "💐" : store.store_type === "pet_shop" ? "🐾" : "🛍️"}</span>}<small>{typeNames[store.store_type] ?? "Τοπική επιχείρηση"}{!store.cover_image_path ? " · Ενδεικτική εικόνα" : ""}</small></div>
         <div className="store-card-body"><h3>{store.name}</h3><p>{store.description ?? `${store.city}, ${store.region}`}</p><div><span>Ελάχιστη {euro(store.minimum_order_cents)}</span><span>Παράδοση {euro(store.base_delivery_fee_cents)}</span></div></div>
       </Link>)}</div>}
    </section>
    <SiteFooter />
  </main>;
}