import React, { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PaymentForm from "../../components/paymentCard/PaymentForm";
import { QRCodeCanvas } from "qrcode.react";
import MainLayout from "../../layouts/MainLayout";
import { ArrowLeftOutlined } from "@ant-design/icons";
import "./style/PaymentPage.css";

const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";

export default function PaymentPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Ví demo
  const [walletBalance, setWalletBalance] = useState(0);
  useEffect(() => {
    const saved = Number(localStorage.getItem("demo:walletBalance"));
    if (Number.isFinite(saved) && saved >= 0) setWalletBalance(saved);
    else {
      localStorage.setItem("demo:walletBalance", "150000");
      setWalletBalance(150000);
    }
  }, []);

  // Contact demo
  const contact = useMemo(
    () => ({
      fullName: "Nguyễn Văn A",
      email: "A.nguyen@example.com",
      phone: "0905123456",
    }),
    []
  );

  const [selectedPayment, setSelectedPayment] = useState(""); // 'visa' | 'mastercard' | 'qr' | 'wallet'
  const [formData, setFormData] = useState({
    cardNumber: "",
    cardHolder: "",
    expiryDate: "",
    cvv: "",
  });

  if (!state) {
    return (
      <div className="page-fallback">
        <h2>Thiếu thông tin đơn hàng</h2>
        <p>Vui lòng đặt lại từ trang danh sách trạm.</p>
        <button className="secondary-btn" onClick={() => navigate("/stations")}>
          <ArrowLeftOutlined /> Về danh sách trạm
        </button>
      </div>
    );
  }

  // Tính đơn
  const orderId = useMemo(() => state.orderId || "ORD" + Date.now(), [state.orderId]);
  const amount = useMemo(() => {
    if (state.amount != null) return state.amount;
    const totalMinutes = state.totalMinutes || 0;
    const perMinute = state.perMinute || 0;
    return Math.round(totalMinutes * perMinute);
  }, [state.amount, state.totalMinutes, state.perMinute]);

  const { station, charger, gun, totalMinutes, perMinute, startTime, baseline } = state;

  // Helpers
  const onInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };
  const handleSelectPayment = (method) => setSelectedPayment(method);

  const buildQrPayload = () => {
    const payload = {
      gateway: "VNPAY",
      merchantCode: "DEMO123",
      txnType: "EV_CHARGE",
      orderId,
      amount,
      currency: "VND",
      stationId: station?.id,
      chargerId: charger?.id,
      gunId: gun?.id,
      desc: `Nap tai ${station?.name} - ${charger?.title} - Cong ${gun?.name}`,
      returnUrl: `${window.location.origin}/payment/success?order=${orderId}`,
      ts: Date.now(),
    };
    return JSON.stringify(payload);
  };

  const buildSuccessPayload = (extra = {}) => {
    const payload = {
      orderId,
      station,
      charger,
      gun,
      startTime: startTime || "",
      baseline: baseline || "",
      totalMinutes: totalMinutes || 0,
      bookingFee: amount,
      paidAt: Date.now(),
      paymentMethod: selectedPayment,
      contact,
      ...extra,
    };
    sessionStorage.setItem(`pay:${orderId}`, JSON.stringify(payload));
    return payload;
  };

  const canPayByWallet = selectedPayment === "wallet" ? walletBalance >= amount : true;
  const payDisabled =
    loading || !selectedPayment || (selectedPayment === "wallet" && !canPayByWallet);

  const handlePay = async () => {
    if (!selectedPayment) return;
    if (selectedPayment === "wallet" && !canPayByWallet) return;

    setLoading(true);
    try {
      const baseExtra = { contact };

      if (selectedPayment === "wallet") {
        const before = walletBalance;
        const after = before - amount;
        localStorage.setItem("demo:walletBalance", String(after));
        setWalletBalance(after);

        const payload = buildSuccessPayload({
          ...baseExtra,
          walletBalanceBefore: before,
          walletBalanceAfter: after,
          paymentRef: `WAL-${orderId}`,
        });

        navigate(`/payment/success?order=${orderId}`, { state: payload, replace: true });
        return;
      }

      const payload = buildSuccessPayload({
        ...baseExtra,
        paymentRef: `${selectedPayment.toUpperCase()}-${orderId}`,
      });

      navigate(`/payment/success?order=${orderId}`, { state: payload, replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="payment-page">
        <div className="payment-container">
          {/* LEFT COLUMN */}
          <div className="left-col">
            {/* (bỏ nút/link quay về ở trên) */}

            <div className="left-panel">
              <PaymentForm
                selectedPayment={selectedPayment}
                formData={formData}
                onSelectPayment={handleSelectPayment}
                onInputChange={onInputChange}
                walletBalance={walletBalance}
                amount={amount}
                contact={contact}
              />

              {selectedPayment === "qr" && (
                <div className="os-qr">
                  <QRCodeCanvas value={buildQrPayload()} size={180} includeMargin />
                  <p className="os-qr-hint">Quét mã QR để thanh toán</p>
                </div>
              )}

              {/* ✅ Nút trong card: Thanh toán (trên) + Quay về (dưới) */}
              <div className="os-actions">
                <button
                  onClick={handlePay}
                  className={`primary-btn ${payDisabled ? "disabled" : ""}`}
                  disabled={payDisabled}
                >
                  {selectedPayment === "qr" ? "Xác nhận đã quét" : "Thanh Toán"}
                </button>

                <button className="secondary-btn" onClick={() => navigate(-1)}>
                  <ArrowLeftOutlined /> Quay về
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="right-panel">
            <h2 className="os-title">Xác nhận đơn đặt trước</h2>

            <div className="os-block">
              <h3>1. Thông tin trụ sạc</h3>
              <p className="os-station-line">
                <b>{station?.name}</b> — {charger?.title} — Cổng <b>{gun?.name}</b>
              </p>
              <ul className="os-station-list">
                <li>Công suất: 60 kW</li>
                <li>Tình trạng trụ: Trống</li>
                <li>Loại cổng sạc: DC</li>
                <li>Tốc độ sạc:</li>
                <ul>
                  <li>8 – 12 tiếng cho ô tô</li>
                  <li>4 – 6 tiếng cho xe máy điện</li>
                </ul>
              </ul>
            </div>

            <div className="os-block">
              <h3>2. Chi phí</h3>
              <table className="os-table">
                <tbody>
                  <tr>
                    <td>Phí đặt chỗ</td>
                    <td className="os-right">{vnd(amount)}</td>
                  </tr>
                  <tr>
                    <td>Tạm tính</td>
                    <td className="os-right">{vnd(amount)}</td>
                  </tr>
                  <tr>
                    <td>Giảm giá</td>
                    <td className="os-right">0%</td>
                  </tr>
                  <tr className="os-total">
                    <td><b>Tổng</b></td>
                    <td className="os-right"><b>{vnd(amount)}</b></td>
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
