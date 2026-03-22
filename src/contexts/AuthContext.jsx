/* eslint-disable no-unused-vars */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";

// ADD these imports at the very top:
import { auth, googleProvider } from "../firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";

/**
 * AuthContext
 * -----------
 * Provides auth state and methods to the entire app.
 * Works in two modes:
 *   1. "mock" mode  – before Firebase is connected (uses localStorage)
 *   2. "firebase"   – once you paste in your Firebase config
 *
 * To switch to Firebase, replace the body of signInWithEmail,
 * signInWithGoogle and logout with the Firebase SDK calls shown
 * in the FIREBASE_SETUP.md guide.
 */

const AuthContext = createContext(null);

// ── Helpers ────────────────────────────────────────────────────────────────
const MOCK_KEY = "asha_mock_user";

function getMockUser() {
  try {
    const raw = sessionStorage.getItem(MOCK_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setMockUser(u) {
  if (u) sessionStorage.setItem(MOCK_KEY, JSON.stringify(u));
  else sessionStorage.removeItem(MOCK_KEY);
}

// ── Provider ───────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // On mount: restore session (mock or real Firebase observer)
  useEffect(() => {
    // ── FIREBASE: Replace this block with onAuthStateChanged ──
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          provider:
            firebaseUser.providerData?.[0]?.providerId === "google.com"
              ? "google"
              : "email",
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
    // ──────────────────────────────────────────────────────────
  }, []);

  // ── Sign in with Email / Password ──────────────────────────────────────
  async function signInWithEmail(email, password) {
    setAuthError(null);
    try {
      // ── FIREBASE: Replace with signInWithEmailAndPassword(auth, email, password) ──
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
      // ────────────────────────────────────────────────────────────────────
    } catch (err) {
      const msg = friendlyError(err.code || err.message);
      setAuthError(msg);
      throw new Error(msg);
    }
  }

  // ── Sign in with Google ────────────────────────────────────────────────
  async function signInWithGoogle() {
    setAuthError(null);
    try {
      // ── FIREBASE: Replace with signInWithPopup(auth, new GoogleAuthProvider()) ──
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
      // ────────────────────────────────────────────────────────────────────
    } catch (err) {
      const msg = friendlyError(err.code || err.message);
      setAuthError(msg);
      throw new Error(msg);
    }
  }

  // ── Sign up with Email ─────────────────────────────────────────────────
  async function signUpWithEmail(email, password, displayName) {
    setAuthError(null);
    try {
      // ── FIREBASE: Replace with createUserWithEmailAndPassword then updateProfile ──
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }
      return result.user;
      // ────────────────────────────────────────────────────────────────────
    } catch (err) {
      const msg = friendlyError(err.code || err.message);
      setAuthError(msg);
      throw new Error(msg);
    }
  }

  // ── Logout ────────────────────────────────────────────────────────────
  async function logout() {
    // ── FIREBASE: Replace with signOut(auth) ──
    await signOut(auth);
    // ──────────────────────────────────────────
  }

  function clearError() {
    setAuthError(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        signInWithEmail,
        signInWithGoogle,
        signUpWithEmail,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// ── Friendly error messages ────────────────────────────────────────────────
function friendlyError(code) {
  const map = {
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/email-already-in-use": "This email is already registered.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/popup-closed-by-user": "Sign-in popup was closed. Please try again.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/cancelled-popup-request": "Only one popup at a time allowed.",
  };
  return map[code] || code || "An unexpected error occurred.";
}
