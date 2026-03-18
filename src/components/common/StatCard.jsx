/**
 * StatCard – Reusable dashboard stat card with label, value, and type.
 *
 * Props:
 *   label – display label
 *   value – numeric value
 *   type  – card type for className variant (e.g. "pink", "blue", "teal", "red")
 */
export default function StatCard({ label, value, type }) {
  return (
    <div className={`stat-card stat-card-${type}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value-wrap">
        <button className="stat-btn">−</button>
        <div className="stat-value">{(value ?? 0).toLocaleString()}</div>
        <button className="stat-btn">+</button>
      </div>
    </div>
  );
}
