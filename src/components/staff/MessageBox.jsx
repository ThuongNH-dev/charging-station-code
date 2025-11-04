import React from "react";
import "./MessageBox.css";

export default function MessageBox({ type = "info", message, onClose, visible = true }) {
  if (!visible || !message) return null;

  const config = {
    error: {
      className: "message-box message-box--error",
      icon: "⚠",
      bgGradient: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
      borderColor: "#ef4444",
      leftBorder: "#dc2626",
      textColor: "#991b1b",
      iconBg: "#dc2626",
    },
    success: {
      className: "message-box message-box--success",
      icon: "✓",
      bgGradient: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
      borderColor: "#86efac",
      leftBorder: "#16a34a",
      textColor: "#166534",
      iconBg: "#16a34a",
    },
    warning: {
      className: "message-box message-box--warning",
      icon: "⚠",
      bgGradient: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
      borderColor: "#fde047",
      leftBorder: "#eab308",
      textColor: "#854d0e",
      iconBg: "#eab308",
    },
    info: {
      className: "message-box message-box--info",
      icon: "ℹ",
      bgGradient: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
      borderColor: "#93c5fd",
      leftBorder: "#3b82f6",
      textColor: "#1e40af",
      iconBg: "#3b82f6",
    },
  };

  const style = config[type] || config.info;

  return (
    <div className={style.className}>
      <div className="message-box-icon" style={{ background: style.iconBg }}>
        {style.icon}
      </div>
      <div className="message-box-content">{message}</div>
      {onClose && (
        <button
          className="message-box-close"
          onClick={onClose}
          aria-label="Đóng thông báo"
          title="Đóng"
          style={{ color: style.textColor }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

