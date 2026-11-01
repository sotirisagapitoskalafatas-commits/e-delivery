"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  orderId: string;
  status: string;
  fulfillmentMethod: "platform" | "merchant" | "independent";
  canManage: boolean;
  canDispatch: boolean;
};

type Courier = { user_id: string; vehicle_type: string | null };

export function OrderActions({ orderId, status, fulfillmentMethod, canManage, canDispatch }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [courierId, setCourierId] = useState("");
  const [choosingCourier, setChoosingCourier] = useState(false);

  async function merchantTransition(nextStatus: "accepted" | "preparing" | "ready_for_pickup" | "delivered") {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setMessage("Δεν έχει ρυθμιστεί το Supabase."); return; }
    setBusy(true);
    setMessage("");
    const { error } = await supabase.rpc("set_merchant_order_status", {
      p_order_id: orderId,
      p_new_status: nextStatus,
      p_reason: null
    });
    setBusy(false);
    if (error) setMessage("Η αλλαγή κατάστασης απορρίφθηκε από τον server. Έλεγξε δικαιώματα και τρέχουσα κατάσταση.");
    else router.refresh();
  }

  async function openCourierPicker() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setMessage("Δεν έχει ρυθμιστεί το Supabase."); return; }
    setBusy(true);
    setMessage("");
    const { data, error } = await supabase.from("courier_profiles")
      .select("user_id,vehicle_type")
      .eq("status", "approved")
      .eq("network_type", fulfillmentMethod === "platform" ? "platform" : "independent_partner")
      .order("created_at", { ascending: true });
    setBusy(false);
    if (error) { setMessage("Δεν ήταν δυνατή η φόρτωση εγκεκριμένων διανομέων."); return; }
    const rows = (data ?? []) as Courier[];
    setCouriers(rows);
    setCourierId(rows[0]?.user_id ?? "");
    setChoosingCourier(true);
    if (rows.length === 0) setMessage(fulfillmentMethod === "platform" ? "Δεν υπάρχουν εγκεκριμένοι διανομείς της πλατφόρμας." : "Δεν υπάρχουν εγκεκριμένοι διανομείς συνεργατών.");
  }

  async function dispatch() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !courierId) return;
    setBusy(true);
    setMessage("");
    const { error } = await supabase.rpc("dispatch_order_to_courier", {
      p_order_id: orderId,
      p_courier_user_id: courierId
    });
    setBusy(false);
    if (error) setMessage("Η ανάθεση δεν ολοκληρώθηκε. Έλεγξε την κατάσταση παραγγελίας και την έγκριση διανομέα.");
    else { setChoosingCourier(false); router.refresh(); }
  }

  let action: { label: string; next: "accepted" | "preparing" | "ready_for_pickup" | "delivered" } | null = null;
  if (status === "pending_merchant") action = { label: "Αποδοχή", next: "accepted" };
  if (status === "accepted") action = { label: "Έναρξη προετοιμασίας", next: "preparing" };
  if (status === "preparing") action = { label: "Έτοιμη για παραλαβή", next: "ready_for_pickup" };
  if (status === "ready_for_pickup" && fulfillmentMethod === "merchant") action = { label: "Ολοκλήρωση παράδοσης", next: "delivered" };

  return <div className="order-actions">
    {canManage && action ? <button className="table-action" type="button" disabled={busy} onClick={() => merchantTransition(action!.next)}>{busy ? "…" : action.label}</button> : null}
    {canDispatch && status === "ready_for_pickup" && fulfillmentMethod === "platform" ? <button className="table-action" type="button" disabled={busy} onClick={openCourierPicker}>Ανάθεση</button> : null}
    {choosingCourier ? <div className="courier-picker">
      <select aria-label="Εγκεκριμένος διανομέας" value={courierId} onChange={(event) => setCourierId(event.target.value)}>
        {couriers.map((courier) => <option key={courier.user_id} value={courier.user_id}>{courier.user_id.slice(0, 8)} · {courier.vehicle_type ?? "όχημα μη δηλωμένο"}</option>)}
      </select>
      <button className="table-action" type="button" disabled={busy || !courierId} onClick={dispatch}>Επιβεβαίωση</button>
      <button className="table-cancel" type="button" onClick={() => setChoosingCourier(false)}>Άκυρο</button>
    </div> : null}
    {message ? <span className="action-message" role="status">{message}</span> : null}
  </div>;
}
