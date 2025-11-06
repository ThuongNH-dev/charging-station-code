import React from "react";
import "./ConfirmDialog.css";

export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  type = "warning",
}) {
  if (!open) return null;

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog-header">
          <div className={`confirm-dialog-icon confirm-dialog-icon--${type}`}>
            {type === "warning" ? "⚠" : type === "danger" ? "⚠" : "ℹ"}
          </div>
          <h3 className="confirm-dialog-title">{title}</h3>
        </div>
        <div className="confirm-dialog-body">
          <p>{message}</p>
        </div>
        <div className="confirm-dialog-actions">
          <button className="confirm-dialog-btn confirm-dialog-btn--cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={`confirm-dialog-btn confirm-dialog-btn--${type}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

