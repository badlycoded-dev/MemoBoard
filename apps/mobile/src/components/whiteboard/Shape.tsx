import { Ellipse, Image as SvgImage, Line, Polygon, Rect, Text as SText } from "react-native-svg";
import { BLUE } from "@/theme/theme";
import { useBoardTheme } from "./BoardTheme";
import { box, ends, isArrow } from "./model";
import { fileIcon, isChip, isImg, isTextFile } from "./utils";

export function Shape({ o, m }: any) {
  const T = useBoardTheme();
  const s = { ...o.style, stroke: T.vis(o.style.stroke), tc: T.vis(o.style.tc) },
    b = box(o);
  if (o.kind === "line") {
    const { a, b: e } = ends(o, m);
    return (
      <>
        <Line
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
            {o.text}
          </SText>
        ) : null}
      </>
    );
  }
  if (o.kind === "tip") {
    const an = { x: o.x + o.w, y: o.y + o.h };
    if (o.hidden)
      return (
        <>
          <Ellipse
            cx={an.x}
            cy={an.y}
            rx={15}
            ry={15}
            fill="#FEF0C7"
            stroke="#F79009"
            strokeWidth={2}
          />
          <SText x={an.x} y={an.y + 6} fontSize={16} textAnchor="middle">
            💡
          </SText>
        </>
      );
    return (
      <>
        <Line x1={an.x} y1={an.y} x2={o.x + 90} y2={o.y + 19} stroke="#98A2B3" strokeWidth={1.5} />
        <Ellipse cx={an.x} cy={an.y} rx={5} ry={5} fill="#F79009" />
        <Rect x={o.x} y={o.y} width={180} height={38} rx={10} fill="#F2F4F7" stroke="#D0D5DD" />
        <SText
          x={o.x + 90}
          y={o.y + 24}
          fontSize={s.fs}
          fill={s.tc}
          fontWeight={s.bold ? "700" : "400"}
          textAnchor="middle"
        >
          {String(o.text ?? "").slice(0, 24)}
        </SText>
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
        <SText x={b.x + b.w - 66} y={my + 6} fontSize={16} textAnchor="middle" fill={BLUE}>
          ⬇
        </SText>
        <SText x={b.x + b.w - 40} y={my + 6} fontSize={16} textAnchor="middle" fill="#F79009">
          ✎
        </SText>
        <SText x={b.x + b.w - 14} y={my + 6} fontSize={16} textAnchor="middle" fill="#F04438">
          ✕
        </SText>
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
          {l}
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
        <SText x={b.x + b.w - 30} y={b.y - 6} fontSize={13} fill={BLUE}>
          {"</>"}
        </SText>
      ) : null}
      {o.fileUrl ? (
        <SText x={b.x + b.w - 4} y={b.y - 6} fontSize={13} textAnchor="end">
          📎
        </SText>
      ) : null}
    </>
  );
}
