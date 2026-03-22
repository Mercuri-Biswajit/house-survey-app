import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

/**
 * ProtectedRoute
 * Wraps any route that requires authentication.
 * Shows a loading screen while auth state is resolving,
 * then redirects to /login if no user is found.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f0f4f0",
        gap: 16,
        fontFamily: "Sora, sans-serif",
      }}>
        <div style={{
          width: 48,
          height: 48,
          border: "3px solid #d1e8d9",
          borderTopColor: "#16a34a",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#7a938a" }}>
          Loading ASHA Survey…
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}