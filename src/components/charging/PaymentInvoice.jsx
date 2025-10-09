import React, { useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import "./PaymentInvoice.css";

const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";

export default function PaymentInvoice() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [search] = useSearchParams();

  const data = useMemo(() => {
    if (state) return state;
    const order = search.get("order");
    if (!order) return null;
    const cached = sessionStorage.getItem(`pay:${order}`);
    return cached ? JSON.parse(cached) : null;
  }, [state, search]);

  if (!data) {
    return (
      <div className="invoice-empty">
        <h2>Không tìm thấy dữ liệu hóa đơn</h2>
        <button onClick={() => navigate("/stations")}>Về trang trạm</button>
      </div>
    );
  }

  const {
    station,
    charger,
    orderId,
    energyCost,
    idlePenalty,
    totalPayable,
    startedAt,
    endedAt,
    energyUsedKWh,
    pricePerKWh,
    sessionSeconds,
  } = data;

  const tax = Math.round(totalPayable * 0.1);
  const totalWithTax = totalPayable + tax;

  const fmtDuration = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h}h${m.toString().padStart(2, "0")}p${s}s`;
  };

  return (
    <div className="invoice-container">
      <div className="invoice-card">
        {/* Bên trái: trạng thái */}
        <div className="invoice-left">
          <img
            src="https://cdn-icons-png.flaticon.com/512/845/845646.png"
            alt="success"
            className="invoice-icon"
          />
          <h2 className="invoice-success">Thanh toán thành công</h2>
          <p className="invoice-date">
            {new Date().toLocaleTimeString()} {new Date().toLocaleDateString()}
          </p>
          <p>Hóa đơn đã được gửi về email của bạn</p>
          <button className="invoice-home-btn" onClick={() => navigate("/stations")}>
            Quay về trang chủ
          </button>
        </div>

        {/* Bên phải: chi tiết hóa đơn */}
        <div className="invoice-right">
          <h3>Hóa đơn thanh toán</h3>

          <h4>1. Thông tin phiên sạc</h4>
          <p><b>{station?.name}</b> — {charger?.title}</p>
          <p>Công suất: {charger?.power}</p>
          <p>Loại cổng sạc: {charger?.type || "—"}</p>
          <p>Thời gian sạc: {fmtDuration(sessionSeconds)}</p>
          <p>Năng lượng: {energyUsedKWh} kWh</p>

          <h4 className="invoice-section">2. Chi phí</h4>
          <table className="invoice-table">
            <tbody>
              <tr><td>Phí sạc</td><td>{vnd(energyCost)}</td></tr>
              <tr><td>Phí phạt</td><td>{vnd(idlePenalty)}</td></tr>
              <tr><td>Phí đặt chỗ</td><td>-40,000 đ</td></tr>
              <tr><td>Tạm tính</td><td>{vnd(totalPayable - 40000)}</td></tr>
              <tr><td>Tiền thuế (10%)</td><td>{vnd(tax)}</td></tr>
              <tr><td>Giảm giá</td><td>0 đ</td></tr>
              <tr className="invoice-total">
                <td>Tổng</td><td>{vnd(totalWithTax)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
