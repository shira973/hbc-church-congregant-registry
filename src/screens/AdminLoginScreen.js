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
          <TextInput
            label="Registered admin phone number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            mode="outlined"
            style={styles.input}
          />
          <Button
            mode="contained"
            onPress={handleRequestOtp}
            loading={busy}
            disabled={busy || phone.trim().length < 6}
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
          <TextInput
            label="Enter code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            mode="outlined"
            maxLength={6}
            style={styles.input}
          />
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
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { marginBottom: 24, textAlign: "center" },
  input: { marginBottom: 16 },
  helper: { marginBottom: 12 },
  linkButton: { marginTop: 32 },
});
