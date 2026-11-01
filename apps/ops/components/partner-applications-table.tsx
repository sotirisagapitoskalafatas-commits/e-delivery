"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type PartnerApplication = {
  id: string; application_type: "merchant" | "courier"; status: string;
  first_name: string; last_name: string; email: string; phone: string; city: string;
  business_name: string | null; business_type: string | null; address_line: string | null; postal_code: string | null;
  fulfillment_interests: string[]; vehicle_type: string | null; courier_network_preference: string | null;
  age_confirmed: boolean; has_valid_driver_license: boolean; has_smartphone: boolean;
  internal_note: string | null; created_at: string;
};

const statusLabels: Record<string,string> = { pending_review:"Νέα αίτηση", in_review:"Σε έλεγχο", contacted:"Έγινε επικοινωνία", approved:"Εγκρίθηκε", declined:"Δεν προχώρησε" };
const typeLabels: Record<string,string> = { merchant:"Επιχείρηση", courier:"Διανομέας" };
const businessLabels: Record<string,string> = { restaurant:"Εστιατόριο", cafe:"Καφέ", bakery:"Αρτοποιείο", supermarket:"Supermarket", convenience:"Mini market", retail:"Λιανικό εμπόριο", pharmacy:"Φαρμακείο", flower_shop:"Ανθοπωλείο", pet_shop:"Pet shop", service_provider:"Υπηρεσίες", other:"Άλλο" };
const fulfilmentLabels: Record<string,string> = { merchant:"Δική του διανομή", platform:"E-DELIVERY", independent:"Ανεξάρτητοι συνεργάτες" };
const vehicleLabels: Record<string,string> = { bicycle:"Ποδήλατο", motorcycle:"Μηχανή / Scooter", car:"Αυτοκίνητο" };

export function PartnerApplicationsTable({ applications }: { applications: PartnerApplication[] }) {
  const [rows,setRows] = useState(applications);
  const [filter,setFilter] = useState("all");
  const [busyId,setBusyId] = useState("");
  const [message,setMessage] = useState("");
  const filtered = useMemo(() => rows.filter(row => filter === "all" || row.status === filter), [rows,filter]);

  async function review(id:string,status:string,note:string) {
    const supabase = createSupabaseBrowserClient();
    if(!supabase){setMessage("Δεν υπάρχει σύνδεση Supabase.");return;}
    setBusyId(id);setMessage("");
    const {data,error}=await supabase.rpc("review_partner_application",{p_application_id:id,p_new_status:status,p_internal_note:note});
    setBusyId("");
    if(error||!data){setMessage("Η ενημέρωση δεν αποθηκεύτηκε. Έλεγξε τον ρόλο OPS και τη migration.");return;}
    setRows(current=>current.map(row=>row.id===id?{...row,status,internal_note:note}:row));
    setMessage("Η αίτηση ενημερώθηκε.");
  }

  return <section className="partner-admin-content">
    <div className="partner-admin-toolbar"><div className="partner-admin-count"><strong>{rows.length}</strong><span>αιτήσεις συνολικά</span></div><select aria-label="Φίλτρο κατάστασης" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Όλες οι καταστάσεις</option>{Object.entries(statusLabels).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></div>
    {message?<p className="partner-admin-message" role="status">{message}</p>:null}
    {filtered.length===0?<div className="empty-state"><div className="empty-icon">↗</div><h3>Δεν υπάρχουν αιτήσεις σε αυτή την κατηγορία</h3><p>Οι νέες αιτήσεις θα εμφανιστούν εδώ μόλις υποβληθούν.</p></div>:<div className="partner-admin-list">{filtered.map(row=><PartnerApplicationCard key={row.id} row={row} busy={busyId===row.id} onReview={review}/>)}</div>}
  </section>;
}

function PartnerApplicationCard({row,busy,onReview}:{row:PartnerApplication;busy:boolean;onReview:(id:string,status:string,note:string)=>void}) {
  const [status,setStatus]=useState(row.status);
  const [note,setNote]=useState(row.internal_note??"");
  const isMerchant=row.application_type==="merchant";
  return <article className="partner-admin-card">
    <div className="partner-admin-card-head"><span className={`partner-admin-type ${row.application_type}`}>{typeLabels[row.application_type]}</span><span className="partner-admin-date">{new Date(row.created_at).toLocaleString("el-GR",{dateStyle:"medium",timeStyle:"short"})}</span><b>{row.first_name} {row.last_name}</b><span className="partner-admin-status">{statusLabels[row.status]??row.status}</span></div>
    <div className="partner-admin-detail-grid">
      <div><small>EMAIL</small><a href={`mailto:${row.email}`}>{row.email}</a></div><div><small>ΤΗΛΕΦΩΝΟ</small><a href={`tel:${row.phone}`}>{row.phone}</a></div><div><small>ΠΕΡΙΟΧΗ</small><strong>{row.city}</strong></div>
      {isMerchant?<><div><small>ΕΠΙΧΕΙΡΗΣΗ</small><strong>{row.business_name}</strong></div><div><small>ΚΑΤΗΓΟΡΙΑ</small><strong>{businessLabels[row.business_type??""]??row.business_type}</strong></div><div><small>ΔΙΕΥΘΥΝΣΗ</small><strong>{row.address_line}, {row.postal_code}</strong></div><div className="partner-admin-detail-full"><small>FULFILLMENT</small><strong>{row.fulfillment_interests.map(x=>fulfilmentLabels[x]??x).join(" · ")}</strong></div></>:<><div><small>ΟΧΗΜΑ</small><strong>{vehicleLabels[row.vehicle_type??""]??row.vehicle_type}</strong></div><div><small>ΜΟΝΤΕΛΟ</small><strong>{row.courier_network_preference}</strong></div><div><small>ΑΡΧΙΚΗ ΕΠΙΒΕΒΑΙΩΣΗ</small><strong>{row.age_confirmed?"18+":"—"} · {row.has_smartphone?"Smartphone":"—"} · {(row.vehicle_type==="bicycle"||row.has_valid_driver_license)?"Άδεια (όπου απαιτείται)":"Δεν επιβεβαιώθηκε"}</strong></div></>}
    </div>
    <div className="partner-admin-review"><label>Εσωτερική σημείωση<textarea value={note} maxLength={2000} onChange={e=>setNote(e.target.value)} placeholder="Σημειώσεις επικοινωνίας και αξιολόγησης…"/></label><div><label>Κατάσταση<select value={status} onChange={e=>setStatus(e.target.value)}>{Object.entries(statusLabels).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label><button disabled={busy} onClick={()=>onReview(row.id,status,note)}>{busy?"Αποθήκευση…":"Αποθήκευση"}</button></div></div>
  </article>;
}