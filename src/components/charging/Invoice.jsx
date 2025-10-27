// src/pages/invoice/Invoice.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams, Link } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";

const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " VND";

export default function InvoicePage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const orderId = state?.orderId || sp.get("order") || "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==== Lấy data BE trả về từ nhiều nguồn một cách "chịu đựng" ====
  const endData = useMemo(() => {
    // 1) location.state: có thể là { message, data }, hoặc { data: {...} }, hoặc để thẳng {...}
    if (state) {
      if (state.data && (state.data.energyKwh || state.data.total || state.data.endedAt)) {
        return state.data;
      }
      if (state.energyKwh || state.total || state.endedAt) {
        return state;
      }
      // đôi khi wrap 2 lớp { message, data: { ... } }
      if (state.data?.data && (state.data.data.energyKwh || state.data.data.total)) {
        return state.data.data;
      }
    }

    // 2) sessionStorage: thử một số key có thể đã lưu ở trang ChargingProgress
    const candidateKeys = [];
    if (orderId) {
      candidateKeys.push(`charge:end:${orderId}`);
      candidateKeys.push(`chargepay:${orderId}`);
    }
    candidateKeys.push("charge:end:last");
    candidateKeys.push("charge:last");

    for (const k of candidateKeys) {
      try {
        const raw = sessionStorage.getItem(k);
        if (!raw) continue;
        const obj = JSON.parse(raw);

        // các khả năng shape:
        // a) { message, data: {...} }
        if (obj?.data && (obj.data.energyKwh || obj.data.total || obj.data.endedAt)) {
          return obj.data;
        }
        // b) { ...fields }
        if (obj?.energyKwh || obj?.total || obj?.endedAt) {
          return obj;
        }
        // c) { data: { data: {...} } }
        if (obj?.data?.data && (obj.data.data.energyKwh || obj.data.data.total)) {
          return obj.data.data;
        }
      } catch (_) {}
    }
    return null;
  }, [state, orderId]);

  useEffect(() => {
    setLoading(false);
    if (!endData) {
      setError(
        "Không tìm thấy dữ liệu hóa đơn của phiên sạc. Hãy kết thúc phiên sạc và điều hướng lại, "
        + "hoặc đảm bảo đã lưu payload BE vào sessionStorage trước khi mở trang này."
      );
    } else {
      setError("");
    }
  }, [endData]);

  // ==== Giá trị hiển thị (fallback an toàn) ====
  const energyKwh     = endData?.energyKwh ?? endData?.energyKWh ?? 0;
  const durationMin   = endData?.durationMin ?? endData?.duration ?? 0;
  const idleMin       = endData?.idleMin ?? endData?.idleMinutes ?? 0;

  const subtotal      = endData?.subtotal ?? 0;
  const tax           = endData?.tax ?? 0;
  const total         = endData?.total ?? 0;

  const endedAt       = endData?.endedAt ? new Date(endData.endedAt) : null;
  const status        = endData?.status ?? "Unpaid";
  const billingMonth  = endData?.billingMonth ?? (endedAt ? endedAt.getMonth() + 1 : "—");
  const billingYear   = endData?.billingYear ?? (endedAt ? endedAt.getFullYear() : "—");

  return (
    <MainLayout>
      <div className="invoice-root" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2>Hóa đơn phiên sạc</h2>
          <div style={{ display: "flex", gap: 12 }}>
            <Link to="/stations">Về danh sách trạm</Link>
            <button onClick={() => navigate(-1)}>Quay lại</button>
          </div>
        </div>

        {loading ? (
          <div>Đang tải…</div>
        ) : error ? (
          <div style={{ color: "#d4380d", background: "#fff2e8", padding: 12, borderRadius: 8 }}>
            {error}
          </div>
        ) : (
          <>
            {/* Thông tin chung */}
            <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <p>Trạng thái</p>
                  <h3 style={{ color: status === "Completed" ? "#4caf50" : status === "Unpaid" ? "#ff4d4f" : "#1677ff" }}>
                    {status}
                  </h3>
                </div>
                <div>
                  <p>Thời gian kết thúc</p>
                  <h4>{endedAt ? endedAt.toLocaleString("vi-VN") : "—"}</h4>
                </div>
                <div>
                  <p>Kỳ thanh toán</p>
                  <h4>{billingMonth}/{billingYear}</h4>
                </div>
              </div>
            </div>

            {/* Chi tiết tiền */}
            <div style={{ border: "1px dashed #ddd", borderRadius: 12, padding: 16 }}>
              <h3 style={{ marginBottom: 12 }}>Chi tiết thanh toán</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", rowGap: 8 }}>
                <div>Năng lượng tiêu thụ</div>
                <div><b>{energyKwh} kWh</b></div>

                <div>Thời lượng sạc</div>
                <div><b>{durationMin} phút</b></div>

                <div>Phút chiếm trụ</div>
                <div><b>{idleMin} phút</b></div>

                <div style={{ borderTop: "1px solid #eee", marginTop: 8 }} />
                <div style={{ borderTop: "1px solid #eee", marginTop: 8 }} />

                <div>Tạm tính</div>
                <div><b>{vnd(subtotal)}</b></div>

                <div>Thuế (VAT)</div>
                <div><b>{vnd(tax)}</b></div>

                <div style={{ borderTop: "1px solid #eee", marginTop: 8 }} />
                <div style={{ borderTop: "1px solid #eee", marginTop: 8 }} />

                <div><b>Tổng cộng</b></div>
                <div><b style={{ fontSize: 18 }}>{vnd(total)}</b></div>
              </div>
            </div>

            {/* Hành động */}
            <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => navigate("/payments")}>Thanh toán ngay</button>
              <button onClick={() => navigate("/history")}>Xem lịch sử</button>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
