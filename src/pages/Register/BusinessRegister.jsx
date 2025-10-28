// src/pages/Register/BusinessRegister.jsx
import React, { useState } from "react";
import { Form, Input, Button, message } from "antd";
import { MailOutlined, LockOutlined, BankOutlined, PhoneOutlined, HomeOutlined } from "@ant-design/icons";
import { fetchJSON, getApiBase } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import "./Register.css";

const API_BASE = getApiBase();

const BusinessRegister = () => {
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
        companyName: values.companyName,
        taxCode: values.taxCode,
        companyEmail: values.companyEmail,
        companyPhone: values.companyPhone,
        address: values.address,
        imageUrl: "string", // tạm mặc định, có thể thay bằng upload sau
      };

      console.log("Sending payload:", payload);

      await fetchJSON(`${API_BASE}/Auth/register-company`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      message.success("🎉 Đăng ký doanh nghiệp thành công!");
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
      <div className="register-card w-[480px]">
        <h2 className="font-semibold mb-6 text-center" style={{ fontSize: 28, color: "#fff" }}>
          Đăng ký doanh nghiệp
        </h2>

        <Form layout="vertical" form={form} onFinish={handleSubmit} autoComplete="off">
          <Form.Item label={<span style={{ color: "#fff" }}>Tên đăng nhập</span>} name="userName"
            rules={[{ required: true, message: "Vui lòng nhập tên đăng nhập!" }]}>
            <Input placeholder="Tên đăng nhập" prefix={<BankOutlined />} />
          </Form.Item>

          <Form.Item label={<span style={{ color: "#fff" }}>Tên công ty</span>} name="companyName"
            rules={[{ required: true, message: "Vui lòng nhập tên công ty!" }]}>
            <Input placeholder="Tên công ty" prefix={<BankOutlined />} />
          </Form.Item>

          <Form.Item label={<span style={{ color: "#fff" }}>Mã số thuế</span>} name="taxCode"
            rules={[{ required: true, message: "Vui lòng nhập mã số thuế!" }]}>
            <Input placeholder="Mã số thuế" />
          </Form.Item>

          <Form.Item label={<span style={{ color: "#fff" }}>Email công ty</span>} name="companyEmail"
            rules={[
              { required: true, message: "Vui lòng nhập email!" },
              { type: "email", message: "Email không hợp lệ!" },
            ]}>
            <Input placeholder="Email công ty" prefix={<MailOutlined />} />
          </Form.Item>

          <Form.Item label={<span style={{ color: "#fff" }}>Số điện thoại công ty</span>} name="companyPhone"
            rules={[{ required: true, message: "Vui lòng nhập số điện thoại!" }]}>
            <Input placeholder="Số điện thoại" prefix={<PhoneOutlined />} />
          </Form.Item>

          <Form.Item label={<span style={{ color: "#fff" }}>Địa chỉ</span>} name="address"
            rules={[{ required: true, message: "Vui lòng nhập địa chỉ!" }]}>
            <Input placeholder="Địa chỉ trụ sở" prefix={<HomeOutlined />} />
          </Form.Item>

          <Form.Item label={<span style={{ color: "#fff" }}>Mật khẩu</span>} name="password"
            rules={[{ required: true, message: "Vui lòng nhập mật khẩu!" }, { min: 8, message: "Ít nhất 8 ký tự!" }]}>
            <Input.Password placeholder="Nhập mật khẩu" prefix={<LockOutlined />} />
          </Form.Item>

          <Form.Item label={<span style={{ color: "#fff" }}>Xác nhận mật khẩu</span>} name="confirmPassword"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Vui lòng xác nhận mật khẩu!" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) return Promise.resolve();
                  return Promise.reject(new Error("Mật khẩu không khớp!"));
                },
              }),
            ]}>
            <Input.Password placeholder="Nhập lại mật khẩu" prefix={<LockOutlined />} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
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

export default BusinessRegister;
