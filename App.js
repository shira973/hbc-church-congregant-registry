import React from "react";
import { StatusBar } from "expo-status-bar";
import { DefaultTheme, PaperProvider } from "react-native-paper";
import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#1d6fb8",
    accent: "#1d6fb8",
    background: "#eaf2fb",
    surface: "#eaf2fb",
    text: "#111827",
    onSurface: "#111827",
    onSurfaceVariant: "#111827",
    placeholder: "#111827",
  },
};

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <AuthProvider>
        <StatusBar style="dark" />
        <AppNavigator />
      </AuthProvider>
    </PaperProvider>
  );
}
