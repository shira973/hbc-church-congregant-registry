import React, { useCallback, useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import {
  Text,
  TextInput,
  Button,
  List,
  HelperText,
  Divider,
} from "react-native-paper";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { listAdmins, listMembers, promoteToAdmin } from "../utils/firestoreHelpers";
import { useAuth } from "../context/AuthContext";

export default function AdminOnboardingScreen() {
  const navigation = useNavigation();
  const { admin } = useAuth();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [admins, setAdmins] = useState([]);

  const loadAdmins = useCallback(async () => {
    setAdmins(await listAdmins());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAdmins();
    }, [loadAdmins])
  );

  // Simple client-side search over the full member list — fine at
  // congregation scale; swap for a Firestore prefix query if the roll
  // book grows into the tens of thousands.
  const handleSearch = async (text) => {
    setSearch(text);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    const all = await listMembers();
    setResults(
      all.filter((m) =>
        (m.name || "").toLowerCase().includes(text.trim().toLowerCase())
      )
    );
  };

  const selectMember = (member) => {
    setSelected(member);
    setPosition(member.position === "Congregant" ? "" : member.position || "");
    setPhone(member.phone || "");
    setResults([]);
    setSearch(member.name);
  };

  const handlePromote = async () => {
    if (!selected) return;
    setBusy(true);
    setStatus("");
    try {
      await promoteToAdmin(selected.id, { position, phone });
      setStatus(`${selected.name} is now an admin.`);
      await loadAdmins();
      setSelected(null);
      setSearch("");
      setPosition("");
      setPhone("");
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Onboard a New Admin
      </Text>
      <Text style={styles.helper}>
        Signed in as {admin?.name} ({admin?.position}). Only existing admins
        can promote another member to admin.
      </Text>

      <Button
        mode="contained"
        icon="account-plus"
        style={styles.onboardButton}
        onPress={() => navigation.navigate("DataEntryAdmin", { createAdmin: true })}
      >
        Onboard New Admin
      </Button>

      <Divider style={styles.sectionDivider} />
      <Text variant="titleMedium" style={styles.sectionTitle}>Admins</Text>
      {admins.length ? (
        admins.map((item) => (
          <List.Item
            key={item.id}
            title={item.name || "Unnamed admin"}
            description={[item.position, item.phone].filter(Boolean).join(" · ")}
            left={(props) => <List.Icon {...props} icon="account-check" />}
          />
        ))
      ) : (
        <Text style={styles.helper}>No admins found.</Text>
      )}

      <Divider style={styles.sectionDivider} />
      <Text variant="titleMedium" style={styles.sectionTitle}>Promote Existing Member</Text>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Search existing member by name</Text>
        <TextInput
          value={search}
          onChangeText={handleSearch}
          mode="outlined"
          style={styles.input}
          contentStyle={styles.inputText}
          labelStyle={styles.inputLabel}
          textColor="#000000"
          placeholderTextColor={styles.placeholderColor.color}
          placeholder="Hannah"
          theme={{ colors: { primary: "#1d6fb8", background: "#cfe0f3" } }}
        />
      </View>

      {results.length > 0 && (
        <View style={styles.resultsList}>
          {results.slice(0, 20).map((item) => (
            <List.Item
              key={item.id}
              title={item.name}
              description={item.phone || "No phone on file"}
              onPress={() => selectMember(item)}
            />
          ))}
        </View>
      )}

      {selected && (
        <>
          <Divider style={{ marginVertical: 16 }} />
          <Text style={styles.helper}>Promoting: {selected.name}</Text>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Position / Post</Text>
            <TextInput
              value={position}
              onChangeText={setPosition}
              mode="outlined"
              placeholder="Pastor"
              style={styles.input}
              contentStyle={styles.inputText}
              labelStyle={styles.inputLabel}
              textColor="#000000"
              placeholderTextColor={styles.placeholderColor.color}
              theme={{ colors: { primary: "#1d6fb8", background: "#cfe0f3" } }}
            />
          </View>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Phone (used for OTP login)</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              mode="outlined"
              keyboardType="phone-pad"
              placeholder="999999999"
              style={styles.input}
              contentStyle={styles.inputText}
              labelStyle={styles.inputLabel}
              textColor="#000000"
              placeholderTextColor={styles.placeholderColor.color}
              theme={{ colors: { primary: "#1d6fb8", background: "#cfe0f3" } }}
            />
          </View>
          <Button
            mode="contained"
            onPress={handlePromote}
            loading={busy}
            disabled={busy || !position.trim() || !phone.trim()}
          >
            Make Admin
          </Button>
        </>
      )}

      {!!status && <HelperText type="info">{status}</HelperText>}
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
    marginBottom: 8,
    color: "#1d2b3a",
  },
  onboardButton: { marginBottom: 8 },
  sectionDivider: { marginVertical: 16 },
  sectionTitle: { marginBottom: 8, color: "#1d2b3a" },
  helper: { marginBottom: 16, color: "#1d2b3a" },
  fieldBlock: {
    marginBottom: 12,
  },
  fieldLabel: {
    color: "#1d2b3a",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    marginBottom: 12,
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
  resultsList: { maxHeight: 220, marginBottom: 8 },
});
