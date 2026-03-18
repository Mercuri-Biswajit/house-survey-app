import Modal from "./Modal";
import styles from "./ConfirmModal.module.css";

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
      <div className={styles.confirmModalContent}>
        <p className={styles.confirmContent}>
          {message}
        </p>
        <div className={styles.modalActions}>
          <button
            className={styles.btnCancel}
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button
            className={`${styles.btnConfirm} ${danger ? styles.danger : styles.warning}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
