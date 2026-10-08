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
