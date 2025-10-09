// src/pages/payment/PaymentFailure.jsx
import React from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";

const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";

export default function PaymentFailure() {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Thanh toán thất bại</h2>
        <p>Không có thông tin giao dịch. Hãy thử đặt lại.</p>
        <Link to="/stations">Về danh sách trạm</Link>
      </div>
    );
  }

  const {
    station, charger, gun, startTime, baseline,
    totalMinutes, bookingFee, error
  } = state;

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h2>❌ Thanh toán thất bại</h2>
      <p style={{ color: "#dc2626" }}>{error || "Đã xảy ra lỗi không xác định."}</p>

      <div style={{ marginTop: 12, lineHeight: 1.7 }}>
        <p><b>Trạm:</b> {station?.name} — {station?.address}</p>
        <p><b>Trụ:</b> {charger?.connector} • {charger?.power}</p>
        <p><b>Súng:</b> {gun?.name}</p>
        <p><b>Giờ bắt đầu:</b> {startTime} (tính phí từ {baseline})</p>
        <p><b>Tổng thời gian:</b> {totalMinutes} phút</p>
        <p><b>Tổng tiền dự kiến:</b> {vnd(bookingFee)}</p>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        <button onClick={() => navigate(-1)} style={{ padding: "10px 16px" }}>
          Thử lại thanh toán
        </button>
        <button onClick={() => navigate("/stations")} style={{ padding: "10px 16px" }}>
          Về danh sách trạm
        </button>
        {station?.id && (
          <button onClick={() => navigate(`/stations/${station.id}`)} style={{ padding: "10px 16px" }}>
            Xem trạm
          </button>
        )}
      </div>
    </div>
  );
}
