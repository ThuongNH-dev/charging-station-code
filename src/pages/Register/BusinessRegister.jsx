import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiBase, fetchAuthJSON } from "../../utils/api";
import MainLayout from "../../layouts/MainLayout";
import MessageBox from "../../components/staff/MessageBox";
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

  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agree) {
      setMessage({ type: "warning", text: "Vui lòng đồng ý với điều khoản & chính sách." });
      setTimeout(() => setMessage({ type: "", text: "" }), 5000);
      return;
    }
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch(`${API_BASE}/Auth/register-company`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, imageUrl: "string" }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          data?.message ||
          data?.errors?.TaxCode?.[0] ||
          data?.errors?.UserName?.[0] ||
          "Đăng ký thất bại. Vui lòng kiểm tra thông tin và thử lại.";
        setMessage({ type: "error", text: msg });
        setTimeout(() => setMessage({ type: "", text: "" }), 5000);
        setLoading(false);
        return;
      }

      setMessage({ type: "success", text: "🎉 Đăng ký doanh nghiệp thành công! Đang chuyển đến trang đăng nhập..." });
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      console.error("❌ Lỗi đăng ký:", err);
      setMessage({ type: "error", text: "Không thể kết nối tới máy chủ. Vui lòng thử lại." });
      setTimeout(() => setMessage({ type: "", text: "" }), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="business-register">
        <MessageBox
          type={message.type}
          message={message.text}
          visible={!!message.text}
          onClose={() => setMessage({ type: "", text: "" })}
        />
        
        <div className="register-container">
          <h1 className="form-title">Đăng ký doanh nghiệp</h1>

          <form className="register-form" onSubmit={handleSubmit}>
            <div className="form-row">
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
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email công ty</label>
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
                <label>Số điện thoại công ty</label>
                <input
                  name="companyPhone"
                  value={form.companyPhone}
                  onChange={handleChange}
                  required
                  placeholder="+84xxxxxxxxx"
                />
              </div>
            </div>

            <div className="form-row">
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
            </div>

            <div className="form-row">
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
            </div>

            <div className="checkbox-wrapper">
              <label className="checkbox-label-wrapper">
                <input
                  type="checkbox"
                  className="terms-checkbox"
                  checked={agree}
                  onChange={() => setAgree(!agree)}
                />
                <span className="checkbox-custom"></span>
                <span className="checkbox-text">
                  Tôi đồng ý với{" "}
                  <a href="/terms" className="terms-link" onClick={(e) => e.stopPropagation()}>
                    điều khoản
                  </a>
                  {" & "}
                  <a href="/privacy" className="terms-link" onClick={(e) => e.stopPropagation()}>
                    chính sách
                  </a>
                </span>
              </label>
            </div>

            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Đang xử lý..." : "Đăng ký ngay"}
            </button>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
