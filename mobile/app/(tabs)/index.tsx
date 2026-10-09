import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchCostsScannedToday, fetchInvoices, fetchPriceAlerts, type InvoiceRow, type PriceAlertRow } from "@shared/invoices";
import { useAuth } from "../../src/auth";
import { baht, colors, formatDate, radius } from "../../src/theme";
import { Button, Card, Empty, Notice, Pill, SectionTitle } from "../../src/ui";
import { errorMessage } from "../../src/util";

export default function Home() {
  const { businessName } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [today, setToday] = useState<{ total: number; count: number } | null>(null);
  const [recent, setRecent] = useState<InvoiceRow[]>([]);
  const [alerts, setAlerts] = useState<PriceAlertRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, r, a] = await Promise.all([fetchCostsScannedToday(), fetchInvoices({ limit: 5, orderBy: "added" }), fetchPriceAlerts(3)]);
      setToday(t);
      setRecent(r);
      setAlerts(a);
      setError(null);
    } catch (e) {
      setError(errorMessage(e, "Couldn't load your data."));
    } finally {
      setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.teal} />}
    >
      <View style={[s.header, { paddingTop: insets.top + 18 }]}>
        <Text style={s.hello}>Hello,</Text>
        <Text style={s.business} numberOfLines={1}>
          {businessName}
        </Text>
      </View>

      <View style={s.body}>
        <Card style={s.todayCard}>
          <Text style={s.todayLabel}>Costs scanned today</Text>
          <Text style={s.todayValue}>{today ? baht(today.total) : loaded ? "฿0" : "…"}</Text>
          <Text style={s.todayMeta}>
            {today ? `${today.count} ${today.count === 1 ? "invoice" : "invoices"}` : " "}
          </Text>
        </Card>

        <Button title="Scan an invoice" variant="gold" onPress={() => router.push("/scan")} style={{ marginTop: 16 }} />

        {error ? (
          <View style={{ marginTop: 16 }}>
            <Notice tone="bad">{error}</Notice>
          </View>
        ) : null}

        {alerts.length > 0 ? (
          <>
            <SectionTitle>Price alerts</SectionTitle>
            <Card style={{ padding: 4 }}>
              {alerts.map((a, i) => (
                <View key={`${a.product}-${a.supplier}-${i}`} style={[s.row, i > 0 && s.rowBorder]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowTitle}>{a.product}</Text>
                    <Text style={s.rowSub}>
                      {a.supplier} · {baht(a.from)} → {baht(a.to)} / {a.unit}
                    </Text>
                  </View>
                  <Pill text={a.change} tone={a.severity === "high" ? "bad" : "warn"} />
                </View>
              ))}
            </Card>
          </>
        ) : null}

        <SectionTitle
          action={
            <Pressable onPress={() => router.push("/invoices")} hitSlop={10}>
              <Text style={s.link}>See all</Text>
            </Pressable>
          }
        >
          Recent invoices
        </SectionTitle>
        <Card style={{ padding: 4 }}>
          {recent.length === 0 ? (
            <Empty title={loaded ? "No invoices yet" : "Loading…"} text={loaded ? "Tap the camera button to scan your first invoice." : undefined} />
          ) : (
            recent.map((inv, i) => (
              <Pressable
                key={inv.id}
                onPress={() => router.push(`/invoice/${inv.id}`)}
                style={({ pressed }) => [s.row, i > 0 && s.rowBorder, pressed && { opacity: 0.6 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>{inv.supplier}</Text>
                  <Text style={s.rowSub}>
                    {formatDate(inv.date)} · {inv.products} {inv.products === 1 ? "item" : "items"}
                  </Text>
                </View>
                <Text style={s.amount}>{baht(inv.total)}</Text>
              </Pressable>
            ))
          )}
        </Card>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: colors.teal, paddingHorizontal: 22, paddingBottom: 64, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  hello: { fontSize: 15, color: "#99f6e4", fontWeight: "600" },
  business: { marginTop: 2, fontSize: 28, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  body: { paddingHorizontal: 18, marginTop: -44 },
  todayCard: { paddingVertical: 20, paddingHorizontal: 20 },
  todayLabel: { fontSize: 13, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  todayValue: { marginTop: 6, fontSize: 40, fontWeight: "900", color: colors.tealDeep, letterSpacing: -1 },
  todayMeta: { marginTop: 2, fontSize: 14, color: colors.muted },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 12 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  rowTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  rowSub: { marginTop: 2, fontSize: 13, color: colors.muted },
  amount: { fontSize: 16, fontWeight: "800", color: colors.tealDeep },
  link: { fontSize: 14, fontWeight: "700", color: colors.teal, borderRadius: radius.pill },
});
