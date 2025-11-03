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
  const [plan] = useState(state?.plan ?? "small");

  const [vnpayUrl, setVnpayUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Map giữa gói frontend và SubscriptionPlanId backend
  const planMap = {
    small: { id: 1, name: "Tiêu chuẩn", price: 499 }, // 499 nghìn
    medium: { id: 2, name: "Cao cấp", price: 1299 },
    large: { id: 4, name: "Doanh nghiệp", price: 1999 },
  };

  const selectedPlan = planMap[plan];
  const amount = (selectedPlan?.price || 0) * 1000; // 👈 chuyển "nghìn" → "đồng"

  useEffect(() => {
    const createPaymentFlow = async () => {
      try {
        if (!companyId) throw new Error("Thiếu mã doanh nghiệp.");
        if (!selectedPlan) throw new Error("Gói đăng ký không hợp lệ.");

        // 1️⃣ Tạo Subscription cho doanh nghiệp
        const subscriptionBody = {
          companyId,
          subscriptionPlanId: selectedPlan.id,
          billingCycle: "Monthly",
          autoRenew: false,
        };

        const subRes = await fetchAuthJSON(`${API_BASE}/Subscriptions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscriptionBody),
        });

        const subscriptionId = subRes?.subscriptionId;
        if (!subscriptionId) throw new Error("Không tạo được gói doanh nghiệp.");

        // 2️⃣ Gọi API thanh toán
        const paymentPayload = {
          subscriptionId,
          amount: amount * 100, // VNPAY yêu cầu nhân 100
          description: `Thanh toán gói ${selectedPlan.name} (Doanh nghiệp)`,
          returnUrl: `${window.location.origin}/register/success?companyId=${companyId}`,
        };

        const payRes = await fetchAuthJSON(`${API_BASE}/Payment/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(paymentPayload),
        });

        const url =
          payRes?.paymentUrl?.url ||
          payRes?.paymentUrl?.href ||
          payRes?.paymentUrl ||
          "";

        if (!url) throw new Error("Không tạo được phiên thanh toán.");
        setVnpayUrl(url);
      } catch (err) {
        console.error("Payment flow error:", err);
        setError(err.message || "Lỗi khi tạo thanh toán.");
      } finally {
        setLoading(false);
      }
    };

    createPaymentFlow();
  }, [companyId, plan]);

  const handlePay = () => {
    if (vnpayUrl) window.location.href = vnpayUrl;
  };

  if (!companyId) {
    return (
      <div className="page-fallback">
        <h2>Thiếu thông tin thanh toán</h2>
        <p>Vui lòng quay lại trang đăng ký doanh nghiệp.</p>
        <button
          className="secondary-btn"
          onClick={() => navigate("/register/company")}
        >
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
            <h2 className="os-title">Thanh toán gói doanh nghiệp</h2>
            <p>
              Mã doanh nghiệp: <b>{companyId}</b>
            </p>
            <p>
              Gói đăng ký: <b>{selectedPlan?.name}</b>
            </p>
            <p>
              Tổng tiền: <b>{vnd(amount)}</b>
            </p>

            <div className="os-qr">
              {loading ? (
                <p>Đang tạo phiên thanh toán...</p>
              ) : vnpayUrl ? (
                <>
                  <QRCodeCanvas value={vnpayUrl} size={200} includeMargin />
                  <p className="os-qr-hint">
                    Quét mã QR để thanh toán qua VNPAY
                  </p>
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
              <button
                className="secondary-btn"
                onClick={() => navigate("/register/company")}
              >
                <ArrowLeftOutlined /> Quay lại
              </button>
            </div>
          </div>

          <div className="right-panel">
            <h3>Thông tin gói</h3>
            <ul className="os-station-list">
              <li>Phí đăng ký được tính theo gói doanh nghiệp bạn đã chọn.</li>
              <li>
                Sau khi thanh toán, tài khoản doanh nghiệp sẽ được kích hoạt tự
                động.
              </li>
              <li>
                Bạn có thể đăng nhập và thêm nhân viên ngay sau khi hoàn tất.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
