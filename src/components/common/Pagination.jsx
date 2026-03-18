/**
 * Pagination – Reusable pagination with prev/next, page numbers, and ellipsis.
 *
 * Props:
 *   page        – current page (1-indexed)
 *   totalPages  – total number of pages
 *   onPageChange – (newPage) => void
 */
export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && p - arr[i - 1] > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="pagination">
      <button disabled={page === 1} onClick={() => onPageChange(page - 1)}>
        ‹ Prev
      </button>
      {pageNumbers.map((p, i) =>
        p === "..." ? (
          <span key={`d${i}`} className="page-dots">
            …
          </span>
        ) : (
          <button
            key={p}
            className={page === p ? "active" : ""}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ),
      )}
      <button
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next ›
      </button>
      <span className="page-info">
        Page {page} of {totalPages}
      </span>
    </div>
  );
}
