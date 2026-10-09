import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchInvoices, type InvoiceRow } from "@shared/invoices";
import { baht, colors, formatDate, shadow } from "../../src/theme";
import { Empty, Notice, Pill } from "../../src/ui";
import { errorMessage } from "../../src/util";

export default function Invoices() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await fetchInvoices({ limit: 300 }));
      setError(null);
    } catch (e) {
      setError(errorMessage(e, "Couldn't load your invoices."));
    } finally {
      setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 18, paddingBottom: 40, gap: 10 }}
      data={rows}
      keyExtractor={(r) => r.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
          tintColor={colors.teal}
        />
      }
      ListHeaderComponent={
        <View style={{ marginBottom: 8 }}>
          <Text style={s.title}>Invoices</Text>
          {error ? <Notice tone="bad">{error}</Notice> : null}
        </View>
      }
      ListEmptyComponent={
        loaded && !error ? <Empty title="No invoices yet" text="Tap the camera button to scan your first invoice." /> : null
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/invoice/${item.id}`)} style={({ pressed }) => [s.card, pressed && { opacity: 0.7 }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.supplier} numberOfLines={1}>
              {item.supplier}
            </Text>
            <Text style={s.sub} numberOfLines={1}>
              {formatDate(item.date)} · {item.generatedNumber ? "No number" : `n° ${item.number}`} · {item.products}{" "}
              {item.products === 1 ? "item" : "items"}
            </Text>
            {item.status !== "processed" ? (
              <View style={{ marginTop: 6 }}>
                <Pill text={item.status === "error" ? "Couldn't read" : "Pending"} tone={item.status === "error" ? "bad" : "warn"} />
              </View>
            ) : null}
          </View>
          <Text style={s.amount}>{baht(item.total)}</Text>
        </Pressable>
      )}
    />
  );
}

const s = StyleSheet.create({
  title: { fontSize: 30, fontWeight: "900", color: colors.ink, letterSpacing: -0.5, marginBottom: 6 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 16, ...shadow },
  supplier: { fontSize: 16, fontWeight: "800", color: colors.ink },
  sub: { marginTop: 3, fontSize: 13, color: colors.muted },
  amount: { fontSize: 17, fontWeight: "900", color: colors.tealDeep },
});
