// src/pages/invoice/Invoice.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams, Link } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import { fetchAuthJSON, getApiBase } from "../../utils/api";
// import "./style/Invoice.css"; // (tuỳ bạn thêm css)

const API_BASE = getApiBase();
const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " VND";

export default function InvoicePage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const orderId = state?.orderId || sp.get("order") || "";
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [invoice, setInvoice] = useState(null);

  // Lấy payload draft (từ state hoặc sessionStorage)
  const draft = useMemo(() => {
    if (state?.orderId) return state;
    if (orderId) {
      try {
        const raw = sessionStorage.getItem(`chargepay:${orderId}`);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }
    return null;
  }, [orderId, state]);

  // Tính tiền (nếu BE không tự tính)
  const computed = useMemo(() => {
    if (!draft) return null;
    const subtotal = Number(draft.energyCost || 0) + Number(draft.idlePenalty || 0);
    const subscriptionAdjustment = 0; // mặc định không giảm
    const taxRate = 0.10;             // VAT 10% (chỉnh nếu khác)
    const tax = Math.round((subtotal - subscriptionAdjustment) * taxRate);
    const total = subtotal - subscriptionAdjustment + tax;

    const ended = new Date(draft.endedAt || Date.now());
    const billingMonth = ended.getMonth() + 1; // 1..12
    const billingYear = ended.getFullYear();

    return {
      subtotal,
      subscriptionAdjustment,
      tax,
      total,
      billingMonth,
      billingYear,
    };
  }, [draft]);

  // Thử nhiều endpoint hợp lý
  async function createInvoiceOnBE(payload) {
    const candidates = [
      `${API_BASE}/Invoices`,
      `${API_BASE}/Invoice`
    ];

    let lastErr = null;
    for (const url of candidates) {
      try {
        const res = await fetchAuthJSON(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        // Giả định BE trả về invoice đã tạo
        if (res && (res.invoiceId || res.InvoiceId || res.id)) {
          return res;
        }
        // Nếu BE không trả id, vẫn coi là thành công và trả lại body
        return res;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("Không tạo được invoice trên BE.");
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");

        if (!draft) {
          throw new Error("Thiếu dữ liệu phiên sạc (orderId/state).");
        }
        if (!computed) {
          throw new Error("Không tính được số tiền.");
        }

        // Chuẩn payload theo contract camelCase (phù hợp style các API khác của bạn)
        // Nếu BE yêu cầu khoá PascalCase, bạn có thể map nhanh (InvoiceId, Total, ...)
        const payload = {
          chargingSessionId: draft.chargingSessionId ?? null,
          subtotal: computed.subtotal,
          subscriptionAdjustment: computed.subscriptionAdjustment,
          tax: computed.tax,
          total: computed.total,
          status: "Unpaid",
          billingMonth: computed.billingMonth,
          billingYear: computed.billingYear,
          isMonthlyInvoice: state?.isMonthlyInvoice ?? false,
          subscriptionId: null,
          customerId: draft.customerId ?? null,

          // (Tuỳ chọn) Gửi thêm meta để BE log/debug
          meta: {
            orderId: draft.orderId,
            stationId: draft.stationId,
            chargerId: draft.chargerId,
            portId: draft.portId,
            startedAt: draft.startedAt,
            endedAt: draft.endedAt,
            energyUsedKWh: draft.energyUsedKWh,
            pricePerKWh: draft.pricePerKWh,
            penaltyPerMin: draft.penaltyPerMin,
            graceSeconds: draft.graceSeconds,
          },
        };

        setPosting(true);
        const created = await createInvoiceOnBE(payload);
        if (!alive) return;

        setInvoice(created);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Lỗi tạo hóa đơn.");
      } finally {
        if (!alive) return;
        setPosting(false);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [draft, computed, state]);

  const showId = invoice?.invoiceId ?? invoice?.InvoiceId ?? invoice?.id ?? "—";
  const showStatus = invoice?.status ?? invoice?.Status ?? "Unpaid";
  const showCreatedAt = invoice?.createdAt ?? invoice?.CreatedAt ?? null;

  return (
    <MainLayout>
      <div className="invoice-root" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2>Hóa đơn</h2>
          <div>
            <Link to="/stations">Về danh sách trạm</Link>
          </div>
        </div>

        {loading ? (
          <div className="bp-hint">Đang khởi tạo hóa đơn…</div>
        ) : error ? (
          <div className="error-text">
            {error}
            <div style={{ marginTop: 8 }}>
              <button onClick={() => navigate(-1)}>Quay lại</button>
            </div>
          </div>
        ) : (
          <>
            <div className="invoice-card" style={{ border: "1px solid #eee", borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <p>Mã hoá đơn</p>
                  <h3>{showId}</h3>
                </div>
                <div>
                  <p>Trạng thái</p>
                  <h3 style={{ color: showStatus === "Unpaid" ? "#ff4d4f" : "#4caf50" }}>{showStatus}</h3>
                </div>
                <div>
                  <p>Thời gian tạo</p>
                  <h4>{showCreatedAt ? new Date(showCreatedAt).toLocaleString("vi-VN") : "—"}</h4>
                </div>
                <div>
                  <p>Kỳ thanh toán</p>
                  <h4>
                    {invoice?.billingMonth ?? invoice?.BillingMonth ?? computed?.billingMonth}/
                    {invoice?.billingYear ?? invoice?.BillingYear ?? computed?.billingYear}
                  </h4>
                </div>
              </div>
            </div>

            <div className="invoice-summary" style={{ border: "1px dashed #ddd", borderRadius: 12, padding: 16 }}>
              <h3 style={{ marginBottom: 12 }}>Chi tiết tiền sạc</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", rowGap: 8 }}>
                <div>Tạm tính (năng lượng + phí chiếm trụ)</div>
                <div><b>{vnd((invoice?.subtotal ?? invoice?.Subtotal) ?? computed.subtotal)}</b></div>

                <div>Giảm trừ gói (Subscription)</div>
                <div><b>- {vnd((invoice?.subscriptionAdjustment ?? invoice?.SubscriptionAdjustment) ?? computed.subscriptionAdjustment)}</b></div>

                <div>Thuế (VAT)</div>
                <div><b>{vnd((invoice?.tax ?? invoice?.Tax) ?? computed.tax)}</b></div>

                <div style={{ borderTop: "1px solid #eee", marginTop: 8 }} />
                <div style={{ borderTop: "1px solid #eee", marginTop: 8 }} />

                <div><b>Tổng cộng</b></div>
                <div><b style={{ fontSize: 18 }}>{vnd((invoice?.total ?? invoice?.Total) ?? computed.total)}</b></div>
              </div>
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => navigate("/payments")}>Thanh toán ngay</button>
              <button onClick={() => navigate("/history")}>Xem lịch sử</button>
              {posting && <span>Đang gửi…</span>}
            </div>

            {draft && (
              <div style={{ marginTop: 24, opacity: 0.8 }}>
                <h4>Thông tin phiên sạc</h4>
                <div style={{ fontSize: 13 }}>
                  Trạm: {draft.station?.name ?? draft.stationId ?? "—"} •
                  Trụ: {draft.charger?.title ?? draft.chargerId ?? "—"} •
                  Cổng: {draft.gun?.code ?? draft.portId ?? "—"} •
                  Điện năng: {draft.energyUsedKWh} kWh •
                  Giá/kWh: {vnd(draft.pricePerKWh)} •
                  Phí chiếm trụ: {vnd(draft.idlePenalty)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
