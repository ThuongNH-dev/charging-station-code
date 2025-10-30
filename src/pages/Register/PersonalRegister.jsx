// src/pages/Register/PersonalRegister.jsx
import React, { useState } from "react";
import { Form, Input, Button, message } from "antd";
import { UserOutlined, MailOutlined, LockOutlined, PhoneOutlined } from "@ant-design/icons";
import { fetchJSON, getApiBase } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import "./Register.css";

const API_BASE = getApiBase();

const PersonalRegister = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    try {
      setLoading(true);

      const payload = {
        userName: values.userName,
        password: values.password,
        confirmPassword: values.confirmPassword,
        fullName: values.fullName,
        phone: values.phone,
        email: values.email,
      };

      console.log("Sending payload:", payload);

      await fetchJSON(`${API_BASE}/Auth/register-customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      message.success("🎉 Đăng ký tài khoản cá nhân thành công!");
      form.resetFields();

      setTimeout(() => navigate("/login"), 1000);
    } catch (err) {
      console.error("❌ Register error:", err);
      message.error("Đăng ký thất bại. Vui lòng kiểm tra lại thông tin!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-bg">
      <div className="register-card w-[420px]">
        <h2 className="font-semibold mb-6 text-center" style={{ fontSize: 28, color: "#fff" }}>
          Đăng ký cá nhân
        </h2>

        <Form layout="vertical" form={form} onFinish={handleSubmit} autoComplete="off">
          <Form.Item
            label={<span style={{ color: "#fff" }}>Tên đăng nhập</span>}
            name="userName"
            rules={[{ required: true, message: "Vui lòng nhập tên đăng nhập!" }]}
          >
            <Input placeholder="Tên đăng nhập" prefix={<UserOutlined />} />
          </Form.Item>

          <Form.Item
            label={<span style={{ color: "#fff" }}>Họ và tên</span>}
            name="fullName"
            rules={[{ required: true, message: "Vui lòng nhập họ và tên!" }]}
          >
            <Input placeholder="Họ và tên đầy đủ" prefix={<UserOutlined />} />
          </Form.Item>

          <Form.Item
            label={<span style={{ color: "#fff" }}>Email</span>}
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập email!" },
              { type: "email", message: "Email không hợp lệ!" },
            ]}
          >
            <Input placeholder="Địa chỉ email" prefix={<MailOutlined />} />
          </Form.Item>

          <Form.Item
            label={<span style={{ color: "#fff" }}>Số điện thoại</span>}
            name="phone"
            rules={[{ required: true, message: "Vui lòng nhập số điện thoại!" }]}
          >
            <Input placeholder="Số điện thoại" prefix={<PhoneOutlined />} />
          </Form.Item>

          <Form.Item
            label={<span style={{ color: "#fff" }}>Mật khẩu</span>}
            name="password"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu!" },
              { min: 8, message: "Mật khẩu phải có ít nhất 8 ký tự!" },
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu" prefix={<LockOutlined />} />
          </Form.Item>

          <Form.Item
            label={<span style={{ color: "#fff" }}>Xác nhận mật khẩu</span>}
            name="confirmPassword"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Vui lòng xác nhận mật khẩu!" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) return Promise.resolve();
                  return Promise.reject(new Error("Mật khẩu không khớp!"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Nhập lại mật khẩu" prefix={<LockOutlined />} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" block htmlType="submit" size="large" loading={loading}>
              Đăng ký
            </Button>
          </Form.Item>

          <div style={{ textAlign: "center", color: "#fff" }}>
            Đã có tài khoản? <b onClick={() => navigate("/login")} style={{ cursor: "pointer" }}>Đăng nhập</b>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default PersonalRegister;
