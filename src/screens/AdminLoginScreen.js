import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import { useAuth } from "../context/AuthContext";
import { requestOtp, verifyOtp } from "../utils/otp";

export default function AdminLoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState("phone"); // "phone" | "code"
  const [deliveredTo, setDeliveredTo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handlePhoneChange = (value) => {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
    setPhone(digitsOnly);
  };

  const handleRequestOtp = async () => {
    setError("");
    setBusy(true);
    try {
      const res = await requestOtp({ phone: phone.trim() });
      setDeliveredTo(res.deliveredTo);
      setStage("code");
    } catch (e) {
      setError(e.message || "Could not send code. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setBusy(true);
    try {
      const res = await verifyOtp({ phone: phone.trim(), code: code.trim() });
      await signIn(res.member);
    } catch (e) {
      setError(e.message || "Invalid code.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Admin Login
      </Text>

      {stage === "phone" && (
        <>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Registered admin phone number</Text>
            <TextInput
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="number-pad"
              maxLength={10}
              mode="outlined"
              style={styles.input}
              contentStyle={styles.inputText}
              labelStyle={styles.inputLabel}
              textColor="#000000"
              placeholderTextColor={styles.placeholderColor.color}
              placeholder="999999999"
              theme={{ colors: { primary: "#1d6fb8", background: "#cfe0f3" } }}
            />
          </View>
          <Button
            mode="contained"
            onPress={handleRequestOtp}
            loading={busy}
            disabled={busy || phone.trim().length !== 10}
          >
            Send Code
          </Button>
        </>
      )}

      {stage === "code" && (
        <>
          <Text style={styles.helper}>
            A 6-digit code was sent to {deliveredTo}.
          </Text>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Enter code</Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              mode="outlined"
              maxLength={6}
              style={styles.input}
              contentStyle={styles.inputText}
              labelStyle={styles.inputLabel}
              textColor="#000000"
              placeholderTextColor={styles.placeholderColor.color}
              placeholder="123456"
              theme={{ colors: { primary: "#1d6fb8", background: "#cfe0f3" } }}
            />
          </View>
          <Button
            mode="contained"
            onPress={handleVerify}
            loading={busy}
            disabled={busy || code.trim().length !== 6}
          >
            Verify & Sign In
          </Button>
          <Button mode="text" onPress={() => setStage("phone")} disabled={busy}>
            Use a different number
          </Button>
        </>
      )}

      {!!error && <HelperText type="error">{error}</HelperText>}

      <Button
        mode="text"
        style={styles.linkButton}
        onPress={() => navigation.navigate("PublicDataEntry")}
      >
        I'm a congregant — go to the roll book form
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#dfeaf7",
  },
  title: {
    marginBottom: 24,
    textAlign: "center",
    color: "#1d2b3a",
  },
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
    marginBottom: 16,
    backgroundColor: "#cfe0f3",
    alignSelf: "center",
    width: "60%",
    minHeight: 44,
  },
  inputText: {
    color: "#000000",
    fontSize: 16,
  },
  inputLabel: {
    color: "#000000",
  },
  placeholderColor: {
    color: "rgba(0, 0, 0, 0.5)",
  },
  helper: { marginBottom: 12, color: "#1d2b3a" },
  linkButton: { marginTop: 32, color: "#1d2b3a" },
});
