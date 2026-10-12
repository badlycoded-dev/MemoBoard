import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useVideoPlayer, VideoView } from "expo-video";
import { useRef, ReactNode, useMemo, useState } from "react";
import { PanResponder, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { box } from "./model";
import { embedHtml, hostOf, isGif, isAudio, isChip, isVideo, youtubeId } from "./utils";

type Cam = { x: number; y: number; k: number };

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Deterministic pseudo-waveform: the same file always gets the same bars. */
const waveform = (seed: string, count: number) => {
  let h = 7;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return Array.from({ length: count }, () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return 0.25 + ((h >>> 8) % 100) / 133;
  });
};

/** Decodes the audio inside a hidden web view (Web Audio API) to get its real loudness peaks. */
const peaksHtml = (url: string, n: number) => `<script>
(async () => {
  try {
    const buf = await (await fetch(${JSON.stringify(url)})).arrayBuffer();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const data = (await ctx.decodeAudioData(buf)).getChannelData(0);
    const size = Math.floor(data.length / ${n}), out = [];
    for (let i = 0; i < ${n}; i++) {
      let max = 0;
      for (let j = i * size; j < (i + 1) * size; j += 40) max = Math.max(max, Math.abs(data[j] || 0));
      out.push(max);
    }
    const top = Math.max(...out, 0.001);
    window.ReactNativeWebView.postMessage(JSON.stringify(out.map((v) => v / top)));
  } catch (e) {}
})();
</script>`;

function PeaksProbe({
  uri,
  count,
  onPeaks,
}: {
  uri: string;
  count: number;
  onPeaks: (p: number[]) => void;
}) {
  const origin = uri.match(/^https?:\/\/[^/]+/)?.[0] ?? "https://localhost";
  return (
    <View style={{ width: 0, height: 0, opacity: 0 }}>
      <WebView
        source={{ html: peaksHtml(uri, count), baseUrl: origin }}
        originWhitelist={["*"]}
        javaScriptEnabled
        onMessage={(e) => onPeaks(JSON.parse(e.nativeEvent.data))}
      />
    </View>
  );
}

/** Tap or drag across the waveform to seek; works on native and web (no locationX needed). */
function useScrub(width: number, onSeek: (fraction: number) => void) {
  const latest = useRef({ width, onSeek });
  latest.current = { width, onSeek };
  const x0 = useRef(0);
  const set = (x: number) => {
    const f = Math.max(0, Math.min(1, x / latest.current.width));
    if (Number.isFinite(f)) latest.current.onSeek(f);
  };
  return useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        x0.current = e.nativeEvent.locationX ?? 0;
        set(x0.current);
      },
      onPanResponderMove: (_, g) => set(x0.current + g.dx),
    }),
  ).current.panHandlers;
}

function AudioPlayer({ uri, width }: { uri: string; width: number }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const [muted, setMuted] = useState(false);
  const waveWidth = Math.max(60, width - 170);
  const scrub = useScrub(waveWidth, (f) => status.duration && player.seekTo(f * status.duration));
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const levels = useMemo(
    () => (peaks ? peaks.map((v) => 0.12 + 0.88 * v) : waveform(uri, 32)),
    [uri, peaks],
  );
  const progress = status.duration ? status.currentTime / status.duration : 0;

  return (
    <View style={styles.audio}>
      <PeaksProbe uri={uri} count={32} onPeaks={setPeaks} />
      <Pressable
        onPress={() => (status.playing ? player.pause() : player.play())}
        style={styles.play}
      >
        <MaterialCommunityIcons name={status.playing ? "pause" : "play"} size={22} color="#fff" />
      </Pressable>
      <View {...scrub} style={[styles.wave, { width: waveWidth }]}>
        {levels.map((level, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={[
              styles.bar,
              {
                height: 6 + 22 * level,
                backgroundColor: i / levels.length < progress ? "#fff" : "#8A8F98",
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.time}>
        {fmt(status.currentTime)} / {fmt(status.duration || 0)}
      </Text>
      <Pressable
        onPress={() => {
          player.muted = !muted;
          setMuted(!muted);
        }}
      >
        <MaterialCommunityIcons
          name={muted ? "volume-off" : "volume-high"}
          size={20}
          color="#fff"
        />
      </Pressable>
    </View>
  );
}

function VideoBox({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = false;
    p.volume = 1;
  });
  return (
    <VideoView
      player={player}
      style={{ width: "100%", height: "100%" }}
      nativeControls
      contentFit="contain"
      surfaceType="textureView"
    />
  );
}

/** YouTube links use the embed player; every other link loads as a normal web page. */
function LinkEmbed({ url }: { url: string }) {
  const id = youtubeId(url);
  const html = embedHtml(url);
  const source = html
    ? { html, baseUrl: `https://${hostOf(url)}` }
    : { uri: id ? `https://www.youtube.com/embed/${id}` : url };
  return (
    <WebView
      source={source}
      originWhitelist={["*"]}
      javaScriptEnabled
      domStorageEnabled
      allowsFullscreenVideo
    />
  );
}

/** Real components (players, web views) that cannot be drawn inside the SVG canvas. */
function contentOf(o: any, width: number): ReactNode {
  const name: string = o.file?.name ?? "";
  if (o.kind === "pin" && o.fileUrl && isAudio(name))
    return <AudioPlayer uri={o.fileUrl} width={width - 12} />;
  if (o.kind === "pin" && o.fileUrl && isVideo(name) && !isChip(o))
    return <VideoBox uri={o.fileUrl} />;
  if (o.kind === "pin" && o.fileUrl && isGif(name) && !isChip(o)) {
    return (
      <Image source={{ uri: o.fileUrl }} style={StyleSheet.absoluteFill} resizeMode="contain" />
    );
  }
  if (o.kind === "link" && o.url && !isChip(o)) return <LinkEmbed url={o.url} />;
  return null;
}

/**
 * Overlay that places the interactive content over the canvas, following pan, zoom and rotation.
 * Only the content area catches touches, so the frame and header still select and drag the item.
 */
export function MediaLayer({ objs, cam }: { objs: any[]; cam: Cam }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {objs.map((o) => {
        const b = box(o);
        const content = contentOf(o, b.w);
        if (!content) return null;
        const cx = cam.x + (b.x + b.w / 2) * cam.k;
        const cy = cam.y + (b.y + b.h / 2) * cam.k;
        return (
          <View
            key={o._id}
            pointerEvents="box-none"
            style={{
              position: "absolute",
              left: cx - b.w / 2,
              top: cy - b.h / 2,
              width: b.w,
              height: b.h,
              transform: [{ rotate: `${o.rot ?? 0}deg` }, { scale: cam.k }],
            }}
          >
            <View style={styles.slot} pointerEvents="box-none">
              {content}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    position: "absolute",
    left: 6,
    right: 6,
    top: 30,
    bottom: 6,
    borderRadius: 12,
    overflow: "hidden",
  },
  audio: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    backgroundColor: "#2B2B2B",
    borderRadius: 28,
  },
  play: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1E88E5",
    alignItems: "center",
    justifyContent: "center",
  },
  wave: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 36 },
  bar: { width: 3, borderRadius: 2 },
  time: { color: "#fff", fontSize: 10 },
});
