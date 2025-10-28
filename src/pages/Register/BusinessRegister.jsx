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

  const planPrices = {
    small: 99000,
    medium: 399000,
    large: 799000,
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
      // ✅ Payload chính xác với backend
      const payload = {
        userName: form.userName,
        password: form.password,
        confirmPassword: form.confirmPassword,
        companyName: form.companyName,
        taxCode: form.taxCode,
        companyEmail: form.companyEmail,
        companyPhone: form.companyPhone,
        address: form.address,
        imageUrl: "string", // bắt buộc có
      };

      console.log("[REGISTER PAYLOAD]", payload);

      const registerRes = await fetchAuthJSON(`${API_BASE}/Auth/register-company`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("[REGISTER RESPONSE]", registerRes);

      if (!registerRes || !registerRes.message?.includes("thành công")) {
        alert(registerRes?.message || "Đăng ký thất bại. Vui lòng kiểm tra thông tin và thử lại.");
        setLoading(false);
        return;
      }

      // 🔹 Lấy companyId vừa tạo
      const accounts = await fetchAuthJSON(`${API_BASE}/Auth`);
      const newCompany = Array.isArray(accounts)
        ? accounts.find((a) => a.userName === form.userName && a.role === "Company")
        : null;

      const companyId = newCompany?.company?.companyId ?? null;

      if (!companyId) {
        alert("Không thể xác định mã doanh nghiệp. Vui lòng thử lại.");
        setLoading(false);
        return;
      }

      // 🔹 Điều hướng sang thanh toán
      navigate("/register/payment", {
        state: {
          companyId,
          presetAmount: planPrices[plan],
          description: `Phí mở tài khoản doanh nghiệp (${
            plan === "small"
              ? "Quy mô nhỏ"
              : plan === "medium"
              ? "Quy mô vừa"
              : "Quy mô lớn"
          })`,
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
        <h1 className="title">Thông tin doanh nghiệp và đăng ký gói</h1>

        <form className="form-section" onSubmit={handleSubmit}>
          <div className="left-col">
            <div className="section-box">
              <h3>Thông tin doanh nghiệp</h3>

              {[
                { label: "Tên đăng nhập", name: "userName", placeholder: "Nhập tên đăng nhập" },
                { label: "Mật khẩu", name: "password", type: "password", placeholder: "Nhập mật khẩu" },
                { label: "Xác nhận mật khẩu", name: "confirmPassword", type: "password", placeholder: "Nhập lại mật khẩu" },
                { label: "Tên công ty", name: "companyName", placeholder: "Công ty TNHH ABC" },
                { label: "Mã số thuế", name: "taxCode", placeholder: "10 hoặc 13 chữ số" },
                { label: "Email công ty", name: "companyEmail", placeholder: "example@company.com" },
                { label: "Số điện thoại công ty", name: "companyPhone", placeholder: "+84xxxxxxxxx" },
                { label: "Địa chỉ", name: "address", placeholder: "Số 1, Đường A, Quận B" },
              ].map((field) => (
                <div className="form-group" key={field.name}>
                  <label>{field.label}</label>
                  <input
                    type={field.type || "text"}
                    name={field.name}
                    value={form[field.name]}
                    onChange={handleChange}
                    required
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="right-col">
            <div className="section-box plan-section">
              <h3>Phí mở tài khoản</h3>

              <div className="plan-grid">
                {Object.entries(planPrices).map(([key, price]) => (
                  <div
                    key={key}
                    className={`plan-box ${plan === key ? "selected" : ""}`}
                    onClick={() => setPlan(key)}
                  >
                    <div className="plan-title">
                      {key === "small"
                        ? "Quy mô nhỏ"
                        : key === "medium"
                        ? "Quy mô vừa"
                        : "Quy mô lớn"}
                    </div>
                    <div className="plan-price">
                      {price.toLocaleString("vi-VN")} đ
                    </div>
                    <p className="plan-desc">
                      ({key === "small"
                        ? "Tối đa 9 thành viên"
                        : key === "medium"
                        ? "Tối đa 50 thành viên"
                        : "Tối đa 100 thành viên"})
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
                Tôi đồng ý với điều khoản & Chính sách
              </div>

              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
