import * as Clipboard from "expo-clipboard";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ReactNode, useState } from "react";
import { Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AudioPlayer, LinkEmbed, VideoPlayer } from "@/components/whiteboard/MediaLayer";
import { embedHtml, isAudio, isVideo, youtubeId } from "@/components/whiteboard/utils";

/** GitHub-flavoured markdown: headings, lists, task lists, tables, code, quotes, images, plus
 *  media (video/audio), embeds (```embed), and ```gallery carousels. */

export const mdPalette = (dark: boolean) =>
  dark
    ? { text: "#E6EDF3", muted: "#8D96A0", border: "#30363D", code: "#161B22", link: "#4493F8", head: "#21262D", surface: "#0D1117" }
    : { text: "#1F2328", muted: "#59636E", border: "#D1D9E0", code: "#F6F8FA", link: "#0969DA", head: "#F6F8FA", surface: "#FFFFFF" };
type P = ReturnType<typeof mdPalette>;

const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "ui-monospace, SFMono-Regular, Consolas, monospace" });

/** Media kind from the alt text (file name) first, then the URL. */
export const mediaKind = (alt: string, url: string): "video" | "audio" | "image" =>
  isVideo(alt) || isVideo(url.split("?")[0]) ? "video" : isAudio(alt) || isAudio(url.split("?")[0]) ? "audio" : "image";

type Block =
  | { t: "h"; n: number; text: string }
  | { t: "p"; text: string }
  | { t: "quote"; text: string }
  | { t: "code"; lang: string; text: string }
  | { t: "hr" }
  | { t: "table"; head: string[]; rows: string[][]; align: string[] }
  | { t: "list"; items: { depth: number; ord?: string; text: string; task?: boolean; done?: boolean; line: number }[] }
  | { t: "media"; alt: string; url: string }
  | { t: "embed"; url: string }
  | { t: "gallery"; items: { alt: string; url: string }[] };

const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
const isSep = (l?: string) => !!l && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(l) && l.includes("-");
const IMG = /^!\[([^\]]*)\]\(([^)\s]+)[^)]*\)$/;
const isBlockStart = (l: string, n?: string) =>
  /^(#{1,6})\s/.test(l) || l.startsWith("```") || l.startsWith(">") || /^\s*([-*+]|\d+\.)\s/.test(l) ||
  /^(-{3,}|\*{3,}|_{3,})$/.test(l.trim()) || (l.includes("|") && isSep(n));

export function parse(src: string): Block[] {
  const lines = src.replace(/\r/g, "").split("\n"), out: Block[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim()) continue;
    const fence = l.match(/^```\s*(\S*)/);
    if (fence) {
      const body: string[] = [];
      while (++i < lines.length && !lines[i].startsWith("```")) body.push(lines[i]);
      const lang = fence[1].toLowerCase();
      if (lang === "gallery")
        out.push({
          t: "gallery",
          items: body.map((b) => b.trim()).filter(Boolean).map((b) => {
            const m = b.match(IMG);
            return m ? { alt: m[1], url: m[2] } : { alt: "", url: b };
          }),
        });
      else if (lang === "embed") out.push({ t: "embed", url: body.join("").trim() });
      else out.push({ t: "code", lang, text: body.join("\n") });
      continue;
    }
    const h = l.match(/^(#{1,6})\s+(.*)/);
    if (h) { out.push({ t: "h", n: h[1].length, text: h[2] }); continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(l.trim())) { out.push({ t: "hr" }); continue; }
    if (l.includes("|") && isSep(lines[i + 1])) {
      const head = cells(l), align = cells(lines[i + 1]).map((c) => (c.startsWith(":") && c.endsWith(":") ? "center" : c.endsWith(":") ? "right" : "left"));
      const rows: string[][] = [];
      i++;
      while (i + 1 < lines.length && lines[i + 1].includes("|") && lines[i + 1].trim()) rows.push(cells(lines[++i]));
      out.push({ t: "table", head, rows, align });
      continue;
    }
    if (l.startsWith(">")) {
      const q = [l.replace(/^>\s?/, "")];
      while (i + 1 < lines.length && lines[i + 1].startsWith(">")) q.push(lines[++i].replace(/^>\s?/, ""));
      out.push({ t: "quote", text: q.join("\n") });
      continue;
    }
    if (/^\s*([-*+]|\d+\.)\s/.test(l)) {
      const items: any[] = [];
      for (; i < lines.length && /^\s*([-*+]|\d+\.)\s/.test(lines[i]); i++) {
        const m = lines[i].match(/^(\s*)([-*+]|\d+\.)\s+(.*)/)!;
        const t = m[3].match(/^\[( |x|X)\]\s+(.*)/);
        items.push({ depth: Math.floor(m[1].length / 2), ord: /\d/.test(m[2]) ? m[2] : undefined, text: t ? t[2] : m[3], task: !!t, done: !!t && t[1] !== " ", line: i });
      }
      i--;
      out.push({ t: "list", items });
      continue;
    }
    const img = l.trim().match(IMG);
    if (img) { out.push({ t: "media", alt: img[1], url: img[2] }); continue; }
    if (/^https?:\/\/\S+$/.test(l.trim()) && (youtubeId(l.trim()) || embedHtml(l.trim()))) { out.push({ t: "embed", url: l.trim() }); continue; }
    const para = [l];
    while (i + 1 < lines.length && lines[i + 1].trim() && !isBlockStart(lines[i + 1], lines[i + 2])) para.push(lines[++i]);
    out.push({ t: "p", text: para.join("\n") });
  }
  return out;
}

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(~~[^~]+~~)|(\*[^*\n]+\*)|(!\[[^\]]*\]\([^)]+\))|(\[[^\]]+\]\([^)]+\))|(https?:\/\/[^\s<)]+)/g;
export function inline(src: string, p: P, base: any = {}): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0, k = 0, m: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(src))) {
    if (m.index > last) out.push(src.slice(last, m.index));
    const t = m[0];
    if (m[1]) out.push(<Text key={k++} style={{ fontFamily: MONO, backgroundColor: p.code, fontSize: 13 }}> {t.slice(1, -1)} </Text>);
    else if (m[2]) out.push(<Text key={k++} style={{ fontWeight: "700" }}>{inline(t.slice(2, -2), p)}</Text>);
    else if (m[3]) out.push(<Text key={k++} style={{ textDecorationLine: "line-through" }}>{inline(t.slice(2, -2), p)}</Text>);
    else if (m[4]) out.push(<Text key={k++} style={{ fontStyle: "italic" }}>{inline(t.slice(1, -1), p)}</Text>);
    else if (m[5] || m[6]) {
      const mm = t.match(/!?\[([^\]]*)\]\(([^)\s]+)[^)]*\)/)!;
      out.push(
        <Text key={k++} style={{ color: p.link }} onPress={() => Linking.openURL(mm[2])}>
          {m[5] ? `🖼 ${mm[1] || "image"}` : mm[1]}
        </Text>,
      );
    } else out.push(<Text key={k++} style={{ color: p.link }} onPress={() => Linking.openURL(t)}>{t}</Text>);
    last = m.index + t.length;
  }
  if (last < src.length) out.push(src.slice(last));
  return out;
}

function Media({ alt, url, p }: { alt: string; url: string; p: P }) {
  const kind = mediaKind(alt, url);
  const [ratio, setRatio] = useState(16 / 9);
  if (kind === "video") return <View style={{ aspectRatio: 16 / 9, borderRadius: 8, overflow: "hidden", backgroundColor: "#000" }}><VideoPlayer uri={url} /></View>;
  if (kind === "audio") return <View style={{ height: 44, maxWidth: 420 }}><AudioPlayer uri={url} width={360} /></View>;
  return (
    <Image
      source={{ uri: url }}
      accessibilityLabel={alt}
      onLoad={(e: any) => {
        const s = e.nativeEvent?.source;
        if (s?.width && s?.height) setRatio(s.width / s.height);
      }}
      style={{ width: "100%", aspectRatio: ratio, borderRadius: 8, backgroundColor: p.code }}
      resizeMode="contain"
    />
  );
}

/** Paged carousel for photos and videos. */
function Gallery({ items, p }: { items: { alt: string; url: string }[]; p: P }) {
  const [w, setW] = useState(0), [i, setI] = useState(0);
  if (!items.length) return null;
  const go = (n: number) => setI(Math.max(0, Math.min(items.length - 1, n)));
  const cur = items[i];
  const kind = mediaKind(cur.alt, cur.url);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ borderWidth: 1, borderColor: p.border, borderRadius: 10, overflow: "hidden", backgroundColor: "#000" }}>
      <View style={{ width: w || "100%", aspectRatio: 16 / 9 }}>
        {kind === "video" ? <VideoPlayer key={cur.url} uri={cur.url} /> : <Image source={{ uri: cur.url }} style={StyleSheet.absoluteFill} resizeMode="contain" />}
      </View>
      {items.length > 1 && (
        <>
          <Pressable onPress={() => go(i - 1)} style={[nav, { left: 6 }]}><MaterialCommunityIcons name="chevron-left" size={26} color="#fff" /></Pressable>
          <Pressable onPress={() => go(i + 1)} style={[nav, { right: 6 }]}><MaterialCommunityIcons name="chevron-right" size={26} color="#fff" /></Pressable>
          <View style={{ position: "absolute", bottom: 8, alignSelf: "center", flexDirection: "row", gap: 6, backgroundColor: "#0008", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }}>
            {items.map((_, n) => <Pressable key={n} onPress={() => go(n)} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: n === i ? "#fff" : "#fff6" }} />)}
          </View>
          <Text style={{ position: "absolute", top: 8, right: 10, color: "#fff", backgroundColor: "#0008", paddingHorizontal: 8, borderRadius: 8, fontSize: 12 }}>{i + 1} / {items.length}</Text>
        </>
      )}
    </View>
  );
}
const nav = { position: "absolute", top: "42%", width: 34, height: 34, borderRadius: 17, backgroundColor: "#0008", alignItems: "center", justifyContent: "center" } as const;

function Code({ text, lang, p }: { text: string; lang: string; p: P }) {
  const [copied, setCopied] = useState(false);
  return (
    <View style={{ backgroundColor: p.code, borderRadius: 8, borderWidth: 1, borderColor: p.border }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10, paddingTop: 6 }}>
        <Text style={{ color: p.muted, fontSize: 11 }}>{lang}</Text>
        <Pressable onPress={() => { Clipboard.setStringAsync(text); setCopied(true); setTimeout(() => setCopied(false), 1200); }}>
          <MaterialCommunityIcons name={copied ? "check" : "content-copy"} size={15} color={p.muted} />
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text selectable style={{ fontFamily: MONO, fontSize: 13, color: p.text, padding: 10, paddingTop: 4 }}>{text}</Text>
      </ScrollView>
    </View>
  );
}

export function Markdown({ src, dark = false, onChange }: { src: string; dark?: boolean; onChange?: (next: string) => void }) {
  const p = mdPalette(dark);
  const blocks = parse(src || "");
  if (!blocks.length) return <Text style={{ color: p.muted }}>Nothing to preview.</Text>;
  const toggle = (line: number) => {
    if (!onChange) return;
    const ls = src.split("\n");
    ls[line] = ls[line].replace(/\[( |x|X)\]/, (m) => (m === "[ ]" ? "[x]" : "[ ]"));
    onChange(ls.join("\n"));
  };
  return (
    <View style={{ gap: 12 }}>
      {blocks.map((b, i) => {
        switch (b.t) {
          case "h":
            return (
              <View key={i} style={b.n <= 2 ? { borderBottomWidth: 1, borderBottomColor: p.border, paddingBottom: 6 } : undefined}>
                <Text style={{ color: p.text, fontWeight: "700", fontSize: [0, 28, 22, 18, 16, 14, 13][b.n] }}>{inline(b.text, p)}</Text>
              </View>
            );
          case "p":
            return <Text key={i} style={{ color: p.text, lineHeight: 22, fontSize: 15 }}>{inline(b.text, p)}</Text>;
          case "quote":
            return (
              <View key={i} style={{ borderLeftWidth: 4, borderLeftColor: p.border, paddingLeft: 12 }}>
                <Text style={{ color: p.muted, lineHeight: 22, fontSize: 15 }}>{inline(b.text, p)}</Text>
              </View>
            );
          case "hr":
            return <View key={i} style={{ height: 2, backgroundColor: p.border }} />;
          case "code":
            return <Code key={i} text={b.text} lang={b.lang} p={p} />;
          case "list":
            return (
              <View key={i} style={{ gap: 4 }}>
                {b.items.map((it, n) => (
                  <View key={n} style={{ flexDirection: "row", gap: 8, paddingLeft: it.depth * 18 }}>
                    {it.task ? (
                      <Pressable onPress={() => toggle(it.line)} style={{ marginTop: 2 }}>
                        <MaterialCommunityIcons name={it.done ? "checkbox-marked" : "checkbox-blank-outline"} size={18} color={it.done ? p.link : p.muted} />
                      </Pressable>
                    ) : (
                      <Text style={{ color: p.text, width: 18, textAlign: "right" }}>{it.ord ?? "•"}</Text>
                    )}
                    <Text style={{ color: p.text, flex: 1, lineHeight: 22, fontSize: 15, textDecorationLine: it.done ? "line-through" : "none", opacity: it.done ? 0.65 : 1 }}>{inline(it.text, p)}</Text>
                  </View>
                ))}
              </View>
            );
          case "table":
            return (
              <ScrollView key={i} horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ borderWidth: 1, borderColor: p.border, borderRadius: 6, overflow: "hidden" }}>
                  {[b.head, ...b.rows].map((r, ri) => (
                    <View key={ri} style={{ flexDirection: "row", backgroundColor: ri === 0 ? p.head : ri % 2 ? p.surface : p.code }}>
                      {b.head.map((_, ci) => (
                        <Text key={ci} style={{ minWidth: 100, padding: 8, color: p.text, fontWeight: ri === 0 ? "700" : "400", textAlign: b.align[ci] as any, borderLeftWidth: ci ? 1 : 0, borderTopWidth: ri ? 1 : 0, borderColor: p.border }}>
                          {inline(r[ci] ?? "", p)}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            );
          case "media":
            return <Media key={i} alt={b.alt} url={b.url} p={p} />;
          case "embed": {
            const tall = !youtubeId(b.url) && !!embedHtml(b.url);
            return <View key={i} style={{ height: tall ? 560 : undefined, aspectRatio: tall ? undefined : 16 / 9, borderRadius: 8, overflow: "hidden" }}><LinkEmbed url={b.url} /></View>;
          }
          case "gallery":
            return <Gallery key={i} items={b.items} p={p} />;
        }
      })}
    </View>
  );
}
