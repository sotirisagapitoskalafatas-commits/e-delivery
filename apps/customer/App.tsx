import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./src/supabase";

type Store = { id: string; name: string; description: string | null; city: string; store_type: string; minimum_order_cents: number; base_delivery_fee_cents: number; platform_delivery_enabled: boolean; merchant_delivery_enabled: boolean; independent_delivery_enabled: boolean; service_postal_codes: string[]; logo_image_path: string | null; cover_image_path: string | null };
type Order = { id: string; status: string; total_cents: number; currency: string; created_at: string };
type ExpressRequest = { id: string; status: string; quoted_fee_cents: number | null; currency: string; parcel_description: string; parcel_size: string; created_at: string };
type ServiceRequest = { id: string; status: string; service_title: string; quoted_price_cents: number | null; currency: string; created_at: string; store: { name: string } | null };
type Product = { id: string; name: string; description: string | null; price_cents: number; currency: string; is_available: boolean; allergens: string[]; image_path: string | null };
type Address = { id: string; label: string; line1: string; city: string; postal_code: string };
type StoreCategory = "all" | "food" | "groceries" | "shops";
type HomeScreen = "stores" | "orders" | "services" | "express";

const MEDIA_BUCKET = "e-delivery-merchant-media";
const categoryPhotos: Record<string, string> = {
  restaurant: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80",
  cafe: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80",
  bakery: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=900&q=80",
  supermarket: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80",
  convenience: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80",
  pharmacy: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=900&q=80",
  flower_shop: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80",
  pet_shop: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=900&q=80",
  retail: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=900&q=80"
};
function mediaUrl(path: string | null) {
  if (!supabase || !path) return null;
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}
function storePhoto(store: Store) {
  return mediaUrl(store.cover_image_path) ?? categoryPhotos[store.store_type] ?? categoryPhotos.retail;
}
const euro = (cents: number) => new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(cents / 100);

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [stores, setStores] = useState<Store[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState("");
  const [label, setLabel] = useState("Σπίτι");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("Αθήνα");
  const [postalCode, setPostalCode] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [placing, setPlacing] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [expressRequests, setExpressRequests] = useState<ExpressRequest[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [serviceProviders, setServiceProviders] = useState<Store[]>([]);
  const [serviceProvider, setServiceProvider] = useState<Store | null>(null);
  const [screen, setScreen] = useState<HomeScreen>("stores");
  const [category, setCategory] = useState<StoreCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceTitle, setServiceTitle] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [serviceSubmitting, setServiceSubmitting] = useState(false);
  const [serviceConfirmation, setServiceConfirmation] = useState("");
  const [pickupAddressId, setPickupAddressId] = useState("");
  const [dropoffAddressId, setDropoffAddressId] = useState("");
  const [pickupContactName, setPickupContactName] = useState("");
  const [pickupPhone, setPickupPhone] = useState("");
  const [dropoffContactName, setDropoffContactName] = useState("");
  const [dropoffPhone, setDropoffPhone] = useState("");
  const [parcelDescription, setParcelDescription] = useState("");
  const [parcelSize, setParcelSize] = useState<"small" | "medium" | "large">("small");
  const [expressSubmitting, setExpressSubmitting] = useState(false);
  const [expressConfirmation, setExpressConfirmation] = useState("");
  const [expressKey, setExpressKey] = useState(() => `express-${Date.now()}-${Math.random().toString(36).slice(2,10)}`);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"platform" | "merchant" | "independent">("platform");
  const [checkoutKey, setCheckoutKey] = useState(() => `checkout-${Date.now()}-${Math.random().toString(36).slice(2,10)}`);

  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !supabase) return;
    let active = true;
    Promise.all([
      supabase.from("stores").select("id,name,description,city,store_type,minimum_order_cents,base_delivery_fee_cents,platform_delivery_enabled,merchant_delivery_enabled,independent_delivery_enabled,service_postal_codes,logo_image_path,cover_image_path").eq("is_active", true).eq("accepts_orders", true).order("name").limit(100),
      supabase.from("stores").select("id,name,description,city,store_type,minimum_order_cents,base_delivery_fee_cents,platform_delivery_enabled,merchant_delivery_enabled,independent_delivery_enabled,service_postal_codes,logo_image_path,cover_image_path").eq("is_active", true).eq("store_type", "service_provider").order("name").limit(60),
      supabase.from("customer_addresses").select("id,label,line1,city,postal_code").order("created_at", { ascending: false }).limit(20),
      supabase.from("orders").select("id,status,total_cents,currency,created_at").order("created_at", { ascending: false }).limit(30),
      supabase.from("express_deliveries").select("id,status,quoted_fee_cents,currency,parcel_description,parcel_size,created_at").order("created_at", { ascending: false }).limit(30),
      supabase.from("service_bookings").select("id,status,service_title,quoted_price_cents,currency,created_at,store:stores(name)").order("created_at", { ascending: false }).limit(30)
    ]).then(([storeResult, serviceResult, addressResult, orderResult, expressResult, bookingResult]) => {
      if (!active) return;
      if (storeResult.error) setError("Δεν ήταν δυνατή η φόρτωση καταστημάτων.");
      else setStores((storeResult.data ?? []) as Store[]);
      if (serviceResult.error) setError("Δεν ήταν δυνατή η φόρτωση υπηρεσιών της περιοχής.");
      else setServiceProviders((serviceResult.data ?? []) as Store[]);
      if (addressResult.error) setError("Δεν ήταν δυνατή η φόρτωση διευθύνσεων.");
      else {
        const rows = (addressResult.data ?? []) as Address[];
        setAddresses(rows);
        if (rows[0]) {
          setAddressId(rows[0].id);
          setPickupAddressId((current) => current || rows[0]!.id);
          setDropoffAddressId((current) => current || rows[1]?.id || rows[0]!.id);
        }
      }
      if (orderResult.error) setError("Δεν ήταν δυνατή η φόρτωση ιστορικού παραγγελιών.");
      else setOrders((orderResult.data ?? []) as Order[]);
      if (expressResult.error) setError("Δεν ήταν δυνατή η φόρτωση αιτημάτων express.");
      else setExpressRequests((expressResult.data ?? []) as ExpressRequest[]);
      if (bookingResult.error) setError("Δεν ήταν δυνατή η φόρτωση αιτημάτων υπηρεσιών.");
      else setServiceRequests((bookingResult.data ?? []) as unknown as ServiceRequest[]);
    });
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    if (!store || !supabase) { setProducts([]); return; }
    let active = true;
    supabase.from("products").select("id,name,description,price_cents,currency,is_available,allergens,image_path").eq("store_id", store.id).eq("is_available", true).order("name").limit(100).then(({ data, error: queryError }) => {
      if (!active) return;
      if (queryError) setError("Δεν ήταν δυνατή η φόρτωση του καταλόγου.");
      else setProducts((data ?? []) as Product[]);
    });
    return () => { active = false; };
  }, [store]);

  const subtotal = useMemo(() => products.reduce((total, product) => total + product.price_cents * (cart[product.id] ?? 0), 0), [products, cart]);
  const count = Object.values(cart).reduce((total, quantity) => total + quantity, 0);
  const cartSignature = JSON.stringify(Object.entries(cart).sort(([a], [b]) => a.localeCompare(b)));
  const selectedAddress = addresses.find((address) => address.id === addressId);
  const deliveryFeeCents = store?.base_delivery_fee_cents ?? 0;
  const totalCents = subtotal + deliveryFeeCents;

  async function loadOrders() {
    const client = supabase;
    if (!client) return;
    const [orderResult, expressResult, bookingResult] = await Promise.all([
      client.from("orders").select("id,status,total_cents,currency,created_at").order("created_at", { ascending: false }).limit(30),
      client.from("express_deliveries").select("id,status,quoted_fee_cents,currency,parcel_description,parcel_size,created_at").order("created_at", { ascending: false }).limit(30),
      client.from("service_bookings").select("id,status,service_title,quoted_price_cents,currency,created_at,store:stores(name)").order("created_at", { ascending: false }).limit(30)
    ]);
    if (orderResult.error || expressResult.error || bookingResult.error) {
      setError("Δεν ήταν δυνατή η ανανέωση όλου του ιστορικού αιτημάτων.");
      return;
    }
    setOrders((orderResult.data ?? []) as Order[]);
    setExpressRequests((expressResult.data ?? []) as ExpressRequest[]);
    setServiceRequests((bookingResult.data ?? []) as unknown as ServiceRequest[]);
  }

  useEffect(() => {
    if (store) setCheckoutKey(`checkout-${Date.now()}-${Math.random().toString(36).slice(2,10)}`);
  }, [store?.id, addressId, cartSignature, fulfillmentMethod]);
  const storeTypesByCategory: Record<StoreCategory, string[]> = {
    all: ["restaurant", "cafe", "bakery", "supermarket", "convenience", "retail", "pharmacy", "flower_shop", "pet_shop", "other"],
    food: ["restaurant", "cafe", "bakery"],
    groceries: ["supermarket", "convenience"],
    shops: ["retail", "pharmacy", "flower_shop", "pet_shop", "other"]
  };
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("el-GR");
  const visibleStores = stores.filter((candidate) => {
    const inCoverage = !selectedAddress || candidate.service_postal_codes.includes(selectedAddress.postal_code);
    const inCategory = storeTypesByCategory[category].includes(candidate.store_type);
    const matchesSearch = !normalizedSearch || `${candidate.name} ${candidate.description ?? ""} ${candidate.city}`.toLocaleLowerCase("el-GR").includes(normalizedSearch);
    return inCoverage && inCategory && matchesSearch;
  });
  const visibleServices = serviceProviders.filter((candidate) => {
    const inCoverage = !selectedAddress || candidate.service_postal_codes.includes(selectedAddress.postal_code);
    const matchesSearch = !normalizedSearch || `${candidate.name} ${candidate.description ?? ""} ${candidate.city}`.toLocaleLowerCase("el-GR").includes(normalizedSearch);
    return inCoverage && matchesSearch;
  });

  async function signIn() {
    setError("");
    if (!supabase) return;
    setBusy(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (authError) setError("Η σύνδεση απέτυχε. Έλεγξε email και κωδικό.");
  }

  async function signUp() {
    setError("");
    if (!supabase) return;
    if (password.length < 10) { setError("Χρησιμοποίησε κωδικό τουλάχιστον 10 χαρακτήρων."); return; }
    setBusy(true);
    const { error: authError } = await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (authError) setError("Η εγγραφή απέτυχε. Χρησιμοποίησε έγκυρο email και ισχυρό κωδικό.");
    else setError("Έλεγξε το email σου για επιβεβαίωση πριν συνδεθείς.");
  }

  async function saveAddress() {
    if (!supabase || !session) return;
    if (!line1.trim() || !city.trim() || !postalCode.trim()) { setError("Συμπλήρωσε οδό, πόλη και Τ.Κ."); return; }
    setBusy(true);
    const { data, error: insertError } = await supabase.from("customer_addresses").insert({
      customer_id: session.user.id, label: label.trim(), line1: line1.trim(), city: city.trim(), postal_code: postalCode.trim()
    }).select("id,label,line1,city,postal_code").single();
    setBusy(false);
    if (insertError || !data) { setError("Δεν αποθηκεύτηκε η διεύθυνση."); return; }
    const row = data as Address;
    setAddresses((current) => [row, ...current]);
    setAddressId(row.id);
    setLine1("");
    setPostalCode("");
    setError("");
  }

  async function signOut() {
    const client = supabase;
    if (!client) return;
    await client.auth.signOut();
  }

  async function submitServiceRequest() {
    const client = supabase;
    if (!client || !session || !serviceProvider || !selectedAddress) {
      setError("Επίλεξε πάροχο και διεύθυνση εξυπηρέτησης.");
      return;
    }
    if (serviceProvider.service_postal_codes.length > 0 && !serviceProvider.service_postal_codes.includes(selectedAddress.postal_code)) {
      setError("Ο πάροχος δεν εξυπηρετεί τον συγκεκριμένο ταχυδρομικό κώδικα.");
      return;
    }
    if (serviceDescription.trim().length < 10) {
      setError("Περιέγραψε λίγο πιο αναλυτικά τι χρειάζεσαι.");
      return;
    }

    setServiceSubmitting(true);
    setError("");
    const { data, error: requestError } = await client.from("service_bookings").insert({
      customer_id: session.user.id,
      store_id: serviceProvider.id,
      service_title: serviceTitle.trim() || "Αίτημα υπηρεσίας",
      request_description: serviceDescription.trim(),
      service_address_snapshot: {
        label: selectedAddress.label,
        line1: selectedAddress.line1,
        city: selectedAddress.city,
        postal_code: selectedAddress.postal_code
      }
    }).select("id,status").single();
    setServiceSubmitting(false);

    if (requestError || !data) {
      setError("Το αίτημα δεν καταχωρήθηκε. Έλεγξε ότι ο πάροχος δέχεται αιτήματα υπηρεσιών.");
      return;
    }
    setServiceConfirmation(data.id);
    setServiceTitle("");
    setServiceDescription("");
    setServiceProvider(null);
  }

  async function submitExpressRequest() {
    const client = supabase;
    if (!client) return;
    if (!pickupAddressId || !dropoffAddressId || pickupAddressId === dropoffAddressId) {
      setError("Επίλεξε δύο διαφορετικές αποθηκευμένες διευθύνσεις για παραλαβή και παράδοση.");
      return;
    }
    if (!pickupContactName.trim() || !pickupPhone.trim() || !dropoffContactName.trim() || !dropoffPhone.trim()) {
      setError("Συμπλήρωσε στοιχεία επικοινωνίας και για τα δύο σημεία.");
      return;
    }
    if (parcelDescription.trim().length < 5) {
      setError("Περιέγραψε σύντομα το δέμα.");
      return;
    }

    setExpressSubmitting(true);
    setError("");
    const { data, error: requestError } = await client.rpc("create_express_delivery_request", {
      p_pickup_address_id: pickupAddressId,
      p_dropoff_address_id: dropoffAddressId,
      p_pickup_contact_name: pickupContactName.trim(),
      p_pickup_phone: pickupPhone.trim(),
      p_dropoff_contact_name: dropoffContactName.trim(),
      p_dropoff_phone: dropoffPhone.trim(),
      p_parcel_description: parcelDescription.trim(),
      p_parcel_size: parcelSize,
      p_scheduled_at: null,
      p_idempotency_key: expressKey
    });
    setExpressSubmitting(false);

    if (requestError) {
      setError("Το αίτημα express δεν καταχωρήθηκε. Έλεγξε τις διευθύνσεις και τα στοιχεία επικοινωνίας.");
      return;
    }
    setExpressConfirmation(String(data));
    setParcelDescription("");
    setExpressKey(`express-${Date.now()}-${Math.random().toString(36).slice(2,10)}`);
  }

  async function placeOrder() {
    if (!supabase || !store || !selectedAddress || count === 0) {
      setError("Επίλεξε διεύθυνση και τουλάχιστον ένα προϊόν.");
      return;
    }
    if (!store.service_postal_codes.includes(selectedAddress.postal_code)) {
      setError("Το κατάστημα δεν εξυπηρετεί τον συγκεκριμένο ταχυδρομικό κώδικα.");
      return;
    }
    setPlacing(true);
    setError("");
    const idempotencyKey = checkoutKey;
    const { data, error: orderError } = await supabase.rpc("create_marketplace_order", {
      p_store_id: store.id,
      p_address_id: selectedAddress.id,
      p_fulfillment_method: fulfillmentMethod,
      p_items: Object.entries(cart).filter(([, quantity]) => quantity > 0).map(([product_id, quantity]) => ({ product_id, quantity })),
      p_idempotency_key: idempotencyKey
    });
    setPlacing(false);
    if (orderError) { setError("Η παραγγελία δεν ολοκληρώθηκε. Έλεγξε διαθεσιμότητα, περιοχή και ελάχιστη αξία."); return; }
    setConfirmation(String(data));
    setCart({});
    setStore(null);
    setScreen("orders");
    await loadOrders();
  }

  if (!ready) return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#E31E24" /></SafeAreaView>;
  if (!supabase) return <SafeAreaView style={styles.center}><Text style={styles.title}>E-DELIVERY</Text><Text style={styles.muted}>Ρύθμισε τα EXPO_PUBLIC_SUPABASE variables.</Text></SafeAreaView>;

  if (!session) return <SafeAreaView style={styles.safe}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.authWrap}>
    <Text style={styles.brand}>e-delivery</Text><Text style={styles.title}>Ό,τι χρειάζεσαι, κοντά σου.</Text><Text style={styles.muted}>Συνδέσου για να ανακαλύψεις καταστήματα στην περιοχή σου.</Text>
    <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholder="Email" value={email} onChangeText={setEmail} />
    <TextInput style={styles.input} secureTextEntry placeholder="Κωδικός" value={password} onChangeText={setPassword} />
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <Pressable style={styles.primary} onPress={signIn} disabled={busy}><Text style={styles.primaryText}>{busy ? "Σύνδεση…" : "Σύνδεση"}</Text></Pressable>
    <Pressable style={styles.secondary} onPress={signUp} disabled={busy}><Text style={styles.secondaryText}>Δημιουργία λογαριασμού</Text></Pressable>
  </KeyboardAvoidingView></SafeAreaView>;

  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}>
      <View><Text style={styles.brand}>e-delivery</Text><Text style={styles.mutedSmall}>Η γειτονιά σου, σε ένα app</Text></View>
      <View style={styles.headerActions}>
        <Pressable onPress={() => { setStore(null); setServiceProvider(null); setScreen("stores"); }}><Text style={screen === "stores" ? styles.navSelected : styles.navLink}>Ανακάλυψη</Text></Pressable>
        <Pressable onPress={() => { setStore(null); setServiceProvider(null); setScreen("express"); }}><Text style={screen === "express" ? styles.navSelected : styles.navLink}>Express</Text></Pressable>
        <Pressable onPress={() => { setStore(null); setServiceProvider(null); setScreen("services"); }}><Text style={screen === "services" ? styles.navSelected : styles.navLink}>Υπηρεσίες</Text></Pressable>
        <Pressable onPress={() => { setStore(null); setServiceProvider(null); setScreen("orders"); void loadOrders(); }}><Text style={screen === "orders" ? styles.navSelected : styles.navLink}>Παραγγελίες ({orders.length})</Text></Pressable>
        <Pressable onPress={() => { void signOut(); }}><Text style={styles.logout}>Έξοδος</Text></Pressable>
      </View>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      {confirmation ? <View style={styles.confirm}><Text style={styles.confirmTitle}>Η παραγγελία καταχωρήθηκε</Text><Text style={styles.muted}>Κωδικός: {confirmation}</Text><Text style={styles.muted}>Πληρωμή: μετρητά κατά την παράδοση.</Text><Pressable onPress={() => setConfirmation("")}><Text style={styles.link}>Συνέχεια αγορών</Text></Pressable></View> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {screen === "express" && !store ? <>
        <Pressable onPress={() => setScreen("stores")}><Text style={styles.back}>‹ Ανακάλυψη</Text></Pressable>
        <View style={styles.hero}><Text style={styles.eyebrow}>E-DELIVERY EXPRESS</Text><Text style={styles.heroTitle}>Στείλε κάτι{"\n"}στη στιγμή.</Text><Text style={styles.muted}>Καταχώρησε το αίτημα αποστολής. Η ομάδα θα επιβεβαιώσει διαθεσιμότητα και τελική χρέωση πριν προχωρήσει η αποστολή.</Text></View>
        {expressConfirmation ? <View style={styles.confirm}><Text style={styles.confirmTitle}>Το αίτημα καταχωρήθηκε</Text><Text style={styles.muted}>Κωδικός: {expressConfirmation}</Text><Text style={styles.muted}>Δεν έγινε χρέωση. Θα επιβεβαιωθούν τιμή και διαθεσιμότητα πριν την αποδοχή.</Text></View> : null}
        <Text style={styles.sectionTitle}>Παραλαβή από</Text>
        {addresses.map((address) => <Pressable key={address.id} style={[styles.address, pickupAddressId === address.id && styles.addressSelected]} onPress={() => setPickupAddressId(address.id)}><Text style={styles.productName}>{address.label}</Text><Text style={styles.mutedSmall}>{address.line1}, {address.city} {address.postal_code}</Text></Pressable>)}
        <TextInput style={styles.input} placeholder="Όνομα αποστολέα" value={pickupContactName} onChangeText={setPickupContactName} />
        <TextInput style={styles.input} placeholder="Τηλέφωνο αποστολέα" keyboardType="phone-pad" value={pickupPhone} onChangeText={setPickupPhone} />
        <Text style={styles.sectionTitle}>Παράδοση σε</Text>
        {addresses.map((address) => <Pressable key={address.id} style={[styles.address, dropoffAddressId === address.id && styles.addressSelected]} onPress={() => setDropoffAddressId(address.id)}><Text style={styles.productName}>{address.label}</Text><Text style={styles.mutedSmall}>{address.line1}, {address.city} {address.postal_code}</Text></Pressable>)}
        <TextInput style={styles.input} placeholder="Όνομα παραλήπτη" value={dropoffContactName} onChangeText={setDropoffContactName} />
        <TextInput style={styles.input} placeholder="Τηλέφωνο παραλήπτη" keyboardType="phone-pad" value={dropoffPhone} onChangeText={setDropoffPhone} />
        <Text style={styles.sectionTitle}>Στοιχεία δέματος</Text>
        <View style={styles.sizeRow}>
          {(["small", "medium", "large"] as const).map((size) => <Pressable key={size} style={[styles.sizeOption, parcelSize === size && styles.sizeOptionSelected]} onPress={() => setParcelSize(size)}><Text style={parcelSize === size ? styles.sizeTextSelected : styles.sizeText}>{size === "small" ? "Μικρό" : size === "medium" ? "Μεσαίο" : "Μεγάλο"}</Text></Pressable>)}
        </View>
        <TextInput style={[styles.input, styles.multiline]} multiline numberOfLines={4} placeholder="Τι περιέχει το δέμα; (χωρίς ευαίσθητα ή απαγορευμένα αντικείμενα)" value={parcelDescription} onChangeText={setParcelDescription} />
        <View style={styles.noticeCard}><Text style={styles.mutedSmall}>Αυτό είναι αίτημα προσφοράς/διαθεσιμότητας. Δεν αποτελεί επιβεβαιωμένη αποστολή και δεν γίνεται χρέωση σε αυτό το βήμα.</Text></View>
        {addresses.length < 2 ? <Text style={styles.error}>Χρειάζεσαι δύο διαφορετικές αποθηκευμένες διευθύνσεις για να υποβάλεις αίτημα express.</Text> : null}
        <Pressable style={styles.primary} onPress={submitExpressRequest} disabled={expressSubmitting || addresses.length < 2}><Text style={styles.primaryText}>{expressSubmitting ? "Υποβολή…" : "Υποβολή αιτήματος express"}</Text></Pressable>
      </> : screen === "services" && !store ? <>
        <Pressable onPress={() => { setServiceProvider(null); setScreen("stores"); }}><Text style={styles.back}>‹ Ανακάλυψη</Text></Pressable>
        <Text style={styles.title}>Υπηρεσίες στην περιοχή σου</Text>
        {serviceConfirmation ? <View style={styles.confirm}><Text style={styles.confirmTitle}>Το αίτημα στάλθηκε</Text><Text style={styles.muted}>Κωδικός: {serviceConfirmation}</Text><Text style={styles.muted}>Ο πάροχος θα ελέγξει το αίτημα και θα επιβεβαιώσει διαθεσιμότητα/τιμή. Δεν έγινε πληρωμή.</Text></View> : null}
        {serviceProvider ? <>
          <Text style={styles.sectionTitle}>{serviceProvider.name}</Text>
          <Text style={styles.muted}>{serviceProvider.description ?? "Περιέγραψε την υπηρεσία που χρειάζεσαι."}</Text>
          <Text style={styles.sectionTitle}>Διεύθυνση εξυπηρέτησης</Text>
          {addresses.map((address) => <Pressable key={address.id} style={[styles.address, addressId === address.id && styles.addressSelected]} onPress={() => setAddressId(address.id)}><Text style={styles.productName}>{address.label}</Text><Text style={styles.mutedSmall}>{address.line1}, {address.city} {address.postal_code}</Text></Pressable>)}
          <TextInput style={styles.input} placeholder="Τι υπηρεσία χρειάζεσαι;" value={serviceTitle} onChangeText={setServiceTitle} />
          <TextInput style={[styles.input, styles.multiline]} multiline numberOfLines={5} placeholder="Περιέγραψε το αίτημά σου με λεπτομέρειες." value={serviceDescription} onChangeText={setServiceDescription} />
          <View style={styles.noticeCard}><Text style={styles.mutedSmall}>Ο πάροχος θα απαντήσει με διαθεσιμότητα και προσφορά. Δεν γίνεται πληρωμή σε αυτό το βήμα.</Text></View>
          <Pressable style={styles.primary} onPress={submitServiceRequest} disabled={serviceSubmitting || !selectedAddress}><Text style={styles.primaryText}>{serviceSubmitting ? "Υποβολή…" : "Αποστολή αιτήματος"}</Text></Pressable>
        </> : visibleServices.length === 0 ? <View style={styles.empty}><Text style={styles.productName}>Δεν βρέθηκαν διαθέσιμοι πάροχοι υπηρεσιών</Text><Text style={styles.mutedSmall}>Η διαθεσιμότητα εμφανίζεται μόνο σε επιβεβαιωμένες περιοχές. Δοκίμασε άλλη αποθηκευμένη διεύθυνση.</Text></View> : visibleServices.map((provider) => <Pressable key={provider.id} style={styles.store} onPress={() => setServiceProvider(provider)}><View style={styles.storeIcon}><Text style={styles.storeEmoji}>🛠</Text></View><View style={{ flex: 1 }}><Text style={styles.storeName}>{provider.name}</Text><Text style={styles.mutedSmall}>{provider.description ?? provider.city}</Text><Text style={styles.mutedSmall}>{provider.city}</Text></View><Text style={styles.arrow}>›</Text></Pressable>)}
      </> : screen === "orders" && !store ? <>
        <Pressable onPress={() => setScreen("stores")}><Text style={styles.back}>‹ Καταστήματα</Text></Pressable>
        <Text style={styles.title}>Οι παραγγελίες μου</Text>
        <Text style={styles.muted}>Η κατάσταση ενημερώνεται από το κατάστημα και την ομάδα διανομής.</Text>
        <Pressable style={styles.secondary} onPress={loadOrders}><Text style={styles.secondaryText}>Ανανέωση ιστορικού</Text></Pressable>
        {orders.length === 0 ? <View style={styles.empty}><Text style={styles.productName}>Δεν έχεις κάνει ακόμη παραγγελία</Text><Text style={styles.mutedSmall}>Οι παραγγελίες σου θα εμφανιστούν εδώ.</Text></View> : orders.map((order) => <View key={order.id} style={styles.orderCard}>
          <View style={styles.orderHeader}><Text style={styles.productName}>#{order.id.slice(0, 8).toUpperCase()}</Text><Text style={styles.orderStatus}>{order.status.replaceAll("_", " ")}</Text></View>
          <Text style={styles.total}>{euro(order.total_cents)}</Text>
          <Text style={styles.mutedSmall}>{new Date(order.created_at).toLocaleString("el-GR", { dateStyle: "medium", timeStyle: "short" })}</Text>
        </View>)}
        <Text style={styles.sectionTitle}>Αιτήματα Express</Text>
        {expressRequests.length === 0 ? <Text style={styles.mutedSmall}>Δεν έχεις ακόμη αιτήματα αποστολής.</Text> : expressRequests.map((request) => <View key={request.id} style={styles.requestCard}>
          <View style={styles.orderHeader}><Text style={styles.productName}>Express · #{request.id.slice(0, 8).toUpperCase()}</Text><Text style={styles.orderStatus}>{request.status.replaceAll("_", " ")}</Text></View>
          <Text style={styles.mutedSmall}>{request.parcel_description} · {request.parcel_size === "small" ? "Μικρό" : request.parcel_size === "medium" ? "Μεσαίο" : "Μεγάλο"}</Text>
          <Text style={styles.mutedSmall}>{request.quoted_fee_cents == null ? "Αναμονή επιβεβαίωσης τιμής" : `Προσφορά: ${euro(request.quoted_fee_cents)}`}</Text>
          <Text style={styles.mutedSmall}>{new Date(request.created_at).toLocaleString("el-GR", { dateStyle: "medium", timeStyle: "short" })}</Text>
        </View>)}
        <Text style={styles.sectionTitle}>Αιτήματα υπηρεσιών</Text>
        {serviceRequests.length === 0 ? <Text style={styles.mutedSmall}>Δεν έχεις ακόμη αιτήματα τοπικών υπηρεσιών.</Text> : serviceRequests.map((request) => <View key={request.id} style={styles.requestCard}>
          <View style={styles.orderHeader}><Text style={styles.productName}>{request.store?.name ?? "Τοπική υπηρεσία"}</Text><Text style={styles.orderStatus}>{request.status.replaceAll("_", " ")}</Text></View>
          <Text style={styles.mutedSmall}>{request.service_title}</Text>
          <Text style={styles.mutedSmall}>{request.quoted_price_cents == null ? "Αναμονή προσφοράς από τον πάροχο" : `Προσφορά: ${euro(request.quoted_price_cents)}`}</Text>
          <Text style={styles.mutedSmall}>{new Date(request.created_at).toLocaleString("el-GR", { dateStyle: "medium", timeStyle: "short" })}</Text>
        </View>)}
      </> : store ? <>
        <Pressable onPress={() => { setStore(null); setCart({}); }}><Text style={styles.back}>‹ Καταστήματα</Text></Pressable>
        <Text style={styles.title}>{store.name}</Text><Text style={styles.muted}>{store.description ?? store.city}</Text>
        <Text style={styles.sectionTitle}>Τρόπος παράδοσης</Text>
        {store.platform_delivery_enabled ? <Pressable style={[styles.address, fulfillmentMethod === "platform" && styles.addressSelected]} onPress={() => setFulfillmentMethod("platform")}><Text style={styles.productName}>Διανομέας πλατφόρμας</Text><Text style={styles.mutedSmall}>Παράδοση από το δίκτυο διανομέων της πλατφόρμας</Text></Pressable> : null}
        {store.merchant_delivery_enabled ? <Pressable style={[styles.address, fulfillmentMethod === "merchant" && styles.addressSelected]} onPress={() => setFulfillmentMethod("merchant")}><Text style={styles.productName}>Διανομή καταστήματος</Text><Text style={styles.mutedSmall}>Παράδοση από τον συνεργαζόμενο έμπορο</Text></Pressable> : null}
        {store.independent_delivery_enabled ? <Pressable style={[styles.address, fulfillmentMethod === "independent" && styles.addressSelected]} onPress={() => setFulfillmentMethod("independent")}><Text style={styles.productName}>Ανεξάρτητος συνεργάτης delivery</Text><Text style={styles.mutedSmall}>Παράδοση από εγκεκριμένο συνεργαζόμενο δίκτυο</Text></Pressable> : null}
        <Image source={{ uri: storePhoto(store) }} style={styles.storeHeroImage} accessibilityLabel={`Φωτογραφία εξωφύλλου ή κατηγορίας ${store.name}`} />
        <Text style={styles.sectionTitle}>Μενού</Text>
        {products.map((product) => <View key={product.id} style={styles.product}>{product.image_path ? <Image source={{ uri: mediaUrl(product.image_path) ?? "" }} style={styles.productPhoto} accessibilityLabel={`Φωτογραφία ${product.name}`} /> : <View style={styles.productPhotoPlaceholder}><Text style={styles.productPhotoMark}>✳</Text></View>}<View style={{ flex: 1 }}><Text style={styles.productName}>{product.name}</Text><Text style={styles.mutedSmall}>{product.description ?? ""}</Text><Text style={styles.price}>{euro(product.price_cents)}</Text>{product.allergens.length ? <Text style={styles.mutedSmall}>Αλλεργιογόνα: {product.allergens.join(", ")}</Text> : null}</View><Pressable style={styles.addButton} onPress={() => setCart((current) => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }))}><Text style={styles.addText}>+ Προσθήκη</Text></Pressable></View>)}
        <Text style={styles.sectionTitle}>Διεύθυνση παράδοσης</Text>
        {addresses.map((address) => <Pressable key={address.id} style={[styles.address, addressId === address.id && styles.addressSelected]} onPress={() => setAddressId(address.id)}><Text style={styles.productName}>{address.label}</Text><Text style={styles.mutedSmall}>{address.line1}, {address.city} {address.postal_code}</Text></Pressable>)}
        <TextInput style={styles.input} placeholder="Ετικέτα (π.χ. Σπίτι)" value={label} onChangeText={setLabel} />
        <TextInput style={styles.input} placeholder="Οδός και αριθμός" value={line1} onChangeText={setLine1} />
        <View style={styles.row}><TextInput style={[styles.input, styles.half]} placeholder="Πόλη" value={city} onChangeText={setCity} /><TextInput style={[styles.input, styles.half]} placeholder="Τ.Κ." keyboardType="number-pad" value={postalCode} onChangeText={setPostalCode} /></View>
        <Pressable style={styles.secondary} onPress={saveAddress} disabled={busy}><Text style={styles.secondaryText}>Αποθήκευση διεύθυνσης</Text></Pressable>
        <View style={styles.cart}>
          <Text style={styles.sectionTitle}>Καλάθι · {count} προϊόντα</Text>
          <View style={styles.priceRow}><Text style={styles.mutedSmall}>Υποσύνολο</Text><Text style={styles.priceLine}>{euro(subtotal)}</Text></View>
          <View style={styles.priceRow}><Text style={styles.mutedSmall}>Παράδοση</Text><Text style={styles.priceLine}>{euro(deliveryFeeCents)}</Text></View>
          <View style={styles.priceRow}><Text style={styles.totalLabel}>Σύνολο</Text><Text style={styles.total}>{euro(totalCents)}</Text></View>
          {subtotal < store.minimum_order_cents ? <Text style={styles.error}>Ελάχιστη αξία παραγγελίας: {euro(store.minimum_order_cents)}.</Text> : null}
          <Text style={styles.mutedSmall}>Πληρωμή με μετρητά κατά την παράδοση. Το τελικό ποσό υπολογίζεται ξανά από τον server.</Text>
          <Pressable style={styles.primary} onPress={placeOrder} disabled={placing || count === 0 || subtotal < store.minimum_order_cents}><Text style={styles.primaryText}>{placing ? "Καταχώρηση…" : "Επιβεβαίωση παραγγελίας"}</Text></Pressable>
        </View>
      </> : <>
        <View style={styles.photoHero}>
          <Image source={{ uri: categoryPhotos.restaurant }} style={styles.photoHeroImage} />
          <View style={styles.photoHeroShade} />
          <View style={styles.photoHeroCopy}>
            <Text style={styles.photoHeroEyebrow}>E-DELIVERY · ΤΟΠΙΚΗ ΑΓΟΡΑ</Text>
            <Text style={styles.photoHeroTitle}>Ό,τι χρειάζεσαι,{"\n"}κοντά σου.</Text>
            <Text style={styles.photoHeroDescription}>Φαγητό, καφές και καθημερινές αγορές από επιχειρήσεις που εξυπηρετούν την περιοχή σου.</Text>
          </View>
        </View>
        <TextInput style={styles.input} placeholder="Αναζήτηση καταστημάτων και προϊόντων" value={searchQuery} onChangeText={setSearchQuery} />
        <View style={styles.categoryRow}>
          {([{ id: "all", label: "Όλα" }, { id: "food", label: "Φαγητό" }, { id: "groceries", label: "Supermarket" }, { id: "shops", label: "Καταστήματα" }] as const).map((item) => <Pressable key={item.id} style={[styles.categoryChip, category === item.id && styles.categoryChipSelected]} onPress={() => setCategory(item.id)}><Text style={category === item.id ? styles.categoryTextSelected : styles.categoryText}>{item.label}</Text></Pressable>)}
        </View>
        <Text style={styles.sectionTitle}>Διαθέσιμα κοντά σου</Text>
        {!selectedAddress ? <Text style={styles.mutedSmall}>Πρόσθεσε διεύθυνση για να δεις ποιες επιχειρήσεις εξυπηρετούν την περιοχή σου.</Text> : null}
        {visibleStores.length === 0 ? <View style={styles.empty}><Text style={styles.productName}>Δεν υπάρχουν διαθέσιμες επιχειρήσεις για αυτή τη διεύθυνση</Text><Text style={styles.mutedSmall}>Η διαθεσιμότητα εμφανίζεται μόνο όταν έχει επιβεβαιωθεί η κάλυψη και η δυνατότητα εξυπηρέτησης.</Text></View> : visibleStores.map((item) => <Pressable key={item.id} style={styles.store} onPress={() => { setStore(item); setCart({}); setFulfillmentMethod(item.platform_delivery_enabled ? "platform" : item.merchant_delivery_enabled ? "merchant" : "independent"); setScreen("stores"); }}><Image source={{ uri: storePhoto(item) }} style={styles.storePhoto} accessibilityLabel={item.cover_image_path ? `Φωτογραφία ${item.name}` : `Ενδεικτική φωτογραφία κατηγορίας για ${item.name}`} /><View style={{ flex: 1 }}><Text style={styles.storeName}>{item.name}</Text><Text style={styles.mutedSmall}>{item.description ?? item.city}</Text><Text style={styles.mutedSmall}>Ελάχιστη {euro(item.minimum_order_cents)} · Παράδοση {euro(item.base_delivery_fee_cents)}</Text></View><Text style={styles.arrow}>›</Text></Pressable>)}
        <Text style={styles.sectionTitle}>Η διεύθυνσή σου</Text>
        {addresses.map((address) => <Pressable key={address.id} style={[styles.address, addressId === address.id && styles.addressSelected]} onPress={() => setAddressId(address.id)}><Text style={styles.productName}>{address.label}</Text><Text style={styles.mutedSmall}>{address.line1}, {address.city} {address.postal_code}</Text></Pressable>)}
        <TextInput style={styles.input} placeholder="Ετικέτα (π.χ. Σπίτι)" value={label} onChangeText={setLabel} />
        <TextInput style={styles.input} placeholder="Οδός και αριθμός" value={line1} onChangeText={setLine1} />
        <View style={styles.row}><TextInput style={[styles.input, styles.half]} placeholder="Πόλη" value={city} onChangeText={setCity} /><TextInput style={[styles.input, styles.half]} placeholder="Τ.Κ." keyboardType="number-pad" value={postalCode} onChangeText={setPostalCode} /></View>
        <Pressable style={styles.secondary} onPress={saveAddress} disabled={busy}><Text style={styles.secondaryText}>Αποθήκευση διεύθυνσης</Text></Pressable>
      </>}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F7F8" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, backgroundColor: "#F7F7F8" },
  authWrap: { flex: 1, justifyContent: "center", padding: 28, gap: 14 },
  header: { paddingHorizontal: 22, paddingVertical: 14, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 9, flexWrap: "wrap", justifyContent: "flex-end" },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  categoryChip: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5EAF2", borderRadius: 999, paddingVertical: 9, paddingHorizontal: 13 },
  categoryChipSelected: { backgroundColor: "#FFC928", borderColor: "#FFC928" },
  categoryText: { color: "#566174", fontWeight: "700", fontSize: 11 },
  categoryTextSelected: { color: "#171717", fontWeight: "900", fontSize: 11 },
  sizeRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  sizeOption: { flex: 1, padding: 12, borderRadius: 11, borderWidth: 1, borderColor: "#E5EAF2", backgroundColor: "white", alignItems: "center" },
  sizeOptionSelected: { backgroundColor: "#FFF3C8", borderColor: "#FFC928" },
  sizeText: { color: "#566174", fontWeight: "700", fontSize: 11 },
  sizeTextSelected: { color: "#171717", fontWeight: "900", fontSize: 11 },
  multiline: { minHeight: 100, textAlignVertical: "top" },
  noticeCard: { marginTop: 10, padding: 14, borderRadius: 13, backgroundColor: "#FFF8E5", borderWidth: 1, borderColor: "#FFE4A3" },
  navLink: { color: "#7E899C", fontSize: 11, fontWeight: "700" },
  navSelected: { color: "#E31E24", fontSize: 11, fontWeight: "900" },
  content: { padding: 20, paddingBottom: 48, gap: 12 },
  brand: { color: "#E31E24", fontWeight: "900", letterSpacing: 1.5, fontSize: 13 },
  title: { color: "#14223B", fontSize: 30, fontWeight: "800", letterSpacing: -1.1 },
  hero: { padding: 22, borderRadius: 24, backgroundColor: "#FFF3C8", gap: 8, marginBottom: 10 },
  heroTitle: { fontSize: 34, lineHeight: 38, fontWeight: "900", color: "#14223B", letterSpacing: -1.4 },
  eyebrow: { color: "#E31E24", fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  muted: { color: "#7E899C", fontSize: 13, lineHeight: 20 },
  mutedSmall: { color: "#8490A3", fontSize: 11, lineHeight: 16 },
  input: { backgroundColor: "white", borderWidth: 1, borderColor: "#E5EAF2", borderRadius: 13, paddingHorizontal: 14, paddingVertical: 13, color: "#14223B", marginTop: 8, flex: 1 },
  primary: { backgroundColor: "#E31E24", padding: 15, alignItems: "center", borderRadius: 13, marginTop: 10 },
  primaryText: { color: "white", fontWeight: "800" },
  secondary: { padding: 14, borderRadius: 13, backgroundColor: "white", alignItems: "center", borderWidth: 1, borderColor: "#E5EAF2" },
  secondaryText: { color: "#E31E24", fontWeight: "700" },
  error: { color: "#B83D45", fontSize: 12 },
  logout: { color: "#E31E24", fontWeight: "700", fontSize: 12 },
  sectionTitle: { marginTop: 16, color: "#192943", fontSize: 17, fontWeight: "800" },
  store: { flexDirection: "row", alignItems: "center", gap: 14, padding: 15, borderRadius: 17, backgroundColor: "white", borderWidth: 1, borderColor: "#E9EDF4" },
  storeIcon: { width: 52, height: 52, borderRadius: 15, backgroundColor: "#FFF3C8", alignItems: "center", justifyContent: "center" },
  storeEmoji: { fontSize: 24 }, storeName: { fontWeight: "800", color: "#182740", fontSize: 15 }, arrow: { fontSize: 28, color: "#9BA8BA" },
  product: { flexDirection: "row", alignItems: "center", paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "#E8ECF2", gap: 12 },
  productName: { fontSize: 14, fontWeight: "700", color: "#182740" }, price: { fontSize: 13, fontWeight: "800", color: "#E31E24", marginTop: 4 },
  addButton: { borderWidth: 1, borderColor: "#FFD967", borderRadius: 10, padding: 9 }, addText: { fontSize: 11, fontWeight: "800", color: "#E31E24" },
  back: { color: "#E31E24", fontWeight: "700" }, address: { backgroundColor: "white", padding: 13, borderRadius: 12, borderWidth: 1, borderColor: "#E5EAF2", marginTop: 7 },
  addressSelected: { borderColor: "#E31E24", backgroundColor: "#FFF9E8" }, row: { flexDirection: "row", gap: 8 }, half: { minWidth: 0 },
  cart: { backgroundColor: "white", borderRadius: 18, padding: 17, marginTop: 16, borderWidth: 1, borderColor: "#E5EAF2" },
  total: { color: "#14223B", fontSize: 18, fontWeight: "900", marginVertical: 8 },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  priceLine: { color: "#43516A", fontSize: 12, fontWeight: "700" },
  totalLabel: { color: "#14223B", fontSize: 14, fontWeight: "900" },
  orderCard: { backgroundColor: "white", padding: 16, borderRadius: 15, borderWidth: 1, borderColor: "#E5EAF2", gap: 6 },
  requestCard: { backgroundColor: "white", padding: 15, borderRadius: 15, borderWidth: 1, borderColor: "#E5EAF2", gap: 7 },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  orderStatus: { color: "#E31E24", fontWeight: "800", fontSize: 10, textTransform: "capitalize" },
  empty: { padding: 20, backgroundColor: "white", borderRadius: 14, gap: 6 },
  confirm: { padding: 18, backgroundColor: "#E9F8F0", borderRadius: 16, gap: 7 }, confirmTitle: { color: "#16784F", fontSize: 17, fontWeight: "900" },
  link: { color: "#E31E24", fontWeight: "800", marginTop: 7 },
  storePhoto: { width: 92, height: 88, borderRadius: 13, backgroundColor: "#F0ECE8" },
  storeHeroImage: { width: "100%", height: 176, borderRadius: 18, marginTop: 10, backgroundColor: "#F0ECE8" },
  productPhoto: { width: 76, height: 76, borderRadius: 12, backgroundColor: "#F0ECE8" },
  productPhotoPlaceholder: { width: 76, height: 76, borderRadius: 12, backgroundColor: "#FFF3C8", alignItems: "center", justifyContent: "center" },
  productPhotoMark: { fontSize: 27, color: "#E31E24" },
  photoHero: { padding: 22, borderRadius: 24, minHeight: 240, overflow: "hidden", justifyContent: "flex-end", gap: 8, marginBottom: 10 },
  photoHeroImage: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", borderRadius: 24 },
  photoHeroShade: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(20,14,12,0.48)", borderRadius: 24 },
  photoHeroCopy: { position: "relative", gap: 8 },
  photoHeroEyebrow: { color: "#FFC928", fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  photoHeroTitle: { fontSize: 34, lineHeight: 38, fontWeight: "900", color: "white", letterSpacing: -1.4 },
  photoHeroDescription: { color: "white", fontSize: 13, lineHeight: 20, maxWidth: 300 }
});
