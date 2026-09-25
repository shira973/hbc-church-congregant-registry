import { getFunctions, httpsCallable } from "firebase/functions";
import { signInWithCustomToken } from "firebase/auth";
import { app, auth } from "../../firebaseConfig";

const functions = getFunctions(app);

// See /functions/index.js for the server-side implementation.
// Swap the underlying send channel there (email today, SMS later) without
// touching any screen code — the client contract stays { requestOtp, verifyOtp }.

export async function requestOtp({ phone }) {
  const call = httpsCallable(functions, "requestOtp");
  const res = await call({ phone });
  return res.data; // { ok: true, deliveredTo: "a***@example.com" }
}

export async function verifyOtp({ phone, code }) {
  const call = httpsCallable(functions, "verifyOtp");
  const res = await call({ phone, code });
  // res.data: { ok: true, member: {...}, token: "<firebase custom token>" }
  if (res.data?.token) {
    // This is what makes request.auth non-null for subsequent Firestore
    // writes, so the security rules' isSignedInAdmin() check passes.
    await signInWithCustomToken(auth, res.data.token);
  }
  return res.data;
}
