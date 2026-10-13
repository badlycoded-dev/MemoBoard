import { Fragment } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Polygon, G, Path, Rect } from "react-native-svg";
import { BLUE } from "@/theme/theme";
import { useBoardTheme } from "@/components/whiteboard/BoardTheme";
import { MediaItem, hasOverlay } from "@/components/whiteboard/MediaLayer";
import { isArrow, handlesOf } from "@/components/whiteboard/model";
import { Shape } from "@/components/whiteboard/Shape";
import { pathOf } from "@/components/whiteboard/utils";

/** Touch surface + background only. Everything visible is drawn by LayerStack and TopOverlay. */
export function BoardCanvas({ pan, wheel }: any) {
  const T = useBoardTheme();
  return (
    <View
      {...pan.panHandlers}
      {...({ onWheel: wheel } as any)}
      collapsable={false}
      style={{ flex: 1, backgroundColor: T.canvas }}
    />
  );
}

const zOf = (x: any) => x._creationTime ?? Infinity; // pending (not yet saved) items sit on top
const svgProps = { pointerEvents: "none", width: "100%", height: "100%", style: StyleSheet.absoluteFill } as any;

function useStrokeDrawing() {
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
  return { T, line, grain };
}

/**
 * Every stroke and item is one layer, ordered by creation time (newest on top). Runs of plain
 * drawings share one SVG; a player / web view gets its own layer made of its frame (SVG) plus its
 * real view, so later items correctly cover it and it covers earlier ones.
 */
export function LayerStack({ strokes, objs, map, cam }: any) {
  const { line, grain } = useStrokeDrawing();
  const items = [
    ...strokes.map((s: any, i: number) => ({ s, k: s._id ?? i, z: zOf(s) })),
    ...objs.filter((o: any) => o.kind !== "tip").map((o: any) => ({ o, k: o._id, z: zOf(o) })),
  ].sort((a, b) => (a.z === b.z ? 0 : a.z < b.z ? -1 : 1));

  const layers: any[] = [];
  let run: any[] = [];
  const flush = () => {
    if (!run.length) return;
    const group = run;
    run = [];
    layers.push(
      <Svg key={"run-" + group[0].k} {...svgProps}>
        <G transform={`translate(${cam.x} ${cam.y}) scale(${cam.k})`}>
          {group.map((it) =>
            it.s ? [line(it.s, it.k), grain(it.s, it.k)] : <Shape key={it.k} o={it.o} m={map} />,
          )}
        </G>
      </Svg>,
    );
  };
  for (const it of items) {
    if (it.o && hasOverlay(it.o)) {
      flush();
      layers.push(
        <Fragment key={"media-" + it.k}>
          <Svg {...svgProps}>
            <G transform={`translate(${cam.x} ${cam.y}) scale(${cam.k})`}>
              <Shape o={it.o} m={map} />
            </G>
          </Svg>
          <MediaItem o={it.o} cam={cam} />
        </Fragment>,
      );
    } else run.push(it);
  }
  flush();
  return <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>{layers}</View>;
}

/** Always above every layer: hints, live previews, and the selection outline + handles. */
export function TopOverlay({ tool, draft, c, objs, map, ghost, sb, selO, cam }: any) {
  const { T, line, grain } = useStrokeDrawing();
  const pts = draft?.pts && (draft.pts.length === 2 ? [...draft.pts, ...draft.pts] : draft.pts);
  return (
    <Svg {...svgProps}>
      <G transform={`translate(${cam.x} ${cam.y}) scale(${cam.k})`}>
        {objs
          .filter((o: any) => o.kind === "tip")
          .map((o: any) => (
            <Shape key={o._id} o={o} m={map} />
          ))}
        {draft?.k === "draw" && [
          line({ tool, color: c.color, width: c.width, points: pts }, "live"),
          grain({ tool, width: c.width, points: pts }, "live"),
        ]}
        {draft?.k === "cut" && (
          <Path
            d={pathOf(pts)}
            stroke={T.canvas}
            strokeWidth={c.width}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
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
  );
}
