import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiBase, fetchAuthJSON } from "../../utils/api";
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

  // Các gói tương ứng với SubscriptionPlans (Business)
  const planInfo = {
    small: { id: 1, name: "Tiêu chuẩn", price: 499000 },
    medium: { id: 2, name: "Cao cấp", price: 1299000 },
    large: { id: 4, name: "Doanh nghiệp", price: 1999000 },
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!agree) {
      alert("Vui lòng đồng ý với điều khoản & chính sách.");
      return;
    }

    setLoading(true);

    try {
      // 1️⃣ Gửi yêu cầu đăng ký doanh nghiệp
      const registerRes = await fetchAuthJSON(`${API_BASE}/Auth/register-company`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          imageUrl: "string", // backend yêu cầu có field này
        }),
      });

      if (!registerRes || !registerRes.message?.includes("thành công")) {
        alert("Đăng ký thất bại. Vui lòng kiểm tra thông tin và thử lại.");
        setLoading(false);
        return;
      }

      // 2️⃣ Lấy lại companyId từ danh sách /Auth
      const accounts = await fetchAuthJSON(`${API_BASE}/Auth`, { method: "GET" });
      const newCompany = Array.isArray(accounts)
        ? accounts.find((a) => a.userName === form.userName && a.role === "Company")
        : null;

      const companyId = newCompany?.company?.companyId ?? null;
      if (!companyId) {
        alert("Không thể xác định mã doanh nghiệp. Vui lòng thử lại.");
        setLoading(false);
        return;
      }

      // 3️⃣ Chuyển sang trang thanh toán (kèm gói & giá)
      const selectedPlan = planInfo[plan];
      navigate("/register/payment", {
        state: {
          companyId,
          presetAmount: selectedPlan.price,
          description: `Thanh toán gói ${selectedPlan.name} (Doanh nghiệp)`,
          plan, // 👈 gửi thêm plan để trang thanh toán biết
        },
      });
    } catch (error) {
      console.error("Lỗi đăng ký doanh nghiệp:", error);
      alert("Có lỗi xảy ra. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="business-register">
      <div className="business-container">
        <h1 className="title">Thông tin doanh nghiệp & đăng ký gói</h1>

        <form className="form-section" onSubmit={handleSubmit}>
          {/* Cột trái: Thông tin doanh nghiệp */}
          <div className="left-col">
            <div className="section-box">
              <h3>Thông tin doanh nghiệp</h3>

              <div className="form-group">
                <label>Tên đăng nhập</label>
                <input
                  type="text"
                  name="userName"
                  value={form.userName}
                  onChange={handleChange}
                  required
                  placeholder="Nhập tên đăng nhập"
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
                  placeholder="Nhập mật khẩu"
                />
              </div>

              <div className="form-group">
                <label>Xác nhận mật khẩu</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Nhập lại mật khẩu"
                />
              </div>

              <div className="form-group">
                <label>Tên công ty</label>
                <input
                  type="text"
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  required
                  placeholder="VD: Công ty TNHH ABC"
                />
              </div>

              <div className="form-group">
                <label>Mã số thuế</label>
                <input
                  type="text"
                  name="taxCode"
                  value={form.taxCode}
                  onChange={handleChange}
                  required
                  placeholder="10 hoặc 13 chữ số"
                />
              </div>

              <div className="form-group">
                <label>Email công ty</label>
                <input
                  type="email"
                  name="companyEmail"
                  value={form.companyEmail}
                  onChange={handleChange}
                  required
                  placeholder="example@company.com"
                />
              </div>

              <div className="form-group">
                <label>Số điện thoại công ty</label>
                <input
                  type="text"
                  name="companyPhone"
                  value={form.companyPhone}
                  onChange={handleChange}
                  required
                  placeholder="+84xxxxxxxxx"
                />
              </div>

              <div className="form-group">
                <label>Địa chỉ</label>
                <input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  required
                  placeholder="Số 1, Đường A, Quận B"
                />
              </div>
            </div>
          </div>

          {/* Cột phải: Chọn gói */}
          <div className="right-col">
            <div className="section-box plan-section">
              <h3>Chọn gói doanh nghiệp</h3>

              <div className="plan-grid">
                <div
                  className={`plan-box ${plan === "small" ? "selected" : ""}`}
                  onClick={() => setPlan("small")}
                >
                  <div className="plan-title">Tiêu chuẩn</div>
                  <div className="plan-price">499.000 đ</div>
                  <p className="plan-desc">Phù hợp doanh nghiệp nhỏ</p>
                </div>

                <div
                  className={`plan-box ${plan === "medium" ? "selected" : ""}`}
                  onClick={() => setPlan("medium")}
                >
                  <div className="plan-title">Cao cấp</div>
                  <div className="plan-price">1.299.000 đ</div>
                  <p className="plan-desc">Phù hợp doanh nghiệp vừa</p>
                </div>

                <div
                  className={`plan-box ${plan === "large" ? "selected" : ""}`}
                  onClick={() => setPlan("large")}
                >
                  <div className="plan-title">Doanh nghiệp</div>
                  <div className="plan-price">1.999.000 đ</div>
                  <p className="plan-desc">Dành cho quy mô lớn</p>
                </div>
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
          </div>
        </form>
      </div>
    </div>
  );
}
