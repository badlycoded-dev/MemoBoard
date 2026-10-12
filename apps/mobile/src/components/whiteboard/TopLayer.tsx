import { StyleSheet } from "react-native";
import Svg, { G } from "react-native-svg";
import { Shape } from "./Shape";

/** Hints are drawn above the media overlay so they never hide behind players or web views. */
export function TopLayer({ objs, map, cam }: any) {
  return (
    <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <G transform={`translate(${cam.x} ${cam.y}) scale(${cam.k})`}>
        {objs
          .filter((o: any) => o.kind === "tip")
          .map((o: any) => (
            <Shape key={o._id} o={o} m={map} />
          ))}
      </G>
    </Svg>
  );
}
