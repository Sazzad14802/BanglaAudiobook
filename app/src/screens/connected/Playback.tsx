import React, { useState } from "react";
import { Text, View, Pressable, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Workspace, Action, Message, ui } from "../../components/Workspace";
import { usePlayer } from "../../contexts/PlayerContext";
const time = (n: number) =>
  `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
export function Playback() {
  const nav = useNavigation<any>();
  const p = usePlayer();
  const [speed, setSpeed] = useState(1);
  const [sleep, setSleep] = useState(0);
  return (
    <Workspace title="Now playing" back={() => nav.goBack()}>
      <Message text={p.error} />
      {p.audiobook ? (
        <>
          <View style={ui.card}>
            {p.audiobook.cover_image_url && (
              <Image
                source={{ uri: p.audiobook.cover_image_url }}
                style={{
                  width: 220,
                  height: 220,
                  borderRadius: 18,
                  alignSelf: "center",
                }}
              />
            )}
            <Text style={ui.title}>{p.audiobook.title}</Text>
            <Text style={ui.body}>
              {p.chapters[p.currentChapterIndex]?.title}
            </Text>
            <Text style={ui.body}>
              {time(p.positionSeconds)} / {time(p.durationSeconds)}
            </Text>
            <View
              style={{ height: 6, backgroundColor: "#e7e1d8", borderRadius: 4 }}
            >
              <View
                style={{
                  height: 6,
                  backgroundColor: "#ce5337",
                  width: `${Math.min(100, p.durationSeconds ? (p.positionSeconds / p.durationSeconds) * 100 : 0)}%`,
                }}
              />
            </View>
          </View>
          <Action
            label={p.isPlaying ? "Pause" : "Play"}
            onPress={() => {
              (p.isPlaying ? p.pause() : p.play()).catch(() => {});
            }}
          />
          <View style={ui.row}>
            <Action
              label="−15 seconds"
              secondary
              onPress={() => p.seek(p.positionSeconds - 15)}
            />
            <Action
              label="+15 seconds"
              secondary
              onPress={() => p.seek(p.positionSeconds + 15)}
            />
          </View>
          <Text style={ui.label}>Playback speed</Text>
          <View style={ui.row}>
            {[0.75, 1, 1.25, 1.5, 2].map((n) => (
              <Pressable
                key={n}
                style={[ui.chip, speed === n && ui.selected]}
                onPress={() => {
                  p.setSpeed(n);
                  setSpeed(n);
                }}
              >
                <Text>{n}×</Text>
              </Pressable>
            ))}
          </View>
          <Text style={ui.label}>Sleep timer</Text>
          <View style={ui.row}>
            {[0, 15, 30, 60].map((n) => (
              <Pressable
                key={n}
                style={[ui.chip, sleep === n && ui.selected]}
                onPress={() => {
                  p.setSleep(n);
                  setSleep(n);
                }}
              >
                <Text>{n ? `${n} min` : "Off"}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={ui.title}>Chapters</Text>
          {p.chapters.map((c, i) => (
            <Action
              key={c.id}
              label={`${i === p.currentChapterIndex ? "▶ " : ""}${c.title} · ${time(c.duration_seconds)}`}
              secondary
              onPress={() => p.selectChapter(i).catch(() => {})}
            />
          ))}
          <Action label="Stop listening" secondary onPress={() => p.stop()} />
        </>
      ) : (
        <Text style={ui.body}>
          Choose an audiobook from your library or catalog.
        </Text>
      )}
    </Workspace>
  );
}
