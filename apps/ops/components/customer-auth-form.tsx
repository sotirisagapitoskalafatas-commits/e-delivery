"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = { mode: "login" | "register"; nextPath?: string };

export function CustomerAuthForm({ mode, nextPath = "/account" }: Props) {
  const router = useRouter();
  const [name,setName]=useState("");
  const [phone,setPhone]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const isRegister=mode==="register";
  const destination=nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/account";

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const supabase=createSupabaseBrowserClient();
    if(!supabase){setMessage("Η υπηρεσία λογαριασμών δεν έχει συνδεθεί ακόμη.");return;}
    if(isRegister && password.length<10){setMessage("Ο κωδικός πρέπει να έχει τουλάχιστον 10 χαρακτήρες.");return;}
    setBusy(true);
    if(isRegister){
      const {data,error}=await supabase.auth.signUp({
        email:email.trim().toLowerCase(),password,
        options:{data:{full_name:name.trim(),phone:phone.trim()||null},emailRedirectTo:`${window.location.origin}/account`}
      });
      setBusy(false);
      if(error){setMessage("Δεν ήταν δυνατή η δημιουργία λογαριασμού. Έλεγξε τα στοιχεία ή δοκίμασε άλλο email.");return;}
      if(!data.session){setMessage("Ο λογαριασμός καταχωρήθηκε. Έλεγξε το email σου για επιβεβαίωση πριν συνδεθείς.");return;}
      router.replace(destination);router.refresh();return;
    }
    const {error}=await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password});
    setBusy(false);
    if(error){setMessage("Η σύνδεση δεν ολοκληρώθηκε. Έλεγξε email και κωδικό.");return;}
    router.replace(destination);router.refresh();
  }

  return <form className="customer-auth-form" onSubmit={submit}>
    {isRegister?<><label htmlFor="customer-name">Ονοματεπώνυμο</label><input id="customer-name" autoComplete="name" required maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="Το όνομά σου"/><label htmlFor="customer-phone">Κινητό <span>(προαιρετικό)</span></label><input id="customer-phone" type="tel" autoComplete="tel" maxLength={32} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+30 ..."/></>:null}
    <label htmlFor="customer-email">Email</label><input id="customer-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/>
    <label htmlFor="customer-password">Κωδικός</label><input id="customer-password" type="password" autoComplete={isRegister?"new-password":"current-password"} minLength={isRegister?10:1} required value={password} onChange={e=>setPassword(e.target.value)} placeholder={isRegister?"Τουλάχιστον 10 χαρακτήρες":"Ο κωδικός σου"}/>
    {message?<p className="customer-auth-message" role="alert">{message}</p>:null}
    <button className="site-primary auth-submit" type="submit" disabled={busy}>{busy?"Παρακαλώ περίμενε…":isRegister?"Δημιουργία λογαριασμού":"Σύνδεση"}</button>
    <p className="auth-switch">{isRegister?"Έχεις ήδη λογαριασμό;":"Δεν έχεις λογαριασμό;"} <Link href={isRegister?"/login":"/register"}>{isRegister?"Σύνδεση":"Δημιούργησε έναν"}</Link></p>
  </form>;
}