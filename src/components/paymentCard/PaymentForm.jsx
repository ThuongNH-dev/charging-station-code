import React from "react";
import "./PaymentForm.css";

const PaymentForm = ({
  selectedPayment,
  formData,
  onSelectPayment,
  onInputChange,
  walletBalance = 0,
  amount = 0,
  contact = {
    fullName: "Nguyễn Văn A",
    phone: "0905123456",
  },
  // 👇 thêm prop vehiclePlate và default rỗng
  vehiclePlate = "",
}) => {
  const fakeData = {
    mastercard: {
      cardNumber: "5555555555554444",
      cardHolder: "TRAN THI B",
      expiryDate: "11/27",
      cvv: "456",
    },
    visa: {
      cardNumber: "4111111111111111",
      cardHolder: "NGUYEN VAN A",
      expiryDate: "12/27",
      cvv: "123",
    },
  };

  const handleSelectPayment = (method) => {
    onSelectPayment(method);
    if (method === "visa" || method === "mastercard") {
      const data = fakeData[method] || {
        cardNumber: "",
        cardHolder: "",
        expiryDate: "",
        cvv: "",
      };
      Object.keys(data).forEach((key) =>
        onInputChange({ target: { name: key, value: data[key] } })
      );
    } else {
      ["cardNumber", "cardHolder", "expiryDate", "cvv"].forEach((key) =>
        onInputChange({ target: { name: key, value: "" } })
      );
    }
  };

  const insufficient = selectedPayment === "wallet" && walletBalance < amount;
  const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";

  return (
    <div className="pf-card">
      <h2 className="pf-title">Xác nhận thông tin</h2>

      {/* 1. Phương thức thanh toán */}
      <div className="pf-methods">
        <h3>1. Phương thức thanh toán</h3>
        <div className="pf-method-grid">
          <div
            className={`pf-method-item ${selectedPayment === "mastercard" ? "active" : ""}`}
            onClick={() => handleSelectPayment("mastercard")}
            role="button"
            tabIndex={0}
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg"
              alt="Mastercard"
            />
          </div>

          <div
            className={`pf-method-item ${selectedPayment === "visa" ? "active" : ""}`}
            onClick={() => handleSelectPayment("visa")}
            role="button"
            tabIndex={0}
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg"
              alt="Visa"
            />
          </div>

          <div
            className={`pf-method-item ${selectedPayment === "qr" ? "active" : ""}`}
            onClick={() => handleSelectPayment("qr")}
            role="button"
            tabIndex={0}
          >
            <div className="vnpay-logo">VNPAY (QR)</div>
          </div>

          <div
            className={`pf-method-item ${selectedPayment === "wallet" ? "active" : ""}`}
            onClick={() => handleSelectPayment("wallet")}
            role="button"
            tabIndex={0}
          >
            <div className="qr-icon">💳 Ví</div>
          </div>
        </div>
      </div>

      {/* 2. Thông tin liên hệ (readonly) */}
      <div className="pf-contact">
        <h3>2. Thông tin liên hệ</h3>
        <div className="pf-readonly">
          <p><b>Họ tên:</b> {contact?.fullName}</p>
          <p><b>Biển số xe:</b> {vehiclePlate || "Chưa có"}</p>
          <p><b>Số điện thoại:</b> {contact?.phone}</p>
        </div>
      </div>

      {/* 3. Thông tin thẻ (ẩn khi QR hoặc Ví) */}
      {selectedPayment && selectedPayment !== "qr" && selectedPayment !== "wallet" && (
        <div className="pf-card-info">
          <h3>3. Thông tin thẻ</h3>
          <div className="pf-form-group">
            <input
              type="text"
              name="cardNumber"
              placeholder="Số thẻ (16 số)"
              value={formData.cardNumber}
              onChange={onInputChange}
              inputMode="numeric"
              maxLength={16}
            />
          </div>
          <div className="pf-form-group">
            <input
              type="text"
              name="cardHolder"
              placeholder="Tên chủ thẻ"
              value={formData.cardHolder}
              onChange={onInputChange}
            />
          </div>
          <div className="pf-form-row">
            <div className="pf-form-group">
              <input
                type="text"
                name="expiryDate"
                placeholder="MM/YY"
                value={formData.expiryDate}
                onChange={onInputChange}
                maxLength={5}
                inputMode="numeric"
              />
            </div>
            <div className="pf-form-group">
              <input
                type="text"
                name="cvv"
                placeholder="CVV"
                value={formData.cvv}
                onChange={onInputChange}
                maxLength={3}
                inputMode="numeric"
              />
            </div>
          </div>
        </div>
      )}

      {/* Ví nội bộ */}
      {selectedPayment === "wallet" && (
        <div className="pf-wallet">
          <div><b>Số dư ví:</b> {vnd(walletBalance)}</div>
          <div><b>Cần thanh toán:</b> {vnd(amount)}</div>
          {insufficient ? (
            <div className="pf-wallet-warning">Số dư không đủ. Vui lòng nạp thêm để tiếp tục.</div>
          ) : (
            <div className="pf-wallet-ok">Số dư đủ để thanh toán ✅</div>
          )}
          <button
            type="button"
            className="pf-topup"
            onClick={() => {
              const next = Number(localStorage.getItem("demo:walletBalance") || "0") + 100000;
              localStorage.setItem("demo:walletBalance", String(next));
              window.dispatchEvent(new Event("storage"));
              alert("Đã nạp demo +100.000đ vào ví. Tải lại trang để cập nhật số dư.");
            }}
          >
            Nạp nhanh +100.000đ (demo)
          </button>
        </div>
      )}

      {selectedPayment === "qr" && (
        <div className="pf-qr-hint">
          <p>
            Bạn đã chọn thanh toán bằng VNPAY/QR. Bấm <b>Thanh toán</b> để xác nhận sau khi quét mã.
          </p>
        </div>
      )}
    </div>
  );
};

export default PaymentForm;
