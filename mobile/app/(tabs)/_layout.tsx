import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { Pressable, StyleSheet, View, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../src/theme";

function ScanButton() {
  const router = useRouter();
  return (
    <View style={s.scanSlot}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Scan an invoice"
        onPress={() => router.push("/scan")}
        style={({ pressed }) => [s.scan, pressed && { transform: [{ scale: 0.95 }] }]}
      >
        <Ionicons name="camera" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

type IconName = React.ComponentProps<typeof Ionicons>["name"];
const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} size={size} color={color} />;
  };

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: colors.line,
          height: 60 + insets.bottom,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("home-outline") }} />
      <Tabs.Screen name="invoices" options={{ title: "Invoices", tabBarIcon: icon("receipt-outline") }} />
      <Tabs.Screen name="scan-tab" options={{ title: "Scan", tabBarButton: () => <ScanButton /> }} />
      <Tabs.Screen name="prices" options={{ title: "Prices", tabBarIcon: icon("pricetags-outline") }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: icon("person-circle-outline") }} />
    </Tabs>
  );
}

const s = StyleSheet.create({
  scanSlot: { flex: 1, alignItems: "center" },
  scan: {
    marginTop: -22,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.bg,
    shadowColor: colors.gold,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
