const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

// ---- Config: set these with `firebase functions:config:set` (or env vars on 2nd gen) ----
// brevo.api_key   -> your free Brevo (Sendinblue) transactional email API key
// brevo.sender    -> a verified sender email, e.g. noreply@yourchurchdomain.org
const BREVO_API_KEY = functions.config().brevo?.api_key;
const BREVO_SENDER = functions.config().brevo?.sender;

const OTP_TTL_MINUTES = 5;
const DAILY_OTP_CAP = 100; // matches the "100 OTPs/day" requirement

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

async function sendEmail(toEmail, code) {
  // Uses Brevo's free transactional email tier (300 emails/day free).
  // Swap this function alone if you later move to an SMS provider.
  const fetch = (await import("node-fetch")).default;
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: BREVO_SENDER, name: "Hawakhana Baptist Church" },
      to: [{ email: toEmail }],
      subject: "Your admin login code",
      htmlContent: `<p>Your Hawakhana Baptist Church admin login code is:</p>
                    <h2>${code}</h2>
                    <p>This code expires in ${OTP_TTL_MINUTES} minutes.</p>`,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Email send failed: ${res.status} ${body}`);
  }
}

/**
 * requestOtp({ phone })
 * Looks up the admin member by phone, enforces the daily cap, generates
 * and stores a short-lived OTP, and emails it to the admin's on-file
 * email address.
 *
 * NOTE: this build sends the OTP by email using the phone record to look
 * up the admin's registered email in Firestore ("members" doc must have
 * an `email` field for whoever logs in this way). If you'd rather text
 * the code, replace sendEmail() with an SMS provider call (Twilio Verify,
 * LabsMobile, etc.) - the request/verify flow below doesn't need to change.
 */
exports.requestOtp = functions.https.onCall(async (data) => {
  const { phone } = data;
  if (!phone) {
    throw new functions.https.HttpsError("invalid-argument", "Phone is required.");
  }

  const membersSnap = await db
    .collection("members")
    .where("phone", "==", phone)
    .where("isAdmin", "==", true)
    .limit(1)
    .get();

  if (membersSnap.empty) {
    throw new functions.https.HttpsError(
      "not-found",
      "No admin found with that phone number."
    );
  }
  const memberDoc = membersSnap.docs[0];
  const member = memberDoc.data();
  if (!member.email) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "This admin has no email on file to deliver a code to."
    );
  }

  // Enforce the daily cap across all admins combined.
  const counterRef = db.collection("otp_counters").doc(todayKey());
  await db.runTransaction(async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const count = counterSnap.exists ? counterSnap.data().count : 0;
    if (count >= DAILY_OTP_CAP) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "Daily OTP limit reached. Try again tomorrow."
      );
    }
    tx.set(counterRef, { count: count + 1 }, { merge: true });
  });

  const code = generateCode();
  const expiresAt = Date.now() + OTP_TTL_MINUTES * 60 * 1000;

  await db.collection("otps").doc(phone).set({
    code,
    expiresAt,
    memberId: memberDoc.id,
    attempts: 0,
  });

  await sendEmail(member.email, code);

  const masked = member.email.replace(/(.{2}).+(@.+)/, "$1***$2");
  return { ok: true, deliveredTo: masked };
});

/**
 * verifyOtp({ phone, code })
 * Checks the stored code, expiry, and attempt count; on success mints a
 * Firebase custom auth token bound to the member's doc ID (so Firestore
 * rules can check request.auth server-side) and returns the admin's
 * member record for the client to store as the session.
 */
exports.verifyOtp = functions.https.onCall(async (data) => {
  const { phone, code } = data;
  if (!phone || !code) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Phone and code are required."
    );
  }

  const otpRef = db.collection("otps").doc(phone);
  const otpSnap = await otpRef.get();
  if (!otpSnap.exists) {
    throw new functions.https.HttpsError("not-found", "No OTP requested for this phone.");
  }
  const otp = otpSnap.data();

  if (Date.now() > otp.expiresAt) {
    await otpRef.delete();
    throw new functions.https.HttpsError("deadline-exceeded", "Code expired. Request a new one.");
  }
  if (otp.attempts >= 5) {
    await otpRef.delete();
    throw new functions.https.HttpsError("resource-exhausted", "Too many attempts. Request a new code.");
  }
  if (otp.code !== code) {
    await otpRef.update({ attempts: admin.firestore.FieldValue.increment(1) });
    throw new functions.https.HttpsError("permission-denied", "Incorrect code.");
  }

  await otpRef.delete();

  const memberSnap = await db.collection("members").doc(otp.memberId).get();
  const member = { id: memberSnap.id, ...memberSnap.data() };

  // Mint a real Firebase Auth token bound to this member's doc ID so
  // Firestore security rules can check request.auth.uid server-side
  // instead of trusting the client's local session alone.
  const token = await admin.auth().createCustomToken(otp.memberId, {
    isAdmin: true,
  });

  return { ok: true, member, token };
});
