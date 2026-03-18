/**
 * SearchToolbar – Reusable toolbar with search input, result count, and optional add button.
 *
 * Props:
 *   search       – current search string
 *   onSearch     – (value) => void
 *   resultCount  – number of filtered results
 *   placeholder  – input placeholder text
 *   addLabel     – optional label for the add button (e.g. "+ Add Household")
 *   onAdd        – optional callback for the add button
 */
export default function SearchToolbar({
  search,
  onSearch,
  resultCount,
  placeholder = "Search…",
  addLabel,
  onAdd,
}) {
  return (
    <div className="toolbar">
      <input
        className="search-input"
        placeholder={placeholder}
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
      <span className="result-count">{resultCount} records</span>
      {addLabel && onAdd && (
        <button className="btn-add" onClick={onAdd}>
          {addLabel}
        </button>
      )}
    </div>
  );
}
