import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiBase, fetchAuthJSON } from "../../utils/api";
import MainLayout from "../../layouts/MainLayout";
import "./BusinessRegister.css";

const API_BASE = getApiBase();

export default function BusinessRegister() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    userName: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    taxCode: "",
    companyEmail: "",
    companyPhone: "",
    address: "",
  });

  const [plan, setPlan] = useState("small");
  const [loading, setLoading] = useState(false);
  const [agree, setAgree] = useState(false);

  const planInfo = {
    small: { id: 1, name: "Tiêu chuẩn", price: 499000 },
    medium: { id: 2, name: "Cao cấp", price: 1299000 },
    large: { id: 4, name: "Doanh nghiệp", price: 1999000 },
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agree) return alert("Vui lòng đồng ý với điều khoản & chính sách.");
    setLoading(true);

    try {
      // 1️⃣ Tạo tài khoản doanh nghiệp
      const registerRes = await fetchAuthJSON(`${API_BASE}/Auth/register-company`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, imageUrl: "string" }),
      });

      if (!registerRes || !registerRes.message?.includes("thành công")) {
        alert("Đăng ký thất bại. Vui lòng kiểm tra thông tin và thử lại.");
        setLoading(false);
        return;
      }

      // 2️⃣ Lấy lại companyId
      const accounts = await fetchAuthJSON(`${API_BASE}/Auth`, { method: "GET" });
      const newCompany = Array.isArray(accounts)
        ? accounts.find((a) => a.userName === form.userName && a.role === "Company")
        : null;
      const companyId = newCompany?.company?.companyId ?? null;
      if (!companyId) throw new Error("Không thể xác định mã doanh nghiệp.");

      // 3️⃣ Tạo Subscription
      const selectedPlan = planInfo[plan];
      const subBody = {
        companyId,
        subscriptionPlanId: selectedPlan.id,
        billingCycle: "Monthly",
        autoRenew: false,
      };
      const subRes = await fetchAuthJSON(`${API_BASE}/Subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subBody),
      });

      const subscriptionId = subRes?.subscriptionId;
      if (!subscriptionId) throw new Error("Không tạo được gói doanh nghiệp.");

      // 4️⃣ Gọi thanh toán VNPAY
      const paymentPayload = {
        subscriptionId,
        amount: selectedPlan.price * 100, // VNPAY yêu cầu nhân 100
        description: `Thanh toán gói ${selectedPlan.name} (Doanh nghiệp)`,
        returnUrl: `${window.location.origin}/register/success?companyId=${companyId}`,
      };

      const payRes = await fetchAuthJSON(`${API_BASE}/Payment/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentPayload),
      });

      const url =
        payRes?.paymentUrl?.url || payRes?.paymentUrl?.href || payRes?.paymentUrl;
      if (!url) throw new Error("Không tạo được phiên thanh toán.");

      // ✅ Mở trang thanh toán
      window.location.href = url;
    } catch (err) {
      console.error("Register error:", err);
      alert(err.message || "Lỗi khi xử lý đăng ký.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="business-register">
        <div className="register-container">
          <h1 className="form-title">Thông tin doanh nghiệp và liên kết thanh toán</h1>

          <form className="register-form" onSubmit={handleSubmit}>
            {/* Cột trái */}
            <div className="form-left">
              <h3>Thông tin doanh nghiệp</h3>

              <div className="form-group">
                <label>Tên đăng nhập</label>
                <input
                  name="userName"
                  value={form.userName}
                  onChange={handleChange}
                  required
                  placeholder="Tên đăng nhập"
                />
              </div>

              <div className="form-group">
                <label>Tên công ty</label>
                <input
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  required
                  placeholder="VD: Công ty TNHH ABC"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  name="companyEmail"
                  type="email"
                  value={form.companyEmail}
                  onChange={handleChange}
                  required
                  placeholder="example@company.com"
                />
              </div>

              <div className="form-group">
                <label>Số điện thoại</label>
                <input
                  name="companyPhone"
                  value={form.companyPhone}
                  onChange={handleChange}
                  required
                  placeholder="+84xxxxxxxxx"
                />
              </div>

              <div className="form-group">
                <label>Mã số thuế</label>
                <input
                  name="taxCode"
                  value={form.taxCode}
                  onChange={handleChange}
                  required
                  placeholder="10 hoặc 13 chữ số"
                />
              </div>

              <div className="form-group">
                <label>Địa chỉ</label>
                <input
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  required
                  placeholder="Số 1, Đường A, Quận B"
                />
              </div>

              <div className="form-group">
                <label>Mật khẩu</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="Tạo mật khẩu"
                />
              </div>

              <div className="form-group">
                <label>Nhập lại mật khẩu</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Nhập lại mật khẩu"
                />
              </div>
            </div>

            {/* Cột phải */}
            <div className="form-right">
              <h3>Phí mở tài khoản</h3>
              <div className="plan-list">
                {Object.entries(planInfo).map(([key, item]) => (
                  <div
                    key={key}
                    className={`plan-item ${plan === key ? "selected" : ""}`}
                    onClick={() => setPlan(key)}
                  >
                    <div className="plan-header">
                      <strong>{item.name}</strong>
                      <span>{item.price.toLocaleString("vi-VN")} đ</span>
                    </div>
                    <p>
                      {key === "small"
                        ? "Tối thiểu 2 thành viên, tối đa 9 thành viên"
                        : key === "medium"
                        ? "Tối thiểu 10 thành viên, tối đa 50 thành viên"
                        : "Tối thiểu 51 thành viên, tối đa 100 thành viên"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="checkbox">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={() => setAgree(!agree)}
                />
                Tôi đồng ý với điều khoản & chính sách
              </div>

              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? "Đang xử lý..." : "Xác nhận & Thanh toán"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
