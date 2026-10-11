import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Linking, Pressable, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { BLUE } from "@/theme/theme";
import { rotatedLine, isArrow } from "@/components/whiteboard/model";

/** Floating bar under a selected item: flip, rotate, type-specific buttons, edit and delete. */
export function SelectionBar({ visible, patchO, selO, card, hz, st, change, openEdit, del }: any) {
  if (!visible) return null;
  return (
    <View
      style={[
        card,
        {
          bottom: hz && st.toolbarAnchor.startsWith("bottom") ? 72 : 16,
          alignSelf: "center",
          flexDirection: "row",
          gap: 16,
          paddingHorizontal: 20,
        },
      ]}
    >
      {selO.kind === "tip" && (
        <Pressable onPress={() => patchO({ id: selO._id, patch: { hidden: !selO.hidden } })}>
          <Text style={{ color: BLUE, fontWeight: "800" }}>{selO.hidden ? "Show" : "Hide"}</Text>
        </Pressable>
      )}
      {(selO.kind === "pin" || selO.kind === "image") && selO.fileUrl && (
        <Pressable onPress={() => Linking.openURL(selO.fileUrl)}>
          <Text style={{ color: BLUE, fontWeight: "800" }}>Open</Text>
        </Pressable>
      )}
      {selO.kind === "code" && (
        <Pressable onPress={() => Clipboard.setStringAsync(selO.code ?? "")}>
          <Text style={{ color: BLUE, fontWeight: "800" }}>Copy</Text>
        </Pressable>
      )}
      {isArrow(selO.kind) && (
        <>
          <Pressable onPress={() => change(selO, rotatedLine(selO, -90))}>
            <MaterialCommunityIcons name="rotate-left" size={22} color={BLUE} />
          </Pressable>
          <Pressable onPress={() => change(selO, rotatedLine(selO, 90))}>
            <MaterialCommunityIcons name="rotate-right" size={22} color={BLUE} />
          </Pressable>
        </>
      )}
      {selO.kind !== "tip" && !isArrow(selO.kind) && (
        <>
          <Pressable onPress={() => change(selO, { flipX: !selO.flipX })}>
            <MaterialCommunityIcons name="flip-horizontal" size={22} color={BLUE} />
          </Pressable>
          <Pressable onPress={() => change(selO, { flipY: !selO.flipY })}>
            <MaterialCommunityIcons name="flip-vertical" size={22} color={BLUE} />
          </Pressable>
          <Pressable
            onPress={() => change(selO, { rot: ((((selO.rot ?? 0) - 90) % 360) + 360) % 360 })}
          >
            <MaterialCommunityIcons name="rotate-left" size={22} color={BLUE} />
          </Pressable>
          <Pressable onPress={() => change(selO, { rot: ((selO.rot ?? 0) + 90) % 360 })}>
            <MaterialCommunityIcons name="rotate-right" size={22} color={BLUE} />
          </Pressable>
        </>
      )}
      <Pressable onPress={() => openEdit(selO)}>
        <Text style={{ color: BLUE, fontWeight: "800" }}>Edit</Text>
      </Pressable>
      <Pressable onPress={() => del(selO, false)}>
        <Text style={{ color: "#C0392B", fontWeight: "800" }}>Delete</Text>
      </Pressable>
    </View>
  );
}
