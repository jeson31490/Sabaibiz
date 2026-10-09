import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MAX_INVOICE_PAGES } from "@shared/scanInvoice";
import { scanInvoice } from "../../src/api";
import { setScan } from "../../src/scanStore";
import { colors } from "../../src/theme";
import { Button, Notice } from "../../src/ui";
import { errorMessage } from "../../src/util";

// Phone photos are often 5-10MB, above Claude's 5MB image limit: shrink to a JPEG, like the website does.
const MAX_EDGE = 1568;

type Page = { id: string; uri: string; dataUrl: string };

async function toPage(uri: string, width: number, height: number): Promise<Page> {
  const ctx = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_EDGE) ctx.resize(width >= height ? { width: MAX_EDGE } : { height: MAX_EDGE });
  const image = await ctx.renderAsync();
  const out = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: true });
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, uri: out.uri, dataUrl: `data:image/jpeg;base64,${out.base64 ?? ""}` };
}

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const camera = useRef<CameraView>(null);
  const abort = useRef<AbortController | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [pages, setPages] = useState<Page[]>([]);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const full = pages.length >= MAX_INVOICE_PAGES;
  const cameraReady = permission?.granted === true;

  async function capture() {
    if (busy || full || !camera.current) return;
    setBusy(true);
    setError(null);
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.9 });
      if (photo) {
        const page = await toPage(photo.uri, photo.width, photo.height);
        setPages((prev) => [...prev, page].slice(0, MAX_INVOICE_PAGES));
      }
    } catch (e) {
      setError(errorMessage(e, "Couldn't take the photo. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function pickFromGallery() {
    if (busy || full) return;
    setBusy(true);
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: MAX_INVOICE_PAGES - pages.length,
        quality: 1,
      });
      if (!result.canceled) {
        const added: Page[] = [];
        for (const asset of result.assets) added.push(await toPage(asset.uri, asset.width, asset.height));
        setPages((prev) => [...prev, ...added].slice(0, MAX_INVOICE_PAGES));
      }
    } catch (e) {
      setError(errorMessage(e, "Couldn't open that photo. Please try another one."));
    } finally {
      setBusy(false);
    }
  }

  async function read() {
    if (pages.length === 0 || reading) return;
    const controller = new AbortController();
    abort.current = controller;
    setReading(true);
    setError(null);
    try {
      const result = await scanInvoice(pages, controller.signal);
      if (controller.signal.aborted) return;
      setScan({ result, pageCount: pages.length });
      router.replace("/scan/review");
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(errorMessage(e, "Something went wrong while reading your invoice."));
      setReading(false);
    }
  }

  function close() {
    abort.current?.abort();
    router.back();
  }

  return (
    <View style={s.root}>
      {cameraReady ? <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" /> : null}

      {!cameraReady ? (
        <View style={s.permission}>
          <Ionicons name="camera-outline" size={44} color="#99f6e4" />
          <Text style={s.permTitle}>Camera access needed</Text>
          <Text style={s.permText}>SabaiBiz uses your camera only to photograph your invoices.</Text>
          {permission && !permission.canAskAgain ? (
            <Text style={s.permText}>Camera access is off. Turn it on for SabaiBiz in your phone settings, or pick photos from your gallery.</Text>
          ) : (
            <Button title="Allow camera" onPress={() => void requestPermission()} style={{ marginTop: 18, alignSelf: "stretch" }} />
          )}
        </View>
      ) : null}

      <View style={[s.top, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={close} hitSlop={12} style={s.round} accessibilityLabel="Close">
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
        <Text style={s.count}>
          {pages.length === 0 ? "Photograph your invoice" : `Page ${pages.length} of ${MAX_INVOICE_PAGES}`}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[s.bottom, { paddingBottom: insets.bottom + 16 }]}>
        {error ? (
          <View style={{ marginBottom: 12 }}>
            <Notice tone="bad">{error}</Notice>
          </View>
        ) : null}

        {pages.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.thumbs}>
            {pages.map((p, i) => (
              <View key={p.id}>
                <Image source={{ uri: p.uri }} style={s.thumb} />
                <Pressable
                  onPress={() => setPages((prev) => prev.filter((x) => x.id !== p.id))}
                  hitSlop={8}
                  style={s.remove}
                  accessibilityLabel={`Remove page ${i + 1}`}
                >
                  <Ionicons name="close" size={14} color="#fff" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={s.hint}>Fit the whole invoice in the frame. Long invoice? Take one photo per page.</Text>
        )}

        <View style={s.controls}>
          <Pressable onPress={pickFromGallery} disabled={busy || full} style={[s.round, s.side, (busy || full) && { opacity: 0.4 }]} accessibilityLabel="Choose from gallery">
            <Ionicons name="images-outline" size={24} color="#fff" />
          </Pressable>

          <Pressable
            onPress={capture}
            disabled={!cameraReady || busy || full}
            accessibilityLabel="Take photo"
            style={({ pressed }) => [s.shutterRing, (!cameraReady || full) && { opacity: 0.4 }, pressed && { transform: [{ scale: 0.95 }] }]}
          >
            {busy ? <ActivityIndicator color={colors.teal} /> : <View style={s.shutter} />}
          </Pressable>

          <Pressable
            onPress={read}
            disabled={pages.length === 0 || busy}
            style={[s.read, (pages.length === 0 || busy) && { opacity: 0.35 }]}
            accessibilityLabel="Read the invoice"
          >
            <Ionicons name="checkmark" size={26} color="#fff" />
          </Pressable>
        </View>
        <View style={s.labels}>
          <Text style={s.label}>Gallery</Text>
          <Text style={s.label}>Photo</Text>
          <Text style={s.label}>Read</Text>
        </View>
      </View>

      {reading ? (
        <View style={s.overlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={s.overlayTitle}>Sabai is reading your invoice…</Text>
          <Text style={s.overlayText}>This usually takes 10 to 20 seconds.</Text>
          <Button title="Cancel" variant="ghost" onPress={close} style={{ marginTop: 24, minWidth: 140 }} />
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#04201f" },
  permission: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 8 },
  permTitle: { marginTop: 10, fontSize: 20, fontWeight: "800", color: "#fff" },
  permText: { fontSize: 14, lineHeight: 20, color: "#99f6e4", textAlign: "center" },
  top: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  count: { color: "#fff", fontSize: 15, fontWeight: "700", backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, overflow: "hidden" },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "rgba(4,32,31,0.78)", paddingTop: 14, paddingHorizontal: 20 },
  hint: { color: "#ccfbf1", fontSize: 13, textAlign: "center", marginBottom: 14, lineHeight: 18 },
  thumbs: { gap: 10, paddingVertical: 4, paddingRight: 8, marginBottom: 12 },
  thumb: { width: 52, height: 68, borderRadius: 8, backgroundColor: "#134e4a" },
  remove: { position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center" },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8 },
  side: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.14)" },
  shutterRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  shutter: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#fff" },
  read: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center" },
  labels: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 6, marginTop: 6 },
  label: { width: 64, textAlign: "center", color: "#99f6e4", fontSize: 11, fontWeight: "600" },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(4,32,31,0.92)", alignItems: "center", justifyContent: "center", padding: 32, gap: 8 },
  overlayTitle: { marginTop: 14, fontSize: 20, fontWeight: "800", color: "#fff", textAlign: "center" },
  overlayText: { fontSize: 14, color: "#99f6e4", textAlign: "center" },
});
