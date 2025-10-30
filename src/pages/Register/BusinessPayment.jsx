import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { ArrowLeftOutlined } from "@ant-design/icons";
import MainLayout from "../../layouts/MainLayout";
import { fetchAuthJSON, getApiBase } from "../../utils/api";
import "../payment/style/PaymentPage.css";

const API_BASE = getApiBase();
const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";

export default function BusinessPayment() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [companyId] = useState(state?.companyId ?? null);
  const [amount] = useState(state?.presetAmount ?? 0);
  const [description] = useState(state?.description ?? "Phí mở tài khoản doanh nghiệp");

  const [vnpayUrl, setVnpayUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const createPayment = async () => {
      try {
        const payload = {
          companyId,
          amount,
          description,
          returnUrl: `${window.location.origin}/register/success?companyId=${companyId}`,
        };

        const res = await fetchAuthJSON(`${API_BASE}/Payment/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const url =
          res?.paymentUrl?.url || res?.paymentUrl?.href || res?.paymentUrl || "";

        if (!url) throw new Error("Không tạo được phiên thanh toán.");
        setVnpayUrl(url);
      } catch (err) {
        setError(err.message || "Lỗi khi tạo thanh toán.");
      } finally {
        setLoading(false);
      }
    };
    createPayment();
  }, [companyId, amount, description]);

  const handlePay = () => {
    if (vnpayUrl) window.location.href = vnpayUrl;
  };

  if (!companyId || !amount) {
    return (
      <div className="page-fallback">
        <h2>Thiếu thông tin thanh toán</h2>
        <p>Vui lòng quay lại trang đăng ký doanh nghiệp.</p>
        <button className="secondary-btn" onClick={() => navigate("/register/company")}>
          <ArrowLeftOutlined /> Quay lại
        </button>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="payment-page">
        <div className="payment-container">
          <div className="left-panel">
            <h2 className="os-title">Thanh toán phí mở tài khoản</h2>
            <p>Mã doanh nghiệp: <b>{companyId}</b></p>
            <p>Tổng tiền: <b>{vnd(amount)}</b></p>

            <div className="os-qr">
              {loading ? (
                <p>Đang tạo phiên thanh toán...</p>
              ) : vnpayUrl ? (
                <>
                  <QRCodeCanvas value={vnpayUrl} size={200} includeMargin />
                  <p className="os-qr-hint">Quét mã QR để thanh toán qua VNPAY</p>
                </>
              ) : (
                <p className="os-error">{error}</p>
              )}
            </div>

            <div className="os-actions">
              <button
                className={`primary-btn ${!vnpayUrl ? "disabled" : ""}`}
                onClick={handlePay}
                disabled={!vnpayUrl}
              >
                Thanh toán ngay
              </button>
              <button className="secondary-btn" onClick={() => navigate("/register/company")}>
                <ArrowLeftOutlined /> Quay lại
              </button>
            </div>
          </div>

          <div className="right-panel">
            <h3>Thông tin</h3>
            <ul className="os-station-list">
              <li>Phí mở tài khoản doanh nghiệp một lần duy nhất.</li>
              <li>Sau khi thanh toán, tài khoản của bạn sẽ được kích hoạt tự động.</li>
              <li>Bạn có thể đăng nhập ngay sau khi hoàn tất.</li>
            </ul>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
    