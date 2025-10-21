import React, { useState } from "react";
import ProfileSidebar from "../form/Info/ProfileSidebar";
import "./UpdateProfile.css";
import MainLayout from "../../layouts/MainLayout";
import { EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons";

export default function ChangePassword() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // 👁 Trạng thái hiển thị mật khẩu cho từng ô
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      return setMsg("Mật khẩu mới không khớp!");
    }

    setLoading(true);
    setMsg("");
    try {
      const response = await fetch(
        "http://localhost:8080/api/change-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentPassword: form.currentPassword,
            newPassword: form.newPassword,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Đổi mật khẩu thất bại!");
      }

      setMsg("Đổi mật khẩu thành công!");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      console.error(err);
      setMsg(err.message || "Có lỗi xảy ra khi đổi mật khẩu!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="profile-page-layout">
        <ProfileSidebar />
        <div className="profile-main-card">
          <h3>Đổi mật khẩu</h3>
          <form className="profile-form" onSubmit={handleSubmit}>
            <label>Mật khẩu hiện tại</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword.current ? "text" : "password"}
                name="currentPassword"
                value={form.currentPassword}
                onChange={handleChange}
                required
                style={{ width: "100%", paddingRight: "40px" }}
              />
              <span
                onClick={() =>
                  setShowPassword((prev) => ({
                    ...prev,
                    current: !prev.current,
                  }))
                }
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  cursor: "pointer",
                }}
              >
                {showPassword.current ? (
                  <EyeInvisibleOutlined />
                ) : (
                  <EyeOutlined />
                )}
              </span>
            </div>

            <label>Mật khẩu mới</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword.new ? "text" : "password"}
                name="newPassword"
                value={form.newPassword}
                onChange={handleChange}
                required
                style={{ width: "100%", paddingRight: "40px" }}
              />
              <span
                onClick={() =>
                  setShowPassword((prev) => ({
                    ...prev,
                    new: !prev.new,
                  }))
                }
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  cursor: "pointer",
                }}
              >
                {showPassword.new ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              </span>
            </div>

            <label>Xác nhận mật khẩu</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword.confirm ? "text" : "password"}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                style={{ width: "100%", paddingRight: "40px" }}
              />
              <span
                onClick={() =>
                  setShowPassword((prev) => ({
                    ...prev,
                    confirm: !prev.confirm,
                  }))
                }
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  cursor: "pointer",
                }}
              >
                {showPassword.confirm ? (
                  <EyeInvisibleOutlined />
                ) : (
                  <EyeOutlined />
                )}
              </span>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn save" disabled={loading}>
                {loading ? "Đang đổi..." : "Lưu"}
              </button>
              <button
                type="button"
                className="btn cancel"
                onClick={() =>
                  setForm({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  })
                }
              >
                Hủy
              </button>
            </div>
            {msg && <p className="msg">{msg}</p>}
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
