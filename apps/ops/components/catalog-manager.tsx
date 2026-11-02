"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Store = { id: string; name: string; city: string; logo_image_path?: string | null; cover_image_path?: string | null };
type ScheduleSlot = { opens_at: string; closes_at: string };
type DaySchedule = { isClosed: boolean; slots: ScheduleSlot[] };
type StoreHourRow = { weekday: number; slot_order: number; opens_at: string | null; closes_at: string | null; is_closed: boolean };
const weekdays = [
  { weekday: 1, label: "Δευτέρα" },
  { weekday: 2, label: "Τρίτη" },
  { weekday: 3, label: "Τετάρτη" },
  { weekday: 4, label: "Πέμπτη" },
  { weekday: 5, label: "Παρασκευή" },
  { weekday: 6, label: "Σάββατο" },
  { weekday: 0, label: "Κυριακή" }
];
function createEmptySchedule(): DaySchedule[] {
  return Array.from({ length: 7 }, () => ({ isClosed: true, slots: [{ opens_at: "09:00", closes_at: "17:00" }] }));
}
function timeMinutes(value: string) {
  const timeParts = value.split(":");
  const hours = Number(timeParts[0]);
  const minutes = Number(timeParts[1]);
  return hours * 60 + minutes;
}
function slotsOverlap(slots: ScheduleSlot[]) {
  type TimeRange = [number, number];
  const ranges: TimeRange[][] = slots.map((slot) => {
    const start = timeMinutes(slot.opens_at);
    const end = timeMinutes(slot.closes_at);
    return end > start ? [[start, end]] : [[start, 1440], [0, end]];
  });
  for (let i = 0; i < ranges.length; i += 1) {
    for (let j = i + 1; j < ranges.length; j += 1) {
      const first = ranges[i] ?? [];
      const second = ranges[j] ?? [];
      if (first.some(([a, b]) => second.some(([x, y]) => a < y && x < b))) return true;
    }
  }
  return false;
}

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
  const root = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${root}/storage/v1/object/public/${MEDIA_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;;
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
  const [allergensText, setAllergensText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState("");
  const [editingProductId, setEditingProductId] = useState("");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editAllergensText, setEditAllergensText] = useState("");
  const [storeMedia, setStoreMedia] = useState<Record<string, { logo_image_path: string | null; cover_image_path: string | null }>>({});
  const [schedule, setSchedule] = useState<DaySchedule[]>(createEmptySchedule);
  const [hoursLoading, setHoursLoading] = useState(false);
  const [hoursSaving, setHoursSaving] = useState(false);
  const [hoursConfigured, setHoursConfigured] = useState(false);
  const [hoursMessage, setHoursMessage] = useState("");
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

  async function loadStoreHours() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !storeId) { setSchedule(createEmptySchedule()); setHoursConfigured(false); return; }
    setHoursLoading(true);
    setHoursMessage("");
    const { data, error } = await supabase.from("store_hours")
      .select("weekday,slot_order,opens_at,closes_at,is_closed")
      .eq("store_id", storeId)
      .order("weekday")
      .order("slot_order");
    setHoursLoading(false);
    if (error) {
      setSchedule(createEmptySchedule());
      setHoursConfigured(false);
      setHoursMessage("Το ωράριο δεν φορτώθηκε. Έλεγξε ότι εφαρμόστηκε η migration 008 και τα δικαιώματα καταστήματος.");
      return;
    }
    const grouped: Record<number, Record<number, ScheduleSlot>> = {};
    for (const row of (data ?? []) as StoreHourRow[]) {
      if (row.is_closed || !row.opens_at || !row.closes_at) continue;
      const daySlots = grouped[row.weekday] ?? {};
      daySlots[row.slot_order] = {
        opens_at: row.opens_at.slice(0, 5),
        closes_at: row.closes_at.slice(0, 5)
      };
      grouped[row.weekday] = daySlots;
    }
    const next = Array.from({ length: 7 }, (_, weekday) => {
      const slots = [grouped[weekday]?.[0], grouped[weekday]?.[1]].filter((slot): slot is ScheduleSlot => Boolean(slot));
      return { isClosed: slots.length === 0, slots: slots.length ? slots : [{ opens_at: "09:00", closes_at: "17:00" }] };
    });
    setSchedule(next);
    const rowCount = (data ?? []).length;
    setHoursConfigured(rowCount === 14);
    setHoursMessage(rowCount === 0
      ? "Δεν έχει καταχωρηθεί ωράριο. Το κατάστημα θα εμφανίζεται χωρίς ένδειξη ανοιχτού/κλειστού."
      : rowCount === 14
        ? "Το εβδομαδιαίο ωράριο έχει φορτωθεί."
        : "Το ωράριο είναι ελλιπές. Αποθήκευσε ξανά και τις επτά ημέρες για σωστές ενδείξεις.");
  }

  function updateScheduleSlot(weekday: number, slotIndex: number, field: keyof ScheduleSlot, value: string) {
    setSchedule((current) => current.map((day, index) => index === weekday
      ? { ...day, slots: day.slots.map((slot, i) => i === slotIndex ? { ...slot, [field]: value } : slot) }
      : day));
  }

  function setDayOpen(weekday: number, isOpen: boolean) {
    setSchedule((current) => current.map((day, index) => index === weekday
      ? { ...day, isClosed: !isOpen, slots: day.slots.length ? day.slots : [{ opens_at: "09:00", closes_at: "17:00" }] }
      : day));
  }

  function addScheduleSlot(weekday: number) {
    setSchedule((current) => current.map((day, index) => index === weekday && day.slots.length < 2
      ? { ...day, slots: [...day.slots, { opens_at: "13:00", closes_at: "17:00" }] }
      : day));
  }

  function removeScheduleSlot(weekday: number, slotIndex: number) {
    setSchedule((current) => current.map((day, index) => index === weekday
      ? { ...day, slots: day.slots.filter((_, i) => i !== slotIndex) }
      : day));
  }

  async function saveStoreHours() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !storeId || !canManage) return;
    const payload: Array<{
      store_id: string; weekday: number; slot_order: number;
      opens_at: string | null; closes_at: string | null; is_closed: boolean; updated_at: string;
    }> = [];
    const updatedAt = new Date().toISOString();

    for (let weekday = 0; weekday < 7; weekday += 1) {
      const day = schedule[weekday];
      if (!day || day.isClosed) {
        for (let slot_order = 0; slot_order < 2; slot_order += 1) {
          payload.push({ store_id: storeId, weekday, slot_order, opens_at: null, closes_at: null, is_closed: true, updated_at: updatedAt });
        }
        continue;
      }
      if (day.slots.length < 1 || day.slots.length > 2) {
        setHoursMessage("Κάθε ανοιχτή ημέρα χρειάζεται ένα ή δύο χρονικά διαστήματα.");
        return;
      }
      for (const slot of day.slots) {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.opens_at) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.closes_at) || slot.opens_at === slot.closes_at) {
          setHoursMessage("Συμπλήρωσε έγκυρες ώρες έναρξης και λήξης. Ίδιες ώρες δεν αποτελούν έγκυρο διάστημα.");
          return;
        }
      }
      if (slotsOverlap(day.slots)) {
        setHoursMessage("Τα δύο χρονικά διαστήματα της ίδιας ημέρας δεν πρέπει να επικαλύπτονται.");
        return;
      }
      for (let slot_order = 0; slot_order < 2; slot_order += 1) {
        const slot = day.slots[slot_order];
        payload.push({
          store_id: storeId, weekday, slot_order,
          opens_at: slot?.opens_at ?? null,
          closes_at: slot?.closes_at ?? null,
          is_closed: !slot,
          updated_at: updatedAt
        });
      }
    }

    setHoursSaving(true);
    setHoursMessage("");
    const { error } = await supabase.from("store_hours").upsert(payload, { onConflict: "store_id,weekday,slot_order" });
    setHoursSaving(false);
    if (error) {
      setHoursMessage("Το ωράριο δεν αποθηκεύτηκε. Έλεγξε τη migration 008 και τα δικαιώματα ιδιοκτήτη/διαχειριστή.");
      return;
    }
    setHoursConfigured(true);
    setHoursMessage("Το εβδομαδιαίο ωράριο αποθηκεύτηκε.");
  }

  useEffect(() => { void loadProducts(); void loadStoreHours(); }, [storeId]);

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
      allergens: Array.from(new Set(allergensText.split(",").map((value) => value.trim()).filter(Boolean)))
    });
    setSaving(false);

    if (error) {
      setMessage("Το προϊόν δεν αποθηκεύτηκε. Έλεγξε ότι έχεις δικαίωμα διαχείρισης του συγκεκριμένου καταστήματος.");
      return;
    }
    setName("");
    setDescription("");
    setPrice("");
    setAllergensText("");
    await loadProducts();
  }

  function beginProductEdit(product: Product) {
    setEditingProductId(product.id);
    setEditName(product.name);
    setEditDescription(product.description ?? "");
    setEditPrice((product.price_cents / 100).toFixed(2).replace(".", ","));
    setEditAllergensText(product.allergens.join(", "));
    setMessage("");
  }

  function cancelProductEdit() {
    setEditingProductId("");
    setEditName("");
    setEditDescription("");
    setEditPrice("");
    setEditAllergensText("");
  }

  async function saveProductEdit(event: React.FormEvent<HTMLFormElement>, product: Product) {
    event.preventDefault();
    const supabase = createSupabaseBrowserClient();
    const numericPrice = Number(editPrice.replace(",", "."));
    if (!supabase || !storeId) return;
    if (!editName.trim() || !Number.isFinite(numericPrice) || numericPrice < 0 || numericPrice > 100000) {
      setMessage("Συμπλήρωσε ονομασία και έγκυρη τιμή σε ευρώ.");
      return;
    }

    const allergens = Array.from(new Set(editAllergensText.split(",").map((value) => value.trim()).filter(Boolean)));
    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("products").update({
      name: editName.trim(),
      description: editDescription.trim() || null,
      price_cents: Math.round(numericPrice * 100),
      allergens
    }).eq("id", product.id).eq("store_id", storeId);
    setSaving(false);

    if (error) {
      setMessage("Οι αλλαγές δεν αποθηκεύτηκαν. Έλεγξε τα δικαιώματα του καταστήματος.");
      return;
    }
    cancelProductEdit();
    await loadProducts();
    setMessage("Τα στοιχεία του προϊόντος ενημερώθηκαν.");
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
    if (error) {
      setMessage("Δεν ήταν δυνατή η διαγραφή του προϊόντος.");
    } else {
      if (product.image_path) {
        const { error: mediaError } = await supabase.storage.from(MEDIA_BUCKET).remove([product.image_path]);
        await loadProducts();
        setMessage(mediaError ? "Το προϊόν διαγράφηκε, αλλά η παλιά φωτογραφία χρειάζεται χειροκίνητο καθαρισμό." : "Το προϊόν και η φωτογραφία του διαγράφηκαν.");
      } else {
        await loadProducts();
        setMessage("Το προϊόν διαγράφηκε.");
      }
    }
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
      {canManage ? <section className="merchant-hours-panel">
        <div className="merchant-hours-heading">
          <div><p className="eyebrow">STORE AVAILABILITY</p><h3>Εβδομαδιαίο ωράριο</h3><p>Καταχώρησε τις ημέρες και τα διαστήματα λειτουργίας. Υποστηρίζονται έως δύο διαστήματα ανά ημέρα και ωράρια που περνούν τα μεσάνυχτα.</p></div>
          <span className={hoursConfigured ? "hours-configured" : "hours-unconfigured"}>{hoursConfigured ? "Ωράριο καταχωρημένο" : "Δεν έχει οριστεί"}</span>
        </div>
        {hoursLoading ? <p className="hours-note">Φόρτωση ωραρίου…</p> : <div className="merchant-hours-list">
          {weekdays.map(({ weekday, label }) => {
            const day = schedule[weekday] ?? { isClosed: true, slots: [] };
            return <div className="merchant-hours-day" key={weekday}>
              <label className="merchant-hours-day-toggle">
                <input type="checkbox" checked={!day.isClosed} onChange={(event) => setDayOpen(weekday, event.target.checked)} />
                <strong>{label}</strong>
              </label>
              {day.isClosed ? <span className="merchant-hours-closed">Κλειστό</span> : <div className="merchant-hours-slots">
                {day.slots.map((slot, slotIndex) => <div className="merchant-hours-slot" key={slotIndex}>
                  <label>Από<input type="time" value={slot.opens_at} onChange={(event) => updateScheduleSlot(weekday, slotIndex, "opens_at", event.target.value)} /></label>
                  <label>Έως<input type="time" value={slot.closes_at} onChange={(event) => updateScheduleSlot(weekday, slotIndex, "closes_at", event.target.value)} /></label>
                  {slotIndex > 0 ? <button type="button" className="table-cancel" onClick={() => removeScheduleSlot(weekday, slotIndex)}>Αφαίρεση</button> : null}
                </div>)}
                {day.slots.length < 2 ? <button type="button" className="table-action" onClick={() => addScheduleSlot(weekday)}>+ Προσθήκη διαστήματος</button> : null}
              </div>}
            </div>;
          })}
        </div>}
        {hoursMessage ? <p className="hours-note" role="status">{hoursMessage}</p> : null}
        <div className="merchant-hours-actions"><button type="button" className="primary-button" disabled={hoursLoading || hoursSaving} onClick={() => void saveStoreHours()}>{hoursSaving ? "Αποθήκευση…" : "Αποθήκευση ωραρίου"}</button></div>
        <p className="hours-note">Χωρίς αποθηκευμένο ωράριο δεν εμφανίζεται ένδειξη «Ανοιχτό τώρα» ή «Κλειστό τώρα». Οι αργίες και οι έκτακτες αλλαγές δεν υποστηρίζονται ακόμη.</p>
      </section> : null}
      {loading ? <p className="catalog-empty">Φόρτωση προϊόντων…</p> : products.length === 0 ? <div className="catalog-empty"><h3>Ο κατάλογος είναι ακόμη κενός</h3><p>Πρόσθεσε τα πρώτα πραγματικά προϊόντα και τις τιμές τους.</p></div> : <div className="catalog-list">
        {products.map((product) => <article className="catalog-product" key={product.id}>
          <div className="catalog-product-photo">{publicMediaUrl(product.image_path) ? <img src={publicMediaUrl(product.image_path)!} alt={`Φωτογραφία ${product.name}`} /> : <span>✳</span>}</div>
          {editingProductId === product.id ? <form className="catalog-inline-edit" onSubmit={(event) => void saveProductEdit(event, product)}>
            <label>Ονομασία<input value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={120} required /></label>
            <label>Περιγραφή<textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} maxLength={500} rows={2} /></label>
            <div className="catalog-edit-fields">
              <label>Τιμή (€)<input inputMode="decimal" value={editPrice} onChange={(event) => setEditPrice(event.target.value)} required /></label>
              <label>Αλλεργιογόνα<input value={editAllergensText} onChange={(event) => setEditAllergensText(event.target.value)} placeholder="π.χ. γλουτένη, γάλα" /></label>
            </div>
            <div className="catalog-edit-actions">
              <button className="primary-button" type="submit" disabled={saving}>{saving ? "Αποθήκευση…" : "Αποθήκευση αλλαγών"}</button>
              <button className="secondary-button" type="button" disabled={saving} onClick={cancelProductEdit}>Ακύρωση</button>
            </div>
          </form> : <>
            <div className="catalog-product-info">
              <strong>{product.name}</strong>
              {product.description ? <p>{product.description}</p> : null}
              <span>{euro(product.price_cents)} · {product.is_available ? "Διαθέσιμο" : "Μη διαθέσιμο"}</span>
              {product.allergens.length ? <small>Αλλεργιογόνα: {product.allergens.join(", ")}</small> : null}
            </div>
            {canManage ? <div className="catalog-product-actions">
              <label className="media-upload-button compact">{uploadingMedia === product.id ? "Μεταφόρτωση…" : "Φωτογραφία"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(uploadingMedia) || saving} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadProductImage(product, file); event.currentTarget.value = ""; }} /></label>
              <button type="button" className="table-action" disabled={saving || Boolean(uploadingMedia)} onClick={() => beginProductEdit(product)}>Επεξεργασία</button>
              <button type="button" className="table-action" disabled={saving || Boolean(uploadingMedia)} onClick={() => toggleAvailability(product)}>{product.is_available ? "Απόκρυψη" : "Δημοσίευση"}</button>
              <button type="button" className="table-cancel" disabled={saving || Boolean(uploadingMedia)} onClick={() => removeProduct(product)}>Διαγραφή</button>
            </div> : null}
          </>}
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
        <label htmlFor="product-allergens">Αλλεργιογόνα</label>
        <input id="product-allergens" value={allergensText} onChange={(event) => setAllergensText(event.target.value)} maxLength={300} placeholder="π.χ. γλουτένη, γάλα, ξηροί καρποί" />
        <button className="primary-button" type="submit" disabled={saving}>{saving ? "Αποθήκευση…" : "Προσθήκη προϊόντος"}</button>
      </form>
      <p className="tiny-note">Οι τιμές αποθηκεύονται σε λεπτά του ευρώ. Τα αλλεργιογόνα καταχωρούνται ως διαχωρισμένη λίστα και πρέπει να επαληθεύονται από το κατάστημα πριν από τη δημόσια διάθεση.</p>
    </section> : null}
  </div>;
}
