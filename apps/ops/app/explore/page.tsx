import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/public-site";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type StoreRow = {
  id: string;
  name: string;
  description: string | null;
  city: string;
  region: string;
  store_type: string;
  minimum_order_cents: number;
  base_delivery_fee_cents: number;
  prep_time_minutes: number;
  service_postal_codes: string[];
  logo_image_path: string | null;
  cover_image_path: string | null;
  timezone: string;
  openStatus?: "open" | "closed" | "unknown";
};

type StoreHoursRow = { store_id: string; weekday: number; opens_at: string | null; closes_at: string | null; is_closed: boolean };

type SortOption = "recommended" | "delivery" | "preparation" | "minimum";
type MenuCategoryRow = { id: string; store_id: string; name: string };

const categoryTypes: Record<string, string[]> = {
  food: ["restaurant", "cafe", "bakery"],
  groceries: ["supermarket", "convenience"],
  shops: ["retail", "pharmacy", "flower_shop", "pet_shop", "parcel_point", "service_provider", "other"]
};

const categoryNames: Record<string, string> = {
  all: "Όλες οι επιλογές",
  food: "Φαγητό & καφές",
  groceries: "Supermarket",
  shops: "Καταστήματα & υπηρεσίες"
};

const typeNames: Record<string, string> = {
  restaurant: "Εστιατόρια",
  cafe: "Καφέδες",
  bakery: "Αρτοποιεία",
  supermarket: "Supermarket",
  convenience: "Mini market",
  retail: "Καταστήματα",
  pharmacy: "Φαρμακεία",
  flower_shop: "Ανθοπωλεία",
  pet_shop: "Pet shops",
  parcel_point: "Σημεία αποστολών",
  service_provider: "Τοπικές υπηρεσίες",
  other: "Λοιπές επιχειρήσεις"
};

const MEDIA_BUCKET = "e-delivery-merchant-media";

const photos: Record<string, string> = {
  restaurant: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=85",
  cafe: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=85",
  bakery: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=85",
  supermarket: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=85",
  convenience: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=85",
  pharmacy: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=85",
  flower_shop: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1200&q=85",
  pet_shop: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1200&q=85",
  retail: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1200&q=85"
};

const marketTabs = [
  { key: "food", title: "Φαγητό & καφές", detail: "Εστιατόρια, καφέ και φούρνοι", image: photos.restaurant, icon: "🍽️" },
  { key: "groceries", title: "Supermarket", detail: "Καθημερινές αγορές για το σπίτι", image: photos.supermarket, icon: "🛒" },
  { key: "shops", title: "Καταστήματα", detail: "Τοπικά καταστήματα και υπηρεσίες", image: photos.retail, icon: "🛍️" }
];

function storeOpenStatus(storeId: string, timezone: string, rows: StoreHoursRow[]): "open" | "closed" | "unknown" {
  const storeRows = rows.filter((row) => row.store_id === storeId);
  if (storeRows.length < 14) return "unknown";
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone || "Europe/Athens",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date()).reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});
    const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const weekdayLabel = parts.weekday;
    if (!weekdayLabel || !(weekdayLabel in weekdays)) return "unknown";
    const today = weekdays[weekdayLabel];
    if (today === undefined) return "unknown";
    const nowMinutes = Number(parts.hour) * 60 + Number(parts.minute);
    const previousDay = (today + 6) % 7;
    const toMinutes = (value: string) => {
      const timeParts = value.slice(0, 5).split(":");
      const hours = Number(timeParts[0]);
      const minutes = Number(timeParts[1]);
      return hours * 60 + minutes;
    };
    const open = storeRows.some((row) => {
      if (row.is_closed || !row.opens_at || !row.closes_at) return false;
      const start = toMinutes(row.opens_at);
      const end = toMinutes(row.closes_at);
      if (end > start) return row.weekday === today && nowMinutes >= start && nowMinutes < end;
      return (row.weekday === today && nowMinutes >= start) ||
        (row.weekday === previousDay && nowMinutes < end);
    });
    return open ? "open" : "closed";
  } catch {
    return "unknown";
  }
}

function publicMediaUrl(path: string | null | undefined) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !path) return null;
  const root = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${root}/storage/v1/object/public/${MEDIA_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function euro(cents: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function queryHref(params: {
  category?: string | undefined;
  type?: string | undefined;
  q?: string | undefined;
  address?: string | undefined;
  postalCode?: string | undefined;
  sort?: SortOption | undefined;
  freeDelivery?: boolean | undefined;
  menuCategory?: string | undefined;
}) {
  const query = new URLSearchParams();
  if (params.category && params.category !== "all") query.set("category", params.category);
  if (params.type) query.set("type", params.type);
  if (params.q) query.set("q", params.q);
  if (params.address) query.set("address", params.address);
  if (params.postalCode) query.set("postal_code", params.postalCode);
  if (params.sort && params.sort !== "recommended") query.set("sort", params.sort);
  if (params.freeDelivery) query.set("free_delivery", "1");
  if (params.menuCategory) query.set("menu_category", params.menuCategory);
  const encoded = query.toString();
  return encoded ? `/explore?${encoded}` : "/explore";
}

export const dynamic = "force-dynamic";

export default async function ExplorePage({
  searchParams
}: {
  searchParams: Promise<{
    category?: string;
    type?: string;
    q?: string;
    address?: string;
    postal_code?: string;
    sort?: string;
    free_delivery?: string;
    menu_category?: string;
  }>;
}) {
  const params = await searchParams;
  const category = categoryTypes[params.category ?? ""] ? params.category! : "all";
  const validTypes = new Set(Object.keys(typeNames));
  const selectedType = params.type && validTypes.has(params.type) ? params.type : null;
  const query = (params.q ?? "").trim().slice(0, 100).toLocaleLowerCase("el-GR");
  const address = (params.address ?? "").trim().slice(0, 120);
  const postalCode = (params.postal_code ?? "").replace(/\D/g, "").slice(0, 5);
  const sort: SortOption = ["delivery", "preparation", "minimum"].includes(params.sort ?? "")
    ? params.sort as SortOption
    : "recommended";
  const freeDeliveryOnly = params.free_delivery === "1";
  const requestedMenuCategory = (params.menu_category ?? "").trim().slice(0, 80);

  const supabase = await createSupabaseServerClient();
  let stores: StoreRow[] = [];
  let menuCategories: MenuCategoryRow[] = [];
  let loadError = false;

  if (supabase) {
    const [storeResult, categoryResult] = await Promise.all([
      supabase.from("stores")
        .select("id,name,description,city,region,store_type,minimum_order_cents,base_delivery_fee_cents,prep_time_minutes,service_postal_codes,logo_image_path,cover_image_path,timezone")
        .eq("is_active", true)
        .eq("accepts_orders", true)
        .order("name")
        .limit(200),
      supabase.from("categories")
        .select("id,store_id,name")
        .eq("is_active", true)
        .order("sort_order")
        .limit(1000)
    ]);
    loadError = Boolean(storeResult.error);
    stores = (storeResult.data ?? []) as StoreRow[];
    if (!categoryResult.error) menuCategories = (categoryResult.data ?? []) as MenuCategoryRow[];
    if (stores.length) {
      const { data: hoursRows, error: hoursError } = await supabase.from("store_hours")
        .select("store_id,weekday,opens_at,closes_at,is_closed")
        .in("store_id", stores.map((store) => store.id))
        .limit(3000);
      if (!hoursError) {
        const hours = (hoursRows ?? []) as StoreHoursRow[];
        stores = stores.map((store) => ({ ...store, openStatus: storeOpenStatus(store.id, store.timezone, hours) }));
      }
    }
  } else {
    loadError = true;
  }

  const activeMenuCategoryNames = Array.from(new Set(
    menuCategories.map((item) => item.name.trim()).filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, "el"));
  const selectedMenuCategory = activeMenuCategoryNames.find((name) =>
    name.localeCompare(requestedMenuCategory, "el", { sensitivity: "base" }) === 0
  ) ?? "";

  const visible = stores.filter((store) => {
    const matchesType = selectedType
      ? store.store_type === selectedType
      : category === "all" || (categoryTypes[category] ?? []).includes(store.store_type);
    const searchable = `${store.name} ${store.description ?? ""} ${store.city} ${store.region}`.toLocaleLowerCase("el-GR");
    const matchesSearch = !query || searchable.includes(query);
    const matchesPostalCode = !postalCode || store.service_postal_codes?.includes(postalCode);
    const matchesFreeDelivery = !freeDeliveryOnly || store.base_delivery_fee_cents === 0;
    const matchesMenuCategory = !selectedMenuCategory || menuCategories.some((item) => item.store_id === store.id && item.name.localeCompare(selectedMenuCategory, "el", { sensitivity: "base" }) === 0);
    return matchesType && matchesSearch && matchesPostalCode && matchesFreeDelivery && matchesMenuCategory;
  });

  const sorted = [...visible].sort((a, b) => {
    if (sort === "delivery") return a.base_delivery_fee_cents - b.base_delivery_fee_cents || a.name.localeCompare(b.name, "el");
    if (sort === "preparation") return a.prep_time_minutes - b.prep_time_minutes || a.name.localeCompare(b.name, "el");
    if (sort === "minimum") return a.minimum_order_cents - b.minimum_order_cents || a.name.localeCompare(b.name, "el");
    return a.name.localeCompare(b.name, "el");
  });

  const activeTypes = selectedType
    ? [selectedType]
    : category === "all"
      ? Object.keys(typeNames)
      : (categoryTypes[category] ?? []);
  const heading = selectedType ? typeNames[selectedType] : categoryNames[category];
  const sharedQuery = { category, q: params.q?.trim(), address, postalCode, sort, freeDelivery: freeDeliveryOnly, menuCategory: selectedMenuCategory };

  return (
    <main className="public-page market-public-page">
      <SiteHeader />

      <section className="explore-hero">
        <div className="explore-hero-inner">
          <span className="section-eyebrow">E-DELIVERY · Η ΑΓΟΡΑ ΤΗΣ ΓΕΙΤΟΝΙΑΣ ΣΟΥ</span>
          <h1>Βάλε τη διεύθυνσή σου<span>.</span></h1>
          <p>Δες τι μπορεί να παραδοθεί στην περιοχή σου από καταστήματα που εξυπηρετούν πραγματικά τον ταχυδρομικό σου κώδικα.</p>
          <form className="explore-search" action="/explore" method="get">
            {selectedType ? <input type="hidden" name="type" value={selectedType} /> : <input type="hidden" name="category" value={category} />}
            {selectedMenuCategory ? <input type="hidden" name="menu_category" value={selectedMenuCategory} /> : null}
            <label className="explore-address-field">
              <span>Διεύθυνση παράδοσης</span>
              <input name="address" defaultValue={address} maxLength={120} placeholder="Οδός και αριθμός" aria-label="Διεύθυνση παράδοσης" />
            </label>
            <label className="explore-postcode-field">
              <span>Ταχυδρομικός κώδικας</span>
              <input name="postal_code" defaultValue={postalCode} inputMode="numeric" pattern="[0-9]{5}" minLength={5} maxLength={5} placeholder="5 ψηφία" aria-label="Ταχυδρομικός κώδικας" />
            </label>
            <label className="explore-query-field">
              <span>Αναζήτηση</span>
              <input name="q" defaultValue={params.q ?? ""} maxLength={100} placeholder="Κατάστημα ή προϊόν" aria-label="Αναζήτηση καταστήματος ή προϊόντος" />
            </label>
            <button className="site-primary" type="submit">Παράγγειλε τώρα <span aria-hidden="true">→</span></button>
          </form>
          <small className="explore-coverage-note">Η κάλυψη παράδοσης ελέγχεται με βάση τον Τ.Κ. · Η διεύθυνση δεν αποθηκεύεται σε αυτό το βήμα.</small>
        </div>
      </section>

      <section className="explore-content">
        <div className="market-category-tabs">
          {marketTabs.map((tab) => {
            const count = stores.filter((store) =>
              (categoryTypes[tab.key] ?? []).includes(store.store_type) &&
              (!postalCode || store.service_postal_codes?.includes(postalCode))
            ).length;
            return (
              <Link
                key={tab.key}
                href={queryHref({ ...sharedQuery, category: tab.key, type: undefined })}
                className={category === tab.key && !selectedType ? "market-category-tab active" : "market-category-tab"}
                style={{ backgroundImage: `linear-gradient(90deg, rgba(18,18,18,.72), rgba(18,18,18,.12)), url("${tab.image}")` }}
              >
                <span className="market-category-tab-icon">{tab.icon}</span>
                <span className="market-category-tab-copy"><strong>{tab.title}</strong><small>{tab.detail}</small></span>
                <span className="market-category-tab-count">{count} διαθέσιμα</span>
              </Link>
            );
          })}
        </div>

        <div className="explore-subcategories">
          <div className="explore-subcategories-heading">
            <div><span className="section-eyebrow">ΑΝΑΚΑΛΥΨΕ</span><h2>Κατηγορίες</h2></div>
            <Link href={queryHref({ ...sharedQuery, category: "all", type: undefined })}>Όλες οι κατηγορίες →</Link>
          </div>
          <div className="explore-filters">
            {activeTypes.map((key) => {
              const count = stores.filter((store) => store.store_type === key && (!postalCode || store.service_postal_codes?.includes(postalCode))).length;
              if (!count && category !== "all" && !selectedType) return null;
              return (
                <Link
                  key={key}
                  className={selectedType === key ? "filter-chip active" : "filter-chip"}
                  href={queryHref({ ...sharedQuery, category, type: selectedType === key ? undefined : key })}
                >
                  {typeNames[key] ?? key}<span>{count}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {activeMenuCategoryNames.length > 0 ? <section className="explore-menu-category-section">
          <div className="explore-subcategories-heading"><div><span className="section-eyebrow">ΑΝΑΛΟΓΑ ΜΕ ΤΟΝ ΚΑΤΑΛΟΓΟ</span><h2>Κουζίνες & κατηγορίες</h2></div></div>
          <div className="explore-menu-category-chips">
            <Link className={!selectedMenuCategory ? "menu-category-chip active" : "menu-category-chip"} href={queryHref({ ...sharedQuery, menuCategory: undefined })}>Όλα</Link>
            {activeMenuCategoryNames.map((name) => {
              const count = new Set(menuCategories.filter((item) => item.name.localeCompare(name, "el", { sensitivity: "base" }) === 0 && stores.some((store) => store.id === item.store_id && (!postalCode || store.service_postal_codes?.includes(postalCode)))).map((item) => item.store_id)).size;
              if (!count) return null;
              return <Link key={name} className={selectedMenuCategory === name ? "menu-category-chip active" : "menu-category-chip"} href={queryHref({ ...sharedQuery, menuCategory: selectedMenuCategory === name ? undefined : name })}>{name}<span>{count}</span></Link>;
            })}
          </div>
        </section> : null}

        <div className="explore-toolbar">
          <div className="explore-toolbar-copy">
            <span className="section-eyebrow">{heading}</span>
            <h2>{sorted.length} {sorted.length === 1 ? "κατάστημα" : "καταστήματα"}</h2>
            <small>{postalCode ? `Εξυπηρετούν τον Τ.Κ. ${postalCode}` : "Επίλεξε Τ.Κ. για επιβεβαίωση περιοχής"}</small>
          </div>
          <form className="explore-sort-form" action="/explore" method="get">
            {selectedType ? <input type="hidden" name="type" value={selectedType} /> : <input type="hidden" name="category" value={category} />}
            <input type="hidden" name="address" value={address} />
            <input type="hidden" name="postal_code" value={postalCode} />
            <input type="hidden" name="q" value={params.q ?? ""} />
            {selectedMenuCategory ? <input type="hidden" name="menu_category" value={selectedMenuCategory} /> : null}
            <label>
              <span>Ταξινόμηση</span>
              <select name="sort" defaultValue={sort}>
                <option value="recommended">Προκαθορισμένο</option>
                <option value="delivery">Κόστος delivery</option>
                <option value="preparation">Χρόνος προετοιμασίας</option>
                <option value="minimum">Ελάχιστη παραγγελία</option>
              </select>
            </label>
            <label className="explore-free-delivery">
              <input type="checkbox" name="free_delivery" value="1" defaultChecked={freeDeliveryOnly} />
              <span>Δωρεάν delivery</span>
            </label>
            <button type="submit">Εφαρμογή</button>
          </form>
        </div>

        {loadError ? (
          <div className="empty-catalog"><span>⌁</span><h3>Ο κατάλογος δεν είναι συνδεδεμένος</h3><p>Η σύνδεση του δημόσιου καταλόγου δεν έχει ολοκληρωθεί ακόμη.</p></div>
        ) : sorted.length === 0 ? (
          <div className="empty-catalog">
            <span>⌖</span>
            <h3>Δεν βρέθηκαν διαθέσιμα καταστήματα</h3>
            <p>{postalCode ? `Δεν υπάρχει ακόμη επιβεβαιωμένη κάλυψη για τον Τ.Κ. ${postalCode}. ` : "Δεν υπάρχουν επιχειρήσεις στα συγκεκριμένα φίλτρα. "}Δοκίμασε άλλη περιοχή ή αφαίρεσε κάποιο φίλτρο.</p>
            <Link href={queryHref({ category: "all", address, postalCode })} className="text-link">Καθαρισμός φίλτρων →</Link>
          </div>
        ) : (
          <div className="store-grid">
            {sorted.map((store) => {
              const coverUrl = publicMediaUrl(store.cover_image_path) ?? photos[store.store_type] ?? photos.retail;
              const logoUrl = publicMediaUrl(store.logo_image_path);
              return (
                <Link href={`/store/${store.id}`} className="public-store-card" key={store.id}>
                  <div className={`store-card-art type-${store.store_type}`} style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.02), rgba(0,0,0,.48)), url("${coverUrl}")` }}>
                    {logoUrl ? <img className="store-card-logo" src={logoUrl} alt="" /> : <span aria-hidden="true">{
                      store.store_type === "restaurant" ? "🍽️" :
                      store.store_type === "cafe" ? "☕" :
                      store.store_type === "bakery" ? "🥐" :
                      ["supermarket", "convenience"].includes(store.store_type) ? "🛒" :
                      store.store_type === "pharmacy" ? "💊" :
                      store.store_type === "flower_shop" ? "💐" :
                      store.store_type === "pet_shop" ? "🐾" : "🛍️"
                    }</span>}
                    <small>{typeNames[store.store_type] ?? "Τοπική επιχείρηση"}{!store.cover_image_path ? " · Ενδεικτική εικόνα" : ""}</small>
                  </div>
                  <div className="store-card-body">
                    <h3>{store.name}</h3>
                    <p>{store.description ?? `${store.city}, ${store.region}`}</p>
                    {store.openStatus === "open" ? <span className="store-hours-status is-open">Ανοιχτό τώρα</span> : store.openStatus === "closed" ? <span className="store-hours-status is-closed">Κλειστό τώρα</span> : null}
                    <div className="store-card-metadata">
                      <span>Προετοιμασία ~{store.prep_time_minutes}′</span>
                      <span>Ελάχιστη {euro(store.minimum_order_cents)}</span>
                      <span>{store.base_delivery_fee_cents === 0 ? "Δωρεάν delivery" : `Delivery ${euro(store.base_delivery_fee_cents)}`}</span>
                    </div>
                    <strong className="store-card-cta">Δες κατάστημα <span aria-hidden="true">→</span></strong>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
