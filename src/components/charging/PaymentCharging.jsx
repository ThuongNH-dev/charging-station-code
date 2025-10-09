import React, { useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import PaymentForm from "../paymentCard/PaymentForm";
import { QRCodeCanvas } from "qrcode.react";
import "./PaymentCharging.css"; // ⬅️ THÊM DÒNG NÀY
import MainLayout from "../../layouts/MainLayout";

const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";

export default function PaymentCharging() {
  const { state } = useLocation();
  const [search] = useSearchParams();
  const navigate = useNavigate();

  const data = useMemo(() => {
    if (state) return state;
    const order = search.get("order");
    if (!order) return null;
    const cached = sessionStorage.getItem(`chargepay:${order}`);
    return cached ? JSON.parse(cached) : null;
  }, [state, search]);

  if (!data) {
    return (
      <div className="page-fallback">
        <h2>Không tìm thấy dữ liệu thanh toán phiên sạc</h2>
        <button className="secondary-btn" onClick={() => navigate("/stations")}>
          Về trang trạm
        </button>
      </div>
    );
  }

  const {
    orderId, station, charger, gun,
    pricePerKWh, energyUsedKWh, sessionSeconds,
    energyCost, idlePenalty, totalPayable,
    startedAt, endedAt, finalBattery, initialBattery,
  } = data;

  const [selectedPayment, setSelectedPayment] = React.useState("");
  const [formData, setFormData] = React.useState({ cardNumber: "", cardHolder: "", expiryDate: "", cvv: "" });

  const onInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };
  const handleSelectPayment = (method) => setSelectedPayment(method);

  const buildQrPayload = () => {
    const payload = {
      gateway: "VNPAY",
      merchantCode: "DEMO123",
      txnType: "EV_CHARGE_PAY",
      orderId,
      amount: totalPayable,
      currency: "VND",
      stationId: station?.id,
      chargerId: charger?.id,
      gunId: gun?.id,
      desc: `Thanh toan sau sac: ${station?.name} - ${charger?.title} - Cong ${gun?.name}`,
      returnUrl: `${window.location.origin}/payment/invoice?order=${orderId}`,
      ts: Date.now(),
    };
    return JSON.stringify(payload);
  };

  const handlePay = async () => {
    const successState = { ...data, paidAt: Date.now(), paidAmount: totalPayable };
    sessionStorage.setItem(`pay:${orderId}`, JSON.stringify(successState));
    navigate(`/payment/invoice?order=${orderId}`, { state: successState, replace: true });
  };

  const fmtDuration = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const parts = [];
    if (h) parts.push(`${h}h`);
    if (m || h) parts.push(`${m}p`);
    parts.push(`${s}s`);
    return parts.join(" ");
  };

  return (
    <MainLayout>
    <div className="payment-page">
      <div className="payment-container">
        {/* LEFT: Phương thức thanh toán + QR + nút */}
        <div className="left-panel">
          <h2 className="section-title">Thanh toán phiên sạc</h2>

          <PaymentForm
            selectedPayment={selectedPayment}
            formData={formData}
            onSelectPayment={handleSelectPayment}
            onInputChange={onInputChange}
          />

          {selectedPayment === "qr" && (
            <section className="os-qr">
              <QRCodeCanvas value={buildQrPayload()} size={240} includeMargin />
              <p className="os-qr-hint">
                Quét mã QR VNPAY để thanh toán — Số tiền: <b>{vnd(totalPayable)}</b>
              </p>
            </section>
          )}

          <div className="os-actions">
            <button className="primary-btn" onClick={handlePay}>
              {selectedPayment === "qr" ? "Xác nhận đã quét" : "Thanh toán"}
            </button>
            <button className="secondary-btn" onClick={() => navigate(-1)}>Quay lại</button>
          </div>
        </div>

        {/* RIGHT: Tóm tắt phiên sạc */}
        <div className="right-panel">
          <h3 className="section-title">Tóm tắt</h3>

          <div className="pc-summary">
            <div className="pc-kv" style={{ marginBottom: 10 }}>
              <span className="k">Mã thanh toán</span><span className="v">{orderId}</span>
              <span className="k">Trạm</span><span className="v">{station?.name}</span>
              <span className="k">Thiết bị</span><span className="v">{charger?.title}</span>
              <span className="k">Cổng</span><span className="v">{gun?.name}</span>
              <span className="k">Pin</span><span className="v">{initialBattery}% → {finalBattery}%</span>
              <span className="k">Thời lượng</span><span className="v">{fmtDuration(sessionSeconds)}</span>
              <span className="k">Tiêu thụ</span><span className="v">{energyUsedKWh} kWh</span>
            </div>

            <table className="pc-table">
              <tbody>
                <tr>
                  <td>Đơn giá điện</td>
                  <td className="pc-right">{vnd(pricePerKWh)}/kWh</td>
                </tr>
                <tr>
                  <td>Tiền điện</td>
                  <td className="pc-right">{vnd(energyCost)}</td>
                </tr>
                <tr>
                  <td>Phí chiếm trụ</td>
                  <td className="pc-right">{vnd(idlePenalty)}</td>
                </tr>
                <tr className="pc-total">
                  <td><b>Tổng thanh toán</b></td>
                  <td className="pc-right"><b>{vnd(totalPayable)}</b></td>
                </tr>
                <tr>
                  <td>Bắt đầu</td>
                  <td className="pc-right">{new Date(startedAt).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Kết thúc</td>
                  <td className="pc-right">{new Date(endedAt).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
    </MainLayout>
  );
}
