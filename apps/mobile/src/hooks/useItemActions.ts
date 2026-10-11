import { Text } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { defStyle } from "@/components/whiteboard/model";
import { isAudio, isVideo, isTextFile, isImg } from "@/components/whiteboard/utils";

/** Actions that create and edit board items (text, tips, code, files, links) and the edit sheet. */
export function useItemActions(deps: any) {
  const {
    board,
    upUrl,
    patchO,
    form,
    setForm,
    fo,
    push,
    create,
    setSel,
    setTool,
    setGrp,
    setSheet,
    setLinkPrompt,
    dim,
    W,
  } = deps;

  const openEdit = (o: any) =>
    setForm({
      id: o._id,
      o,
      text: o.text ?? "",
      code: o.code ?? "",
      s: { ...o.style },
      show: !!o.showContent,
      url: o.url ?? "",
    });
  const save = async () => {
    const o = form.o;
    const name: string = fo?.file?.name ?? "";
    let code = form.code;
    if (o.kind === "pin" && form.show && isTextFile(name) && !code && fo?.fileUrl) {
      code = await (await fetch(fo.fileUrl)).text();
    }
    const after: any = {
      text: form.text,
      code,
      style: form.s,
      showContent: form.show,
      ...(o.kind === "link" ? { url: form.url } : {}),
    };
    const before: any = {
      text: o.text ?? "",
      code: o.code ?? "",
      style: o.style,
      showContent: !!o.showContent,
    };
    if ((o.kind === "pin" || o.kind === "link") && form.show !== !!o.showContent) {
      // switching between file chip and media view resizes the item
      Object.assign(
        after,
        form.show
          ? { w: Math.max(o.w, 240), h: isImg(name) ? 160 : isVideo(name) ? 180 : 200 }
          : { w: 230, h: 46 },
      );
      Object.assign(before, { w: o.w, h: o.h });
    }
    push({ ref: { id: o._id }, op: "upd", before, after });
    patchO({ id: o._id, patch: after });
    setForm(null);
  };
  const attach = async () => {
    const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (r.canceled) return;
    const a = r.assets[0],
      blob = await (await fetch(a.uri)).blob();
    const res = await fetch(await upUrl(), {
      method: "POST",
      headers: { "Content-Type": a.mimeType ?? "application/octet-stream" },
      body: blob,
    });
    await patchO({
      id: form.id,
      patch: { file: { storageId: (await res.json()).storageId, name: a.name } },
    });
  };

  const mid = () => W({ x: dim.current.w / 2, y: dim.current.h / 2 });
  const place = async (data: any, edit: boolean) => {
    const ref = await create(false, data);
    setSel(ref.id);
    setTool("select");
    setGrp(null);
    setSheet(null);
    if (edit)
      setForm({
        id: ref.id,
        o: { ...data, _id: ref.id },
        text: data.text ?? "",
        code: data.code ?? "",
        s: { ...data.style },
      });
  };
  const addText = () => {
    const m = mid();
    place(
      {
        kind: "text",
        x: m.x - 100,
        y: m.y - 20,
        w: 200,
        h: 40,
        text: "Text",
        style: { ...defStyle, stroke: "none", fill: "none", fs: 22 },
      },
      true,
    );
  };
  const addTip = () => {
    const m = mid();
    place(
      {
        kind: "tip",
        x: m.x + 30,
        y: m.y - 60,
        w: -30,
        h: 60,
        text: "Hint",
        style: { ...defStyle, fs: 14 },
      },
      true,
    );
  };
  const addCode = () => {
    const m = mid();
    place(
      {
        kind: "code",
        x: m.x - 150,
        y: m.y - 100,
        w: 300,
        h: 200,
        text: "snippet.txt",
        code: "",
        style: { ...defStyle, fill: "#F9FAFB", sw: 1, fs: 11 },
      },
      true,
    );
  };
  const addLink = (raw: string) => {
    const url = /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
    const m = mid();
    place(
      {
        kind: "link",
        url,
        x: m.x - 115,
        y: m.y - 23,
        w: 230,
        h: 46,
        showContent: false,
        style: { ...defStyle, fill: "none" },
      },
      false,
    );
  };
  const addPin = async (mime = "*/*") => {
    if (mime === "link") {
      setLinkPrompt(true);
      return;
    }
    const r = await DocumentPicker.getDocumentAsync({ type: mime, copyToCacheDirectory: true });
    if (r.canceled) return;
    const a = r.assets[0];
    const blob = await (await fetch(a.uri)).blob();
    const res = await fetch(await upUrl(), {
      method: "POST",
      headers: { "Content-Type": a.mimeType ?? "application/octet-stream" },
      body: blob,
    });
    const file = { storageId: (await res.json()).storageId, name: a.name };
    const m = mid();
    const audio = isAudio(a.name);
    // New files start as a compact file chip (audio starts as a player); "Show content" in the editor reveals the media.
    place(
      {
        kind: "pin",
        x: m.x - (audio ? 135 : 115),
        y: m.y - (audio ? 42 : 23),
        w: audio ? 270 : 230,
        h: audio ? 84 : 46,
        file,
        showContent: false,
        style: { ...defStyle, fill: "none" },
      },
      false,
    );
  };
  const loadText = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: "text/*", copyToCacheDirectory: true });
    if (r.canceled) return;
    const a = r.assets[0],
      t = await (await fetch(a.uri)).text();
    setForm((f: any) => ({ ...f, code: t, text: a.name }));
  };

  return {
    openEdit,
    save,
    attach,
    mid,
    place,
    addText,
    addTip,
    addCode,
    addLink,
    addPin,
    loadText,
  };
}
