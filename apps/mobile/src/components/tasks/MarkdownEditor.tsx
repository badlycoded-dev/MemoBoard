import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ext, isAudio, isImg, isTextFile, isVideo } from "@/components/whiteboard/utils";
import { Markdown, mdPalette } from "./Markdown";

type Icon = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "ui-monospace, Consolas, monospace" });

/** Write / Preview markdown editor with a formatting + import toolbar. `upload` stores a picked
 *  file and returns its public URL. */
export function MarkdownEditor({
  value, onChange, upload, dark = false,
}: { value: string; onChange: (v: string) => void; upload: (a: DocumentPicker.DocumentPickerAsset) => Promise<string>; dark?: boolean }) {
  const p = mdPalette(dark);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [busy, setBusy] = useState(false);
  const sel = useRef({ start: value.length, end: value.length });

  const put = (text: string, cursorBack = 0) => {
    const { start, end } = sel.current;
    onChange(value.slice(0, start) + text + value.slice(end));
    const pos = start + text.length - cursorBack;
    sel.current = { start: pos, end: pos };
  };
  const wrap = (a: string, b = a, ph = "text") => {
    const { start, end } = sel.current;
    const chosen = value.slice(start, end) || ph;
    onChange(value.slice(0, start) + a + chosen + b + value.slice(end));
  };
  const line = (prefix: string) => {
    const start = value.lastIndexOf("\n", sel.current.start - 1) + 1;
    onChange(value.slice(0, start) + prefix + value.slice(start));
  };

  const pick = async (type: string | string[], multiple: boolean, mode: "file" | "gallery") => {
    const r = await DocumentPicker.getDocumentAsync({ type, multiple, copyToCacheDirectory: true });
    if (r.canceled) return;
    setBusy(true);
    try {
      const parts: string[] = [];
      for (const a of r.assets) {
        if (mode === "file" && isTextFile(a.name)) {
          const t = await (await fetch(a.uri)).text();
          parts.push("```" + ext(a.name) + "\n" + t.replace(/\n$/, "") + "\n```");
          continue;
        }
        const url = await upload(a);
        parts.push(isImg(a.name) || isVideo(a.name) || isAudio(a.name) ? `![${a.name}](${url})` : `[📦 ${a.name}](${url})`);
      }
      const md = mode === "gallery" ? "\n```gallery\n" + parts.join("\n") + "\n```\n" : "\n" + parts.join("\n\n") + "\n";
      put(md);
    } finally {
      setBusy(false);
    }
  };

  const tools: [Icon, () => void][] = [
    ["format-bold", () => wrap("**")],
    ["format-italic", () => wrap("*")],
    ["format-strikethrough", () => wrap("~~")],
    ["format-header-2", () => line("## ")],
    ["code-tags", () => wrap("`", "`", "code")],
    ["code-braces", () => put("\n```js\ncode\n```\n", 5)],
    ["link-variant", () => wrap("[", "](https://)", "link")],
    ["format-list-bulleted", () => line("- ")],
    ["checkbox-marked-outline", () => line("- [ ] ")],
    ["format-quote-close", () => line("> ")],
    ["table", () => put("\n| Column | Column |\n| ------ | ------ |\n| cell   | cell   |\n")],
    ["play-box-outline", () => put("\n```embed\nhttps://\n```\n", 5)],
    ["paperclip", () => pick("*/*", true, "file")],
    ["image-multiple-outline", () => pick(["image/*", "video/*"], true, "gallery")],
  ];

  return (
    <View style={{ borderWidth: 1, borderColor: p.border, borderRadius: 10, overflow: "hidden", backgroundColor: p.surface }}>
      <View style={{ flexDirection: "row", backgroundColor: p.head, borderBottomWidth: 1, borderBottomColor: p.border }}>
        {(["write", "preview"] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={{ paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: 2, borderBottomColor: tab === t ? "#F78166" : "transparent" }}>
            <Text style={{ color: p.text, fontWeight: tab === t ? "700" : "400" }}>{t === "write" ? "Write" : "Preview"}</Text>
          </Pressable>
        ))}
        {busy && <ActivityIndicator style={{ marginLeft: 8 }} />}
      </View>
      {tab === "write" ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomWidth: 1, borderBottomColor: p.border }}>
            {tools.map(([icon, on]) => (
              <Pressable key={icon} onPress={on} style={{ padding: 8 }}>
                <MaterialCommunityIcons name={icon} size={20} color={p.muted} />
              </Pressable>
            ))}
          </ScrollView>
          <TextInput
            multiline
            value={value}
            onChangeText={onChange}
            onSelectionChange={(e) => (sel.current = e.nativeEvent.selection)}
            placeholder="Write markdown… tables, links, code, task lists, files, galleries"
            placeholderTextColor={p.muted}
            style={{ color: p.text, minHeight: 220, padding: 12, fontFamily: MONO, fontSize: 14, textAlignVertical: "top" }}
          />
        </>
      ) : (
        <View style={{ padding: 14, minHeight: 220 }}>
          <Markdown src={value} dark={dark} onChange={onChange} />
        </View>
      )}
    </View>
  );
}
