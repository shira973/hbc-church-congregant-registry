# Hawakhana Baptist Church Roll Book

A React Native (Expo) app for iOS, Android, and Web: a congregation registry
with an admin dashboard, admin onboarding via OTP, and a public data-entry
form congregants can fill in themselves without registering.

## Why Firebase, not a custom backend

Firestore's free (Spark) tier — 1 GiB storage, 50K reads/day, 20K
writes/day, no card required — comfortably covers a single-church roll book
at hundreds to low-thousands of members. A custom Spring Boot backend + DB
would mean paying for and managing hosting and a database yourself for no
real benefit at this scale, since a member record maps cleanly onto a
Firestore document.

**One caveat:** Firebase Phone Auth (real SMS OTP) requires the paid Blaze
plan. Since only admins log in (a handful of people, occasionally) rather
than the whole congregation, this build instead does **email-based OTP**
via a Cloud Function + a free transactional email tier (Brevo, 300
emails/day free), which stays entirely on Firebase's free tier and meets
the "up to 100/day" requirement with headroom. See "Swapping to SMS OTP"
below if you'd rather text codes once volume or preference justifies the
Blaze plan.

## Project structure

```
App.js                      Root component: providers + navigator
firebaseConfig.js           Firebase init (fill in your project's config)
firebase.json                Firebase CLI config (hosting, functions, rules)
firestore.rules              Security rules (admin-gated writes)
functions/                   Cloud Functions: OTP request/verify
src/
  navigation/AppNavigator.js Login gate + admin tab navigator
  context/AuthContext.js     Local admin session (persisted via AsyncStorage)
  screens/
    AdminLoginScreen.js      Phone -> OTP -> sign in
    AdminOnboardingScreen.js Existing admin promotes another member to admin
    AdminProfileScreen.js    Own details (editable) + list of other admins
    AdminDashboardScreen.js  Analytics section + scrollable member table
    UserDataEntryScreen.js   The roll book form, with inline translation toggle
  i18n/translations.js       Field-name translation map for the toggle
  utils/
    firestoreHelpers.js      Data model + CRUD + analytics computation
    otp.js                   Client-side OTP request/verify calls
```

## Data model

Single Firestore collection, `members`. An admin is just a member document
with `isAdmin: true` — no separate admins collection, so "promote to admin"
is a single field update. See the comment block at the top of
`src/utils/firestoreHelpers.js` for the full field list, matching every
field named in the spec (name, sex, DOB, phone, parents' names, baptism
date/by, permanent + temporary address, guardian/caretaker, previous/
transiting convention, date of death, discontinuation, reborn, rejoin,
remarks, plus the defaults `isAdmin: false` / `position: "Congregant"`).

`dateOfDeath` and `remarks` are admin-only: the data-entry screen hides
these fields entirely for unauthenticated congregant submissions, and the
Firestore security rule (`firestore.rules`) enforces the same restriction
server-side so it can't be bypassed by calling the API directly.

## Authentication flow (OTP)

1. Admin enters their registered phone number → `requestOtp` Cloud
   Function looks up the matching admin member doc, generates a 6-digit
   code, stores it with a 5-minute expiry, and emails it via Brevo.
2. Admin enters the code → `verifyOtp` Cloud Function checks it, then
   mints a **Firebase custom auth token** bound to that member's document
   ID.
3. The client signs into Firebase Auth with that custom token
   (`signInWithCustomToken`), which is what makes `request.auth` non-null
   for Firestore — this is what the security rules check before allowing
   admin-only writes (promoting a member, editing death/remarks, etc.).
4. The admin session (member doc) is also cached locally via
   AsyncStorage so the app doesn't need to re-verify OTP on every launch.

A daily counter document (`otp_counters/{date}`) caps total OTP sends at
100/day across all admins combined.

### Swapping to SMS OTP later

Only `functions/index.js`'s `sendEmail()` needs to change — replace it
with a call to an SMS provider (Twilio Verify, LabsMobile, etc.) and pass
a phone number instead of an email. The request/verify contract the app
uses (`requestOtp` / `verifyOtp`) doesn't change.

## Setup

### 1. Frontend

```bash
npm install
npx expo start        # then press w / i / a for web / iOS / Android
```

Fill in `firebaseConfig.js` with your Firebase project's web app config
(Firebase Console → Project settings → General → Your apps).

### 2. Firebase project

```bash
npm install -g firebase-tools
firebase login
firebase init          # select Firestore, Functions, Hosting; point at this folder
```

Set the Brevo email credentials for the Cloud Function:

```bash
firebase functions:config:set brevo.api_key="YOUR_BREVO_KEY" brevo.sender="noreply@yourdomain.org"
```

Deploy:

```bash
firebase deploy --only firestore:rules,functions
```

### 3. Seed the first admin

There's no admin yet on a fresh database, so the onboarding flow's
"only an existing admin can promote another" rule needs a bootstrap
exception. Simplest approach: manually create the first `members`
document in the Firebase Console with `isAdmin: true`, a `phone`, and an
`email`, then log in as that admin and use the in-app Onboarding screen
for everyone after.

### 4. Deploying the web build for free

```bash
npx expo export:web
firebase deploy --only hosting
```

Firebase Hosting's free tier (10 GB storage, 360 MB/day transfer) is
enough for a single-congregation app. For iOS/Android, build with
[EAS Build](https://docs.expo.dev/build/introduction/) (Expo's free tier
covers occasional builds) and distribute via TestFlight / an APK.

## What's still a prototype, not production-hardened

- The first-admin bootstrap above is manual by design — there's
  intentionally no "self-serve first admin" API, since that would be a
  privilege-escalation hole.
- Retrieval/search in Onboarding is a simple client-side filter over the
  full member list — fine at congregation scale, but swap for a proper
  Firestore query if the roll book grows very large.
- No rate limiting beyond the OTP daily cap; add App Check before
  exposing this publicly at scale.
