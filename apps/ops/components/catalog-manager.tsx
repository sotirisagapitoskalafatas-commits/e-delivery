"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Store = { id: string; name: string; city: string };
type Product = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  is_available: boolean;
  allergens: string[];
};

function euro(cents: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function CatalogManager({ stores, canManage }: { stores: Store[]; canManage: boolean }) {
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadProducts() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !storeId) { setProducts([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id,name,description,price_cents,currency,is_available,allergens")
      .eq("store_id", storeId)
      .order("name", { ascending: true });
    setLoading(false);
    if (error) {
      setMessage("Δεν ήταν δυνατή η φόρτωση καταλόγου. Έλεγξε τη σύνδεση και τα δικαιώματα καταστήματος.");
      return;
    }
    setProducts((data ?? []) as Product[]);
    setMessage("");
  }

  useEffect(() => { void loadProducts(); }, [storeId]);

  async function addProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !storeId) return;

    const numericPrice = Number(price.replace(",", "."));
    if (!name.trim() || !Number.isFinite(numericPrice) || numericPrice < 0 || numericPrice > 100000) {
      setMessage("Συμπλήρωσε όνομα και έγκυρη τιμή σε ευρώ.");
      return;
    }

    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("products").insert({
      store_id: storeId,
      name: name.trim(),
      description: description.trim() || null,
      price_cents: Math.round(numericPrice * 100),
      currency: "EUR",
      is_available: true,
      allergens: []
    });
    setSaving(false);

    if (error) {
      setMessage("Το προϊόν δεν αποθηκεύτηκε. Έλεγξε ότι έχεις δικαίωμα διαχείρισης του συγκεκριμένου καταστήματος.");
      return;
    }
    setName("");
    setDescription("");
    setPrice("");
    await loadProducts();
  }

  async function toggleAvailability(product: Product) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setSaving(true);
    const { error } = await supabase.from("products")
      .update({ is_available: !product.is_available })
      .eq("id", product.id)
      .eq("store_id", storeId);
    setSaving(false);
    if (error) setMessage("Δεν ήταν δυνατή η αλλαγή διαθεσιμότητας.");
    else await loadProducts();
  }

  async function removeProduct(product: Product) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setSaving(true);
    const { error } = await supabase.from("products")
      .delete()
      .eq("id", product.id)
      .eq("store_id", storeId);
    setSaving(false);
    if (error) setMessage("Δεν ήταν δυνατή η διαγραφή του προϊόντος.");
    else await loadProducts();
  }

  if (stores.length === 0) {
    return <section className="catalog-empty"><h2>Δεν έχει ανατεθεί κατάστημα</h2><p>Ο διαχειριστής πρέπει πρώτα να ολοκληρώσει την εγγραφή του εμπόρου και να συνδέσει τον λογαριασμό σου με ένα κατάστημα.</p></section>;
  }

  return <div className="catalog-layout">
    <section className="catalog-panel">
      <div className="catalog-toolbar">
        <div><p className="eyebrow">MERCHANT CATALOGUE</p><h2>Τα προϊόντα σου</h2></div>
        <select aria-label="Επιλογή καταστήματος" value={storeId} onChange={(event) => setStoreId(event.target.value)}>
          {stores.map((store) => <option key={store.id} value={store.id}>{store.name} · {store.city}</option>)}
        </select>
      </div>
      {message ? <p className="catalog-message" role="status">{message}</p> : null}
      {loading ? <p className="catalog-empty">Φόρτωση προϊόντων…</p> : products.length === 0 ? <div className="catalog-empty"><h3>Ο κατάλογος είναι ακόμη κενός</h3><p>Πρόσθεσε τα πρώτα πραγματικά προϊόντα και τις τιμές τους.</p></div> : <div className="catalog-list">
        {products.map((product) => <article className="catalog-product" key={product.id}>
          <div className="catalog-product-info">
            <strong>{product.name}</strong>
            {product.description ? <p>{product.description}</p> : null}
            <span>{euro(product.price_cents)} · {product.is_available ? "Διαθέσιμο" : "Μη διαθέσιμο"}</span>
          </div>
          {canManage ? <div className="catalog-product-actions">
            <button type="button" className="table-action" disabled={saving} onClick={() => toggleAvailability(product)}>{product.is_available ? "Απόκρυψη" : "Δημοσίευση"}</button>
            <button type="button" className="table-cancel" disabled={saving} onClick={() => removeProduct(product)}>Διαγραφή</button>
          </div> : null}
        </article>)}
      </div>}
    </section>

    {canManage ? <section className="catalog-panel">
      <p className="eyebrow">NEW ITEM</p><h2>Προσθήκη προϊόντος</h2>
      <form className="catalog-form" onSubmit={addProduct}>
        <label htmlFor="product-name">Ονομασία</label>
        <input id="product-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required placeholder="π.χ. Club sandwich" />
        <label htmlFor="product-description">Περιγραφή</label>
        <textarea id="product-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} rows={3} placeholder="Σύντομη περιγραφή και βασικά συστατικά" />
        <label htmlFor="product-price">Τιμή (€)</label>
        <input id="product-price" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} required placeholder="π.χ. 8,90" />
        <button className="primary-button" type="submit" disabled={saving}>{saving ? "Αποθήκευση…" : "Προσθήκη προϊόντος"}</button>
      </form>
      <p className="tiny-note">Οι τιμές αποθηκεύονται σε λεπτά του ευρώ. Τα αλλεργιογόνα πρέπει να συμπληρώνονται και να ελέγχονται πριν από δημόσια διάθεση· η ειδική διαχείρισή τους θα προστεθεί στο επόμενο βήμα.</p>
    </section> : null}
  </div>;
}
