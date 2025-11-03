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

  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agree) return alert("Vui lòng đồng ý với điều khoản & chính sách.");
    setLoading(true);

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
        alert(msg);
        setLoading(false);
        return;
      }

      alert("🎉 Đăng ký doanh nghiệp thành công!");
      navigate("/login");
    } catch (err) {
      console.error("❌ Lỗi đăng ký:", err);
      alert("Không thể kết nối tới máy chủ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="business-register">
        <div className="register-container">
          <h1 className="form-title">Đăng ký doanh nghiệp</h1>

          <form className="register-form single" onSubmit={handleSubmit}>
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

            <div className="checkbox">
              <input
                type="checkbox"
                checked={agree}
                onChange={() => setAgree(!agree)}
              />
              Tôi đồng ý với điều khoản & chính sách
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
