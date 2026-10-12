import { StyleSheet, View } from "react-native";
import Svg, { Polygon, G, Path, Rect } from "react-native-svg";
import { BLUE } from "@/theme/theme";
import { useBoardTheme } from "@/components/whiteboard/BoardTheme";
import { isArrow, handlesOf } from "@/components/whiteboard/model";
import { Shape } from "@/components/whiteboard/Shape";
import { pathOf } from "@/components/whiteboard/utils";

/** The SVG drawing surface: strokes, items, live previews and the selection outline. */
export function BoardCanvas({
  strokes,
  draft,
  tool,
  c,
  objs,
  map,
  ghost,
  sb,
  selO,
  cam,
  pan,
  wheel,
}: any) {
  const T = useBoardTheme();
  const line = (s: any, k: any) => (
    <Path
      key={k}
      d={pathOf(s.points)}
      stroke={T.vis(s.color)}
      strokeWidth={s.width}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={s.tool === "wood" ? 0.9 : s.tool === "marker" ? 0.4 : 1}
    />
  );
  const grain = (s: any, k: any) =>
    s.tool === "wood" ? (
      <Path
        key={k + "g"}
        d={pathOf(s.points)}
        stroke="#FFFFFF"
        strokeOpacity={0.4}
        strokeWidth={Math.max(1, s.width * 0.45)}
        strokeDasharray="1 6"
        fill="none"
        strokeLinecap="round"
      />
    ) : null;

  return (
    <View
      {...pan.panHandlers}
      {...({ onWheel: wheel } as any)}
      collapsable={false}
      style={{ flex: 1, backgroundColor: T.canvas }}
    >
      <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <G transform={`translate(${cam.x} ${cam.y}) scale(${cam.k})`}>
          {strokes.map((s, i) => [line(s, s._id ?? i), grain(s, s._id ?? i)])}
          {draft?.k === "draw" && [
            line(
              {
                tool,
                color: c.color,
                width: c.width,
                points: draft.pts.length === 2 ? [...draft.pts, ...draft.pts] : draft.pts,
              },
              "live",
            ),
            grain(
              {
                tool,
                width: c.width,
                points: draft.pts.length === 2 ? [...draft.pts, ...draft.pts] : draft.pts,
              },
              "live",
            ),
          ]}
          {draft?.k === "cut" && (
            <Path
              d={pathOf(draft.pts.length === 2 ? [...draft.pts, ...draft.pts] : draft.pts)}
              stroke={T.canvas}
              strokeWidth={c.width}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {objs
            .filter((o: any) => o.kind !== "tip")
            .map((o) => (
              <Shape key={o._id} o={o} m={map} />
            ))}
          {ghost && <Shape o={ghost} m={map} />}
          {sb && (
            <>
              {isArrow(selO.kind) || selO.kind === "tip" ? (
                <Rect
                  x={sb.x - 4}
                  y={sb.y - 4}
                  width={sb.w + 8}
                  height={sb.h + 8}
                  fill="none"
                  stroke={BLUE}
                  strokeDasharray="5 4"
                />
              ) : (
                <Polygon
                  points={["nw", "ne", "se", "sw"]
                    .map((id) => handlesOf(selO, map).find((h) => h.id === id)!)
                    .map((h) => `${h.x},${h.y}`)
                    .join(" ")}
                  fill="none"
                  stroke={BLUE}
                  strokeDasharray="5 4"
                />
              )}
              {selO.kind !== "tip" &&
                handlesOf(selO, map).map((h) => (
                  <Rect
                    key={h.id}
                    x={h.x - 6 / cam.k}
                    y={h.y - 6 / cam.k}
                    width={12 / cam.k}
                    height={12 / cam.k}
                    rx={6 / cam.k}
                    fill={h.id === "rot" ? BLUE : "#fff"}
                    stroke={BLUE}
                    strokeWidth={2 / cam.k}
                  />
                ))}
            </>
          )}
        </G>
      </Svg>
    </View>
  );
}
