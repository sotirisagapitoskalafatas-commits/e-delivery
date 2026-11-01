"use client";

import Script from "next/script";
import { useEffect, useRef, useState, type FormEvent } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void; theme: "light"; language: "el" }) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

type Kind = "merchant" | "courier";

const businessTypes = [
  ["restaurant", "Εστιατόριο"], ["cafe", "Καφέ"], ["bakery", "Αρτοποιείο / Φούρνος"],
  ["supermarket", "Supermarket"], ["convenience", "Mini market / Περίπτερο"],
  ["retail", "Λιανικό εμπόριο"], ["pharmacy", "Φαρμακείο"], ["flower_shop", "Ανθοπωλείο"],
  ["pet_shop", "Pet shop"], ["service_provider", "Τοπικές υπηρεσίες"], ["other", "Άλλο"]
];

const fulfillmentOptions = [
  ["merchant", "Δική μου διανομή"],
  ["platform", "Διανομείς E-DELIVERY"],
  ["independent", "Ανεξάρτητοι συνεργάτες"]
];

export function PartnerApplicationForm({ kind }: { kind: Kind }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileContainer = useRef<HTMLDivElement>(null);
  const turnstileWidget = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";


  useEffect(() => {
    if (!turnstileReady || !siteKey || !turnstileContainer.current || !window.turnstile || turnstileWidget.current) return;
    turnstileWidget.current = window.turnstile.render(turnstileContainer.current, {
      sitekey: siteKey,
      callback: (token) => setTurnstileToken(token),
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken(""),
      theme: "light",
      language: "el"
    });
    return () => {
      if (turnstileWidget.current && window.turnstile) window.turnstile.remove(turnstileWidget.current);
      turnstileWidget.current = null;
    };
  }, [turnstileReady, siteKey]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (process.env.NEXT_PUBLIC_PARTNER_APPLICATIONS_ENABLED !== "true") {
      setMessage("Η δημόσια υποβολή αιτήσεων δεν έχει ανοίξει ακόμη.");
      return;
    }
    if (!siteKey) {
      setMessage("Η δημόσια φόρμα δεν έχει ενεργοποιηθεί ακόμη. Απαιτείται ρύθμιση Cloudflare Turnstile.");
      return;
    }
    if (!turnstileToken) {
      setMessage("Ολοκλήρωσε πρώτα την επαλήθευση ασφαλείας.");
      return;
    }

    setBusy(true);
    const formData = new FormData(event.currentTarget);
    const checkedValues = (name: string) => formData.getAll(name).map(String);
    const selectedFulfilment = kind === "merchant" ? checkedValues("fulfillment_interests") : [];
    const selectedVehicle = String(formData.get("vehicle_type") ?? "");
    if (kind === "merchant" && selectedFulfilment.length === 0) {
      setBusy(false);
      setMessage("Επίλεξε τουλάχιστον έναν τρόπο παράδοσης.");
      return;
    }
    if (kind === "courier" && ["motorcycle", "car"].includes(selectedVehicle) && formData.get("has_valid_driver_license") !== "on") {
      setBusy(false);
      setMessage("Για μηχανή ή αυτοκίνητο απαιτείται επιβεβαίωση ισχύουσας άδειας οδήγησης.");
      return;
    }
    const payload = {
      application_type: kind,
      first_name: String(formData.get("first_name") ?? "").trim(),
      last_name: String(formData.get("last_name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
      phone: String(formData.get("phone") ?? "").trim(),
      city: String(formData.get("city") ?? "").trim(),
      business_name: kind === "merchant" ? String(formData.get("business_name") ?? "").trim() : null,
      business_type: kind === "merchant" ? String(formData.get("business_type") ?? "") : null,
      address_line: kind === "merchant" ? String(formData.get("address_line") ?? "").trim() : null,
      postal_code: kind === "merchant" ? String(formData.get("postal_code") ?? "").trim() : null,
      fulfillment_interests: selectedFulfilment,
      vehicle_type: kind === "courier" ? String(formData.get("vehicle_type") ?? "") : null,
      courier_network_preference: kind === "courier" ? String(formData.get("courier_network_preference") ?? "") : null,
      age_confirmed: kind === "courier" && formData.get("age_confirmed") === "on",
      has_valid_driver_license: kind === "courier" && formData.get("has_valid_driver_license") === "on",
      has_smartphone: kind === "courier" && formData.get("has_smartphone") === "on",
      privacy_notice_acknowledged: formData.get("privacy_notice_acknowledged") === "on",
      website: String(formData.get("website") ?? ""),
      turnstile_token: turnstileToken
    };

    try {
      const response = await fetch("/api/partner-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json() as { success?: boolean; id?: string; error?: string };
      setBusy(false);
      if (!response.ok || !result.success || !result.id) {
        setMessage(result.error === "application_already_exists"
          ? "Υπάρχει ήδη ενεργή αίτηση με αυτό το email. Η ομάδα μας θα επικοινωνήσει μαζί σου."
          : result.error === "turnstile_not_configured"
            ? "Η ασφαλής υποβολή δεν έχει ενεργοποιηθεί ακόμη."
            : "Δεν ήταν δυνατή η καταχώριση. Έλεγξε τα πεδία και δοκίμασε ξανά.");
        if (turnstileWidget.current && window.turnstile) window.turnstile.reset(turnstileWidget.current);
        setTurnstileToken("");
        return;
      }
      setApplicationId(result.id);
      setSubmitted(true);
    } catch {
      setBusy(false);
      setMessage("Δεν ήταν δυνατή η επικοινωνία με τον server. Δοκίμασε ξανά.");
      if (turnstileWidget.current && window.turnstile) window.turnstile.reset(turnstileWidget.current);
      setTurnstileToken("");
    }
  }

  if (submitted) {
    return (
      <section className="partner-form-success" role="status">
        <span>✓</span><p className="partner-form-kicker">Η ΑΙΤΗΣΗ ΚΑΤΑΧΩΡΙΣΤΗΚΕ</p>
        <h3>Ευχαριστούμε για το ενδιαφέρον σου.</h3>
        <p>Η αίτησή σου έχει σταλεί στην ομάδα E-DELIVERY για έλεγχο. Η υποβολή δεν δημιουργεί λογαριασμό ούτε επιβεβαιώνει συνεργασία.</p>
        <small>Κωδικός αίτησης: {applicationId.slice(0, 8).toUpperCase()}</small>
      </section>
    );
  }

  return (
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={() => setTurnstileReady(true)} />
    <form className="partner-application-form" onSubmit={submit}>
      <div className="partner-form-head"><span className="partner-form-kicker">ΑΡΧΙΚΗ ΑΙΤΗΣΗ</span><h3>{kind === "merchant" ? "Στοιχεία επιχείρησης" : "Στοιχεία υποψηφίου διανομέα"}</h3><p>Τα πεδία με * είναι υποχρεωτικά.</p></div>
      <div className="partner-form-grid">
        <label>Όνομα *<input name="first_name" required maxLength={80} autoComplete="given-name" placeholder="Όνομα" /></label>
        <label>Επώνυμο *<input name="last_name" required maxLength={100} autoComplete="family-name" placeholder="Επώνυμο" /></label>
        <label>Email *<input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="name@example.com" /></label>
        <label>Κινητό τηλέφωνο *<input name="phone" type="tel" required minLength={7} maxLength={32} autoComplete="tel" placeholder="+30 69..." /></label>
        <label className="partner-field-full">Πόλη / Περιοχή *<input name="city" required maxLength={100} autoComplete="address-level2" placeholder="π.χ. Αθήνα, Θεσσαλονίκη" /></label>
        {kind === "merchant" ? <>
          <label className="partner-field-full">Όνομα επιχείρησης *<input name="business_name" required maxLength={180} placeholder="Επωνυμία ή διακριτικός τίτλος" /></label>
          <label>Είδος επιχείρησης *<select name="business_type" required defaultValue=""><option value="" disabled>Επίλεξε κατηγορία</option>{businessTypes.map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label>Ταχυδρομικός κώδικας *<input name="postal_code" required pattern="[0-9]{5}" inputMode="numeric" maxLength={5} placeholder="5 ψηφία" /></label>
          <label className="partner-field-full">Διεύθυνση καταστήματος *<input name="address_line" required maxLength={250} placeholder="Οδός και αριθμός" /></label>
          <fieldset className="partner-form-fieldset partner-field-full"><legend>Πώς θα ήθελες να παραδίδονται οι παραγγελίες; *</legend><p>Επίλεξε ένα ή περισσότερα μοντέλα. Η τελική διαθεσιμότητα επιβεβαιώνεται ανά περιοχή.</p>{fulfillmentOptions.map(([value,label]) => <label className="partner-checkbox" key={value}><input type="checkbox" name="fulfillment_interests" value={value} />{label}</label>)}</fieldset>
        </> : <>
          <label>Όχημα *<select name="vehicle_type" required defaultValue=""><option value="" disabled>Επίλεξε όχημα</option><option value="bicycle">Ποδήλατο</option><option value="motorcycle">Μηχανή / Scooter</option><option value="car">Αυτοκίνητο</option></select></label>
          <label>Μοντέλο συνεργασίας *<select name="courier_network_preference" required defaultValue=""><option value="" disabled>Επίλεξε προτίμηση</option><option value="platform">Δίκτυο E-DELIVERY</option><option value="independent_partner">Ανεξάρτητος συνεργάτης</option><option value="merchant_fleet">Στόλος συνεργαζόμενης επιχείρησης</option></select></label>
          <fieldset className="partner-form-fieldset partner-field-full"><legend>Αρχική επιβεβαίωση στοιχείων *</legend>
            <label className="partner-checkbox"><input type="checkbox" name="age_confirmed" required />Είμαι τουλάχιστον 18 ετών.</label>
            <label className="partner-checkbox"><input type="checkbox" name="has_smartphone" required />Διαθέτω smartphone για επικοινωνία και χρήση εφαρμογών.</label>
            <label className="partner-checkbox"><input type="checkbox" name="has_valid_driver_license" />Διαθέτω ισχύουσα άδεια οδήγησης, όπου απαιτείται για το όχημά μου.</label>
          </fieldset>
          <p className="partner-form-help partner-field-full">Η τελική επιλεξιμότητα, τα απαιτούμενα έγγραφα, η ασφάλιση και οι όροι συνεργασίας ελέγχονται ξεχωριστά ανά όχημα και μοντέλο. Η φόρμα δεν αποτελεί έγκριση.</p>
        </>}
      </div>
      <label className="partner-privacy-check"><input type="checkbox" name="privacy_notice_acknowledged" required />Έχω διαβάσει την <a href="/privacy#partner-applications" target="_blank" rel="noreferrer">ενημέρωση απορρήτου</a> και γνωρίζω ότι τα στοιχεία μου θα χρησιμοποιηθούν για την εξέταση και επικοινωνία σχετικά με την αίτησή μου. *</label>
      <div className="partner-honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div className="partner-turnstile-wrap">
        {siteKey && process.env.NEXT_PUBLIC_PARTNER_APPLICATIONS_ENABLED === "true" ? <div ref={turnstileContainer} /> : <p className="partner-turnstile-unavailable">Η δημόσια υποβολή θα ενεργοποιηθεί όταν ολοκληρωθούν ο έλεγχος απορρήτου και η ρύθμιση ασφαλείας.</p>}
      </div>
      {message ? <p className="partner-form-error" role="alert">{message}</p> : null}
      <button className="partner-form-submit" type="submit" disabled={busy || !siteKey || !turnstileToken || process.env.NEXT_PUBLIC_PARTNER_APPLICATIONS_ENABLED !== "true"}>{busy ? "Αποστολή αίτησης…" : "Υποβολή αίτησης ενδιαφέροντος"} <span>→</span></button>
      <p className="partner-form-footnote">Τα στοιχεία είναι ορατά μόνο στην εξουσιοδοτημένη ομάδα λειτουργίας. Μην καταχωρίζεις αριθμούς ταυτότητας ή τραπεζικά στοιχεία σε αυτή την αρχική φόρμα.</p>
    </form></>
  );
}