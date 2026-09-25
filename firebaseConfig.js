import { Platform } from "react-native";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  initializeAuth,
  browserLocalPersistence,
} from "firebase/auth";

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

// Auth persistence differs between web and native RN. Avoid importing the
// unsupported Firebase React Native auth subpath so the bundle works.
let auth;
if (Platform.OS === "web") {
  auth = initializeAuth(app, { persistence: browserLocalPersistence });
} else {
  auth = initializeAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };
