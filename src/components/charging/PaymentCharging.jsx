import React, { useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import PaymentForm from "../paymentCard/PaymentForm"
import { QRCodeCanvas } from "qrcode.react";

const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";

export default function PaymentCharging() {
  const { state } = useLocation();
  const [search] = useSearchParams();
  const navigate = useNavigate();

  // ✅ Lấy lại từ state hoặc sessionStorage (chống mất khi F5)
  const data = useMemo(() => {
    if (state) return state;
    const order = search.get("order");
    if (!order) return null;
    const cached = sessionStorage.getItem(`chargepay:${order}`);
    return cached ? JSON.parse(cached) : null;
  }, [state, search]);

  if (!data) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Không tìm thấy dữ liệu thanh toán phiên sạc</h2>
        <button onClick={() => navigate("/stations")} style={{ padding: "8px 12px" }}>Về trang trạm</button>
      </div>
    );
  }

  const {
    orderId,
    station,
    charger,
    gun,
    pricePerKWh,
    energyUsedKWh,
    sessionSeconds,
    energyCost,
    idlePenalty,
    totalPayable,
    startedAt,
    endedAt,
    finalBattery,
    initialBattery,
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
    // validate form nếu cần...
    const successState = {
      ...data,
      paidAt: Date.now(),
      paidAmount: totalPayable,
    };
    // Lưu để trang thành công đọc
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
    <div style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <h1>Thanh toán phiên sạc</h1>

      {/* Thông tin phiên sạc */}
      <section style={{ marginBottom: 16, padding: 16, border: "1px solid #eee", borderRadius: 8 }}>
        <h3>Thông tin</h3>
        <ul>
          <li>Mã thanh toán: <b>{orderId}</b></li>
          <li>Trạm: <b>{station?.name}</b></li>
          <li>Thiết bị: <b>{charger?.title}</b> — Cổng: <b>{gun?.name}</b></li>
          <li>Pin: <b>{initialBattery}% → {finalBattery}%</b></li>
          <li>Thời lượng sạc: <b>{fmtDuration(sessionSeconds)}</b></li>
          <li>Năng lượng tiêu thụ: <b>{energyUsedKWh} kWh</b></li>
          <li>Đơn giá điện: <b>{vnd(pricePerKWh)}</b>/kWh</li>
          <li>Tiền điện: <b>{vnd(energyCost)}</b></li>
          <li>Phí chiếm trụ: <b>{vnd(idlePenalty)}</b></li>
          <li>Tổng thanh toán: <b style={{ fontSize: 18 }}>{vnd(totalPayable)}</b></li>
          <li>Bắt đầu: <b>{new Date(startedAt).toLocaleString()}</b></li>
          <li>Kết thúc: <b>{new Date(endedAt).toLocaleString()}</b></li>
        </ul>
      </section>

      {/* Form chọn phương thức + ô thẻ */}
      <PaymentForm
        selectedPayment={selectedPayment}
        formData={formData}
        onSelectPayment={handleSelectPayment}
        onInputChange={onInputChange}
      />

      {/* QR nếu chọn */}
      {selectedPayment === "qr" && (
        <section style={{ marginTop: 16, padding: 16, border: "1px solid #eee", borderRadius: 8 }}>
          <h3>Quét mã QR VNPAY để thanh toán</h3>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <QRCodeCanvas value={buildQrPayload()} size={240} includeMargin />
            <div>
              <div><b>Số tiền:</b> {vnd(totalPayable)}</div>
              <div><b>Nội dung:</b> {`TT ${orderId}`}</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
                * Mã QR giả lập để test luồng thanh toán.
              </div>
            </div>
          </div>
        </section>
      )}

      <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
        <button onClick={() => navigate(-1)}>Quay lại</button>
        <button onClick={handlePay}>
          {selectedPayment === "qr" ? "Xác nhận đã quét" : "Thanh toán"}
        </button>
      </div>
    </div>
  );
}
