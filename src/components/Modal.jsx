import { useEffect } from "react";

export default function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`modal ${wide ? "modal-wide" : ""}`}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
