import { StyleSheet } from "react-native";
import Svg, { G } from "react-native-svg";
import { hasOverlay } from "./MediaLayer";
import { box } from "./model";
import { Shape } from "./Shape";

const overlaps = (a: any, b: any) => {
  const p = box(a);
  const q = box(b);
  return p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h;
};

/**
 * Items that must appear above media players: hints always, and any item created after a player
 * or web view it overlaps. Players are real views, so they cannot sit inside the SVG.
 */
export function TopLayer({ objs, map, cam }: any) {
  const above = objs.filter((o: any, i: number) => {
    if (o.kind === "tip") return true;
    if (hasOverlay(o)) return false;
    return objs.slice(0, i).some((m: any) => hasOverlay(m) && overlaps(m, o));
  });
  return (
    <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <G transform={`translate(${cam.x} ${cam.y}) scale(${cam.k})`}>
        {above.map((o: any) => (
          <Shape key={o._id} o={o} m={map} />
        ))}
      </G>
    </Svg>
  );
}
