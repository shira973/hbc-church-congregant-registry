import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AuthContext = createContext(null);
const SESSION_KEY = "hbcrb_admin_session";

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null); // { id, name, phone, position, isAdmin }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (raw) setAdmin(JSON.parse(raw));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = async (memberDoc) => {
    setAdmin(memberDoc);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(memberDoc));
  };

  const signOut = async () => {
    setAdmin(null);
    await AsyncStorage.removeItem(SESSION_KEY);
  };

  return (
    <AuthContext.Provider value={{ admin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
