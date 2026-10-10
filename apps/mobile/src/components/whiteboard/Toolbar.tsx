import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from "react-native";
import { ColorPicker } from "@/components/ColorPicker";
import { Slider } from "@/components/ui/Slider";
import { useBoardTheme } from "./BoardTheme";
import { PIN_TYPES } from "./constants";
import { DRAW_TOOLS, OBJECT_TOOLS, isDraw, isObj } from "./constants";
import { ColorSwatches, ToolButton } from "./controls";
import type { Tool } from "./model";

export type Group = "draw" | "obj" | "pin";
export type Sheet = "size" | "scale" | "color";
export type Anchor = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type ToolbarMenu = {
  open: boolean;
  setOpen: (open: boolean) => void;
  group: Group | null;
  setGroup: (group: Group | null) => void;
  sheet: Sheet | null;
  setSheet: (sheet: Sheet | null) => void;
};

export type ToolbarActions = {
  setTool: (tool: Tool) => void;
  undo: () => void;
  redo: () => void;
  addText: () => void;
  addTip: () => void;
  addCode: () => void;
  addPin: (mime?: string) => void;
  setZoom: (percent: number) => void;
  setColor: (color: string) => void;
  setWidth: (width: number) => void;
};

type Props = {
  tool: Tool;
  cfg: Record<string, { color: string; width: number }>;
  zoomPct: number;
  canUndo: boolean;
  canRedo: boolean;
  /** Y offset below the header where toolbars may start. */
  top0: number;
  /** Safe-area insets (matter in landscape and on notched phones). */
  safe: { left: number; right: number; bottom: number };
  horizontal: boolean;
  /** Screen corner the toolbar is anchored to; it also decides its side (left/right) and edge (top/bottom). */
  anchor: Anchor;
  /** "Show full toolbar": always expanded, no collapse arrow. */
  showFull: boolean;
  menu: ToolbarMenu;
  actions: ToolbarActions;
};

const BUTTON = 42;

export function Toolbar({
  tool,
  cfg,
  zoomPct,
  canUndo,
  canRedo,
  top0,
  safe,
  horizontal,
  anchor,
  showFull,
  menu,
  actions,
}: Props) {
  const T = useBoardTheme();
  const card = T.panel;
  const hz = horizontal;
  const [edge, side] = anchor.split("-") as ["top" | "bottom", "left" | "right"];
  const { group, sheet } = menu;
  const expanded = showFull || menu.open;
  const mainRef = useRef<ScrollView>(null);
  const subRef = useRef<ScrollView>(null);

  // The collapse arrow is the toolbar's anchor: first item on the left/top, last on the right/bottom.
  const arrowFirst = hz ? side === "left" : edge === "top";
  const lead = !showFull && arrowFirst ? 1 : 0; // buttons placed before "select"
  const c = cfg[tool];
  const current = [...DRAW_TOOLS, ...OBJECT_TOOLS].find((t) => t[0] === tool);
  const isEraser = tool.startsWith("eraser");
  const hasSize = tool !== "select" && tool !== "pipette";
  const hasColor = hasSize && !isEraser && tool !== "wood";

  useEffect(() => {
    // Keep the selected tool visible inside scrolling toolbars.
    const mainIndex = lead + (tool === "select" ? 0 : isDraw(tool) ? 1 : 2);
    const subIndex = Math.max(
      0,
      DRAW_TOOLS.findIndex((t) => t[0] === tool),
    );
    const to = (i: number) =>
      ({ [hz ? "x" : "y"]: Math.max(0, i * BUTTON - 2 * BUTTON), animated: true }) as any;
    mainRef.current?.scrollTo(to(mainIndex));
    subRef.current?.scrollTo(to(subIndex));
  }, [tool, expanded, group, hz, lead]);

  const choose = (t: Tool) => {
    actions.setTool(t);
    menu.setGroup(null);
    menu.setSheet(null);
  };
  const toggleGroup = (g: Group) => {
    menu.setGroup(group === g ? null : g);
    menu.setSheet(null);
  };
  const toggleSheet = (s: Sheet) => menu.setSheet(sheet === s ? null : s);
  const collapse = () => {
    menu.setOpen(false);
    menu.setGroup(null);
    menu.setSheet(null);
  };

  // ---- placement: the toolbar is anchored to the chosen screen corner ----
  const gap = 8 + (side === "left" ? safe.left : safe.right);
  const atTop = edge === "top";
  const alongEdge = (topValue: number, bottomValue: number) =>
    atTop ? { top: topValue } : { bottom: bottomValue + safe.bottom };
  const mainPos = (
    hz
      ? { [side]: gap, maxWidth: "96%", ...alongEdge(top0, 12) }
      : { [side]: gap, maxHeight: "82%", ...alongEdge(top0, 12) }
  ) as ViewStyle;
  const subPos = (index: number) =>
    (hz
      ? { [side]: gap, ...alongEdge(top0 + 58, 64) }
      : {
          [side]: gap + 58,
          ...(atTop
            ? { top: top0 + (lead + index - 1) * BUTTON + 2 }
            : { bottom: 12 + safe.bottom }),
        }) as ViewStyle;
  const sheetPos = (
    hz
      ? { [side]: gap, ...alongEdge(top0 + 116, 124) }
      : { [side]: gap + 58, ...(atTop ? { bottom: 16 + safe.bottom } : { top: top0 }) }
  ) as ViewStyle;

  if (!expanded) {
    const collapsedPos = { [side]: gap, ...alongEdge(top0, 12) } as ViewStyle;
    return (
      <View style={[card, collapsedPos, styles.collapsed]}>
        <ToolButton
          icon={current ? current[1] : "cursor-default"}
          sel
          on={() => menu.setOpen(true)}
        />
      </View>
    );
  }

  const arrowIcon = hz
    ? edge === "top"
      ? "chevron-up"
      : "chevron-down"
    : side === "left"
      ? "chevron-left"
      : "chevron-right";
  const arrow = showFull ? null : <ToolButton icon={arrowIcon} on={collapse} />;
  const sizeButton = hasSize ? (
    <ToolButton icon="format-line-weight" sel={sheet === "size"} on={() => toggleSheet("size")} />
  ) : null;
  const colorButton = hasColor ? (
    <ToolButton icon="palette-outline" sel={sheet === "color"} on={() => toggleSheet("color")} />
  ) : null;

  return (
    <>
      <View style={[card, mainPos]}>
        <ScrollView
          ref={mainRef}
          horizontal={hz}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          {arrowFirst && arrow}
          <ToolButton icon="cursor-default" sel={tool === "select"} on={() => choose("select")} />
          <ToolButton
            icon={isDraw(tool) && current ? current[1] : "pen"}
            sel={isDraw(tool)}
            on={() => toggleGroup("draw")}
          />
          <ToolButton
            icon={isObj(tool) && current ? current[1] : "shape-outline"}
            sel={isObj(tool)}
            on={() => toggleGroup("obj")}
          />
          <ToolButton icon="format-text" on={actions.addText} />
          <ToolButton icon="lightbulb-on-outline" on={actions.addTip} />
          <ToolButton icon="code-tags" on={actions.addCode} />
          <ToolButton icon="paperclip" sel={group === "pin"} on={() => toggleGroup("pin")} />
          <View style={[hz ? styles.dividerH : styles.dividerV, { backgroundColor: T.border }]} />
          <View style={{ opacity: canUndo ? 1 : 0.3 }}>
            <ToolButton icon="undo" on={actions.undo} />
          </View>
          <View style={{ opacity: canRedo ? 1 : 0.3 }}>
            <ToolButton icon="redo" on={actions.redo} />
          </View>
          <Pressable
            onPress={() => {
              toggleSheet("scale");
              menu.setGroup(null);
            }}
            style={[styles.scale, hz && styles.scaleH]}
          >
            <Text
              style={{ fontSize: 12, color: T.text, fontWeight: sheet === "scale" ? "800" : "500" }}
            >
              {zoomPct}%
            </Text>
          </Pressable>
          {!arrowFirst && arrow}
        </ScrollView>
      </View>

      {group === "draw" && (
        <View style={[card, subPos(1), hz && styles.subRow]}>
          <ScrollView
            ref={subRef}
            horizontal={hz}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            {DRAW_TOOLS.map(([key, icon]) => (
              <ToolButton key={key} icon={icon} sel={tool === key} on={() => choose(key)} />
            ))}
            {colorButton}
            {sizeButton}
          </ScrollView>
        </View>
      )}

      {group === "pin" && (
        <View style={[card, subPos(6), styles.objectList]}>
          {PIN_TYPES.map(([key, icon, name, mime]) => (
            <Pressable
              key={key}
              onPress={() => {
                actions.addPin(mime);
                menu.setGroup(null);
              }}
              style={styles.objectRow}
            >
              <MaterialCommunityIcons
                name={icon}
                size={20}
                color={T.text}
                style={styles.objectGlyph}
              />
              <Text style={{ color: T.text }}>{name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {group === "obj" && (
        <View style={[card, subPos(2), styles.objectList]}>
          {OBJECT_TOOLS.map(([key, icon, name]) => (
            <Pressable
              key={key}
              onPress={() => choose(key)}
              style={[styles.objectRow, { backgroundColor: tool === key ? T.sel : "transparent" }]}
            >
              <MaterialCommunityIcons
                name={icon}
                size={20}
                color={T.text}
                style={styles.objectGlyph}
              />
              <Text style={{ color: T.text }}>{name}</Text>
            </Pressable>
          ))}
          <View style={{ flexDirection: "row" }}>
            {colorButton}
            {sizeButton}
          </View>
        </View>
      )}

      {sheet && (
        <View style={[card, sheetPos, { padding: 12 }]}>
          {sheet === "color" ? (
            <View style={styles.pickerBox}>
              <ColorPicker value={c.color} onChange={actions.setColor} />
            </View>
          ) : sheet === "scale" ? (
            <>
              <Text style={[styles.sheetLabel, { color: T.text }]}>Scale {zoomPct}%</Text>
              <Slider v={zoomPct} min={20} max={500} on={actions.setZoom} />
            </>
          ) : (
            <>
              <Text style={[styles.sheetLabel, { color: T.text }]}>
                {isEraser ? "Eraser size" : "Thickness"} {c.width}
              </Text>
              <Slider v={c.width} min={1} max={isEraser ? 80 : 40} on={actions.setWidth} />
              {hasColor && <ColorSwatches v={c.color} on={actions.setColor} />}
            </>
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  collapsed: { borderRadius: 26, padding: 3 },
  dividerH: { width: 1, height: 28, alignSelf: "center", marginHorizontal: 4 },
  dividerV: { height: 1, marginVertical: 4 },
  scale: { height: 34, alignItems: "center", justifyContent: "center" },
  scaleH: { height: BUTTON, width: 48 },
  subRow: { flexDirection: "row", maxWidth: "96%" },
  objectList: { width: 190 },
  objectRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 8, borderRadius: 16 },
  objectGlyph: { fontSize: 18, width: 24, textAlign: "center" },
  pickerBox: { backgroundColor: "#fff", borderRadius: 16, padding: 8 },
  sheetLabel: { marginBottom: 4 },
});
