import Constants from "expo-constants";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth";
import { colors } from "../../src/theme";
import { Button, Card } from "../../src/ui";

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "S";

export default function Account() {
  const { name, email, businessName, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  function confirmSignOut() {
    Alert.alert("Sign out", "You will need to sign in again to scan invoices.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
    ]);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 18, paddingBottom: 40 }}
    >
      <Text style={s.title}>Account</Text>

      <Card style={s.profile}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials(name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={s.email} numberOfLines={1}>
            {email}
          </Text>
          <Text style={s.business} numberOfLines={1}>
            {businessName}
          </Text>
        </View>
      </Card>

      <Button title="Sign out" variant="danger" onPress={confirmSignOut} style={{ marginTop: 20 }} />

      <Text style={s.version}>SabaiBiz {Constants.expoConfig?.version ?? ""} · prototype</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 30, fontWeight: "900", color: colors.ink, letterSpacing: -0.5, marginBottom: 16 },
  profile: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.teal, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  name: { fontSize: 18, fontWeight: "800", color: colors.ink },
  email: { marginTop: 2, fontSize: 14, color: colors.muted },
  business: { marginTop: 4, fontSize: 13, fontWeight: "700", color: colors.gold },
  version: { marginTop: 28, textAlign: "center", fontSize: 12, color: colors.muted },
});
