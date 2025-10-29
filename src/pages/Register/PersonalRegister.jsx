import React, { useState } from "react";
import { Form, Input, Button, message } from "antd";
import { UserOutlined, MailOutlined, LockOutlined, PhoneOutlined } from "@ant-design/icons";
import { fetchJSON, getApiBase } from "../../utils/api";
import { useNavigate } from "react-router-dom";

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
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        padding: "60px 0",
        background: "#f2f6f9",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 3px 10px rgba(0, 0, 0, 0.08)",
          padding: "40px 50px",
          width: "90%",
          maxWidth: 480,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 30,
            color: "#111827",
          }}
        >
          Đăng ký cá nhân
        </h2>

        <Form
          layout="vertical"
          form={form}
          onFinish={handleSubmit}
          autoComplete="off"
          requiredMark={false}
        >
          {/* Tên đăng nhập */}
          <Form.Item
            label={<span style={{ fontWeight: 600, color: "#374151" }}>Tên đăng nhập</span>}
            name="userName"
            rules={[{ required: true, message: "Vui lòng nhập tên đăng nhập!" }]}
          >
            <Input
              placeholder="Tên đăng nhập"
              prefix={<UserOutlined />}
              style={{
                borderRadius: 6,
                height: 42,
                fontSize: 15,
                border: "1px solid #d1d5db",
              }}
            />
          </Form.Item>

          {/* Họ và tên */}
          <Form.Item
            label={<span style={{ fontWeight: 600, color: "#374151" }}>Họ và tên</span>}
            name="fullName"
            rules={[{ required: true, message: "Vui lòng nhập họ và tên!" }]}
          >
            <Input
              placeholder="Họ và tên đầy đủ"
              prefix={<UserOutlined />}
              style={{
                borderRadius: 6,
                height: 42,
                fontSize: 15,
                border: "1px solid #d1d5db",
              }}
            />
          </Form.Item>

          {/* Email */}
          <Form.Item
            label={<span style={{ fontWeight: 600, color: "#374151" }}>Email</span>}
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập email!" },
              { type: "email", message: "Email không hợp lệ!" },
            ]}
          >
            <Input
              placeholder="Địa chỉ email"
              prefix={<MailOutlined />}
              style={{
                borderRadius: 6,
                height: 42,
                fontSize: 15,
                border: "1px solid #d1d5db",
              }}
            />
          </Form.Item>

          {/* Số điện thoại */}
          <Form.Item
            label={<span style={{ fontWeight: 600, color: "#374151" }}>Số điện thoại</span>}
            name="phone"
            rules={[{ required: true, message: "Vui lòng nhập số điện thoại!" }]}
          >
            <Input
              placeholder="Số điện thoại"
              prefix={<PhoneOutlined />}
              style={{
                borderRadius: 6,
                height: 42,
                fontSize: 15,
                border: "1px solid #d1d5db",
              }}
            />
          </Form.Item>

          {/* Mật khẩu */}
          <Form.Item
            label={<span style={{ fontWeight: 600, color: "#374151" }}>Mật khẩu</span>}
            name="password"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu!" },
              { min: 8, message: "Mật khẩu phải có ít nhất 8 ký tự!" },
            ]}
          >
            <Input.Password
              placeholder="Nhập mật khẩu"
              prefix={<LockOutlined />}
              style={{
                borderRadius: 6,
                height: 42,
                fontSize: 15,
                border: "1px solid #d1d5db",
              }}
            />
          </Form.Item>

          <p
            style={{
              fontSize: 13,
              color: "#6b7280",
              marginTop: -8,
              marginBottom: 10,
            }}
          >
            Sử dụng ít nhất 8 chữ cái, số và ký hiệu
          </p>

          {/* Xác nhận mật khẩu */}
          <Form.Item
            label={<span style={{ fontWeight: 600, color: "#374151" }}>Xác nhận mật khẩu</span>}
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
            <Input.Password
              placeholder="Nhập lại mật khẩu"
              prefix={<LockOutlined />}
              style={{
                borderRadius: 6,
                height: 42,
                fontSize: 15,
                border: "1px solid #d1d5db",
              }}
            />
          </Form.Item>

          {/* Nút đăng ký */}
          <Form.Item>
            <Button
              type="primary"
              block
              htmlType="submit"
              size="large"
              loading={loading}
              style={{
                background: "#111827",
                border: "none",
                borderRadius: 8,
                height: 44,
                fontWeight: 600,
                fontSize: 15,
              }}
              onMouseOver={(e) => (e.target.style.background = "#000")}
              onMouseOut={(e) => (e.target.style.background = "#111827")}
            >
              Đăng ký
            </Button>
          </Form.Item>

          <div
            style={{
              textAlign: "center",
              color: "#374151",
              fontSize: 14,
            }}
          >
            Đã có tài khoản?{" "}
            <b
              onClick={() => navigate("/login")}
              style={{
                cursor: "pointer",
                color: "#111827",
                fontWeight: 600,
              }}
            >
              Đăng nhập
            </b>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default PersonalRegister;
