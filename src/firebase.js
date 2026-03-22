// src/firebase.js
// ─────────────────────────────────────────────────────────────────────────────
// Firebase configuration for ASHA Survey App
// ─────────────────────────────────────────────────────────────────────────────
//
// SETUP INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com
// 2. Create / open your project
// 3. Project Settings → General → "Your apps" → Add Web App (</>)
// 4. Copy the firebaseConfig object and paste it below
// 5. Enable Authentication providers:
//    Authentication → Sign-in method → Enable "Email/Password" & "Google"
// 6. Copy your .env.example to .env.local and fill in the values
//
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ── Paste your Firebase config here ──────────────────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// ── Initialize ────────────────────────────────────────────────────────────────
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

const db = getFirestore(app);

export { auth, googleProvider, db };
export default app;