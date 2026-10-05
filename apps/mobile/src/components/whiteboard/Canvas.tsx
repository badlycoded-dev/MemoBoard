import React, { useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { isWeb } from "../../services/platform";
import { colors } from "../../theme/colors";

export type Stroke = { color: string; width: number; points: number[] };
const toPath = (p: number[]) => {
  let d = `M${p[0]} ${p[1]}`;
  for (let i = 2; i < p.length; i += 2) d += ` L${p[i]} ${p[i + 1]}`;
  return d;
};
const webOnly = isWeb ? ({ touchAction: "none", cursor: "crosshair", userSelect: "none" } as any) : null;

export function Canvas(props: { strokes: Stroke[]; color: string; width: number; onStroke: (s: Stroke) => void }) {
  const [live, setLive] = useState<number[]>([]);
  const origin = useRef({ x: 0, y: 0 });
  const pts = useRef<number[]>([]);
  const cfg = useRef(props); cfg.current = props;

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      origin.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
      pts.current = [origin.current.x, origin.current.y];
      setLive([...pts.current]);
    },
    onPanResponderMove: (_, g) => {
      pts.current.push(Math.round(origin.current.x + g.dx), Math.round(origin.current.y + g.dy));
      setLive([...pts.current]);
    },
    onPanResponderRelease: () => {
      if (pts.current.length === 2) pts.current.push(pts.current[0], pts.current[1]); // tap = dot
      if (pts.current.length >= 4) cfg.current.onStroke({ color: cfg.current.color, width: cfg.current.width, points: pts.current });
      pts.current = []; setLive([]);
    },
  }), []);

  return (
    <View {...pan.panHandlers} style={[{ flex: 1, backgroundColor: colors.canvas }, webOnly]}>
      <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
        {props.strokes.map((s, i) => (
          <Path key={i} d={toPath(s.points)} stroke={s.color} strokeWidth={s.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {live.length >= 2 && (
          <Path d={toPath(live.length === 2 ? [...live, ...live] : live)} stroke={props.color} strokeWidth={props.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </Svg>
    </View>
  );
}
