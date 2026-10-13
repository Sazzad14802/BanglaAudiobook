import React, { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BanglaBookHeader } from "./BanglaBookHeader";
import { BanglaBookButton } from "./BanglaBookButton";
import { Colors, Radius, Spacing } from "../theme";

export function Workspace({
  title,
  children,
  back,
  refresh,
}: {
  title: string;
  children: React.ReactNode;
  back?: () => void;
  refresh?: () => Promise<void>;
}) {
  const [refreshing, setRefreshing] = useState(false);
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.background }}
      edges={["top", "left", "right"]}
    >
      <BanglaBookHeader title={title} onBack={back} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={ui.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            refresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={async () => {
                  setRefreshing(true);
                  try {
                    await refresh();
                  } finally {
                    setRefreshing(false);
                  }
                }}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Field({
  label,
  value,
  onChange,
  secure = false,
  keyboard = "default",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  secure?: boolean;
  keyboard?: "default" | "email-address" | "numeric";
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={ui.input}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        keyboardType={keyboard}
        autoCapitalize="none"
      />
    </View>
  );
}
export function Action({
  label,
  onPress,
  busy = false,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  secondary?: boolean;
}) {
  return (
    <BanglaBookButton
      label={label}
      onPress={onPress}
      isLoading={busy}
      variant={secondary ? "outline" : "primary"}
    />
  );
}
export function Message({ text }: { text: string }) {
  return text ? (
    <Text accessibilityRole="alert" style={ui.message}>
      {text}
    </Text>
  ) : null;
}
export const ui = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: 18,
    paddingBottom: 50,
    width: "100%",
    maxWidth: 850,
    alignSelf: "center",
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.lg,
    padding: 20,
    gap: 12,
  },
  title: { fontSize: 23, fontWeight: "700", color: Colors.textPrimary },
  label: { fontWeight: "600", color: Colors.textSecondary },
  body: { fontSize: 15, lineHeight: 24, color: Colors.textSecondary },
  input: {
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  message: {
    padding: 14,
    backgroundColor: Colors.tintAmber,
    color: Colors.tintAmberText,
    borderRadius: 10,
    lineHeight: 22,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
  },
  selected: { backgroundColor: Colors.primarySurface },
});
