"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SignInForm({ redirectTo = "/ops" }: { redirectTo?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Λείπει η ρύθμιση Supabase. Συμπλήρωσε τα NEXT_PUBLIC_SUPABASE_* variables.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setMessage("Η σύνδεση απέτυχε. Έλεγξε τα στοιχεία σου ή επικοινώνησε με τον διαχειριστή.");
      return;
    }
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label htmlFor="email">Email</label>
      <input id="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
      <label htmlFor="password">Κωδικός</label>
      <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
      {message ? <p className="form-message" role="alert">{message}</p> : null}
      <button className="primary-button" type="submit" disabled={busy}>{busy ? "Σύνδεση…" : "Σύνδεση"}</button>
    </form>
  );
}
