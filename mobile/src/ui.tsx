import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { colors, radius, shadow } from "./theme";

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "gold" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = "primary", loading, disabled, style }: ButtonProps) {
  const inactive = disabled || loading;
  const textColor = variant === "ghost" ? colors.teal : variant === "danger" ? colors.danger : "#fff";
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      style={({ pressed }) => [s.btn, s[variant], inactive && s.btnOff, pressed && { opacity: 0.85 }, style]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={[s.btnText, { color: textColor }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  error,
  style,
  ...input
}: { label: string; hint?: string | null; error?: string | null; style?: StyleProp<ViewStyle> } & TextInputProps) {
  return (
    <View style={style}>
      <Text style={s.label}>{label}</Text>
      <TextInput placeholderTextColor="#94aeaa" autoCorrect={false} {...input} style={[s.input, error ? s.inputError : null]} />
      {error ? <Text style={s.error}>{error}</Text> : hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

const PILL: Record<"ok" | "warn" | "bad" | "info", { bg: string; fg: string }> = {
  ok: { bg: colors.okSoft, fg: colors.ok },
  warn: { bg: colors.goldSoft, fg: colors.gold },
  bad: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.tealSoft, fg: colors.tealDark },
};

export function Pill({ text, tone = "info" }: { text: string; tone?: keyof typeof PILL }) {
  return (
    <View style={[s.pill, { backgroundColor: PILL[tone].bg }]}>
      <Text style={[s.pillText, { color: PILL[tone].fg }]}>{text}</Text>
    </View>
  );
}

export function Notice({ children, tone = "warn" }: { children: ReactNode; tone?: "warn" | "bad" | "info" }) {
  return (
    <View style={[s.notice, { backgroundColor: PILL[tone].bg }]}>
      <Text style={[s.noticeText, { color: PILL[tone].fg }]}>{children}</Text>
    </View>
  );
}

export function SectionTitle({ children, action }: { children: string; action?: ReactNode }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionTitle}>{children}</Text>
      {action}
    </View>
  );
}

export function Empty({ title, text }: { title: string; text?: string }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyTitle}>{title}</Text>
      {text ? <Text style={s.emptyText}>{text}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 16, ...shadow },
  btn: { minHeight: 52, borderRadius: radius.input, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  primary: { backgroundColor: colors.teal },
  gold: { backgroundColor: colors.gold },
  ghost: { backgroundColor: colors.tealMist, borderWidth: 1, borderColor: colors.line },
  danger: { backgroundColor: colors.dangerSoft },
  btnOff: { opacity: 0.45 },
  btnText: { fontSize: 16, fontWeight: "700" },
  label: { fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 },
  input: {
    minHeight: 50,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.ink,
  },
  inputError: { borderColor: colors.danger },
  hint: { marginTop: 6, fontSize: 12, color: colors.muted },
  error: { marginTop: 6, fontSize: 12, color: colors.danger },
  pill: { alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12, fontWeight: "700" },
  notice: { borderRadius: radius.input, padding: 12 },
  noticeText: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 26, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.ink },
  empty: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  emptyText: { marginTop: 6, fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 20 },
});
