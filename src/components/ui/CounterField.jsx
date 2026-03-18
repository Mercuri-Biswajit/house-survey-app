import styles from "./CounterField.module.css";

/**
 * CounterField – Reusable counter with +/- buttons for numeric form values.
 *
 * Props:
 *   label      – display label
 *   value      – current numeric value
 *   onChange   – (newValue) => void
 *   colorClass – CSS class for the variant (e.g. "counter-pink", "counter-blue")
 *   readOnly   – if true, hides +/- buttons
 */
export default function CounterField({
  label,
  value,
  onChange,
  colorClass = "",
  readOnly = false,
}) {
  const val = Number(value) || 0;
  // Map colorClass to module styles if provided
  const variantClass = styles[colorClass] || "";

  return (
    <div className={`${styles["counter-field"]} ${variantClass}`}>
      <div className={styles["counter-label"]}>{label}</div>
      <div className={styles["counter-controls"]}>
        {!readOnly && (
          <button
            className={`${styles["counter-btn"]} ${styles.minus}`}
            onClick={() => onChange(Math.max(0, val - 1))}
          >
            −
          </button>
        )}
        <span className={styles["counter-val"]}>{val}</span>
        {!readOnly && (
          <button
            className={`${styles["counter-btn"]} ${styles.plus}`}
            onClick={() => onChange(val + 1)}
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}
