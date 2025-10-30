// src/pages/invoice/Invoice.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams, Link } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import "./Invoice.css";

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
    // 1) location.state
    if (state) {
      if (state.data && (state.data.energyKwh || state.data.total || state.data.endedAt)) {
        return state.data;
      }
      if (state.energyKwh || state.total || state.endedAt) {
        return state;
      }
      if (state.data?.data && (state.data.data.energyKwh || state.data.data.total)) {
        return state.data.data;
      }
    }

    // 2) sessionStorage
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

        if (obj?.data && (obj.data.energyKwh || obj.data.total || obj.data.endedAt)) {
          return obj.data;
        }
        if (obj?.energyKwh || obj?.total || obj?.endedAt) {
          return obj;
        }
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
        "Không tìm thấy dữ liệu hóa đơn của phiên sạc. Hãy kết thúc phiên sạc và điều hướng lại, " +
          "hoặc đảm bảo đã lưu payload BE vào sessionStorage trước khi mở trang này."
      );
    } else {
      setError("");
    }
  }, [endData]);

  // ==== Giá trị hiển thị (fallback an toàn) ====
  const customerId = endData?.customerId ?? "—";
  const companyId = endData?.companyId ?? "—";
  const vehicleId = endData?.vehicleId ?? "—";
  const portId = endData?.portId ?? "—";

  const startSoc = endData?.startSoc ?? endData?.socStart ?? null;
  const endSoc = endData?.endSoc ?? endData?.socEnd ?? null;

  const energyKwh = endData?.energyKwh ?? endData?.energyKWh ?? 0;
  const durationMin = endData?.durationMin ?? endData?.duration ?? 0; // đang ẩn UI
  const idleMin = endData?.idleMin ?? endData?.idleMinutes ?? 0;

  const subtotal = endData?.subtotal ?? 0;
  const tax = endData?.tax ?? 0;
  const total = endData?.total ?? 0;

  const endedAt = endData?.endedAt ? new Date(endData.endedAt) : null;
  const status = endData?.status ?? "Unpaid";
  const billingMonth = endData?.billingMonth ?? (endedAt ? endedAt.getMonth() + 1 : "—");
  const billingYear = endData?.billingYear ?? (endedAt ? endedAt.getFullYear() : "—");

  // Gói đăng ký áp dụng (appliedSubscription)
  const sub = endData?.appliedSubscription ?? null;
  const subPlanName = sub?.planName ?? "—";
  const subDiscountPercent = sub?.discountPercent ?? 0;
  const subFreeIdleMinutes = sub?.freeIdleMinutes ?? 0;

  // CSS trạng thái phiên sạc
  const statusClass = (() => {
    if (status === "Completed") return "status status--completed";
    if (status === "Unpaid") return "status status--unpaid";
    return "status status--paid";
  })();

  // Render chính
  let renderContent;
  if (loading) {
    renderContent = <div className="loading">Đang tải…</div>;
  } else if (error) {
    renderContent = <div className="alert">{error}</div>;
  } else {
    renderContent = (
      <>
        {/* Chi tiết phiên sạc (đã gộp gói đăng ký và đặt trước phần tính tiền) */}
        <div className="invoice-card invoice-card--p24 invoice-card--dashed" style={{ marginTop: 16 }}>
          <h3 className="h3" style={{ marginBottom: 12 }}>Chi tiết phiên sạc</h3>

          {/* Thông tin chung */}
          <div className="details">
            <div className="grid-2">
              <div>
                <p className="k">Trạng thái</p>
                <span className={statusClass}>{status}</span>
              </div>
              <div>
                <p className="k">Thời gian kết thúc</p>
                <h4 className="h4">{endedAt ? endedAt.toLocaleString("vi-VN") : "—"}</h4>
              </div>
              <div>
                <p className="k">Kỳ thanh toán</p>
                <h4 className="h4">{billingMonth}/{billingYear}</h4>
              </div>
            </div>
          </div>

          {/* Bảng thông tin */}
          <div className="grid-kv">
            {/* <div className="k">Khách hàng</div>
            <div className="v">#{customerId}</div>

            <div className="k">Công ty</div>
            <div className="v">{companyId ?? "—"}</div>

            <div className="k">Xe</div>
            <div className="v">#{vehicleId}</div>

            <div className="k">Cổng sạc</div>
            <div className="v">#{portId}</div> */}

            <div className="hr-thin"></div>
            <div className="hr-thin"></div>

            {/* SoC dạng "33% → 100%" */}
            <div className="k">SoC</div>
            <div className="v">
              {startSoc == null || endSoc == null ? "—" : `${startSoc}% \u2192 ${endSoc}%`}
            </div>

            <div className="k">Năng lượng tiêu thụ</div>
            <div className="v">{energyKwh} kWh</div>

            {/* <div className="k">Thời lượng sạc</div>
            <div className="v">{durationMin} phút</div> */}

            <div className="k">Phút chiếm trụ</div>
            <div className="v">{idleMin} phút</div>

            {/* === Gói đăng ký áp dụng (đặt trước phần tính tiền) === */}
            <div className="hr-thin"></div>
            <div className="hr-thin"></div>

            <div className="k">Gói đăng ký áp dụng</div>
            <div className="v">{subPlanName}</div>

            <div className="k">Giảm giá</div>
            <div className="v">{subDiscountPercent}%</div>

            <div className="k">Miễn phí phút chiếm trụ</div>
            <div className="v">{subFreeIdleMinutes} phút</div>

            {/* === Tính tiền === */}
            <div className="hr-thin"></div>
            <div className="hr-thin"></div>

            <div className="k">Tạm tính</div>
            <div className="v">{vnd(subtotal)}</div>

            <div className="k">Thuế (VAT)</div>
            <div className="v">{vnd(tax)}</div>

            <div className="v">Tổng cộng</div>
            <div className="v total">{vnd(total)}</div>
          </div>
        </div>

        {/* Hành động */}
        <div
          style={{
            marginTop: 16,
            display: "flex",
            flexDirection: "row",
            gap: 16,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div className="invoice-actions">
            <Link to="/stations" className="invoice-link">Về danh sách trạm</Link>
          </div>
          <button className="btn btn--primary" onClick={() => navigate("/invoiceSummary")}>
            Xem tất cả hoá đơn
          </button>
        </div>
      </>
    );
  }

  return (
    <MainLayout>
      <div className="invoice-root">
        <div className="invoice-topbar">
          <h2 className="h2">Hóa đơn phiên sạc</h2>
        </div>

        {renderContent}
      </div>
    </MainLayout>
  );
}
