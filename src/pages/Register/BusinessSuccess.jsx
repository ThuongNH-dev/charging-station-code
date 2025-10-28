import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import "../payment/style/PaymentPage.css";

export default function BusinessSuccess() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(search);
  const companyId = params.get("companyId");

  return (
    <MainLayout>
      <div className="payment-page">
        <div className="payment-container">
          <div className="left-panel">
            <h2 className="os-title">🎉 Đăng ký doanh nghiệp thành công!</h2>
            <p>
              Cảm ơn bạn đã thanh toán phí mở tài khoản doanh nghiệp.
              <br />
              Mã doanh nghiệp của bạn là: <b>{companyId ?? "—"}</b>
            </p>
            <div className="os-actions">
              <button className="primary-btn" onClick={() => navigate("/login")}>
                Đăng nhập ngay
              </button>
              <button className="secondary-btn" onClick={() => navigate("/")}>
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
