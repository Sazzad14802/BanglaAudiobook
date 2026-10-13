import React, { useState, useCallback, useEffect } from "react";
import { Text, View, Pressable } from "react-native";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import {
  Workspace,
  Field,
  Action,
  Message,
  ui,
} from "../../components/Workspace";
import { AudiobookCard } from "../../components/AudiobookCard";
import { EditorialHeroCard } from "../../components/EditorialHeroCard";
import { Audiobook } from "../../types/audiobook";
import { apiClient } from "../../api/client";
import { audiobooksApi } from "../../api/audiobooks";
import { useAuth } from "../../contexts/AuthContext";
import { usePlayer } from "../../contexts/PlayerContext";
import { offline } from "../../storage/offline";

export function Catalog() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const [books, setBooks] = useState<Audiobook[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState(route.params?.query || "");
  const [genre, setGenre] = useState("");
  const [language, setLanguage] = useState("");
  const [tier, setTier] = useState("");
  const [publisher, setPublisher] = useState("");
  const [channel, setChannel] = useState("");
  const [publishers, setPublishers] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [channels, setChannels] = useState<
    { id: string; name: string; publisher_id: string }[]
  >([]);
  useEffect(() => {
    apiClient
      .get<typeof publishers>("/catalog/publishers")
      .then(setPublishers)
      .catch(() => {});
    apiClient
      .get<typeof channels>("/catalog/channels")
      .then(setChannels)
      .catch(() => {});
  }, []);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const explore = route.name !== "Home";
  const load = useCallback(async () => {
    setBusy(true);
    try {
      const filters = new URLSearchParams({
        page: String(page),
        q: query,
        ...(genre ? { genre } : {}),
        ...(language ? { language } : {}),
        ...(tier ? { access_tier: tier } : {}),
        ...(publisher ? { publisher } : {}),
        ...(channel ? { channel } : {}),
      });
      const data = await apiClient.get<{ items: Audiobook[]; pages: number }>(
        `/audiobooks?${filters}`,
      );
      setBooks(data.items);
      setPages(data.pages);
      setMessage(
        data.items.length ? "" : "No audiobooks match this selection.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [page, query, genre, language, tier, publisher, channel]);
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(load, 300);
      return () => clearTimeout(timer);
    }, [load]),
  );
  return (
    <Workspace
      title={
        explore
          ? "Discover audiobooks"
          : `Welcome, ${user?.full_name || user?.username}`
      }
      refresh={load}
    >
      {!explore && books[0] && (
        <EditorialHeroCard
          title={books[0].title}
          meta="Explore the BanglaBook collection"
          coverUrl={books[0].cover_image_url || undefined}
          onPress={() =>
            nav.navigate("AudiobookDetails", { audiobookId: books[0].id })
          }
        />
      )}
      {explore && (
        <>
          <Field
            label="Search title"
            value={query}
            onChange={(v) => {
              setQuery(v);
              setPage(1);
            }}
          />
          <Field label="Genre" value={genre} onChange={setGenre} />
          <View style={ui.row}>
            {["", "bn", "en"].map((v) => (
              <Pressable
                key={v}
                style={[ui.chip, language === v && ui.selected]}
                onPress={() => setLanguage(v)}
              >
                <Text>{v || "All languages"}</Text>
              </Pressable>
            ))}
          </View>
          <View style={ui.row}>
            {["", "free", "premium"].map((v) => (
              <Pressable
                key={v}
                style={[ui.chip, tier === v && ui.selected]}
                onPress={() => setTier(v)}
              >
                <Text>{v || "All access tiers"}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={ui.label}>Publisher</Text>
          <View style={ui.row}>
            {[{ id: "", name: "All publishers" }, ...publishers].map((p) => (
              <Pressable
                key={p.id}
                style={[ui.chip, publisher === p.id && ui.selected]}
                onPress={() => {
                  setPublisher(p.id);
                  setChannel("");
                  setPage(1);
                }}
              >
                <Text>{p.name}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={ui.label}>Channel</Text>
          <View style={ui.row}>
            {[
              { id: "", name: "All channels", publisher_id: "" },
              ...channels.filter(
                (c) => !publisher || c.publisher_id === publisher,
              ),
            ].map((c) => (
              <Pressable
                key={c.id}
                style={[ui.chip, channel === c.id && ui.selected]}
                onPress={() => {
                  setChannel(c.id);
                  setPage(1);
                }}
              >
                <Text>{c.name}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      <Message text={message} />
      {busy && <Text>Loading…</Text>}
      {books.map((book) => (
        <AudiobookCard
          key={book.id}
          audiobook={book}
          onPress={() =>
            nav.navigate("AudiobookDetails", { audiobookId: book.id })
          }
        />
      ))}
      <View style={ui.row}>
        {page > 1 && (
          <Action
            label="Previous"
            secondary
            onPress={() => setPage(page - 1)}
          />
        )}
        <Text style={ui.body}>
          {page} / {pages}
        </Text>
        {page < pages && (
          <Action label="Next" secondary onPress={() => setPage(page + 1)} />
        )}
      </View>
    </Workspace>
  );
}
export function BookDetails() {
  const nav = useNavigation<any>();
  const { params } = useRoute<any>();
  const { user } = useAuth();
  const player = usePlayer();
  const [book, setBook] = useState<Audiobook | null>(null);
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      setBook(await audiobooksApi.get(params.audiobookId));
      setPlaylists(await apiClient.get<any[]>("/playlists"));
    } catch (e) {
      setMessage((e as Error).message);
    }
  }, [params.audiobookId]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      setMessage(success);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Workspace title="Audiobook" back={() => nav.goBack()} refresh={load}>
      <Message text={message} />
      {book && (
        <>
          <EditorialHeroCard
            title={book.title}
            meta={`${book.author || "Unknown author"} · ${book.access_tier || "free"}`}
            coverUrl={book.cover_image_url || undefined}
          />
          <Text style={ui.body}>
            {book.description || "No description provided."}
          </Text>
          <Text style={ui.body}>
            {book.language} · {book.genre || "Uncategorized"} · {book.status}
          </Text>
          <Action
            label="Listen"
            busy={busy}
            onPress={() =>
              run(async () => {
                await player.loadAudiobook(book);
                nav.navigate("Player", { audiobookId: book.id });
              }, "")
            }
          />
          <Action
            label="Save to favorites"
            secondary
            onPress={() =>
              run(
                () => apiClient.post(`/library/${book.id}`),
                "Saved to your library.",
              )
            }
          />
          <Action
            label="Remove from favorites"
            secondary
            onPress={() =>
              run(
                () => apiClient.delete(`/library/${book.id}`),
                "Removed from your library.",
              )
            }
          />
          <Action
            label="Download for offline listening"
            secondary
            busy={busy}
            onPress={() =>
              run(
                () => offline.download(book, user!.id),
                "Encrypted audio saved for offline listening.",
              )
            }
          />
          {playlists.map((list) => (
            <Action
              key={list.id}
              label={`Add to ${list.name}`}
              secondary
              onPress={() =>
                run(
                  () => apiClient.put(`/playlists/${list.id}/books/${book.id}`),
                  "Added to playlist.",
                )
              }
            />
          ))}
          <View style={ui.card}>
            <Text style={ui.title}>Report this content</Text>
            <Field
              label="Describe the copyright or content issue"
              value={reason}
              onChange={setReason}
            />
            <Action
              label="Submit report"
              secondary
              onPress={() =>
                run(
                  () =>
                    apiClient.post("/reports", {
                      audiobook_id: book.id,
                      reason,
                    }),
                  "Report submitted for administrator review.",
                )
              }
            />
          </View>
        </>
      )}
    </Workspace>
  );
}
export function PersonalLibrary() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const player = usePlayer();
  const [tab, setTab] = useState("saved");
  const [books, setBooks] = useState<Audiobook[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setMessage("");
    try {
      if (tab === "saved") {
        const r = await apiClient.get<any>("/library");
        setBooks(r.items.map((r: any) => r.audiobook));
      } else if (tab === "private") {
        setBooks((await audiobooksApi.listMine()).items);
      } else if (tab === "history") {
        const history = await apiClient.get<any[]>("/history");
        const all = await Promise.all(
          history.map((r) =>
            audiobooksApi.get(r.audiobook_id).catch(() => null),
          ),
        );
        setBooks(all.filter(Boolean) as Audiobook[]);
      } else if (tab === "offline") {
        setBooks(await offline.list(user!.id));
      } else {
        setLists(await apiClient.get("/playlists"));
        setBooks(
          selected ? await apiClient.get(`/playlists/${selected}/books`) : [],
        );
      }
    } catch (e) {
      setMessage((e as Error).message);
    }
  }, [tab, selected, user?.id]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  return (
    <Workspace title="Your library" refresh={load}>
      <View style={ui.row}>
        {["saved", "private", "playlists", "history", "offline"].map((v) => (
          <Pressable
            key={v}
            style={[ui.chip, tab === v && ui.selected]}
            onPress={() => {
              setTab(v);
              setBooks([]);
            }}
          >
            <Text>{v}</Text>
          </Pressable>
        ))}
      </View>
      <Message text={message} />
      {tab === "playlists" && (
        <>
          <Field label="New playlist name" value={name} onChange={setName} />
          <Action
            label="Create playlist"
            onPress={async () => {
              try {
                await apiClient.post("/playlists", { name });
                setName("");
                await load();
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          />
          {lists.map((list) => (
            <Action
              key={list.id}
              label={list.name}
              secondary
              onPress={() => setSelected(list.id)}
            />
          ))}
        </>
      )}
      {books.length === 0 && (
        <Text style={ui.body}>No audiobooks in this collection.</Text>
      )}
      {books.map((book) => (
        <View key={book.id}>
          <AudiobookCard
            audiobook={book}
            onPress={async () => {
              if (tab === "offline") {
                try {
                  await player.loadOffline(
                    book,
                    await offline.open(book.id, user!.id),
                  );
                  nav.navigate("Player", { audiobookId: book.id });
                } catch (e) {
                  setMessage((e as Error).message);
                }
              } else nav.navigate("AudiobookDetails", { audiobookId: book.id });
            }}
          />
          {tab === "playlists" && (
            <Action
              label="Remove from playlist"
              secondary
              onPress={async () => {
                await apiClient.delete(
                  `/playlists/${selected}/books/${book.id}`,
                );
                await load();
              }}
            />
          )}
          {tab === "offline" && (
            <Action
              label="Delete download"
              secondary
              onPress={async () => {
                await offline.remove(book.id, user!.id);
                await load();
              }}
            />
          )}
        </View>
      ))}
    </Workspace>
  );
}
