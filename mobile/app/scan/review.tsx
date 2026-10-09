import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  DuplicateInvoiceError,
  fetchSupplierNames,
  findSavedInvoice,
  invoiceDateWarning,
  isIsoDate,
  saveInvoice,
  SimilarInvoiceError,
} from "@shared/invoices";
import { checkLine } from "@shared/scanInvoice";
import { clearScan, getScan } from "../../src/scanStore";
import { baht, colors, formatDate, radius } from "../../src/theme";
import { Button, Card, Field, Notice, Pill } from "../../src/ui";

export default function Review() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scan = getScan();

  const [supplier, setSupplier] = useState(scan?.result.supplier_name ?? "");
  const [number, setNumber] = useState(scan?.result.invoice_number ?? "");
  // Never today by default: with no date printed, the owner types it.
  const [date, setDate] = useState(isIsoDate(scan?.result.invoice_date) ? scan!.result.invoice_date! : "");
  const [totalText, setTotalText] = useState(scan?.result.invoice_total != null ? String(scan.result.invoice_total) : "");
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [alreadySaved, setAlreadySaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!scan) {
      router.replace("/");
      return;
    }
    fetchSupplierNames().then(setSuppliers).catch(() => {});
    findSavedInvoice(scan.result.supplier_name ?? "", scan.result.invoice_number ?? "")
      .then((saved) => {
        if (saved) setAlreadySaved(`This invoice is already saved (dated ${formatDate(saved.date)}). You don't need to save it again.`);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = Number(totalText.replace(/,/g, "").trim());
  const totalOk = totalText.trim() !== "" && Number.isFinite(total) && total > 0;
  const dateOk = isIsoDate(date);
  const canSave = !!supplier.trim() && dateOk && totalOk && !saving;
  const warning = dateOk ? invoiceDateWarning(date) : null;

  const chips = useMemo(() => {
    const typed = supplier.trim().toLowerCase();
    return suppliers.filter((n) => n.toLowerCase() !== typed && (!typed || n.toLowerCase().includes(typed))).slice(0, 6);
  }, [suppliers, supplier]);

  if (!scan) return null;
  const { result } = scan;

  async function save(allowSimilar = false) {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      const id = await saveInvoice(
        {
          supplier: supplier.trim(),
          number: number.trim(),
          date,
          total,
          items: result.products.map((p) => ({
            name: p.name,
            originalName: p.original_name,
            quantity: p.quantity,
            unit: p.unit,
            unitPrice: p.unit_price,
            printedLineTotal: p.line_total,
            content_amount: p.content_amount,
            content_unit: p.content_unit,
            content_source: p.content_source,
            category: p.category,
          })),
          scanId: result.scan_id,
          supplierLegalName: result.supplier_legal_name,
          supplierTaxId: result.supplier_tax_id,
        },
        { allowSimilar },
      );
      clearScan();
      router.replace(`/invoice/${id}`);
    } catch (e) {
      setSaving(false);
      if (e instanceof SimilarInvoiceError) {
        Alert.alert("Possible duplicate", e.message, [
          { text: "Cancel", style: "cancel" },
          { text: "Save anyway", onPress: () => void save(true) },
        ]);
      } else {
        setSaveError(e instanceof DuplicateInvoiceError ? e.message : "We couldn't save this invoice. Please try again.");
      }
    }
  }

  function discard() {
    Alert.alert("Discard this invoice?", "The reading will be lost.", [
      { text: "Keep editing", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => {
          clearScan();
          router.back();
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[s.top, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={discard} hitSlop={12}>
          <Text style={s.discard}>Discard</Text>
        </Pressable>
        <Text style={s.topTitle}>Check the invoice</Text>
        <View style={{ width: 56 }} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, paddingBottom: 140 }}>
        {alreadySaved ? (
          <View style={{ marginBottom: 14 }}>
            <Notice tone="warn">{alreadySaved}</Notice>
          </View>
        ) : null}

        <Card style={{ gap: 14 }}>
          <View>
            <Field label="Supplier" value={supplier} onChangeText={setSupplier} placeholder="Not found, please type it" autoCapitalize="words" />
            {chips.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.chips}>
                {chips.map((n) => (
                  <Pressable key={n} onPress={() => setSupplier(n)} style={s.chip}>
                    <Text style={s.chipText}>{n}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>
          <Field
            label="Invoice number"
            value={number}
            onChangeText={setNumber}
            placeholder="None printed"
            autoCapitalize="characters"
            hint={number.trim() ? null : "No number? Sabai makes its own reference."}
          />
          <Field
            label="Invoice date (YYYY-MM-DD)"
            value={date}
            onChangeText={setDate}
            placeholder="2026-10-09"
            keyboardType="numbers-and-punctuation"
            error={date && !dateOk ? "Use the format YYYY-MM-DD" : null}
            hint={warning}
          />
          <Field
            label="Total paid (฿)"
            value={totalText}
            onChangeText={setTotalText}
            placeholder="0"
            keyboardType="decimal-pad"
            hint={result.invoice_total_label ? `Read from: ${result.invoice_total_label}` : null}
          />
        </Card>

        <Text style={s.section}>
          {result.products.length} {result.products.length === 1 ? "item" : "items"} read
        </Text>
        <Card style={{ padding: 4 }}>
          {result.products.map((p, i) => {
            const check = checkLine(p.quantity, p.unit_price, p.line_total);
            return (
              <View key={`${p.name}-${i}`} style={[s.line, i > 0 && s.lineBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.lineName}>{p.name}</Text>
                  <Text style={s.lineSub}>
                    {p.quantity} {p.unit} × {baht(p.unit_price)}
                  </Text>
                  {check.mismatch ? (
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
        <Text style={s.foot}>You can fix item details on sabaibiz.com after saving.</Text>

        {saveError ? (
          <View style={{ marginTop: 14 }}>
            <Notice tone="bad">{saveError}</Notice>
          </View>
        ) : null}
      </ScrollView>

      <View style={[s.bar, { paddingBottom: insets.bottom + 12 }]}>
        <Button title="Confirm and save" onPress={() => void save()} disabled={!canSave} loading={saving} />
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingBottom: 12, backgroundColor: colors.bg },
  topTitle: { fontSize: 17, fontWeight: "800", color: colors.ink },
  discard: { width: 56, fontSize: 15, fontWeight: "600", color: colors.danger },
  chips: { gap: 8, paddingTop: 10 },
  chip: { backgroundColor: colors.tealSoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontSize: 13, fontWeight: "700", color: colors.tealDark },
  section: { marginTop: 24, marginBottom: 10, fontSize: 18, fontWeight: "800", color: colors.ink },
  line: { flexDirection: "row", gap: 12, padding: 14 },
  lineBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  lineName: { fontSize: 15, fontWeight: "700", color: colors.ink },
  lineSub: { marginTop: 2, fontSize: 13, color: colors.muted },
  lineTotal: { fontSize: 15, fontWeight: "800", color: colors.tealDeep },
  foot: { marginTop: 12, fontSize: 12, color: colors.muted, textAlign: "center" },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 12, backgroundColor: "rgba(244,250,249,0.96)", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
});
