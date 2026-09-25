import React, { useState } from "react";
import { View, StyleSheet, FlatList } from "react-native";
import {
  Text,
  TextInput,
  Button,
  List,
  HelperText,
  Divider,
} from "react-native-paper";
import { listMembers, promoteToAdmin } from "../utils/firestoreHelpers";
import { useAuth } from "../context/AuthContext";

export default function AdminOnboardingScreen() {
  const { admin } = useAuth();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

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
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Onboard a New Admin
      </Text>
      <Text style={styles.helper}>
        Signed in as {admin?.name} ({admin?.position}). Only existing admins
        can promote another member to admin.
      </Text>

      <TextInput
        label="Search existing member by name"
        value={search}
        onChangeText={handleSearch}
        mode="outlined"
        style={styles.input}
      />

      {results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          style={styles.resultsList}
          renderItem={({ item }) => (
            <List.Item
              title={item.name}
              description={item.phone || "No phone on file"}
              onPress={() => selectMember(item)}
            />
          )}
        />
      )}

      {selected && (
        <>
          <Divider style={{ marginVertical: 16 }} />
          <Text style={styles.helper}>Promoting: {selected.name}</Text>
          <TextInput
            label="Position / Post"
            value={position}
            onChangeText={setPosition}
            mode="outlined"
            placeholder="e.g. Pastor, Deacon, Secretary"
            style={styles.input}
          />
          <TextInput
            label="Phone (used for OTP login)"
            value={phone}
            onChangeText={setPhone}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.input}
          />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { marginBottom: 8 },
  helper: { marginBottom: 16, color: "#555" },
  input: { marginBottom: 12 },
  resultsList: { maxHeight: 220, marginBottom: 8 },
});
