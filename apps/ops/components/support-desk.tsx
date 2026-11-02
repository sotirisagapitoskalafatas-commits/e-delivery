"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type SupportDeskTicket = {
  id: string;
  customer_id: string;
  order_id: string | null;
  category: string;
  subject: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  customer: { full_name: string | null; phone: string | null } | null;
};

type SupportDeskMessage = {
  id: string;
  ticket_id: string;
  author_user_id: string;
  message: string;
  created_at: string;
};

const statusLabels: Record<string, string> = {
  open: "Ανοιχτό",
  in_progress: "Σε εξέλιξη",
  waiting_customer: "Αναμονή πελάτη",
  resolved: "Επιλύθηκε",
  closed: "Κλειστό"
};

const categoryLabels: Record<string, string> = {
  order: "Παραγγελία",
  delivery: "Παράδοση",
  payment: "Πληρωμή",
  account: "Λογαριασμός",
  other: "Άλλο"
};

function dateTime(value: string) {
  return new Date(value).toLocaleString("el-GR", { dateStyle: "medium", timeStyle: "short" });
}

export function SupportDesk({ initialTickets, currentUserId }: { initialTickets: SupportDeskTicket[]; currentUserId: string }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [selectedId, setSelectedId] = useState(initialTickets[0]?.id ?? "");
  const [messages, setMessages] = useState<SupportDeskMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");
  const [filter, setFilter] = useState<"active" | "all" | "urgent">("active");
  const [notice, setNotice] = useState("");

  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;
  const visibleTickets = useMemo(() => tickets.filter((ticket) => {
    if (filter === "urgent") return ticket.priority === "urgent" && !["resolved", "closed"].includes(ticket.status);
    if (filter === "active") return !["resolved", "closed"].includes(ticket.status);
    return true;
  }), [tickets, filter]);

  async function loadMessages(ticketId: string) {
    const client = createSupabaseBrowserClient();
    if (!client || !ticketId) return;
    setLoading(true);
    const { data, error } = await client.from("support_ticket_messages")
      .select("id,ticket_id,author_user_id,message,created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true })
      .limit(500);
    setLoading(false);
    if (error) {
      setNotice("Δεν ήταν δυνατή η φόρτωση της συνομιλίας. Έλεγξε τα RLS permissions.");
      return;
    }
    setMessages((data ?? []) as SupportDeskMessage[]);
    setNotice("");
  }

  async function refreshTickets() {
    const client = createSupabaseBrowserClient();
    if (!client) return;
    const { data, error } = await client.from("support_tickets")
      .select("id,customer_id,order_id,category,subject,status,priority,assigned_to,created_at,updated_at,customer:profiles(full_name,phone)")
      .order("updated_at", { ascending: false })
      .limit(300);
    if (error) {
      setNotice("Δεν ήταν δυνατή η ανανέωση της λίστας αιτημάτων.");
      return;
    }
    setTickets((data ?? []) as unknown as SupportDeskTicket[]);
  }

  useEffect(() => {
    if (selectedId) void loadMessages(selectedId);
    else setMessages([]);
  }, [selectedId]);

  async function updateTicket(patch: { status?: string; priority?: string }) {
    const client = createSupabaseBrowserClient();
    if (!client || !selected) return;
    setBusy(true);
    setNotice("");
    const { error } = await client.from("support_tickets")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", selected.id);
    setBusy(false);
    if (error) {
      setNotice("Η ενημέρωση δεν αποθηκεύτηκε. Έλεγξε ότι ο χρήστης έχει ρόλο support ή ops_admin.");
      return;
    }
    setTickets((current) => current.map((ticket) => ticket.id === selected.id ? { ...ticket, ...patch, updated_at: new Date().toISOString() } : ticket));
    setNotice("Οι αλλαγές αποθηκεύτηκαν.");
  }

  async function sendReply() {
    const client = createSupabaseBrowserClient();
    if (!client || !selected || reply.trim().length === 0) return;
    setBusy(true);
    setNotice("");
    const { error } = await client.from("support_ticket_messages").insert({
      ticket_id: selected.id,
      author_user_id: currentUserId,
      message: reply.trim()
    });
    setBusy(false);
    if (error) {
      setNotice("Το μήνυμα δεν στάλθηκε. Το αίτημα ίσως έχει κλείσει.");
      return;
    }
    setReply("");
    await Promise.all([loadMessages(selected.id), refreshTickets()]);
  }

  return (
    <div className="support-desk">
      <aside className="support-desk-list">
        <div className="support-desk-list-head">
          <div><p className="eyebrow">CUSTOMER CARE</p><h2>Εισερχόμενα</h2></div>
          <button type="button" className="support-refresh" onClick={() => void refreshTickets()}>Ανανέωση</button>
        </div>
        <div className="support-desk-filters">
          <button type="button" className={filter === "active" ? "selected" : ""} onClick={() => setFilter("active")}>Ενεργά</button>
          <button type="button" className={filter === "urgent" ? "selected" : ""} onClick={() => setFilter("urgent")}>Επείγοντα</button>
          <button type="button" className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>Όλα</button>
        </div>
        <div className="support-ticket-list">
          {visibleTickets.length === 0 ? <p className="support-empty">Δεν υπάρχουν αιτήματα σε αυτό το φίλτρο.</p> : visibleTickets.map((ticket) => (
            <button type="button" key={ticket.id} className={selectedId === ticket.id ? "support-ticket-summary selected" : "support-ticket-summary"} onClick={() => setSelectedId(ticket.id)}>
              <span className="support-ticket-summary-top"><b>{ticket.subject}</b><i className={ticket.priority === "urgent" ? "urgent" : ""}>{ticket.priority === "urgent" ? "Επείγον" : statusLabels[ticket.status] ?? ticket.status}</i></span>
              <span className="support-ticket-customer">{ticket.customer?.full_name || "Πελάτης"} · {categoryLabels[ticket.category] ?? "Άλλο"}</span>
              <span className="support-ticket-summary-bottom"><small>#{ticket.id.slice(0, 8).toUpperCase()}</small><small>{dateTime(ticket.updated_at)}</small></span>
            </button>
          ))}
        </div>
      </aside>
      <section className="support-desk-thread">
        {selected ? <>
          <header className="support-thread-header">
            <div><p className="eyebrow">CASE #{selected.id.slice(0, 8).toUpperCase()}</p><h2>{selected.subject}</h2><p>{selected.customer?.full_name || "Πελάτης"}{selected.customer?.phone ? " · " + selected.customer.phone : ""}</p></div>
            <div className="support-thread-tags"><span>{categoryLabels[selected.category] ?? "Άλλο"}</span><span>{statusLabels[selected.status] ?? selected.status}</span>{selected.order_id ? <span>Παραγγελία #{selected.order_id.slice(0, 8).toUpperCase()}</span> : null}</div>
          </header>
          <div className="support-thread-actions">
            <label>Κατάσταση<select value={selected.status} disabled={busy} onChange={(event) => void updateTicket({ status: event.target.value })}>
              <option value="open">Ανοιχτό</option>
              <option value="in_progress">Σε εξέλιξη</option>
              <option value="waiting_customer">Αναμονή πελάτη</option>
              <option value="resolved">Επιλύθηκε</option>
              <option value="closed">Κλειστό</option>
            </select></label>
            <label>Προτεραιότητα<select value={selected.priority} disabled={busy} onChange={(event) => void updateTicket({ priority: event.target.value })}>
              <option value="normal">Κανονική</option>
              <option value="urgent">Επείγουσα</option>
            </select></label>
          </div>
          {notice ? <p className="support-notice" role="status">{notice}</p> : null}
          <div className="support-thread-messages">
            {loading ? <p className="support-empty">Φόρτωση συνομιλίας…</p> : messages.length === 0 ? <p className="support-empty">Δεν υπάρχουν μηνύματα.</p> : messages.map((message) => (
              <article key={message.id} className={message.author_user_id === currentUserId ? "support-chat-message staff" : "support-chat-message customer"}>
                <div><b>{message.author_user_id === currentUserId ? "Ομάδα υποστήριξης" : selected.customer?.full_name || "Πελάτης"}</b><time>{dateTime(message.created_at)}</time></div>
                <p>{message.message}</p>
              </article>
            ))}
          </div>
          {["open", "in_progress", "waiting_customer"].includes(selected.status) ? <form className="support-thread-reply" onSubmit={(event) => { event.preventDefault(); void sendReply(); }}>
            <textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Γράψε απάντηση προς τον πελάτη…" maxLength={4000} required />
            <button type="submit" className="primary-button" disabled={busy || !reply.trim()}>{busy ? "Αποστολή…" : "Αποστολή απάντησης"}</button>
          </form> : <p className="support-closed-note">Το αίτημα είναι επιλυμένο ή κλειστό. Άλλαξε την κατάσταση σε εξέλιξη για να συνεχιστεί η συνομιλία.</p>}
        </> : <div className="support-thread-empty"><span>✉</span><h2>Επίλεξε ένα αίτημα</h2><p>Οι συνομιλίες πελατών θα εμφανιστούν εδώ.</p></div>}
      </section>
    </div>
  );
}
