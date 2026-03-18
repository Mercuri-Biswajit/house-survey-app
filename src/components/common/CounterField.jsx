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
  return (
    <div className={`counter-field ${colorClass}`}>
      <div className="counter-label">{label}</div>
      <div className="counter-controls">
        {!readOnly && (
          <button
            className="counter-btn minus"
            onClick={() => onChange(Math.max(0, val - 1))}
          >
            −
          </button>
        )}
        <span className="counter-val">{val}</span>
        {!readOnly && (
          <button
            className="counter-btn plus"
            onClick={() => onChange(val + 1)}
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}
