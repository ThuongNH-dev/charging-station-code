import React, { useState } from "react";
import { getApiBase, fetchAuthJSON } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import "./PersonalRegister.css";

const API_BASE = getApiBase();

export default function PersonalRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    userName: "",
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetchAuthJSON(`${API_BASE}/Auth/register-customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res || !res.message?.includes("thành công")) {
        alert("Đăng ký thất bại. Vui lòng kiểm tra lại thông tin!");
        setLoading(false);
        return;
      }

      alert("🎉 Đăng ký tài khoản cá nhân thành công!");
      navigate("/login");
    } catch (err) {
      console.error("❌ Register error:", err);
      alert("Lỗi kết nối đến máy chủ!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="personal-register">
        <div className="register-card">
          <h2 className="register-title">Đăng ký cá nhân</h2>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Tên đăng nhập</label>
              <input
                className="form-input"
                name="userName"
                value={form.userName}
                onChange={handleChange}
                required
                placeholder="Nhập tên đăng nhập"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Họ và tên</label>
              <input
                className="form-input"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                required
                placeholder="Nhập họ và tên đầy đủ"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="example@email.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Số điện thoại</label>
              <input
                className="form-input"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                placeholder="+84xxxxxxxxx"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mật khẩu</label>
              <input
                className="form-input"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                placeholder="Tạo mật khẩu"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Xác nhận mật khẩu</label>
              <input
                className="form-input"
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Nhập lại mật khẩu"
              />
            </div>

            <button
              type="submit"
              className="primary-btn"
              disabled={loading}
            >
              {loading ? "Đang xử lý..." : "Đăng ký"}
            </button>

            <div className="signup-link">
              Đã có tài khoản?{" "}
              <a onClick={() => navigate("/login")}>Đăng nhập</a>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
