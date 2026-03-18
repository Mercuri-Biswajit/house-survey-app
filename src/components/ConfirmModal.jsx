import Modal from "./Modal";

export default function ConfirmModal({
  title,
  message,
  onConfirm,
  onClose,
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = true,
}) {
  return (
    <Modal title={title || "Confirm Action"} onClose={onClose}>
      <div className="confirm-modal-content">
        <p style={{ marginBottom: "20px", color: "#374151", fontSize: "14px" }}>
          {message}
        </p>
        <div
          className="modal-actions"
          style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}
        >
          <button
            className="btn-cancel"
            onClick={onClose}
            style={{ padding: "8px 16px", borderRadius: "6px" }}
          >
            {cancelText}
          </button>
          <button
            className={danger ? "btn-del" : "btn-save"}
            onClick={onConfirm}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              backgroundColor: danger ? "#ef4444" : "#f59e0b",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
