import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./src/supabase";

type Assignment = {
  id: string;
  status: string;
  orders: {
    id: string;
    status: string;
    total_cents: number;
    currency: string;
    delivery_address_snapshot: {
      line1?: string;
      city?: string;
      postal_code?: string;
      delivery_instructions?: string;
    };
  } | null;
};

const euro = (cents: number, currency: string) =>
  new Intl.NumberFormat("el-GR", { style: "currency", currency }).format(cents / 100);

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadTasks() {
    if (!supabase) return;
    setBusy(true);
    const { data, error: queryError } = await supabase
      .from("courier_assignments")
      .select("id,status,orders(id,status,total_cents,currency,delivery_address_snapshot)")
      .in("status", ["offered", "accepted", "picked_up"])
      .order("created_at", { ascending: false });
    setBusy(false);
    if (queryError) setError("Δεν ήταν δυνατή η φόρτωση διαδρομών. Βεβαιώσου ότι ο λογαριασμός έχει εγκριθεί ως διανομέας.");
    else { setError(""); setAssignments((data ?? []) as unknown as Assignment[]); }
  }

  useEffect(() => {
    if (session) void loadTasks();
  }, [session]);

  async function signIn() {
    if (!supabase) return;
    setError("");
    setBusy(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (authError) setError("Η σύνδεση απέτυχε. Έλεγξε τα στοιχεία σου.");
  }

  async function signOut() {
    const client = supabase;
    if (!client) return;
    await client.auth.signOut();
  }

  async function act(assignmentId: string, action: "accept" | "picked_up" | "delivered") {
    if (!supabase) return;
    setBusy(true);
    const result = action === "accept"
      ? await supabase.rpc("accept_courier_assignment", { p_assignment_id: assignmentId })
      : await supabase.rpc("set_courier_delivery_status", { p_assignment_id: assignmentId, p_new_status: action });
    setBusy(false);
    if (result.error) setError("Η ενημέρωση δεν ολοκληρώθηκε. Έλεγξε ότι η διαδρομή είναι ακόμη ενεργή.");
    else await loadTasks();
  }

  if (!ready) return <SafeAreaView style={styles.center}><ActivityIndicator color="#E31E24" size="large" /></SafeAreaView>;
  if (!supabase) return <SafeAreaView style={styles.center}><Text style={styles.title}>E-DELIVERY Courier</Text><Text style={styles.muted}>Ρύθμισε τα EXPO_PUBLIC_SUPABASE variables.</Text></SafeAreaView>;

  if (!session) return <SafeAreaView style={styles.center}>
    <View style={styles.authCard}>
      <Text style={styles.brand}>e-delivery / COURIER</Text>
      <Text style={styles.title}>Έτοιμος για διαδρομή;</Text>
      <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Κωδικός" secureTextEntry value={password} onChangeText={setPassword} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.primary} onPress={signIn} disabled={busy}><Text style={styles.primaryText}>{busy ? "Σύνδεση…" : "Σύνδεση"}</Text></Pressable>
    </View>
  </SafeAreaView>;

  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}>
      <View><Text style={styles.brand}>e-delivery / COURIER</Text><Text style={styles.title}>Οι διαδρομές μου</Text></View>
      <Pressable onPress={() => { void signOut(); }}><Text style={styles.link}>Έξοδος</Text></Pressable>
    </View>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <FlatList
      contentContainerStyle={styles.list}
      data={assignments}
      keyExtractor={(item) => item.id}
      refreshing={busy}
      onRefresh={loadTasks}
      ListEmptyComponent={<View style={styles.empty}><Text style={styles.cardTitle}>Δεν υπάρχουν ενεργές αναθέσεις</Text><Text style={styles.muted}>Οι νέες προσφορές διαδρομής θα εμφανιστούν εδώ.</Text></View>}
      renderItem={({ item }) => {
        const order = item.orders;
        if (!order) return null;
        const address = order.delivery_address_snapshot ?? {};
        return <View style={styles.card}>
          <View style={styles.row}><Text style={styles.tag}>{item.status.toUpperCase()}</Text><Text style={styles.amount}>{euro(order.total_cents, order.currency)}</Text></View>
          <Text style={styles.cardTitle}>Παραγγελία #{order.id.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.address}>{address.line1 ?? "Διεύθυνση πελάτη"}{"\n"}{address.city ?? ""} {address.postal_code ?? ""}</Text>
          {address.delivery_instructions ? <Text style={styles.muted}>Οδηγίες: {address.delivery_instructions}</Text> : null}
          {item.status === "offered" ? <Pressable style={styles.primary} onPress={() => act(item.id, "accept")} disabled={busy}><Text style={styles.primaryText}>Αποδοχή διαδρομής</Text></Pressable> : null}
          {item.status === "accepted" ? <Pressable style={styles.primary} onPress={() => act(item.id, "picked_up")} disabled={busy}><Text style={styles.primaryText}>Παρέλαβα την παραγγελία</Text></Pressable> : null}
          {item.status === "picked_up" ? <Pressable style={styles.primary} onPress={() => act(item.id, "delivered")} disabled={busy}><Text style={styles.primaryText}>Ολοκλήρωση παράδοσης</Text></Pressable> : null}
        </View>;
      }}
    />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F7F8" },
  center: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#F7F7F8" },
  authCard: { backgroundColor: "white", borderRadius: 22, padding: 24, gap: 12 },
  header: { backgroundColor: "white", padding: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  list: { padding: 18, gap: 14, flexGrow: 1 },
  brand: { fontSize: 11, fontWeight: "900", color: "#E31E24", letterSpacing: 1.4 },
  title: { fontSize: 26, color: "#15243E", fontWeight: "900", marginTop: 9 },
  muted: { color: "#8792A5", fontSize: 12, lineHeight: 18 },
  input: { borderWidth: 1, borderColor: "#E4EAF2", borderRadius: 12, padding: 14, backgroundColor: "white" },
  primary: { backgroundColor: "#E31E24", borderRadius: 12, padding: 14, alignItems: "center", marginTop: 12 },
  primaryText: { color: "white", fontWeight: "800" },
  link: { color: "#E31E24", fontWeight: "700" },
  error: { color: "#B43D45", padding: 14, fontSize: 12 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 36, backgroundColor: "white", borderRadius: 16, marginTop: 20, gap: 10 },
  card: { backgroundColor: "white", borderRadius: 18, padding: 18, borderWidth: 1, borderColor: "#E8EDF4", gap: 10 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tag: { color: "#E31E24", backgroundColor: "#FFF3C8", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8, overflow: "hidden", fontSize: 9, fontWeight: "900" },
  amount: { color: "#172945", fontWeight: "900", fontSize: 16 },
  cardTitle: { color: "#172945", fontSize: 16, fontWeight: "800" },
  address: { color: "#55647A", fontSize: 13, lineHeight: 20 }
});
