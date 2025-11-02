import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { message } from "antd";
import "./StaffPaymentSuccess.css";

export default function StaffPaymentSuccess() {
  const navigate = useNavigate();
  const { search } = useLocation();
  
  const params = new URLSearchParams(search);
  
  // ✅ Lấy các thông tin từ VNPay
  const sessionId = params.get("sessionId") || params.get("id");
  const vnpResponseCode = params.get("vnp_ResponseCode");
  const vnpTxnRef = params.get("vnp_TxnRef");
  const vnpAmount = params.get("vnp_Amount"); // VNPay trả về số tiền x100
  const success = params.get("success") === "true" || vnpResponseCode === "00";

  useEffect(() => {
    console.log("🔍 Staff Payment Success Page");
    console.log("🔍 Session ID:", sessionId);
    console.log("🔍 VNPay Response Code:", vnpResponseCode);
    console.log("🔍 Transaction Ref:", vnpTxnRef);
    console.log("🔍 Success:", success);
    console.log("🔍 All Params:", Object.fromEntries(params));

    // Hiển thị thông báo
    if (success) {
      message.success("Thanh toán thành công!");
    } else {
      message.error(`Thanh toán thất bại! Mã lỗi: ${vnpResponseCode || "Unknown"}`);
    }
  }, [success, sessionId, vnpResponseCode, vnpTxnRef, params]);

  return (
    <div className="staff-success-page">
      <div className="staff-success-box">
        {success ? (
          <CheckCircleOutlined style={{ fontSize: "64px", color: "#52c41a" }} />
        ) : (
          <CloseCircleOutlined style={{ fontSize: "64px", color: "#ff4d4f" }} />
        )}
        
        <h2>
          {success ? "Thanh toán thành công 🎉" : "Thanh toán thất bại ❌"}
        </h2>
        
        <p>
          {sessionId && (
            <>
              Phiên sạc khách vãng lai <b>#{sessionId}</b>
              {success ? " đã được thanh toán." : " chưa được thanh toán."}
            </>
          )}
        </p>

        {vnpTxnRef && (
          <p style={{ fontSize: "14px", color: "#666" }}>
            Mã giao dịch: <b>{vnpTxnRef}</b>
          </p>
        )}

        {vnpAmount && (
          <p style={{ fontSize: "14px", color: "#666" }}>
            Số tiền: <b>{(Number(vnpAmount) / 100).toLocaleString("vi-VN")} ₫</b>
          </p>
        )}

        {/* Debug info trong development */}
        {process.env.NODE_ENV === 'development' && (
          <details style={{ marginTop: '20px', fontSize: '12px' }}>
            <summary style={{ cursor: 'pointer', color: '#1890ff' }}>
              🔍 Debug Info (click to expand)
            </summary>
            <pre style={{ 
              textAlign: 'left', 
              background: '#f5f5f5', 
              padding: '10px', 
              borderRadius: '4px',
              maxWidth: '500px',
              overflow: 'auto'
            }}>
              {JSON.stringify(Object.fromEntries(params), null, 2)}
            </pre>
          </details>
        )}

        <button
          className="primary-btn"
          onClick={() => navigate("/staff")}
          style={{ marginTop: '20px' }}
        >
          Quay lại trang quản lý
        </button>
      </div>
    </div>
  );
}