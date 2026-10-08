import { useRef, useState } from "react";
import { PanResponder, Pressable, Text, TextInput, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { Slider } from "./ui/Slider";

// Reusable (whiteboard, task board...). value/onChange use "#RRGGBB" or "#RRGGBBAA".
type RGBA = { r: number; g: number; b: number; a: number };
const cl = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
export const toHex = ({ r, g, b, a }: RGBA) =>
  "#" +
  [r, g, b].map((v) => cl(v).toString(16).padStart(2, "0")).join("") +
  (a < 255 ? cl(a).toString(16).padStart(2, "0") : "");
export const fromHex = (h: string): RGBA => {
  const m = h.replace("#", ""),
    f =
      m.length === 3
        ? m
            .split("")
            .map((c) => c + c)
            .join("")
        : m,
    n = (i: number) => parseInt(f.slice(i, i + 2), 16) || 0;
  return f.length >= 6
    ? { r: n(0), g: n(2), b: n(4), a: f.length >= 8 ? n(6) : 255 }
    : { r: 0, g: 0, b: 0, a: 255 };
};
const hsv2rgb = (h: number, s: number, v: number) => {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return { r: f(5) * 255, g: f(3) * 255, b: f(1) * 255 };
};
const rgb2hsv = ({ r, g, b }: RGBA) => {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b),
    d = mx - Math.min(r, g, b);
  const h =
    d === 0 ? 0 : mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s: mx ? d / mx : 0, v: mx };
};
const show = (c: RGBA, f: string) =>
  f === "HEX"
    ? toHex(c)
    : f === "RGBA"
      ? `${c.r}, ${c.g}, ${c.b}, ${c.a}`
      : (() => {
          const k = 1 - Math.max(c.r, c.g, c.b) / 255,
            d = 1 - k || 1,
            q = (v: number) => Math.round(((1 - v / 255 - k) / d) * 100);
          return `${q(c.r)}, ${q(c.g)}, ${q(c.b)}, ${Math.round(k * 100)}`;
        })();
const parse = (t: string, f: string, a: number): RGBA | null => {
  if (f === "HEX")
    return /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(t.trim()) ? fromHex(t.trim()) : null;
  const n = t.split(",").map(parseFloat);
  if (n.some(isNaN)) return null;
  if (f === "RGBA" && n.length >= 3)
    return { r: cl(n[0]), g: cl(n[1]), b: cl(n[2]), a: cl(n[3] ?? a) };
  if (f === "CMYK" && n.length === 4) {
    const m = (i: number) => cl(255 * (1 - n[i] / 100) * (1 - n[3] / 100));
    return { r: m(0), g: m(1), b: m(2), a };
  }
  return null;
};
const HUE = ["#f00", "#ff0", "#0f0", "#0ff", "#00f", "#f0f", "#f00"];
const SAVED = [
  "#12275C",
  "#E4572E",
  "#2BA84A",
  "#8E44AD",
  "#F2A900",
  "#1E88E5",
  "#7A4A21",
  "#111111",
];

function Square({ h, s, v, on, size }: any) {
  const S = useRef<any>({});
  S.current = { on, size };
  const o = useRef({ x: 0, y: 0 });
  const set = (x: number, y: number) => {
    const z = S.current.size,
      q = (n: number) => Math.max(0, Math.min(1, n / z));
    S.current.on(q(x), 1 - q(y));
  };
  const pr = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        o.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
        set(o.current.x, o.current.y);
      },
      onPanResponderMove: (_, g) => set(o.current.x + g.dx, o.current.y + g.dy),
    }),
  ).current;
  const hue = toHex({ ...hsv2rgb(h, 1, 1), a: 255 });
  return (
    <View
      {...pr.panHandlers}
      style={{ width: size, height: size, borderRadius: 14, overflow: "hidden" }}
    >
      <Svg pointerEvents="none" width={size} height={size}>
        <Defs>
          <LinearGradient id="w" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#fff" />
            <Stop offset="1" stopColor={hue} />
          </LinearGradient>
          <LinearGradient id="k" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000" stopOpacity="0" />
            <Stop offset="1" stopColor="#000" />
          </LinearGradient>
        </Defs>
        <Rect width={size} height={size} fill="url(#w)" />
        <Rect width={size} height={size} fill="url(#k)" />
      </Svg>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: s * size - 8,
          top: (1 - v) * size - 8,
          width: 16,
          height: 16,
          borderRadius: 14,
          borderWidth: 2,
          borderColor: "#fff",
        }}
      />
    </View>
  );
}

export function ColorPicker({
  value,
  onChange,
  size = 220,
}: {
  value: string;
  onChange: (hex: string) => void;
  size?: number;
}) {
  const c = fromHex(value),
    [tab, setTab] = useState<"spectre" | "slider">("spectre"),
    [fmt, setFmt] = useState("HEX");
  const [saved, setSaved] = useState(SAVED),
    [hs, setHs] = useState(() => rgb2hsv(c)),
    [txt, setTxt] = useState<string | null>(null);
  const emit = (n: RGBA, sync = true) => {
    if (sync) setHs(rgb2hsv(n));
    setTxt(null);
    onChange(toHex(n));
  };
  const fromHsv = (h: number, s: number, v: number) => {
    setHs({ h, s, v });
    emit({ ...hsv2rgb(h, s, v), a: c.a }, false);
  };
  const t = "#344054",
    row = { flexDirection: "row" as const, alignItems: "center" as const };
  return (
    <View style={{ width: size }}>
      <View style={{ ...row, gap: 8, marginBottom: 8 }}>
        {(["spectre", "slider"] as const).map((k) => (
          <Pressable
            key={k}
            onPress={() => setTab(k)}
            style={{
              flex: 1,
              padding: 6,
              borderRadius: 14,
              alignItems: "center",
              backgroundColor: tab === k ? "#E5E7EB" : "#F9FAFB",
            }}
          >
            <Text style={{ fontSize: 12, color: t }}>{k === "spectre" ? "Spectre" : "Slider"}</Text>
          </Pressable>
        ))}
      </View>
      {tab === "spectre" ? (
        <>
          <Square
            h={hs.h}
            s={hs.s}
            v={hs.v}
            size={size}
            on={(s: number, v: number) => fromHsv(hs.h, s, v)}
          />
          <Slider
            w={size}
            v={Math.round(hs.h)}
            min={0}
            max={360}
            colors={HUE}
            on={(h) => fromHsv(h, hs.s, hs.v)}
          />
        </>
      ) : (
        (["r", "g", "b"] as const).map((k) => (
          <View key={k} style={row}>
            <Slider w={size - 40} v={c[k]} min={0} max={255} on={(n) => emit({ ...c, [k]: n })} />
            <Text style={{ width: 36, textAlign: "right", color: t }}>{c[k]}</Text>
          </View>
        ))
      )}
      <View style={row}>
        <Slider w={size - 40} v={c.a} min={0} max={255} on={(a) => emit({ ...c, a }, false)} />
        <Text style={{ width: 36, textAlign: "right", color: t }}>{c.a}</Text>
      </View>
      <View style={{ ...row, gap: 8, marginTop: 4 }}>
        <Pressable
          onPress={() => setFmt(fmt === "HEX" ? "RGBA" : fmt === "RGBA" ? "CMYK" : "HEX")}
          style={{ padding: 8, borderRadius: 14, backgroundColor: "#F2F4F7" }}
        >
          <Text style={{ color: t }}>{fmt} ⌄</Text>
        </Pressable>
        <TextInput
          value={txt ?? show(c, fmt)}
          onChangeText={setTxt}
          autoCapitalize="none"
          autoCorrect={false}
          onEndEditing={() => {
            const n = parse(txt ?? "", fmt, c.a);
            if (n) emit(n);
            else setTxt(null);
          }}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#D0D5DD",
            borderRadius: 14,
            padding: 6,
            color: t,
          }}
        />
      </View>
      <Text style={{ marginTop: 8, color: t }}>Select colors</Text>
      <View style={{ ...row, flexWrap: "wrap", gap: 6, marginTop: 6 }}>
        {saved.map((x) => (
          <Pressable
            key={x}
            onPress={() => emit(fromHex(x))}
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor: x,
              borderWidth: 2,
              borderColor: x === toHex(c) ? "#2848E0" : "#D0D5DD",
            }}
          />
        ))}
        <Pressable
          onPress={() => setSaved((v) => (v.includes(toHex(c)) ? v : [...v, toHex(c)]))}
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            borderWidth: 1,
            borderColor: "#D0D5DD",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: t }}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}
