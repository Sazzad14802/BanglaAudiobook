import React, { useState, useEffect } from "react";
import { Text, View, Pressable, Platform } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import {
  Workspace,
  Field,
  Action,
  Message,
  ui,
} from "../../components/Workspace";
import { apiClient } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";

export async function pickUpload(
  path: string,
  type = "application/pdf",
  extra: Record<string, string> = {},
) {
  const picked = await DocumentPicker.getDocumentAsync({
    type,
    copyToCacheDirectory: true,
  });
  if (picked.canceled) return false;
  const file = picked.assets[0];
  const form = new FormData();
  if (Platform.OS === "web")
    form.append("file", await (await fetch(file.uri)).blob(), file.name);
  else
    form.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || type,
    } as any);
  Object.entries(extra).forEach(([k, v]) => form.append(k, v));
  await apiClient.uploadFile(path, form);
  return true;
}
export function CreateBook() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("bn");
  const [genre, setGenre] = useState("");
  const [channel, setChannel] = useState("");
  const [tier, setTier] = useState("free");
  const [channels, setChannels] = useState<any[]>([]);
  const [quota, setQuota] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    apiClient
      .get("/generation/quota")
      .then(setQuota)
      .catch((e) => setMessage(e.message));
    if (user?.account_type === "publisher")
      apiClient
        .get<any[]>("/publisher/channels")
        .then(setChannels)
        .catch((e) => setMessage(e.message));
  }, []);
  return (
    <Workspace title="Create an audiobook">
      <Text style={ui.body}>
        {quota
          ? `${quota.used} / ${quota.limit} requests used this month · ${quota.plan}`
          : "Loading generation quota…"}
      </Text>
      <Field label="Title" value={title} onChange={setTitle} />
      <Field label="Author" value={author} onChange={setAuthor} />
      <Field
        label="Description"
        value={description}
        onChange={setDescription}
      />
      <Field label="Genre" value={genre} onChange={setGenre} />
      <View style={ui.row}>
        {["bn", "en"].map((v) => (
          <Pressable
            key={v}
            style={[ui.chip, language === v && ui.selected]}
            onPress={() => setLanguage(v)}
          >
            <Text>{v === "bn" ? "বাংলা" : "English"}</Text>
          </Pressable>
        ))}
      </View>
      {user?.account_type === "publisher" ? (
        <>
          <View style={ui.row}>
            {["free", "premium"].map((v) => (
              <Pressable
                key={v}
                style={[ui.chip, tier === v && ui.selected]}
                onPress={() => setTier(v)}
              >
                <Text>{v}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={ui.label}>Channel (optional)</Text>
          {channels.map((c) => (
            <Action
              key={c.id}
              label={`${channel === c.id ? "✓ " : ""}${c.name}`}
              secondary
              onPress={() => setChannel(channel === c.id ? "" : c.id)}
            />
          ))}
        </>
      ) : (
        <Text style={ui.body}>
          Your generated audiobook is private and cannot be published.
        </Text>
      )}
      <Message text={message} />
      <Action
        label="Continue to upload"
        busy={busy}
        onPress={async () => {
          setBusy(true);
          try {
            const book = await apiClient.post<any>("/audiobooks", {
              title,
              author,
              description,
              language,
              genre,
              visibility: "PRIVATE",
              access_tier: tier,
              channel_id: channel || null,
            });
            nav.navigate("UploadSource", { audiobookId: book.id });
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
    </Workspace>
  );
}
export function SourceUpload() {
  const nav = useNavigation<any>();
  const { params } = useRoute<any>();
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Workspace title="Upload source" back={() => nav.goBack()}>
      <Text style={ui.body}>
        Upload an unencrypted PDF containing up to 1,000 pages. Scanned pages
        are processed with OCR.
      </Text>
      <Action
        label={ready ? "Replace PDF" : "Select and upload PDF"}
        busy={busy}
        onPress={() =>
          run(async () => {
            if (await pickUpload(`/audiobooks/${params.audiobookId}/source`)) {
              setReady(true);
              setMessage("PDF uploaded.");
            }
          })
        }
      />
      {ready && (
        <Action
          label="Start generation"
          busy={busy}
          onPress={() =>
            run(async () => {
              await apiClient.post(
                `/audiobooks/${params.audiobookId}/generate`,
              );
              nav.replace("GenerationStatus", params);
            })
          }
        />
      )}{" "}
      {user?.account_type === "publisher" && (
        <Action
          label="Upload an MP3 instead"
          busy={busy}
          secondary
          onPress={() =>
            run(async () => {
              if (
                await pickUpload(
                  `/audiobooks/${params.audiobookId}/audio`,
                  "audio/mpeg",
                )
              )
                nav.navigate("AudiobookDetails", params);
            })
          }
        />
      )}
      <Message text={message} />
    </Workspace>
  );
}
export function GenerationProgress() {
  const nav = useNavigation<any>();
  const { params } = useRoute<any>();
  const [state, setState] = useState<any>(null);
  const [message, setMessage] = useState("");
  async function load() {
    try {
      setState(
        await apiClient.get(
          `/audiobooks/${params.audiobookId}/generation-status`,
        ),
      );
      setMessage("");
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [params.audiobookId]);
  const job = state?.latest_job;
  return (
    <Workspace
      title="Generation progress"
      back={() => nav.goBack()}
      refresh={load}
    >
      <Message text={message} />
      {job && (
        <>
          <View style={ui.card}>
            <Text style={ui.title}>
              {job.cancelled ? "Cancelled" : job.status}
            </Text>
            <Text style={ui.body}>
              {job.completed_pages} / {job.total_pages} pages ready
            </Text>
            <Text style={ui.body}>
              Attempt {job.attempts}. Completed pages can be listened to while
              generation continues.
            </Text>
            {job.error_message && <Message text={job.error_message} />}
          </View>
          {job.completed_pages > 0 && (
            <Action
              label="Listen to ready pages"
              onPress={() => nav.navigate("AudiobookDetails", params)}
            />
          )}{" "}
          {["PENDING", "PROCESSING"].includes(job.status) && (
            <Action
              label="Cancel request"
              secondary
              onPress={async () => {
                try {
                  await apiClient.post(`/generation/${job.id}/cancel`);
                  await load();
                } catch (e) {
                  setMessage((e as Error).message);
                }
              }}
            />
          )}
          {job.status === "FAILED" && !job.cancelled && (
            <Action
              label="Retry request"
              secondary
              onPress={async () => {
                try {
                  await apiClient.post(`/generation/${job.id}/retry`);
                  await load();
                } catch (e) {
                  setMessage((e as Error).message);
                }
              }}
            />
          )}
        </>
      )}
    </Workspace>
  );
}
