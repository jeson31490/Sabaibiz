import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { checkLine } from "@shared/scanInvoice";
import { fetchInvoice, type InvoiceDetail } from "@shared/invoices";
import { baht, colors, formatDate } from "../../src/theme";
import { Card, Notice, Pill } from "../../src/ui";
import { errorMessage } from "../../src/util";

export default function InvoiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoice(String(id))
      .then((inv) => (inv ? setInvoice(inv) : setMissing(true)))
      .catch((e) => setError(errorMessage(e, "Couldn't load this invoice.")));
  }, [id]);

  if (error || missing) {
    return (
      <View style={s.center}>
        <Notice tone="bad">{error ?? "This invoice doesn't exist."}</Notice>
      </View>
    );
  }
  if (!invoice) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 18, paddingBottom: 48 }}>
      <Stack.Screen options={{ title: invoice.supplier }} />

      <Card>
        <Text style={s.supplier}>{invoice.supplier}</Text>
        <Text style={s.meta}>
          {formatDate(invoice.date)} · {invoice.generatedNumber ? "No invoice number" : `n° ${invoice.number}`}
        </Text>
        <Text style={s.total}>{baht(invoice.total)}</Text>
        <Text style={s.metaSmall}>Scanned on {formatDate(invoice.scannedOn)}</Text>
      </Card>

      <Text style={s.section}>
        {invoice.items.length} {invoice.items.length === 1 ? "item" : "items"}
      </Text>
      <Card style={{ padding: 4 }}>
        {invoice.items.map((line, i) => {
          const check = checkLine(line.quantity, line.unitPrice, line.printedLineTotal);
          return (
            <View key={line.id} style={[s.line, i > 0 && s.lineBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={s.lineName}>{line.name}</Text>
                <Text style={s.lineSub}>
                  {line.quantity} {line.unit} × {baht(line.unitPrice)}
                </Text>
                {line.originalName && line.originalName !== line.name ? <Text style={s.original}>{line.originalName}</Text> : null}
                {line.lineFlagged || check.mismatch ? (
                  <View style={{ marginTop: 6 }}>
                    <Pill text="Check line" tone="warn" />
                  </View>
                ) : null}
              </View>
              <Text style={s.lineTotal}>{baht(check.total)}</Text>
            </View>
          );
        })}
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.bg },
  supplier: { fontSize: 22, fontWeight: "900", color: colors.ink },
  meta: { marginTop: 4, fontSize: 14, color: colors.muted },
  total: { marginTop: 14, fontSize: 36, fontWeight: "900", color: colors.tealDeep, letterSpacing: -1 },
  metaSmall: { marginTop: 2, fontSize: 12, color: colors.muted },
  section: { marginTop: 24, marginBottom: 10, fontSize: 18, fontWeight: "800", color: colors.ink },
  line: { flexDirection: "row", gap: 12, padding: 14 },
  lineBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  lineName: { fontSize: 15, fontWeight: "700", color: colors.ink },
  lineSub: { marginTop: 2, fontSize: 13, color: colors.muted },
  original: { marginTop: 2, fontSize: 12, color: "#94aeaa" },
  lineTotal: { fontSize: 15, fontWeight: "800", color: colors.tealDeep },
});
