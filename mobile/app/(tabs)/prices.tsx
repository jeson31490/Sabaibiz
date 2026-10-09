import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchPriceAlerts, type PriceAlertRow } from "@shared/invoices";
import { baht, colors, shadow } from "../../src/theme";
import { Empty, Notice, Pill } from "../../src/ui";
import { errorMessage } from "../../src/util";

export default function Prices() {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<PriceAlertRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchPriceAlerts(50)
        .then((r) => {
          setRows(r);
          setError(null);
        })
        .catch((e) => setError(errorMessage(e, "Couldn't load price alerts.")))
        .finally(() => setLoaded(true));
    }, []),
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 18, paddingBottom: 40, gap: 10 }}
      data={rows}
      keyExtractor={(r, i) => `${r.product}-${r.supplier}-${i}`}
      ListHeaderComponent={
        <View style={{ marginBottom: 8 }}>
          <Text style={s.title}>Prices</Text>
          <Text style={s.lead}>Products that got more expensive, spotted from your invoices.</Text>
          {error ? (
            <View style={{ marginTop: 10 }}>
              <Notice tone="bad">{error}</Notice>
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        loaded && !error ? <Empty title="No price alerts" text="Scan a few invoices and Sabai will warn you when a price goes up." /> : null
      }
      renderItem={({ item }) => (
        <View style={s.card}>
          <View style={{ flex: 1 }}>
            <Text style={s.product}>{item.product}</Text>
            <Text style={s.sub}>
              {item.supplier} · {baht(item.from)} → {baht(item.to)} / {item.unit}
            </Text>
          </View>
          <Pill text={item.change} tone={item.severity === "high" ? "bad" : "warn"} />
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  title: { fontSize: 30, fontWeight: "900", color: colors.ink, letterSpacing: -0.5 },
  lead: { marginTop: 4, fontSize: 14, color: colors.muted, lineHeight: 20 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 16, ...shadow },
  product: { fontSize: 16, fontWeight: "800", color: colors.ink },
  sub: { marginTop: 3, fontSize: 13, color: colors.muted },
});
