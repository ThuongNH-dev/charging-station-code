// src/pages/payment/PaymentInvoice.jsx
import React, { useMemo } from "react";
import { useNavigate, useLocation, useSearchParams, Link } from "react-router-dom";
import "./PaymentInvoice.css";
import MainLayout from "../../layouts/MainLayout";

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
      <MainLayout>
        <div className="inv-empty">
          <h2>Không tìm thấy dữ liệu hóa đơn</h2>
          <button onClick={() => navigate("/stations")} className="inv-btn">Về danh sách trạm</button>
        </div>
      </MainLayout>
    );
  }

  const {
    station, charger, orderId,
    energyCost, idlePenalty, totalPayable,
    startedAt, endedAt, energyUsedKWh, pricePerKWh, sessionSeconds,
  } = data;

  const tax = Math.round(totalPayable * 0.1);
  const totalWithTax = totalPayable + tax;

  const fmtDuration = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h}h${m.toString().padStart(2, "0")}p${s}s`;
  };

  const copyOrder = async () => {
    try {
      await navigator.clipboard.writeText(orderId || "");
      alert("Đã sao chép mã đơn");
    } catch {}
  };

  const printPDF = () => window.print();

  return (
    <MainLayout>
      <div className="inv-page">
        <div className="inv-card">
          {/* Cột trái */}
          <aside className="inv-left">
            <div className="inv-badge-wrap">
              <div className="inv-badge">
                <svg viewBox="0 0 128 128" aria-hidden="true">
                  <rect x="24" y="16" width="80" height="96" rx="16" fill="currentColor" />
                  <path d="M46 64l14 14 26-26" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="inv-pill">ĐÃ THANH TOÁN</span>
            </div>

            <h2 className="inv-title">Thanh toán thành công</h2>
            <p className="inv-time">
              {new Date().toLocaleTimeString()} • {new Date().toLocaleDateString()}
            </p>
            <p className="inv-note">Hóa đơn đã được gửi về email của bạn.</p>

            <div className="inv-actions">
              <button className="inv-btn" onClick={() => navigate("/stations")}>Quay về trang chủ</button>
              <button className="inv-btn ghost" onClick={printPDF}>In / Tải PDF</button>
            </div>
          </aside>

          {/* Cột phải */}
          <section className="inv-right">
            <div className="inv-right-head">
              <h3>Hóa đơn thanh toán</h3>

              <div className="inv-total-chip num">
                <span>Tổng thanh toán</span>
                <strong>{vnd(totalWithTax)}</strong>
              </div>
            </div>

            <div className="inv-meta">
              <div>
                <span className="inv-label">Mã đơn:</span>
                <b className="num">{orderId || "—"}</b>
                {orderId && <button className="inv-mini" onClick={copyOrder}>Sao chép</button>}
              </div>
              <div><span className="inv-label">Bắt đầu:</span> {startedAt ? new Date(startedAt).toLocaleString() : "—"}</div>
              <div><span className="inv-label">Kết thúc:</span> {endedAt ? new Date(endedAt).toLocaleString() : "—"}</div>
            </div>

            <div className="inv-divider" />

            <h4>1) Thông tin phiên sạc</h4>
            <ul className="inv-list">
              <li><b>{station?.name}</b> — {charger?.title}</li>
              <li>Công suất: {charger?.power}</li>
              <li>Loại cổng: {charger?.type || "—"}</li>
              <li>Thời gian sạc: {fmtDuration(sessionSeconds)}</li>
              <li>Năng lượng: <span className="num">{energyUsedKWh}</span> kWh @ <span className="num">{vnd(pricePerKWh)}</span>/kWh</li>
            </ul>

            <h4>2) Chi phí</h4>
            <table className="inv-table num">
              <tbody>
                <tr><td>Phí sạc</td><td>{vnd(energyCost)}</td></tr>
                <tr><td>Phí phạt</td><td>{vnd(idlePenalty)}</td></tr>
                <tr><td>Phí đặt chỗ</td><td>-40,000 đ</td></tr>
                <tr className="inv-subtotal"><td>Tạm tính</td><td>{vnd(totalPayable - 40000)}</td></tr>
                <tr><td>Thuế (10%)</td><td>{vnd(tax)}</td></tr>
                <tr><td>Giảm giá</td><td>0 đ</td></tr>
                <tr className="inv-total-row"><td>Tổng thanh toán</td><td>{vnd(totalWithTax)}</td></tr>
              </tbody>
            </table>

            <div className="inv-footer">
              <Link to="/stations" className="inv-link">← Tiếp tục tìm trạm khác</Link>
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
