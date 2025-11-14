import React, { useState } from "react";
import {
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import Header from "../../components/header/Header";
import Footer from "../../components/footer/Footer";
import "./ContactPage.css";
import { message } from "antd";

export default function ContactPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Vui lòng nhập họ tên!";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "Vui lòng nhập email!";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email không hợp lệ!";
    }
    
    if (!formData.message.trim()) {
      newErrors.message = "Vui lòng nhập nội dung!";
    }
    
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    console.log("Form data:", formData);
    message.success("Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất.", 3);
    
    // Reset form
    setFormData({ name: "", email: "", message: "" });
    setErrors({});
  };

  return (
    <>
      <Header />
      <div className="contact-page">
        <div className="contact-container">
          <div className="contact-header">
            <h2 className="contact-title">Liên hệ với chúng tôi</h2>
            <p className="contact-subtitle">
              Hãy điền thông tin bên dưới để chúng tôi có thể hỗ trợ bạn nhanh nhất.
            </p>
          </div>

          <div className="contact-layout">
            {/* Form liên hệ */}
            <div className="contact-form-panel">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Họ và tên</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Nguyễn Văn A"
                  />
                  {errors.name && <div className="form-error">{errors.name}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="example@gmail.com"
                  />
                  {errors.email && <div className="form-error">{errors.email}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">Nội dung</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    className="form-textarea"
                    placeholder="Nhập nội dung bạn muốn gửi..."
                  />
                  {errors.message && <div className="form-error">{errors.message}</div>}
                </div>

                <button type="submit" className="form-submit">
                  Gửi tin nhắn
                </button>

                <p className="form-disclaimer">
                  Bằng cách gửi biểu mẫu này, bạn đồng ý với{" "}
                  <span
                    className="form-disclaimer-link"
                    onClick={() => navigate("/terms")}
                  >
                    Điều khoản sử dụng
                  </span>{" "}
                  của chúng tôi.
                </p>
              </form>
            </div>

            {/* Thông tin liên hệ */}
            <div className="contact-info-panel">
              <h3 className="contact-info-title">Thông tin liên hệ</h3>
              
              <div className="contact-info-item">
                <EnvironmentOutlined className="contact-info-icon" />
                <span>Văn phòng: 123 Đường Trạm Sạc, Quận 7, TP.HCM</span>
              </div>
              
              <div className="contact-info-item">
                <MailOutlined className="contact-info-icon" />
                <span>Email: tramsac@gmail.com</span>
              </div>
              
              <div className="contact-info-item">
                <PhoneOutlined className="contact-info-icon" />
                <span>SĐT: 0912 345 678</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}