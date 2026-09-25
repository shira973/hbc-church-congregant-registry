import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import {
  Text,
  TextInput,
  Button,
  SegmentedButtons,
  HelperText,
  RadioButton,
} from "react-native-paper";
import { useRoute } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { createMember, updateMember, getMember, DEFAULT_MEMBER } from "../utils/firestoreHelpers";
import { LANGUAGES, LANGUAGE_LABELS, label } from "../i18n/translations";

// One entry per plain text field: [fieldKey, formStatePath]. Address and
// admin-only fields are handled separately below since they need special
// layout/visibility.
const BASIC_FIELDS = [
  ["name", "name"],
  ["dob", "dob"],
  ["phone", "phone"],
  ["fatherName", "fatherName"],
  ["motherName", "motherName"],
  ["baptismDate", "baptismDate"],
  ["baptizedBy", "baptizedBy"],
  ["previousConvention", "previousConvention"],
  ["transitingToConvention", "transitingToConvention"],
  ["dateOfDiscontinuation", "dateOfDiscontinuation"],
  ["dateOfReborn", "dateOfReborn"],
  ["dateOfRejoin", "dateOfRejoin"],
];

const PERMANENT_ADDRESS_FIELDS = [
  ["state", "state"],
  ["townCityVillage", "townCityVillage"],
  ["district", "district"],
  ["locality", "locality"],
  ["houseNumber", "houseNumber"],
  ["houseName", "houseName"],
  ["pinCode", "pinCode"],
];

function emptyForm() {
  return JSON.parse(JSON.stringify(DEFAULT_MEMBER));
}

export default function UserDataEntryScreen() {
  const { admin } = useAuth(); // null when a congregant fills this in unauthenticated
  const route = useRoute();
  const memberId = route.params?.memberId;
  const inputTheme = {
    colors: {
      text: "#000000",
      primary: "#1d6fb8",
      placeholder: "#000000",
      onSurfaceVariant: "#000000",
      background: "#cfe0f3",
    },
  };

  const [lang, setLang] = useState(LANGUAGES[0]);
  const [form, setForm] = useState(emptyForm());
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!memberId) {
      setForm(emptyForm());
      return;
    }
    (async () => {
      const existing = await getMember(memberId);
      if (existing) setForm({ ...emptyForm(), ...existing });
    })();
  }, [memberId]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setAddressField = (key, value) =>
    setForm((f) => ({
      ...f,
      address: {
        ...f.address,
        permanent: { ...f.address.permanent, [key]: value },
      },
    }));

  const handleSave = async () => {
    setBusy(true);
    setStatus("");
    try {
      // Admin-only fields are stripped out entirely when a non-admin
      // (congregant, self-service) submits, regardless of what's in
      // local state — this mirrors the Firestore rule that also blocks it.
      const payload = { ...form };
      if (!admin) {
        payload.dateOfDeath = "";
        payload.remarks = "";
        payload.isAdmin = false;
        payload.position = "Congregant";
      }

      if (memberId) {
        await updateMember(memberId, payload);
        setStatus("Saved changes.");
      } else {
        await createMember(payload);
        setStatus("Entry submitted. Thank you.");
        setForm(emptyForm());
      }
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerRow}>
        <Text variant="headlineSmall" style={styles.title}>
          {label("formTitle", lang)}
        </Text>
        <SegmentedButtons
          value={lang}
          onValueChange={setLang}
          buttons={LANGUAGES.map((l) => ({ value: l, label: LANGUAGE_LABELS[l] }))}
          style={styles.langToggle}
        />
      </View>

      <View style={styles.radioGroup}>
        <Text variant="titleSmall" style={styles.sectionTitle}>
          {label("sex", lang)}
        </Text>
        <RadioButton.Group onValueChange={(v) => setField("sex", v)} value={form.sex}>
          <View style={styles.radioRow}>
            <RadioButton.Item
              label="Male"
              value="Male"
              position="leading"
              style={styles.radioItem}
              labelStyle={styles.radioLabel}
            />
            <RadioButton.Item
              label="Female"
              value="Female"
              position="leading"
              style={styles.radioItem}
              labelStyle={styles.radioLabel}
            />
          </View>
        </RadioButton.Group>
      </View>

      {BASIC_FIELDS.map(([labelKey, formKey]) => (
        <TextInput
          key={formKey}
          label={label(labelKey, lang)}
          value={form[formKey]}
          onChangeText={(v) => setField(formKey, v)}
          mode="outlined"
          style={styles.input}
          contentStyle={styles.inputText}
          labelStyle={styles.inputLabel}
          textColor="#000000"
          placeholderTextColor="#000000"
          theme={inputTheme}
        />
      ))}

      <Text variant="titleSmall" style={styles.sectionTitle}>
        {label("permanentAddress", lang)}
      </Text>
      {PERMANENT_ADDRESS_FIELDS.map(([labelKey, addrKey]) => (
        <TextInput
          key={addrKey}
          label={label(labelKey, lang)}
          value={form.address.permanent[addrKey]}
          onChangeText={(v) => setAddressField(addrKey, v)}
          mode="outlined"
          style={styles.input}
          contentStyle={styles.inputText}
          labelStyle={styles.inputLabel}
          textColor="#000000"
          placeholderTextColor="#000000"
          theme={inputTheme}
        />
      ))}

      <TextInput
        label={label("temporaryAddress", lang)}
        value={form.address.temporary}
        onChangeText={(v) =>
          setForm((f) => ({ ...f, address: { ...f.address, temporary: v } }))
        }
        mode="outlined"
        style={styles.input}
        contentStyle={styles.inputText}
        labelStyle={styles.inputLabel}
        textColor="#000000"
        placeholderTextColor="#000000"
        theme={inputTheme}
      />
      <TextInput
        label={label("guardianCaretaker", lang)}
        value={form.address.guardianCaretaker}
        onChangeText={(v) =>
          setForm((f) => ({ ...f, address: { ...f.address, guardianCaretaker: v } }))
        }
        mode="outlined"
        style={styles.input}
        contentStyle={styles.inputText}
        labelStyle={styles.inputLabel}
        textColor="#000000"
        placeholderTextColor="#000000"
        theme={inputTheme}
      />

      {admin && (
        <>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Admin-only fields
          </Text>
          <TextInput
            label={label("dateOfDeath", lang)}
            value={form.dateOfDeath}
            onChangeText={(v) => setField("dateOfDeath", v)}
            mode="outlined"
            style={styles.input}
            contentStyle={styles.inputText}
            labelStyle={styles.inputLabel}
            textColor="#000000"
            placeholderTextColor="#000000"
            theme={inputTheme}
          />
          <TextInput
            label={label("remarks", lang)}
            value={form.remarks}
            onChangeText={(v) => setField("remarks", v)}
            mode="outlined"
            multiline
            style={styles.input}
            contentStyle={styles.inputText}
            labelStyle={styles.inputLabel}
            textColor="#000000"
            placeholderTextColor="#000000"
            theme={inputTheme}
          />
        </>
      )}

      <Button mode="contained" onPress={handleSave} loading={busy} disabled={busy}>
        {label("save", lang)}
      </Button>

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
  headerRow: { marginBottom: 20 },
  title: { marginBottom: 12, color: "#1d2b3a" },
  langToggle: { marginBottom: 8 },
  sectionTitle: { marginTop: 16, marginBottom: 8, color: "#1d2b3a" },
  radioGroup: {
    marginBottom: 12,
  },
  radioRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  radioItem: {
    flex: 1,
    backgroundColor: "#cfe0f3",
    borderRadius: 8,
  },
  radioLabel: {
    color: "#1d2b3a",
    fontSize: 14,
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
});
