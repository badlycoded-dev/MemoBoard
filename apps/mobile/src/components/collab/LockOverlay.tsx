import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Avatar } from "@/components/account/Avatar";
import { box } from "@/components/whiteboard/model";

/** True while someone other than `meId` holds a fresh editing lock on the item. */
export const lockedByOther = (o: any, meId?: string) => !!o?.lockedBy && o.lockedBy !== meId && Date.now() - (o.lockedAt ?? 0) < 45000;

/** Name + avatar of whoever holds the lock (image comes from presence). */
export const lockerOf = (o: any, presence: any[]) => ({ name: o.lockedName ?? "Someone", image: presence.find((p) => p.userId === o.lockedBy)?.image ?? null });

export function LockBadge({ name, image }: { name: string; image?: string | null }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#101828E6", borderRadius: 16, paddingVertical: 3, paddingLeft: 3, paddingRight: 10, maxWidth: "92%" }}>
      <Avatar uri={image} name={name} size={22} />
      <Text numberOfLines={1} style={{ color: "#fff", fontSize: 12, fontWeight: "700", flexShrink: 1 }}>{name}</Text>
    </View>
  );
}

/** Grey overlay with the editor's avatar and name over every whiteboard item someone else is editing. */
export function LockOverlay({ objs, cam, meId, presence }: { objs: any[]; cam: { x: number; y: number; k: number }; meId?: string; presence: any[] }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 10000); return () => clearInterval(t); }, []);
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}>
      {objs.filter((o) => lockedByOther(o, meId)).map((o) => {
        const b = box(o);
        const who = lockerOf(o, presence);
        return (
          <View key={o._id} style={{ position: "absolute", left: b.x * cam.k + cam.x, top: b.y * cam.k + cam.y, width: Math.max(b.w * cam.k, 40), height: Math.max(b.h * cam.k, 28), backgroundColor: "rgba(71,84,103,0.5)", borderRadius: 6, alignItems: "center", justifyContent: "center" }}>
            <LockBadge name={who.name} image={who.image} />
          </View>
        );
      })}
    </View>
  );
}
