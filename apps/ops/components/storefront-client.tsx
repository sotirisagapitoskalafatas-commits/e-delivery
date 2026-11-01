"use client";

import {useEffect,useMemo,useState,type FormEvent} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {createSupabaseBrowserClient} from "@/lib/supabase/browser";

type StoreInfo={id:string;name:string;description:string|null;city:string;region:string;address_line:string;postal_code:string;store_type:string;minimum_order_cents:number;base_delivery_fee_cents:number;platform_delivery_enabled:boolean;merchant_delivery_enabled:boolean;independent_delivery_enabled:boolean;service_postal_codes:string[];prep_time_minutes:number};
type Product={id:string;name:string;description:string|null;price_cents:number;currency:string;allergens:string[]};
type Address={id:string;label:string;line1:string;city:string;postal_code:string};
const euro=(cents:number)=>new Intl.NumberFormat("el-GR",{style:"currency",currency:"EUR"}).format(cents/100);

export function StorefrontClient({store}:{store:StoreInfo}){
  const router=useRouter();
  const [products,setProducts]=useState<Product[]>([]);const [addresses,setAddresses]=useState<Address[]>([]);
  const [userId,setUserId]=useState<string|null>(null);const [cart,setCart]=useState<Record<string,number>>({});
  const [addressId,setAddressId]=useState("");const [fulfillment,setFulfillment]=useState<"platform"|"merchant"|"independent">(store.platform_delivery_enabled?"platform":store.merchant_delivery_enabled?"merchant":"independent");
  const [label,setLabel]=useState("Σπίτι");const [line1,setLine1]=useState("");const [city,setCity]=useState(store.city);const [postalCode,setPostalCode]=useState("");
  const [loading,setLoading]=useState(true);const [savingAddress,setSavingAddress]=useState(false);const [placing,setPlacing]=useState(false);const [message,setMessage]=useState("");

  useEffect(()=>{
    const client=createSupabaseBrowserClient();
    if(!client){setLoading(false);setMessage("Η σύνδεση πελατών δεν είναι ενεργή ακόμη.");return;}
    let active=true;
    void(async()=>{
      const [productResult,authResult]=await Promise.all([
        client.from("products").select("id,name,description,price_cents,currency,allergens").eq("store_id",store.id).eq("is_available",true).order("name"),
        client.auth.getUser()
      ]);
      if(!active)return;
      if(productResult.error)setMessage("Δεν ήταν δυνατή η φόρτωση του καταλόγου.");else setProducts((productResult.data??[]) as Product[]);
      const user=authResult.data.user;setUserId(user?.id??null);
      if(user){
        const {data,error}=await client.from("customer_addresses").select("id,label,line1,city,postal_code").order("created_at",{ascending:false}).limit(20);
        if(!active)return;
        if(error)setMessage("Δεν ήταν δυνατή η φόρτωση των αποθηκευμένων διευθύνσεων.");
        const rows=(data??[]) as Address[];setAddresses(rows);setAddressId(rows[0]?.id??"");
      }
      setLoading(false);
    })();
    return()=>{active=false;};
  },[store.id]);

  const subtotal=useMemo(()=>products.reduce((sum,p)=>sum+p.price_cents*(cart[p.id]??0),0),[products,cart]);
  const total=subtotal+store.base_delivery_fee_cents;
  const itemCount=Object.values(cart).reduce((sum,n)=>sum+n,0);
  function updateQuantity(id:string,delta:number){
    setCart(current=>{const next={...current};const quantity=(next[id]??0)+delta;if(quantity<=0)delete next[id];else next[id]=Math.min(quantity,99);return next;});
  }
  async function saveAddress(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const client=createSupabaseBrowserClient();
    if(!client||!userId){setMessage("Συνδέσου για να αποθηκεύσεις τη διεύθυνσή σου.");return;}
    if(!/^\d{5}$/.test(postalCode.trim())){setMessage("Συμπλήρωσε έγκυρο ελληνικό Τ.Κ. 5 ψηφίων.");return;}
    setSavingAddress(true);
    const {data,error}=await client.from("customer_addresses").insert({customer_id:userId,label:label.trim()||"Διεύθυνση",line1:line1.trim(),city:city.trim(),region:store.region,postal_code:postalCode.trim()}).select("id,label,line1,city,postal_code").single();
    setSavingAddress(false);
    if(error||!data){setMessage("Η διεύθυνση δεν αποθηκεύτηκε. Έλεγξε τα στοιχεία και δοκίμασε ξανά.");return;}
    setAddresses(current=>[data as Address,...current]);setAddressId(data.id);setLine1("");setPostalCode("");setMessage("Η διεύθυνση αποθηκεύτηκε.");
  }
  async function placeOrder(){
    const client=createSupabaseBrowserClient();
    if(!client){setMessage("Η σύνδεση πελατών δεν είναι διαθέσιμη.");return;}
    if(!userId){router.push(`/login?next=${encodeURIComponent(`/store/${store.id}`)}`);return;}
    if(!addressId){setMessage("Πρόσθεσε ή επίλεξε διεύθυνση παράδοσης.");return;}
    const items=Object.entries(cart).filter(([,quantity])=>quantity>0).map(([product_id,quantity])=>({product_id,quantity}));
    if(!items.length){setMessage("Πρόσθεσε τουλάχιστον ένα προϊόν στο καλάθι.");return;}
    if(subtotal<store.minimum_order_cents){setMessage(`Το ελάχιστο καλάθι είναι ${euro(store.minimum_order_cents)}.`);return;}
    setPlacing(true);setMessage("");
    const {data,error}=await client.rpc("create_marketplace_order",{p_store_id:store.id,p_address_id:addressId,p_fulfillment_method:fulfillment,p_items:items,p_idempotency_key:`web-checkout-${crypto.randomUUID()}`});
    setPlacing(false);
    if(error||!data){
      const raw=error?.message??"";
      const messages:Record<string,string>={outside_store_service_area:"Το κατάστημα δεν εξυπηρετεί τον συγκεκριμένο Τ.Κ.",platform_delivery_unavailable:"Η παράδοση από E-DELIVERY δεν είναι διαθέσιμη.",merchant_delivery_unavailable:"Η διανομή καταστήματος δεν είναι διαθέσιμη.",independent_delivery_unavailable:"Το ανεξάρτητο δίκτυο δεν είναι διαθέσιμο.",product_unavailable_or_wrong_store:"Κάποιο προϊόν δεν είναι πλέον διαθέσιμο.",minimum_order_not_met:"Δεν έχει συμπληρωθεί το ελάχιστο καλάθι."};
      const match=Object.entries(messages).find(([key])=>raw.includes(key));setMessage(match?.[1]??"Η παραγγελία δεν ολοκληρώθηκε. Έλεγξε διεύθυνση και διαθεσιμότητα.");return;
    }
    router.push(`/account?order=${String(data)}`);router.refresh();
  }
  const methods=[...(store.platform_delivery_enabled?[{value:"platform" as const,label:"E-DELIVERY courier"}]:[]),...(store.merchant_delivery_enabled?[{value:"merchant" as const,label:"Διανομή καταστήματος"}]:[]),...(store.independent_delivery_enabled?[{value:"independent" as const,label:"Ανεξάρτητος συνεργάτης"}]:[])];

  return <section className="storefront-layout">
    <div className="storefront-menu"><div className="storefront-menu-heading"><div><span className="section-eyebrow">Ο ΚΑΤΑΛΟΓΟΣ</span><h2>Διάλεξε τα αγαπημένα σου.</h2></div><span className="menu-count">{products.length} προϊόντα</span></div>
      {loading?<div className="empty-catalog"><h3>Φόρτωση καταλόγου…</h3></div>:products.length===0?<div className="empty-catalog"><h3>Ο κατάλογος ενημερώνεται</h3><p>Δεν υπάρχουν αυτή τη στιγμή διαθέσιμα προϊόντα.</p></div>:
      <div className="product-grid">{products.map(product=><article className="web-product-card" key={product.id}><div className="product-card-symbol">✳</div><div className="web-product-copy"><h3>{product.name}</h3><p>{product.description??" "}</p>{product.allergens.length?<small>Αλλεργιογόνα: {product.allergens.join(", ")}</small>:null}<strong>{euro(product.price_cents)}</strong></div><button className="quantity-add" type="button" onClick={()=>updateQuantity(product.id,1)} aria-label={`Προσθήκη ${product.name}`}>+</button>{(cart[product.id]??0)>0?<div className="quantity-control"><button type="button" onClick={()=>updateQuantity(product.id,-1)} aria-label="Αφαίρεση">−</button><b>{cart[product.id] ?? 0}</b><button type="button" onClick={()=>updateQuantity(product.id,1)} aria-label="Προσθήκη">+</button></div>:null}</article>)}</div>}
    </div>
    <aside className="web-cart"><span className="section-eyebrow">ΤΟ ΚΑΛΑΘΙ ΣΟΥ</span><h2>Η παραγγελία</h2>
      {itemCount===0?<div className="cart-empty">Το καλάθι σου είναι άδειο.<br/><small>Πρόσθεσε προϊόντα για να συνεχίσεις.</small></div>:products.filter(p=>cart[p.id]).map(p=><div className="cart-line" key={p.id}><span>{cart[p.id] ?? 0} × {p.name}</span><b>{euro(p.price_cents*(cart[p.id] ?? 0))}</b></div>)}
      <div className="cart-divider"/><div className="cart-line"><span>Προϊόντα</span><b>{euro(subtotal)}</b></div><div className="cart-line"><span>Παράδοση</span><b>{euro(store.base_delivery_fee_cents)}</b></div><div className="cart-total"><span>Σύνολο</span><b>{euro(total)}</b></div>
      {methods.length>1?<fieldset className="fulfillment-options"><legend>Τρόπος παράδοσης</legend>{methods.map(m=><label key={m.value}><input type="radio" name="fulfillment" checked={fulfillment===m.value} onChange={()=>setFulfillment(m.value)}/>{m.label}</label>)}</fieldset>:methods.length===1?<p className="cart-fulfillment">Παράδοση: {methods[0]?.label ?? ""}</p>:<p className="cart-warning">Δεν έχει ενεργοποιηθεί τρόπος παράδοσης.</p>}
      {userId?<><label className="cart-field-label" htmlFor="saved-address">Διεύθυνση παράδοσης</label><select id="saved-address" value={addressId} onChange={e=>setAddressId(e.target.value)}><option value="">Επίλεξε διεύθυνση</option>{addresses.map(a=><option key={a.id} value={a.id}>{a.label} · {a.line1}, {a.city} {a.postal_code}</option>)}</select>
        <details className="add-address"><summary>+ Προσθήκη νέας διεύθυνσης</summary><form onSubmit={saveAddress}><input required maxLength={60} value={label} onChange={e=>setLabel(e.target.value)} placeholder="Ετικέτα (π.χ. Σπίτι)"/><input required maxLength={250} value={line1} onChange={e=>setLine1(e.target.value)} placeholder="Οδός και αριθμός"/><input required maxLength={100} value={city} onChange={e=>setCity(e.target.value)} placeholder="Πόλη"/><input required inputMode="numeric" maxLength={5} value={postalCode} onChange={e=>setPostalCode(e.target.value)} placeholder="Τ.Κ. 5 ψηφίων"/><button className="site-secondary full" disabled={savingAddress}>{savingAddress?"Αποθήκευση…":"Αποθήκευση διεύθυνσης"}</button></form></details>
      </>:<div className="cart-auth-note"><p>Συνδέσου για να επιλέξεις διεύθυνση και να ολοκληρώσεις την παραγγελία.</p><Link href={`/login?next=${encodeURIComponent(`/store/${store.id}`)}`}>Σύνδεση πελάτη →</Link></div>}
      <div className="payment-note"><span>Επιβεβαίωση παραγγελίας</span><small>Πληρωμή με μετρητά κατά την παράδοση, όπου υποστηρίζεται.</small></div>{message?<p className="checkout-message" role="status">{message}</p>:null}
      <button className="site-primary checkout-button" type="button" onClick={placeOrder} disabled={placing||itemCount===0||methods.length===0}>{placing?"Καταχώρηση…":"Ολοκλήρωση παραγγελίας"}</button><small className="cart-footnote">Η τιμή και η διαθεσιμότητα επαληθεύονται από τον server πριν καταχωρηθεί η παραγγελία.</small>
    </aside>
  </section>;
}