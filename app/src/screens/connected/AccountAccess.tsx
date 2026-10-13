import React, { useState, useEffect } from "react";
import { Text, View, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import {
  Workspace,
  Field,
  Action,
  Message,
  ui,
} from "../../components/Workspace";
import { useAuth } from "../../contexts/AuthContext";
import { apiClient } from "../../api/client";
import { authStorage } from "../../storage/authStorage";
import { TokenResponse } from "../../types/auth";
WebBrowser.maybeCompleteAuthSession();

export function AccountAccess() {
  const nav = useNavigation<any>();
  const auth = useAuth();
  const [type, setType] = useState<"listener" | "publisher">("listener");
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Workspace title="Welcome to BanglaBook">
      <Text style={ui.title}>
        {signup ? "Create your account" : "Sign in to your stories"}
      </Text>
      <Text style={ui.body}>
        Listener and publisher accounts have separate credentials, even with the
        same email.
      </Text>
      <View style={ui.row}>
        {(["listener", "publisher"] as const).map((t) => (
          <Pressable
            key={t}
            style={[ui.chip, type === t && ui.selected]}
            onPress={() => setType(t)}
            accessibilityRole="button"
          >
            <Text>{t === "listener" ? "Listener" : "Publisher"}</Text>
          </Pressable>
        ))}
      </View>
      {signup && (
        <>
          <Field label="Full name" value={name} onChange={setName} />
          <Field label="Username" value={username} onChange={setUsername} />
        </>
      )}
      <Field
        label="Email"
        value={email}
        onChange={setEmail}
        keyboard="email-address"
      />
      <Field label="Password" value={password} onChange={setPassword} secure />
      <Message text={message} />
      <Action
        label={signup ? "Create account" : "Sign in"}
        busy={busy}
        onPress={async () => {
          setBusy(true);
          setMessage("");
          try {
            if (signup)
              await auth.register({
                username,
                email,
                password,
                full_name: name,
                account_type: type,
              });
            else
              await auth.login({
                username_or_email: email,
                password,
                account_type: type,
              });
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
      <Action
        label={signup ? "Already registered? Sign in" : "Create an account"}
        secondary
        onPress={() => setSignup(!signup)}
      />
      <Action
        label="Forgot password"
        secondary
        onPress={() => nav.navigate("ForgotPassword")}
      />
      {process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID && (
        <GoogleAccess type={type} onError={setMessage} />
      )}
    </Workspace>
  );
}
function GoogleAccess({
  type,
  onError,
}: {
  type: "listener" | "publisher";
  onError: (message: string) => void;
}) {
  const auth = useAuth();
  const [request, response, prompt] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
  useEffect(() => {
    if (response?.type === "success") {
      const token =
        response.authentication?.idToken || response.params.id_token;
      if (token)
        apiClient
          .post<TokenResponse>(
            "/auth/google",
            { id_token: token, account_type: type },
            false,
          )
          .then(async (result) => {
            await auth.acceptSession(result);
          })
          .catch((e) => onError(e.message));
    }
  }, [response]);
  return (
    <Action
      label="Continue with Google"
      busy={!request}
      secondary
      onPress={() => {
        prompt().catch((e) => onError(e.message));
      }}
    />
  );
}
export function AccountRecovery() {
  const nav = useNavigation<any>();
  const [email, setEmail] = useState("");
  const [type, setType] = useState<"listener" | "publisher">("listener");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(path: string, body: unknown) {
    setBusy(true);
    try {
      const data = await apiClient.post<{ message: string }>(path, body, false);
      setMessage(data.message);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Workspace title="Account recovery" back={() => nav.goBack()}>
      <View style={ui.row}>
        {(["listener", "publisher"] as const).map((t) => (
          <Pressable
            key={t}
            style={[ui.chip, type === t && ui.selected]}
            onPress={() => setType(t)}
          >
            <Text>{t}</Text>
          </Pressable>
        ))}
      </View>
      <Field label="Email" value={email} onChange={setEmail} />
      <Action
        label="Email a recovery code"
        busy={busy}
        onPress={() => run("/auth/recovery", { email, account_type: type })}
      />
      <Field label="Code from your email" value={token} onChange={setToken} />
      <Field
        label="New password"
        value={password}
        onChange={setPassword}
        secure
      />
      <Action
        label="Reset password"
        busy={busy}
        onPress={() => run("/auth/reset-password", { token, password })}
      />
      <Message text={message} />
    </Workspace>
  );
}
