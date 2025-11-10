// src/pages/payment/PaymentFailure.jsx
import React, { useMemo } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import "./style/PaymentFailure.css";

const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";

export default function PaymentFailure() {
  const location = useLocation();
  const { state } = location;
  const navigate = useNavigate();

  // ✅ Hỗ trợ cả redirect từ BE theo dạng ?success=false&reason=payment_failed
  const search = new URLSearchParams(location.search);
  const qsSuccess = search.get("success");
  const qsReason = search.get("reason");

  const reasonText = useMemo(() => {
    const r = (state?.error || qsReason || "").toLowerCase();
    if (!r) return "Đã xảy ra lỗi không xác định.";
    if (r.includes("cancel")) return "Bạn đã hủy giao dịch.";
    if (r.includes("timeout")) return "Quá thời gian thanh toán.";
    if (r.includes("insufficient")) return "Số dư không đủ hoặc bị từ chối.";
    if (r.includes("payment_failed")) return "Thanh toán thất bại từ cổng thanh toán.";
    return state?.error || qsReason || "Đã xảy ra lỗi không xác định.";
  }, [state?.error, qsReason]);

  // Nếu không có state từ FE thì vẫn render dựa vào query BE
  const noData = !state && !qsSuccess && !qsReason;

  const {
    station, charger, gun, startTime, baseline,
    totalMinutes, bookingFee
  } = state || {};

  return (
    <div className="pf-wrap">
      <div className="pf-bg" aria-hidden />
      <div className="pf-card pf-animate-in">
        <div className="pf-status">
          <div className="pf-icon">
            {/* Icon X */}
            <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden>
              <path d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7A1 1 0 0 0 5.7 7.1L10.6 12l-4.9 4.9a1 1 0 1 0 1.4 1.4L12 13.4l4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4z"/>
            </svg>
          </div>
          <div>
            <h1 className="pf-title">Thanh toán thất bại</h1>
            <p className="pf-subtitle">{reasonText}</p>
            {qsSuccess === "false" && (
              <div className="pf-badge">Mã lý do: <span>{qsReason}</span></div>
            )}
          </div>
        </div>

        {noData ? (
          <div className="pf-empty">
            <p>Không có thông tin giao dịch. Hãy thử đặt lại.</p>
            <Link className="pf-link" to="/stations">Về danh sách trạm</Link>
          </div>
        ) : (
          <>
            <div className="pf-details">
              {station && (
                <div className="pf-row">
                  <span className="pf-label">Trạm</span>
                  <span className="pf-value">{station?.name} — {station?.address}</span>
                </div>
              )}

              {charger && (
                <div className="pf-row">
                  <span className="pf-label">Trụ</span>
                  <span className="pf-value">{charger?.connector} • {charger?.power}</span>
                </div>
              )}

              {gun && (
                <div className="pf-row">
                  <span className="pf-label">Súng</span>
                  <span className="pf-value">{gun?.name}</span>
                </div>
              )}

              {startTime && (
                <div className="pf-row">
                  <span className="pf-label">Giờ bắt đầu</span>
                  <span className="pf-value">{startTime}{baseline ? ` (tính phí từ ${baseline})` : ""}</span>
                </div>
              )}

              {totalMinutes != null && (
                <div className="pf-row">
                  <span className="pf-label">Tổng thời gian</span>
                  <span className="pf-value">{totalMinutes} phút</span>
                </div>
              )}

              {bookingFee != null && (
                <div className="pf-row">
                  <span className="pf-label">Tổng tiền dự kiến</span>
                  <span className="pf-value pf-money">{vnd(bookingFee)}</span>
                </div>
              )}
            </div>

            <div className="pf-actions">
              <button className="pf-btn" onClick={() => navigate("/stations")}>
                Về danh sách trạm
              </button>
              {station?.id && (
                <button
                  className="pf-btn pf-btn-ghost"
                  onClick={() => navigate(`/stations/${station.id}`)}
                >
                  Xem trạm
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
