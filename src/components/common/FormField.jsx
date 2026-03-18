/**
 * FormField – Reusable form field with label and input.
 *
 * Props:
 *   label     – label text
 *   value     – current input value
 *   onChange  – (newValue) => void
 *   type      – input type (default: "text")
 *   readOnly  – boolean (default: false)
 *   className – optional wrapper className (default: "form-field")
 */
export default function FormField({
  label,
  value,
  onChange,
  type = "text",
  readOnly = false,
  className = "form-field",
}) {
  return (
    <div className={className}>
      {label && <label>{label}</label>}
      <input
        type={type}
        value={value ?? ""}
        readOnly={readOnly}
        onChange={(e) => onChange && onChange(e.target.value)}
      />
    </div>
  );
}
