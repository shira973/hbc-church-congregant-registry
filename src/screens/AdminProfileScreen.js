import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, TextInput, Button, List, IconButton, Divider } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { listAdmins, updateMember } from "../utils/firestoreHelpers";

const OWN_FIELDS = [
  { key: "name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "position", label: "Position / Post" },
  { key: "email", label: "Email (for OTP delivery)" },
];

export default function AdminProfileScreen() {
  const { admin, signIn } = useAuth();
  const [editingField, setEditingField] = useState(null);
  const [draft, setDraft] = useState({});
  const [admins, setAdmins] = useState([]);

  const loadAdmins = useCallback(async () => {
    const all = await listAdmins();
    setAdmins(all);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAdmins();
    }, [loadAdmins])
  );

  useEffect(() => {
    setDraft(admin || {});
  }, [admin]);

  const startEdit = (key) => {
    setEditingField(key);
    setDraft((d) => ({ ...d, [key]: admin[key] || "" }));
  };

  const saveEdit = async (key) => {
    await updateMember(admin.id, { [key]: draft[key] });
    const updated = { ...admin, [key]: draft[key] };
    await signIn(updated); // refresh local session copy
    setEditingField(null);
    loadAdmins();
  };

  if (!admin) return null;

  return (
    <ScrollView style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        My Profile
      </Text>

      {OWN_FIELDS.map(({ key, label }) => (
        <View key={key} style={styles.fieldRow}>
          {editingField === key ? (
            <>
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput
                  value={draft[key] || ""}
                  onChangeText={(v) => setDraft((d) => ({ ...d, [key]: v }))}
                  mode="outlined"
                  style={styles.fieldInput}
                  contentStyle={styles.inputText}
                  labelStyle={styles.inputLabel}
                  textColor="#000000"
                  placeholderTextColor={styles.placeholderColor.color}
                  placeholder={
                    key === "phone"
                      ? "999999999"
                      : key === "email"
                        ? "name@example.com"
                        : key === "position"
                          ? "Pastor"
                          : "Hannah"
                  }
                  theme={{ colors: { primary: "#1d6fb8", background: "#cfe0f3" } }}
                />
              </View>
              <IconButton icon="check" onPress={() => saveEdit(key)} />
            </>
          ) : (
            <>
              <List.Item
                title={label}
                description={admin[key] || "—"}
                style={styles.listItem}
              />
              <IconButton icon="pencil" onPress={() => startEdit(key)} />
            </>
          )}
        </View>
      ))}

      <Divider style={{ marginVertical: 20 }} />

      <Text variant="titleMedium" style={styles.title}>
        Other Admins
      </Text>
      {admins
        .filter((a) => a.id !== admin.id)
        .map((a) => (
          <List.Item key={a.id} title={a.name} description={a.position} />
        ))}
      {admins.length <= 1 && (
        <Text style={styles.helper}>No other admins onboarded yet.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#dfeaf7",
  },
  title: {
    marginBottom: 12,
    color: "#1d2b3a",
  },
  fieldRow: { flexDirection: "row", alignItems: "center" },
  fieldBlock: {
    flex: 1,
    marginBottom: 8,
  },
  fieldLabel: {
    color: "#1d2b3a",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    marginLeft: 4,
  },
  fieldInput: {
    flex: 1,
    backgroundColor: "#cfe0f3",
  },
  inputText: {
    color: "#000000",
  },
  inputLabel: {
    color: "#000000",
  },
  placeholderColor: {
    color: "rgba(0, 0, 0, 0.5)",
  },
  listItem: { flex: 1, paddingLeft: 0 },
  helper: { color: "#1d2b3a", fontStyle: "italic" },
});
