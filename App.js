import React from "react";
import { StatusBar } from "expo-status-bar";
import { PaperProvider } from "react-native-paper";
import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  return (
    <PaperProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </AuthProvider>
    </PaperProvider>
  );
}
