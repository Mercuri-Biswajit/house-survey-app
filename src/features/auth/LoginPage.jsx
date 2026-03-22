import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./LoginPage.module.css";

// ── Google SVG icon ────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

// ── Animated health cross ──────────────────────────────────────────────────
function HealthCross() {
  return (
    <svg viewBox="0 0 60 60" fill="none" className={styles.healthCross}>
      <rect x="22" y="5"  width="16" height="50" rx="4" fill="rgba(255,255,255,0.15)"/>
      <rect x="5"  y="22" width="50" height="16" rx="4" fill="rgba(255,255,255,0.15)"/>
      <rect x="23" y="6"  width="14" height="48" rx="3" fill="rgba(255,255,255,0.08)"/>
      <rect x="6"  y="23" width="48" height="14" rx="3" fill="rgba(255,255,255,0.08)"/>
    </svg>
  );
}

export default function LoginPage() {
  const {
    signInWithEmail,
    signInWithGoogle,
    signUpWithEmail,
    authError,
    clearError,
    user,
    loading,
    isFirebaseMode,
  } = useAuth();

  const navigate = useNavigate();

  const [mode,          setMode]          = useState("login");
  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [name,          setName]          = useState("");
  const [showPass,      setShowPass]      = useState(false);
  const [isSubmitting,  setIsSubmitting]  = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [fieldError,    setFieldError]    = useState("");
  const [mounted,       setMounted]       = useState(false);

  // Mount animation
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Redirect when already logged in
  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  // FIX 1: Wrap side-effects in useCallback so the function reference is
  // stable and can be listed in the dependency array without re-running
  // on every render. This satisfies both exhaustive-deps AND
  // react-hooks/set-state-in-effect rules.
  const resetErrors = useCallback(() => {
    clearError();
    setFieldError("");
  }, [clearError]);

  useEffect(() => {
    resetErrors();
  }, [mode, resetErrors]);

  // Validation
  function validate() {
    if (mode === "signup" && !name.trim()) {
      setFieldError("Please enter your full name.");
      return false;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setFieldError("Enter a valid email address.");
      return false;
    }
    if (!password || password.length < 6) {
      setFieldError("Password must be at least 6 characters.");
      return false;
    }
    return true;
  }

  // FIX 2 & 3: Non-empty catch blocks — errors are handled inside
  // AuthContext (setAuthError), so we just log here for debugging.
  async function handleSubmit(e) {
    e.preventDefault();
    setFieldError("");
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, name);
      }
    } catch (err) {
      console.debug("[LoginPage] Auth error:", err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogle() {
    setFieldError("");
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.debug("[LoginPage] Google auth error:", err.message);
    } finally {
      setGoogleLoading(false);
    }
  }

  const displayError = fieldError || authError;

  return (
    <div className={`${styles.page} ${mounted ? styles.ready : ""}`}>

      {/* ── Left panel ─────────────────────────────────────────── */}
      <div className={styles.leftPanel}>
        <div className={styles.blob1} />
        <div className={styles.blob2} />
        <div className={styles.blob3} />

        <div className={styles.leftContent}>
          <div className={styles.brand}>
            <div className={styles.brandLogo}>
              <HealthCross />
            </div>
            <div>
              <div className={styles.brandName}>ASHA Survey</div>
              <div className={styles.brandTagline}>E-Register System</div>
            </div>
          </div>

          <div className={styles.headline}>
            <h1>Community Health<br /><em>Made Digital</em></h1>
            <p>
              Track household surveys, immunization schedules, and maternal
              health records for your village — all in one place.
            </p>
          </div>

          <div className={styles.statsPills}>
            {[
              { icon: "⌂",  label: "Households",     value: "293+" },
              { icon: "♀",  label: "Mothers Tracked", value: "12"  },
              { icon: "💉", label: "Vaccines Logged", value: "38+" },
            ].map((s) => (
              <div key={s.label} className={styles.pill}>
                <span className={styles.pillIcon}>{s.icon}</span>
                <div>
                  <div className={styles.pillValue}>{s.value}</div>
                  <div className={styles.pillLabel}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.leftFooter}>
            National Health Mission · West Bengal
          </div>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────── */}
      <div className={styles.rightPanel}>
        <div className={styles.formCard}>

          <div className={styles.formHeader}>
            <h2>{mode === "login" ? "Welcome back" : "Create account"}</h2>
            <p>
              {mode === "login"
                ? "Sign in to your ASHA register"
                : "Register for access to the system"}
            </p>
          </div>

          <div className={styles.tabSwitcher}>
            <button
              type="button"
              className={`${styles.tabBtn} ${mode === "login" ? styles.tabActive : ""}`}
              onClick={() => setMode("login")}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${mode === "signup" ? styles.tabActive : ""}`}
              onClick={() => setMode("signup")}
            >
              Register
            </button>
            <div className={`${styles.tabSlider} ${mode === "signup" ? styles.tabSliderRight : ""}`} />
          </div>

          <button
            type="button"
            className={styles.googleBtn}
            onClick={handleGoogle}
            disabled={googleLoading || isSubmitting}
          >
            {googleLoading ? <span className={styles.spinner} /> : <GoogleIcon />}
            <span>Continue with Google</span>
          </button>

          <div className={styles.divider}><span>or continue with email</span></div>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>

            {mode === "signup" && (
              <div className={`${styles.field} ${styles.fieldReveal}`}>
                <label htmlFor="lp-name">Full Name</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}>👤</span>
                  <input
                    id="lp-name"
                    type="text"
                    placeholder="e.g. Jaba Rani Barman"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="lp-email">Email Address</label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}>✉</span>
                <input
                  id="lp-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label htmlFor="lp-password">Password</label>
                {mode === "login" && (
                  <button type="button" className={styles.forgotLink}>
                    Forgot password?
                  </button>
                )}
              </div>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}>🔒</span>
                <input
                  id="lp-password"
                  type={showPass ? "text" : "password"}
                  placeholder={
                    mode === "signup" ? "At least 6 characters" : "Enter your password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  className={styles.showPassBtn}
                  onClick={() => setShowPass((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {displayError && (
              <div className={styles.errorBox} role="alert">
                <span aria-hidden="true">⚠</span> {displayError}
              </div>
            )}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting || googleLoading}
            >
              {isSubmitting ? (
                <>
                  <span className={styles.spinner} />
                  {mode === "login" ? "Signing in…" : "Creating account…"}
                </>
              ) : (
                mode === "login" ? "Sign In →" : "Create Account →"
              )}
            </button>
          </form>

          <div className={styles.formFooter}>
            {mode === "login" ? (
              <span>
                New to ASHA Survey?{" "}
                <button type="button" className={styles.switchLink} onClick={() => setMode("signup")}>
                  Create an account
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{" "}
                <button type="button" className={styles.switchLink} onClick={() => setMode("login")}>
                  Sign in
                </button>
              </span>
            )}
          </div>

          <div className={styles.demoHint}>
            {isFirebaseMode
              ? "🔥 Firebase connected — use your real account"
              : "🔧 Demo mode — enter any email & password to continue"}
          </div>

        </div>
      </div>
    </div>
  );
}