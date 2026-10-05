import { Tool } from "./model";
const T: [Tool, string, string][] = [["select", "➤", "Select"], ["pen", "✎", "Pen"], ["wood", "✏", "Wooden pen"], ["eraser", "⌫", "Eraser"],
  ["rect", "▭", "Rectangle"], ["round", "▢", "Rounded rectangle"], ["ellipse", "◯", "Circle"], ["triangle", "△", "Triangle"],
  ["arrow", "→", "Thin arrow"], ["arrowThick", "⇨", "Thick arrow"]];
export const Toolbar = ({ tool, pick, undo, redo, canU, canR }: any) => (
  <div className="bar">
    {T.map(([k, i, t]) => <button key={k} title={t} className={tool === k ? "on" : ""} onClick={() => pick(k)}>{i}</button>)}
    <hr /><button title="Undo" onClick={undo} disabled={!canU}>↶</button><button title="Redo" onClick={redo} disabled={!canR}>↷</button>
  </div>
);
const SW = ["#12275C", "#E4572E", "#2BA84A", "#8E44AD", "#F2A900", "#1E88E5", "#7A4A21", "#111111"];
export const ToolControl = ({ tool, cfg, set }: any) => {
  if (tool === "select") return null;
  const c = cfg[tool], up = (p: any) => set({ ...cfg, [tool]: { ...c, ...p } });
  return (
    <div className="panel" style={{ left: 76, top: 64 }}>
      {tool !== "eraser" && <>
        <div className="sw">{SW.map((x) => <i key={x} className={x === c.color ? "on" : ""} style={{ background: x }} onClick={() => up({ color: x })} />)}</div>
        <label>Custom color<input type="color" value={c.color} onChange={(e) => up({ color: e.target.value })} /></label>
      </>}
      <label>{tool === "eraser" ? "Eraser size" : "Thickness"}: {c.width}
        <input type="range" min={1} max={tool === "eraser" ? 60 : 24} value={c.width} onChange={(e) => up({ width: +e.target.value })} /></label>
    </div>
  );
};
export const Inspector = ({ o, patch, upload }: any) => {
  const s = o.style, st = (p: any) => patch({ style: { ...s, ...p } });
  return (
    <div className="panel" style={{ right: 12, top: 64, width: 230 }} key={o._id}>
      <label>Text color<input type="color" value={s.tc} onChange={(e) => st({ tc: e.target.value })} /></label>
      <label>Text size: {s.fs}<input type="range" min={10} max={48} value={s.fs} onChange={(e) => st({ fs: +e.target.value })} /></label>
      <label><span><input type="checkbox" checked={s.bold} onChange={(e) => st({ bold: e.target.checked })} /> Bold text</span></label>
      <label>Outline<input type="color" value={s.stroke} onChange={(e) => st({ stroke: e.target.value })} /></label>
      {!o.kind.startsWith("arrow") && <label>Fill<input type="color" value={s.fill === "none" ? "#ffffff" : s.fill} onChange={(e) => st({ fill: e.target.value })} /></label>}
      <label>Code snippet
        <textarea rows={6} spellCheck={false} defaultValue={o.code ?? ""} style={{ fontFamily: "Consolas,monospace", fontSize: 12 }} onBlur={(e) => patch({ code: e.target.value })} /></label>
      <label>File{o.file && <a href={o.fileUrl} target="_blank" rel="noreferrer">{o.file.name}</a>}
        <input type="file" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} /></label>
    </div>
  );
};
