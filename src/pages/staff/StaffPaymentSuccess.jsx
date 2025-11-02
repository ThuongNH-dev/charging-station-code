import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircleOutlined } from "@ant-design/icons";
import "./StaffPaymentSuccess.css";

export default function StaffPaymentSuccess() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const sessionId = params.get("sessionId") || params.get("id");

  return (
    <div className="staff-success-page">
      <div className="staff-success-box">
        <CheckCircleOutlined style={{ fontSize: "64px", color: "#52c41a" }} />
        <h2>Thanh toán thành công 🎉</h2>
        <p>
          Phiên sạc khách vãng lai{" "}
          {sessionId ? <b>#{sessionId}</b> : ""} đã được thanh toán.
        </p>
        <button
          className="primary-btn"
          onClick={() => navigate("/staff/payments")}
        >
          Quay lại trang thanh toán
        </button>
      </div>
    </div>
  );
}
