// src/pages/auth/RegisterSelect.jsx
import React, { useState, useEffect } from "react";
import { UserOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { HiOutlineUserGroup } from "react-icons/hi";
import "./Register.css";

const RegisterSelect = () => {
  const [selected, setSelected] = useState(null);
  const [banner, setBanner] = useState(null); // 🔔 banner thông báo đầu trang
  const navigate = useNavigate();

  // Tự ẩn banner sau 5s (nếu không phải lỗi)
  useEffect(() => {
    if (!banner || banner.type === "error") return;
    const timer = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(timer);
  }, [banner]);

  const showBanner = (type, text) => {
    setBanner({ type, text });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelect = (role) => {
    setSelected(role);
    if (role === "personal" || role === "business") {
      navigate(`/register/${role}`);
    } else {
      showBanner("error", "Vui lòng chọn vai trò hợp lệ!");
    }
  };

  return (
    <div className="register-bg">
      {/* 🔔 Banner đầu trang */}
      {banner && (
        <div className={`top-alert ${banner.type}`}>
          <div className="top-alert__inner">
            <span className="top-alert__text">{banner.text}</span>
            <button
              className="top-alert__close"
              onClick={() => setBanner(null)}
              aria-label="Đóng thông báo"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="register-card register-card-select">
        <h2>CHÀO MỪNG BẠN!</h2>
        <p>Hãy chọn vai trò để bắt đầu hành trình cùng chúng tôi</p>

        <div className="register-options">
          <button
            aria-label="Chọn vai trò cá nhân"
            onClick={() => handleSelect("personal")}
            className={`register-option ${
              selected === "personal" ? "selected" : ""
            }`}
          >
            <UserOutlined className="register-option-icon" />
            <p className="mt-2 font-medium">Cá nhân</p>
          </button>

          <button
            aria-label="Chọn vai trò doanh nghiệp"
            onClick={() => handleSelect("business")}
            className={`register-option ${
              selected === "business" ? "selected" : ""
            }`}
          >
            <HiOutlineUserGroup className="register-option-icon" />
            <p className="mt-2 font-medium">Doanh nghiệp</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterSelect;
