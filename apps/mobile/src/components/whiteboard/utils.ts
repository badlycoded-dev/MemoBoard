import { box, toLocal } from "./model";
import type { Pt } from "./model";

export const ext = (n: string) => (n.split(".").pop() || "").toLowerCase();
export const isImg = (n: string) => /^(png|jpe?g|gif|webp|bmp)$/.test(ext(n));
export const fileIcon = (n: string) => {
  const e = ext(n);
  return /^(txt|md|log|json|csv|pdf|docx?)$/.test(e)
    ? "📄"
    : /^(mp3|wav|ogg|flac|m4a)$/.test(e)
      ? "🔊"
      : /^(mp4|mov|mkv|avi|webm)$/.test(e)
        ? "📼"
        : /^(zip|rar|7z|tar|gz)$/.test(e)
          ? "🗃️"
          : "📦";
};
export const pathOf = (p: number[]) => {
  let d = `M${p[0]} ${p[1]}`;
  for (let i = 2; i < p.length; i += 2) d += ` L${p[i]} ${p[i + 1]}`;
  return d;
};
export const strip = ({ _id, _creationTime, boardId, fileUrl, userId, createdAt, ...d }: any) => d;
export const segD = (p: Pt, a: Pt, b: Pt) => {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    l = dx * dx + dy * dy || 1,
    t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
};

export const isTextFile = (n: string) =>
  /^(txt|md|log|json|csv|js|ts|tsx|jsx|py|java|c|cpp|cs|go|rs|html|css|xml|yml|yaml|sh|sql)$/.test(
    ext(n),
  );

/** True while a pin is drawn as a compact file chip (its content is hidden). */
export const isAudio = (n: string) => /^(mp3|wav|ogg|m4a|aac|flac)$/.test(ext(n));
export const isVideo = (n: string) => /^(mp4|mov|mkv|webm|avi|m4v)$/.test(ext(n));
export const hostOf = (u?: string) => (u ?? "").replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
export const youtubeId = (u: string) =>
  u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/)?.[1];

/** True while an item is drawn as a compact chip (its content is hidden). */
export const isChip = (o: any) => {
  const name = o.file?.name ?? "";
  if (o.kind === "link") return !o.showContent;
  if (o.kind !== "pin" || isAudio(name)) return false;
  return !(o.showContent && (isImg(name) || isTextFile(name) || isVideo(name)));
};

export type Act = "delete" | "edit" | "download" | "copy" | "open";
const isCodeLike = (o: any) =>
  o.kind === "code" || (o.kind === "pin" && !isChip(o) && isTextFile(o.file?.name ?? ""));
const isViewer = (o: any) =>
  o.kind === "code" ||
  o.kind === "image" ||
  ((o.kind === "pin" || o.kind === "link") && !isChip(o));

/** Buttons shown on a file chip or media/code view, listed from the right edge inwards. */
export const actionsOf = (o: any): Act[] => {
  const acts: Act[] = ["delete", "edit"];
  if (o.kind === "link") acts.push("open");
  if (o.fileUrl) acts.push("download");
  if (isCodeLike(o)) acts.push("copy");
  return acts;
};

/** Which button (if any) sits under world point `p`: the whole chip, or the top strip of a viewer. */
export const actionAt = (o: any, p: Pt): Act | null => {
  if (!isChip(o) && !isViewer(o)) return null;
  const b = box(o),
    q = toLocal(o, p),
    dx = b.x + b.w - q.x;
  if (dx < 0 || q.y < b.y || q.y > b.y + (isChip(o) ? b.h : Math.min(28, b.h))) return null;
  return actionsOf(o)[Math.floor(dx / 26)] ?? null;
};
