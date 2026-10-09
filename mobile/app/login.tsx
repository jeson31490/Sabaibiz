import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase, supabaseConfigured } from "../src/supabase";
import { colors } from "../src/theme";
import { Button, Field, Notice } from "../src/ui";

export default function Login() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) {
      setError(authError.message === "Invalid login credentials" ? "Wrong email or password." : authError.message);
      setBusy(false);
    }
    // On success the root layout switches to the tabs by itself.
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.teal }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.hero}>
          <Text style={s.brand}>
            Sabai<Text style={{ color: "#fbbf24" }}>Biz</Text>
          </Text>
          <Text style={s.tag}>Photograph your invoices.{"\n"}Sabai does the accounting.</Text>
        </View>

        <View style={s.sheet}>
          <Text style={s.title}>Sign in</Text>
          {!supabaseConfigured ? (
            <Notice tone="bad">App not configured: add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (see mobile/.env.example).</Notice>
          ) : null}
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            placeholder="you@restaurant.com"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            placeholder="Your password"
            onSubmitEditing={signIn}
            style={{ marginTop: 14 }}
          />
          {error ? (
            <View style={{ marginTop: 14 }}>
              <Notice tone="bad">{error}</Notice>
            </View>
          ) : null}
          <Button title="Sign in" onPress={signIn} loading={busy} style={{ marginTop: 20 }} />
          <Text style={s.foot}>New to SabaiBiz? Create your account on sabaibiz.com, then sign in here.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  hero: { paddingHorizontal: 28, paddingBottom: 36 },
  brand: { fontSize: 44, fontWeight: "900", color: "#fff", letterSpacing: -1 },
  tag: { marginTop: 10, fontSize: 18, lineHeight: 26, color: "#99f6e4", fontWeight: "500" },
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingTop: 28,
    gap: 0,
  },
  title: { fontSize: 24, fontWeight: "800", color: colors.ink, marginBottom: 18 },
  foot: { marginTop: 18, fontSize: 13, lineHeight: 19, color: colors.muted, textAlign: "center" },
});
