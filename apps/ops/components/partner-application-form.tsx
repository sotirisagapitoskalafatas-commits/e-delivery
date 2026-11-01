"use client";

import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

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
  const prefix = kind === "merchant" ? "merchant-app" : "courier-app";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setBusy(false);
      setMessage("Η φόρμα συνεργασιών δεν έχει συνδεθεί ακόμη με τη βάση δεδομένων. Δοκίμασε ξανά αργότερα.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const checkedValues = (name: string) => formData.getAll(name).map(String);
    const { data, error } = await supabase.rpc("submit_partner_application", {
      p_application_type: kind,
      p_first_name: String(formData.get("first_name") ?? "").trim(),
      p_last_name: String(formData.get("last_name") ?? "").trim(),
      p_email: String(formData.get("email") ?? "").trim().toLowerCase(),
      p_phone: String(formData.get("phone") ?? "").trim(),
      p_city: String(formData.get("city") ?? "").trim(),
      p_business_name: kind === "merchant" ? String(formData.get("business_name") ?? "").trim() : null,
      p_business_type: kind === "merchant" ? String(formData.get("business_type") ?? "") : null,
      p_address_line: kind === "merchant" ? String(formData.get("address_line") ?? "").trim() : null,
      p_postal_code: kind === "merchant" ? String(formData.get("postal_code") ?? "").trim() : null,
      p_fulfillment_interests: kind === "merchant" ? checkedValues("fulfillment_interests") : [],
      p_vehicle_type: kind === "courier" ? String(formData.get("vehicle_type") ?? "") : null,
      p_courier_network_preference: kind === "courier" ? String(formData.get("courier_network_preference") ?? "") : null,
      p_age_confirmed: kind === "courier" && formData.get("age_confirmed") === "on",
      p_has_valid_driver_license: kind === "courier" && formData.get("has_valid_driver_license") === "on",
      p_has_smartphone: kind === "courier" && formData.get("has_smartphone") === "on",
      p_privacy_notice_acknowledged: formData.get("privacy_notice_acknowledged") === "on",
      p_website: String(formData.get("website") ?? "")
    });

    setBusy(false);
    if (error || !data) {
      const errorText = error?.message ?? "";
      setMessage(errorText.includes("application_already_exists")
        ? "Υπάρχει ήδη ενεργή αίτηση με αυτό το email. Η ομάδα μας θα επικοινωνήσει μαζί σου."
        : "Δεν ήταν δυνατή η καταχώριση. Έλεγξε τα υποχρεωτικά πεδία και δοκίμασε ξανά.");
      return;
    }

    setApplicationId(String(data));
    setSubmitted(true);
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
      <label className="partner-privacy-check"><input type="checkbox" name="privacy_notice_acknowledged" required />Έχω διαβάσει την <a href="/privacy" target="_blank" rel="noreferrer">ενημέρωση απορρήτου</a> και γνωρίζω ότι τα στοιχεία μου θα χρησιμοποιηθούν για την εξέταση και επικοινωνία σχετικά με την αίτησή μου. *</label>
      <div className="partner-honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      {message ? <p className="partner-form-error" role="alert">{message}</p> : null}
      <button className="partner-form-submit" type="submit" disabled={busy}>{busy ? "Αποστολή αίτησης…" : "Υποβολή αίτησης ενδιαφέροντος"} <span>→</span></button>
      <p className="partner-form-footnote">Τα στοιχεία είναι ορατά μόνο στην εξουσιοδοτημένη ομάδα λειτουργίας. Μην καταχωρίζεις αριθμούς ταυτότητας ή τραπεζικά στοιχεία σε αυτή την αρχική φόρμα.</p>
    </form>
  );
}