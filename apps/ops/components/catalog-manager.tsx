"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Store = { id: string; name: string; city: string; logo_image_path?: string | null; cover_image_path?: string | null };
type Product = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  is_available: boolean;
  allergens: string[];
  image_path: string | null;
};

const MEDIA_BUCKET = "e-delivery-merchant-media";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
function publicMediaUrl(path: string | null | undefined) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !path) return null;
  return `${base.replace(/\\/$/, "")}/storage/v1/object/public/${MEDIA_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
function imageExtension(file: File) {
  return file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
}
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
  const [uploadingMedia, setUploadingMedia] = useState("");
  const [storeMedia, setStoreMedia] = useState<Record<string, { logo_image_path: string | null; cover_image_path: string | null }>>({});
  const activeStore = stores.find((store) => store.id === storeId);
  const activeMedia = {
    logo_image_path: storeMedia[storeId]?.logo_image_path ?? activeStore?.logo_image_path ?? null,
    cover_image_path: storeMedia[storeId]?.cover_image_path ?? activeStore?.cover_image_path ?? null
  };

  async function loadProducts() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !storeId) { setProducts([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id,name,description,price_cents,currency,is_available,allergens,image_path")
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

  function validateImage(file: File) {
    if (!acceptedImageTypes.has(file.type)) { setMessage("Χρησιμοποίησε εικόνα JPG, PNG ή WebP."); return false; }
    if (file.size > MAX_IMAGE_BYTES) { setMessage("Η εικόνα πρέπει να είναι έως 5 MB."); return false; }
    return true;
  }

  async function uploadStoreImage(slot: "logo_image_path" | "cover_image_path", file: File) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !storeId || !canManage || !validateImage(file)) return;
    const folder = slot === "logo_image_path" ? "logo" : "cover";
    const path = `${storeId}/${folder}/${crypto.randomUUID()}.${imageExtension(file)}`;
    const oldPath = activeMedia[slot];
    setUploadingMedia(slot); setMessage("");
    const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: false });
    if (uploadError) { setUploadingMedia(""); setMessage("Η μεταφόρτωση απέτυχε. Έλεγξε ότι εφαρμόστηκε η migration merchant media."); return; }
    const { error: updateError } = await supabase.from("stores").update({ [slot]: path }).eq("id", storeId);
    if (updateError) {
      await supabase.storage.from(MEDIA_BUCKET).remove([path]); setUploadingMedia("");
      setMessage("Η εικόνα ανέβηκε αλλά δεν συνδέθηκε με το κατάστημα. Έλεγξε τα δικαιώματα."); return;
    }
    setStoreMedia((current) => ({ ...current, [storeId]: { ...activeMedia, [slot]: path } }));
    if (oldPath) await supabase.storage.from(MEDIA_BUCKET).remove([oldPath]);
    setUploadingMedia(""); setMessage(slot === "logo_image_path" ? "Το λογότυπο ενημερώθηκε." : "Η φωτογραφία εξωφύλλου ενημερώθηκε.");
  }

  async function uploadProductImage(product: Product, file: File) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !storeId || !canManage || !validateImage(file)) return;
    const path = `${storeId}/products/${product.id}/${crypto.randomUUID()}.${imageExtension(file)}`;
    setUploadingMedia(product.id); setMessage("");
    const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: false });
    if (uploadError) { setUploadingMedia(""); setMessage("Η φωτογραφία προϊόντος δεν ανέβηκε. Έλεγξε τη migration και τα δικαιώματα."); return; }
    const { error: updateError } = await supabase.from("products").update({ image_path: path }).eq("id", product.id).eq("store_id", storeId);
    if (updateError) {
      await supabase.storage.from(MEDIA_BUCKET).remove([path]); setUploadingMedia("");
      setMessage("Η φωτογραφία δεν συνδέθηκε με το προϊόν."); return;
    }
    if (product.image_path) await supabase.storage.from(MEDIA_BUCKET).remove([product.image_path]);
    setUploadingMedia(""); await loadProducts(); setMessage("Η φωτογραφία προϊόντος ενημερώθηκε.");
  }

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
      {canManage ? <section className="merchant-media-panel">
        <div className="merchant-media-heading"><p className="eyebrow">STORE PHOTOGRAPHY</p><h3>Η εικόνα του καταστήματός σου</h3><p>Αυθεντικές φωτογραφίες της επιχείρησης · JPG, PNG ή WebP · έως 5 MB.</p></div>
        <div className="merchant-media-grid">
          <div className="merchant-media-slot">
            <div className="merchant-media-preview merchant-logo-preview">{publicMediaUrl(activeMedia.logo_image_path) ? <img src={publicMediaUrl(activeMedia.logo_image_path)!} alt={`Λογότυπο ${activeStore?.name ?? "καταστήματος"}`} /> : <span>{activeStore?.name.trim().slice(0,1).toLocaleUpperCase("el-GR") ?? "E"}</span>}</div>
            <div><strong>Λογότυπο</strong><small>Τετράγωνη εικόνα 1:1</small></div>
            <label className="media-upload-button">{uploadingMedia === "logo_image_path" ? "Μεταφόρτωση…" : "Ανέβασε λογότυπο"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(uploadingMedia)} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadStoreImage("logo_image_path", file); event.currentTarget.value = ""; }} /></label>
          </div>
          <div className="merchant-media-slot cover-slot">
            <div className="merchant-media-preview merchant-cover-preview" style={publicMediaUrl(activeMedia.cover_image_path) ? { backgroundImage: `url("${publicMediaUrl(activeMedia.cover_image_path)}")` } : undefined}>{!activeMedia.cover_image_path ? <span>Φωτογραφία καταστήματος</span> : null}</div>
            <div><strong>Φωτογραφία εξωφύλλου</strong><small>Οριζόντια φωτογραφία 16:9</small></div>
            <label className="media-upload-button">{uploadingMedia === "cover_image_path" ? "Μεταφόρτωση…" : "Ανέβασε εξώφυλλο"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(uploadingMedia)} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadStoreImage("cover_image_path", file); event.currentTarget.value = ""; }} /></label>
          </div>
        </div>
      </section> : null}
      {loading ? <p className="catalog-empty">Φόρτωση προϊόντων…</p> : products.length === 0 ? <div className="catalog-empty"><h3>Ο κατάλογος είναι ακόμη κενός</h3><p>Πρόσθεσε τα πρώτα πραγματικά προϊόντα και τις τιμές τους.</p></div> : <div className="catalog-list">
        {products.map((product) => <article className="catalog-product" key={product.id}>
          <div className="catalog-product-photo">{publicMediaUrl(product.image_path) ? <img src={publicMediaUrl(product.image_path)!} alt={`Φωτογραφία ${product.name}`} /> : <span>✳</span>}</div>
          <div className="catalog-product-info">
            <strong>{product.name}</strong>
            {product.description ? <p>{product.description}</p> : null}
            <span>{euro(product.price_cents)} · {product.is_available ? "Διαθέσιμο" : "Μη διαθέσιμο"}</span>
          </div>
          {canManage ? <div className="catalog-product-actions">
            <label className="media-upload-button compact">{uploadingMedia === product.id ? "Μεταφόρτωση…" : "Φωτογραφία"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(uploadingMedia) || saving} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadProductImage(product, file); event.currentTarget.value = ""; }} /></label>
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
