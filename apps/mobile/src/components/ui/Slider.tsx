import { useRef } from "react";
import { PanResponder, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
const BLUE = "#2848E0";
// Dependency-free slider; optional gradient track via `colors`.
export function Slider({ v, min, max, on, w = 220, colors }: { v: number; min: number; max: number; on: (n: number) => void; w?: number; colors?: string[] }) {
  const S = useRef<any>({}); S.current = { min, max, on, w };
  const x0 = useRef(0);
  const set = (x: number) => { const a = S.current; a.on(Math.round(a.min + Math.max(0, Math.min(1, x / a.w)) * (a.max - a.min))); };
  const pr = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true, onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => { x0.current = e.nativeEvent.locationX; set(x0.current); },
    onPanResponderMove: (_, g) => set(x0.current + g.dx),
  })).current;
  const f = ((v - min) / (max - min)) * w;
  return (
    <View {...pr.panHandlers} style={{ width: w, height: 30, justifyContent: "center" }}>
      {colors ? (
        <Svg pointerEvents="none" width={w} height={8}>
          <Defs><LinearGradient id="g" x1="0" y1="0" x2="1" y2="0">{colors.map((c, i) => <Stop key={i} offset={i / (colors.length - 1)} stopColor={c} />)}</LinearGradient></Defs>
          <Rect width={w} height={8} rx={4} fill="url(#g)" />
        </Svg>
      ) : (
        <View pointerEvents="none" style={{ height: 4, borderRadius: 2, backgroundColor: "#D0D5DD" }}><View style={{ width: f, height: 4, borderRadius: 2, backgroundColor: BLUE }} /></View>
      )}
      <View pointerEvents="none" style={{ position: "absolute", left: f - 9, width: 18, height: 18, borderRadius: 9, backgroundColor: "#fff", borderWidth: 2, borderColor: BLUE }} />
    </View>
  );
}
