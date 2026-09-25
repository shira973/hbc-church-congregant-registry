import { Platform } from "react-native";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  initializeAuth,
  getAuth,
  browserLocalPersistence,
} from "firebase/auth";
// @ts-ignore - only resolvable on native builds
import { getReactNativePersistence } from "firebase/auth/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ---- Fill these in from your Firebase console (Project settings > General) ----
const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME.firebaseapp.com",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME.appspot.com",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Auth persistence differs between web and native RN
let auth;
if (Platform.OS === "web") {
  auth = initializeAuth(app, { persistence: browserLocalPersistence });
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

const db = getFirestore(app);

export { app, auth, db };
