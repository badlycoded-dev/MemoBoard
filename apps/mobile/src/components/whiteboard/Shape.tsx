import {
  TSpan,
  G,
  Ellipse,
  Image as SvgImage,
  Line,
  Polygon,
  Rect,
  Text as SText,
} from "react-native-svg";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { BLUE } from "@/theme/theme";
import { useBoardTheme } from "./BoardTheme";
import { box, ends, isArrow } from "./model";
import { hostOf, isAudio, isVideo, actionsOf, fileIcon, isChip, isImg, isTextFile } from "./utils";

function ShapeBody({ o, m }: any) {
  const T = useBoardTheme();
  const s = { ...o.style, stroke: T.vis(o.style.stroke), tc: T.vis(o.style.tc) },
    b = box(o);
  if (o.kind === "line") {
    const { a, b: e } = ends(o, m);
    return (
      <>
        <Line
          strokeDasharray={dashOf(s.dash)}
          x1={a.x}
          y1={a.y}
          x2={e.x}
          y2={e.y}
          stroke={s.stroke}
          strokeWidth={s.sw}
          strokeLinecap="round"
        />
        {o.text ? (
          <SText
            x={(a.x + e.x) / 2}
            y={(a.y + e.y) / 2 - s.fs}
            fontSize={s.fs}
            fontWeight={s.bold ? "700" : "400"}
            fill={s.tc}
            textAnchor="middle"
          >
            {styledSpans(String(o.text))}
          </SText>
        ) : null}
      </>
    );
  }
  if (o.kind === "tip") {
    const an = { x: o.x + o.w, y: o.y + o.h };
    if (o.hidden) {
      return (
        <>
          <Ellipse
            cx={an.x}
            cy={an.y}
            rx={16}
            ry={16}
            fill="#FFF4CC"
            stroke="#F5B301"
            strokeWidth={2}
          />
          <SIcon name="lightbulb-on-outline" x={an.x} y={an.y + 6} size={18} fill="#B7791F" />
        </>
      );
    }
    return (
      <>
        <Line
          x1={an.x}
          y1={an.y}
          x2={o.x + 24}
          y2={o.y + 38}
          stroke="#F5B301"
          strokeWidth={2}
          strokeDasharray="4 4"
        />
        <Ellipse cx={an.x} cy={an.y} rx={7} ry={7} fill="#fff" stroke="#F5B301" strokeWidth={3} />
        <Rect
          x={o.x}
          y={o.y}
          width={190}
          height={44}
          rx={16}
          fill="#FFF4CC"
          stroke="#F5B301"
          strokeWidth={1.5}
        />
        <SIcon name="lightbulb-on-outline" x={o.x + 22} y={o.y + 28} size={18} fill="#B7791F" />
        <SText
          x={o.x + 40}
          y={o.y + 27}
          fontSize={s.fs}
          fill={s.tc}
          fontWeight={s.bold ? "700" : "400"}
        >
          {styledSpans(String(o.text ?? "").slice(0, 22))}
        </SText>
      </>
    );
  }
  if (o.kind === "link") {
    const chip = isChip(o);
    const my = chip ? b.y + b.h / 2 : b.y + 14;
    return (
      <>
        <Rect
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          rx={s.r ?? (chip ? b.h / 2 : 14)}
          fill={chip ? "#F2F4F7" : "#fff"}
          stroke="#D0D5DD"
        />
        <SIcon name="link-variant" x={b.x + 18} y={my + 7} size={20} fill="#2848E0" />
        <SText x={b.x + 38} y={my + 5} fontSize={13} fill="#344054">
          {`| ${hostOf(o.url).slice(0, Math.max(6, Math.floor((b.w - 130) / 7)))}`}
        </SText>
        <ActionStrip o={o} b={b} />
      </>
    );
  }
  if (isChip(o)) {
    const name: string = o.file?.name ?? "file";
    const my = b.y + b.h / 2;
    const maxChars = Math.max(6, Math.floor((b.w - 120) / 7));
    return (
      <>
        <Rect
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          rx={s.r ?? b.h / 2}
          fill="#F2F4F7"
          stroke="#D0D5DD"
        />
        <SText x={b.x + 14} y={my + 7} fontSize={20}>
          {fileIcon(name)}
        </SText>
        <SText x={b.x + 42} y={my + 5} fontSize={13} fill="#344054">
          {`| ${name.length > maxChars ? name.slice(0, maxChars - 1) + "…" : name}`}
        </SText>
        <ActionStrip o={o} b={b} />
      </>
    );
  }
  if (o.kind === "pin" && (isAudio(o.file?.name ?? "") || isVideo(o.file?.name ?? ""))) {
    const audio = isAudio(o.file?.name ?? "");
    const name: string = o.file?.name ?? "";
    return (
      <>
        <Rect
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          rx={s.r ?? 14}
          fill={audio ? "#F2F4F7" : "#101828"}
          stroke="#D0D5DD"
        />
        <SText x={b.x + 10} y={b.y + 17} fontSize={12} fill={audio ? "#344054" : "#fff"}>
          {name.length > 24 ? name.slice(0, 23) + "…" : name}
        </SText>
        <ActionStrip o={o} b={b} />
      </>
    );
  }
  if (o.kind === "image" || (o.kind === "pin" && isImg(o.file?.name ?? "")))
    return (
      <>
        <SText x={b.x} y={b.y - 6} fontSize={11} fill="#667085">
          {o.file?.name}
        </SText>
        {o.fileUrl ? (
          <SvgImage
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            href={{ uri: o.fileUrl }}
            preserveAspectRatio="xMidYMid slice"
          />
        ) : (
          <Rect x={b.x} y={b.y} width={b.w} height={b.h} fill="#F2F4F7" />
        )}
        <Rect x={b.x} y={b.y} width={b.w} height={b.h} fill="none" stroke="#D0D5DD" />
        <ActionStrip o={o} b={b} />
      </>
    );
  if (o.kind === "code" || (o.kind === "pin" && isTextFile(o.file?.name ?? ""))) {
    const lines = String(o.code ?? "").split("\n"),
      n = Math.max(1, Math.floor((b.h - 30) / 14)),
      mc = Math.max(4, Math.floor((b.w - 40) / 6.6));
    return (
      <>
        <Rect x={b.x} y={b.y} width={b.w} height={b.h} rx={8} fill="#F9FAFB" stroke="#98A2B3" />
        <Rect x={b.x} y={b.y} width={b.w} height={24} rx={8} fill="#E4E7EC" />
        <SText x={b.x + 10} y={b.y + 16} fontSize={11} fill={T.text}>
          {o.kind === "pin" ? o.file?.name : (o.text ?? "snippet")}
        </SText>
        <ActionStrip o={o} b={b} />
        {lines.slice(0, n).map((l: string, i: number) => (
          <SText
            key={i}
            x={b.x + 8}
            y={b.y + 40 + i * 14}
            fontSize={11}
            fontFamily="monospace"
            fill="#1D2939"
          >{`${i + 1}  ${l.slice(0, mc)}`}</SText>
        ))}
      </>
    );
  }
  const tx = (x: number, y: number) =>
    String(o.text ?? "")
      .split("\n")
      .map((l: string, i: number, a: string[]) => (
        <SText
          key={i}
          x={x}
          y={y + (i - (a.length - 1) / 2) * s.fs * 1.2 + s.fs * 0.35}
          fontSize={s.fs}
          fontWeight={s.bold ? "700" : "400"}
          fill={s.tc}
          textAnchor="middle"
        >
          {styledSpans(l)}
        </SText>
      ));
  if (isArrow(o.kind)) {
    const { a, b: e } = ends(o, m),
      ang = Math.atan2(e.y - a.y, e.x - a.x),
      hl = 8 + s.sw * 2.5;
    const p = (d: number) => `${e.x - hl * Math.cos(ang + d)},${e.y - hl * Math.sin(ang + d)}`;
    return (
      <>
        <Line
          strokeDasharray={dashOf(s.dash)}
          x1={a.x}
          y1={a.y}
          x2={e.x - hl * 0.6 * Math.cos(ang)}
          y2={e.y - hl * 0.6 * Math.sin(ang)}
          stroke={s.stroke}
          strokeWidth={s.sw}
          strokeLinecap="round"
        />
        <Polygon points={`${e.x},${e.y} ${p(-0.45)} ${p(0.45)}`} fill={s.stroke} />
        {o.text ? tx((a.x + e.x) / 2, (a.y + e.y) / 2 - s.fs) : null}
      </>
    );
  }
  const cp = { stroke: s.stroke, strokeWidth: s.sw, fill: s.fill };
  return (
    <>
      {o.kind === "ellipse" ? (
        <Ellipse cx={b.x + b.w / 2} cy={b.y + b.h / 2} rx={b.w / 2} ry={b.h / 2} {...cp} />
      ) : o.kind === "triangle" ? (
        <Polygon
          points={`${b.x + b.w / 2},${b.y} ${b.x + b.w},${b.y + b.h} ${b.x},${b.y + b.h}`}
          {...cp}
        />
      ) : (
        <Rect
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          rx={s.r ?? (o.kind === "round" ? 18 : 0)}
          {...cp}
        />
      )}
      {o.text ? tx(b.x + b.w / 2, b.y + b.h / 2) : null}
      {o.code ? (
        <SIcon name="code-tags" x={b.x + b.w - 20} y={b.y - 6} size={15} fill="#2848E0" />
      ) : null}
      {o.fileUrl ? (
        <SIcon name="paperclip" x={b.x + b.w - 6} y={b.y - 6} size={15} fill="#667085" />
      ) : null}
    </>
  );
}

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];
const dashOf = (d?: string) => (d === "dashed" ? "10 8" : d === "dotted" ? "2 8" : undefined);

/** Material icon drawn inside the SVG canvas (the icon font is loaded by any rendered icon). */
function SIcon({
  name,
  x,
  y,
  size = 16,
  fill,
}: {
  name: IconName;
  x: number;
  y: number;
  size?: number;
  fill: string;
}) {
  const code = MaterialCommunityIcons.glyphMap[name] as unknown as number;
  if (!code) return null;
  return (
    <SText
      x={x}
      y={y}
      fontFamily="material-community"
      fontSize={size}
      fill={fill}
      textAnchor="middle"
    >
      {String.fromCodePoint(code)}
    </SText>
  );
}

const ACTION_ICON: Record<string, IconName> = {
  delete: "close",
  open: "open-in-new",
  edit: "pencil",
  download: "download",
  copy: "content-copy",
};
const ACTION_COLOR: Record<string, string> = {
  delete: "#F04438",
  open: "#2848E0",
  edit: "#F79009",
  download: "#2848E0",
  copy: "#667085",
};

/** Row of small action buttons (copy / download / edit / delete) in the top-right of a chip or viewer. */
function ActionStrip({ o, b }: { o: any; b: ReturnType<typeof box> }) {
  const acts = actionsOf(o);
  const cy = isChip(o) ? b.y + b.h / 2 : b.y + 14;
  return (
    <>
      {o.kind === "image" || (o.kind === "pin" && !isChip(o) && isImg(o.file?.name ?? "")) ? (
        <Rect
          x={b.x + b.w - 26 * acts.length - 6}
          y={b.y + 2}
          width={26 * acts.length + 4}
          height={24}
          rx={12}
          fill="#fff"
          opacity={0.85}
        />
      ) : null}
      {acts.map((act, i) => (
        <SIcon
          key={act}
          name={ACTION_ICON[act]}
          x={b.x + b.w - 13 - 26 * i}
          y={cy + 6}
          size={17}
          fill={ACTION_COLOR[act]}
        />
      ))}
    </>
  );
}

/** Draws an item, applying its rotation and mirroring around the box center. */
export function Shape({ o, m }: any) {
  const body = <ShapeBody o={o} m={m} />;
  if (isArrow(o.kind) || o.kind === "tip" || !(o.rot || o.flipX || o.flipY)) return body;
  const b = box(o),
    cx = b.x + b.w / 2,
    cy = b.y + b.h / 2;
  const transform = `translate(${cx} ${cy}) rotate(${o.rot ?? 0}) scale(${o.flipX ? -1 : 1} ${o.flipY ? -1 : 1}) translate(${-cx} ${-cy})`;
  return <G transform={transform}>{body}</G>;
}

const STYLE_TOKENS = /(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*]+\*|\{#[0-9a-fA-F]{3,8}\|[^}]+\})/;

/** Inline text syntax: **bold**, *italic*, __underline__, ~~strike~~ and {#e4572e|colored}. */
function styledSpans(text: string) {
  return text
    .split(STYLE_TOKENS)
    .filter(Boolean)
    .map((part, i) => {
      let props: any = {};
      let body = part;
      if (/^\*\*[^*]+\*\*$/.test(part)) {
        props = { fontWeight: "700" };
        body = part.slice(2, -2);
      } else if (/^__[^_]+__$/.test(part)) {
        props = { textDecoration: "underline" };
        body = part.slice(2, -2);
      } else if (/^~~[^~]+~~$/.test(part)) {
        props = { textDecoration: "line-through" };
        body = part.slice(2, -2);
      } else if (/^\*[^*]+\*$/.test(part)) {
        props = { fontStyle: "italic" };
        body = part.slice(1, -1);
      } else {
        const m = part.match(/^\{(#[0-9a-fA-F]{3,8})\|([^}]+)\}$/);
        if (m) {
          props = { fill: m[1] };
          body = m[2];
        }
      }
      return (
        <TSpan key={i} {...props}>
          {body}
        </TSpan>
      );
    });
}
