import React, { useState, useCallback } from "react";
import { Text, View, Alert } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  Workspace,
  Field,
  Action,
  Message,
  ui,
} from "../../components/Workspace";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { apiClient } from "../../api/client";
import { pickUpload } from "./Generation";
import { offline } from "../../storage/offline";
import { randomUUID } from "expo-crypto";

export function AccountProfile() {
  const nav = useNavigation<any>();
  const { user, refreshUser, logout } = useAuth();
  const { setLanguage } = useLanguage();
  const [name, setName] = useState(user?.full_name || "");
  const [plans, setPlans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [channelName, setChannelName] = useState("");
  const [channelDescription, setChannelDescription] = useState("");
  const [channelEdit, setChannelEdit] = useState("");
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkout, setCheckout] = useState<any>(null);
  const [edit, setEdit] = useState<any>(null);
  const publisher = user?.account_type === "publisher";
  const load = useCallback(async () => {
    try {
      await refreshUser();
      setPayments(await apiClient.get<any[]>("/payments"));
      if (publisher) {
        setApplications(await apiClient.get<any[]>("/publisher/applications"));
        setChannels(await apiClient.get<any[]>("/publisher/channels"));
        if (user?.publisher_status === "active") {
          setDashboard(await apiClient.get("/publisher/dashboard"));
          setBooks((await apiClient.get<any>("/audiobooks/my")).items);
        }
      } else setPlans(await apiClient.get<any[]>("/subscriptions/plans"));
    } catch (e) {
      setMessage((e as Error).message);
    }
  }, [publisher, user?.publisher_status]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  async function run(fn: () => Promise<unknown>, success = "Saved.") {
    setBusy(true);
    setMessage("");
    try {
      await fn();
      setMessage(success);
      await load();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function buy(kind: string, plan_id?: string) {
    await run(async () => {
      setCheckout(
        await apiClient.post("/payments", {
          kind,
          plan_id: plan_id || null,
          idempotency_key: randomUUID(),
        }),
      );
    }, "Order created. Complete the development checkout below.");
  }
  return (
    <Workspace
      title={publisher ? "Publisher workspace" : "Your account"}
      refresh={load}
    >
      <View style={ui.card}>
        <Text style={ui.title}>{user?.full_name || user?.username}</Text>
        <Text style={ui.body}>
          {user?.email} · {user?.account_type}
        </Text>
        {publisher ? (
          <Text style={ui.body}>Status: {user?.publisher_status}</Text>
        ) : (
          <Text style={ui.body}>
            {user?.premium_until
              ? `Premium access until ${new Date(user.premium_until).toLocaleString()}`
              : "Free listener account"}
          </Text>
        )}
      </View>
      <Message text={message} />
      <Field label="Full name" value={name} onChange={setName} />
      <Action
        label="Save profile"
        busy={busy}
        secondary
        onPress={() =>
          run(() => apiClient.patch("/users/me", { full_name: name }))
        }
      />
      <View style={ui.row}>
        <Action label="বাংলা" secondary onPress={() => setLanguage("bn")} />
        <Action label="English" secondary onPress={() => setLanguage("en")} />
      </View>
      {!publisher && (
        <>
          <Text style={ui.title}>Premium subscriptions</Text>
          {plans.map((p) => (
            <View key={p.id} style={ui.card}>
              <Text style={ui.title}>{p.name}</Text>
              <Text style={ui.body}>
                ৳{p.price} · {p.months} month(s)
              </Text>
              <Action
                label="Subscribe / renew"
                busy={busy}
                onPress={() => buy("subscription", p.id)}
              />
            </View>
          ))}
          <Action
            label="Cancel future renewal"
            secondary
            busy={busy}
            onPress={() =>
              run(
                () => apiClient.post("/subscriptions/cancel"),
                "Renewal cancelled. Paid access remains until expiry.",
              )
            }
          />
        </>
      )}
      {publisher && (
        <>
          {applications.map((a) => (
            <View key={a.id} style={ui.card}>
              <Text style={ui.label}>
                {a.legal_name} · {a.status}
              </Text>
              <Text style={ui.body}>
                {a.reason || "Awaiting administrative review."}
              </Text>
            </View>
          ))}
          {["pending_approval", "rejected"].includes(
            user?.publisher_status || "",
          ) && (
            <Action
              label="Submit verification PDF"
              busy={busy}
              onPress={() =>
                run(async () => {
                  if (name.trim().length < 2)
                    throw new Error("Enter your legal name above.");
                  if (
                    !(await pickUpload(
                      "/publisher/applications",
                      "application/pdf",
                      { legal_name: name },
                    ))
                  )
                    throw new Error("No verification document selected.");
                }, "Verification submitted.")
              }
            />
          )}{" "}
          {user?.publisher_status === "approved_pending_payment" && (
            <Action
              label="Pay registration fee"
              busy={busy}
              onPress={() => buy("publisher_registration")}
            />
          )}{" "}
          {dashboard && (
            <>
              <View style={ui.card}>
                <Text style={ui.title}>Your publishing activity</Text>
                <Text style={ui.body}>
                  {dashboard.audiobooks} audiobooks · {dashboard.eligible_views}{" "}
                  eligible views this month
                </Text>
                <Text style={ui.title}>
                  ৳{dashboard.available_balance} available
                </Text>
                <Text style={ui.body}>
                  Current-month earnings are allocated after month close, based
                  on eligible premium views.
                </Text>
              </View>
              <Text style={ui.title}>Channels</Text>
              {channels.map((c) => (
                <View key={c.id} style={ui.card}>
                  <Text style={ui.label}>
                    {c.name}
                    {c.moderated ? " · restricted" : ""}
                  </Text>
                  <Text style={ui.body}>{c.description}</Text>
                  <Action
                    label="Edit channel"
                    secondary
                    onPress={() => {
                      setChannelEdit(c.id);
                      setChannelName(c.name);
                      setChannelDescription(c.description);
                    }}
                  />
                </View>
              ))}
              <Field
                label="Channel name"
                value={channelName}
                onChange={setChannelName}
              />
              <Field
                label="Channel description"
                value={channelDescription}
                onChange={setChannelDescription}
              />
              <Action
                label={channelEdit ? "Save channel" : "Create channel"}
                busy={busy}
                onPress={() =>
                  run(async () => {
                    if (channelEdit)
                      await apiClient.put(
                        `/publisher/channels/${channelEdit}`,
                        { name: channelName, description: channelDescription },
                      );
                    else
                      await apiClient.post("/publisher/channels", {
                        name: channelName,
                        description: channelDescription,
                      });
                    setChannelEdit("");
                    setChannelName("");
                    setChannelDescription("");
                  })
                }
              />
              <Text style={ui.title}>Your audiobooks</Text>
              {books.map((b) => (
                <View key={b.id} style={ui.card}>
                  <Text style={ui.label}>
                    {b.title} · {b.status} · {b.visibility}
                  </Text>
                  <Action
                    label="View / listen"
                    secondary
                    onPress={() =>
                      nav.navigate("AudiobookDetails", { audiobookId: b.id })
                    }
                  />
                  <Action
                    label="Edit metadata"
                    secondary
                    onPress={() => setEdit({ ...b })}
                  />
                  {b.status === "COMPLETED" && (
                    <Action
                      label={
                        b.visibility === "PUBLIC"
                          ? "Make private"
                          : "Publish audiobook"
                      }
                      busy={busy}
                      onPress={() =>
                        run(() =>
                          apiClient.patch(`/audiobooks/${b.id}/visibility`, {
                            visibility:
                              b.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC",
                          }),
                        )
                      }
                    />
                  )}
                </View>
              ))}
              {edit && (
                <View style={ui.card}>
                  <Text style={ui.title}>Edit audiobook</Text>
                  {[
                    "title",
                    "author",
                    "description",
                    "genre",
                    "cover_image_url",
                  ].map((key) => (
                    <Field
                      key={key}
                      label={key.replaceAll("_", " ")}
                      value={edit[key] || ""}
                      onChange={(v) => setEdit({ ...edit, [key]: v })}
                    />
                  ))}
                  <Action
                    label="Save audiobook"
                    busy={busy}
                    onPress={() =>
                      run(async () => {
                        const {
                          title,
                          author,
                          description,
                          genre,
                          cover_image_url,
                        } = edit;
                        await apiClient.patch(`/audiobooks/${edit.id}`, {
                          title,
                          author,
                          description,
                          genre,
                          cover_image_url,
                        });
                        setEdit(null);
                      })
                    }
                  />
                </View>
              )}
              <Text style={ui.title}>Revenue history</Text>
              {dashboard.ledger.length === 0 && (
                <Text style={ui.body}>No allocated earnings yet.</Text>
              )}
              {dashboard.ledger.map((r: any) => (
                <Text key={r.id} style={ui.body}>
                  {r.month} · {r.kind} · ৳{r.amount}
                </Text>
              ))}
              <Field
                label="Withdrawal amount (BDT)"
                value={amount}
                onChange={setAmount}
                keyboard="numeric"
              />
              <Field
                label="Payout destination"
                value={destination}
                onChange={setDestination}
              />
              <Action
                label="Request withdrawal"
                busy={busy}
                onPress={() =>
                  run(() =>
                    apiClient.post("/publisher/withdrawals", {
                      amount,
                      destination,
                    }),
                  )
                }
              />
              <Text style={ui.body}>
                Development payouts are simulated. No real funds are
                transferred.
              </Text>
              {dashboard.withdrawals.map((w: any) => (
                <Text key={w.id} style={ui.body}>
                  ৳{w.amount} · {w.status} · {w.reason}
                </Text>
              ))}
            </>
          )}
        </>
      )}
      {checkout && (
        <View style={ui.card}>
          <Text style={ui.title}>Development payment</Text>
          <Text style={ui.body}>Order {checkout.id}</Text>
          <Text style={ui.title}>৳{checkout.amount}</Text>
          <Text style={ui.body}>
            This is a mock mobile-wallet checkout. No real money moves.
          </Text>
          {["success", "failed", "cancelled"].map((status) => (
            <Action
              key={status}
              label={
                status === "success"
                  ? "Confirm payment"
                  : status === "failed"
                    ? "Simulate failure"
                    : "Cancel payment"
              }
              secondary={status !== "success"}
              busy={busy}
              onPress={() =>
                run(async () => {
                  await apiClient.post(
                    `/payments/${checkout.id}/mock-confirm`,
                    { status },
                  );
                  setCheckout(null);
                }, `Payment ${status}.`)
              }
            />
          ))}
        </View>
      )}
      <Text style={ui.title}>Payment history</Text>
      {payments.length === 0 && (
        <Text style={ui.body}>No payment orders yet.</Text>
      )}
      {payments.map((p) => (
        <View key={p.id} style={ui.card}>
          <Text style={ui.body}>
            {p.kind} · ৳{p.amount} · {p.status}
          </Text>
          {p.status === "pending" && (
            <Action
              label="Resume checkout"
              secondary
              onPress={() => setCheckout(p)}
            />
          )}
        </View>
      ))}
      <Action
        label="Sign out"
        secondary
        onPress={() => {
          Alert.alert(
            "Sign out",
            "Offline downloads will be removed from this device.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Sign out",
                onPress: async () => {
                  await offline.clear(user!.id);
                  await logout();
                },
              },
            ],
          );
        }}
      />
    </Workspace>
  );
}
