import styles from "./Badge.module.css";

/**
 * Badge – Reusable inline badge/pill component.
 *
 * Props:
 *   children  – badge content
 *   variant   – color variant classname (e.g. "pink", "blue", "teal", "purple", "red", "green")
 *   onClick   – optional click handler
 *   style     – optional inline styles
 */
export default function Badge({ children, variant = "", onClick, style }) {
  const className = styles[`badge-${variant}`] || "";
  return (
    <span
      className={className}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : undefined, ...style }}
    >
      {children}
    </span>
  );
}
