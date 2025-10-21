import React, { useState } from "react";
import { Form, Input, Button, message } from "antd";
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import "./Register.css";

const API_URL = "https://68e336488e14f4523dacc3c1.mockapi.io/hehe/Personal";

const PersonalRegister = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false); // trạng thái gửi

  // ✅ Hàm xử lý gửi dữ liệu lên MockAPI
  const handleSubmit = async (values) => {
    try {
      setLoading(true);

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) throw new Error("Không thể gửi dữ liệu!");

      const data = await res.json();
      console.log("MockAPI response:", data);

      message.success("Đăng ký thành công 🎉");
      form.resetFields(); // reset form
    } catch (error) {
      console.error(error);
      message.error("Đăng ký thất bại. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-bg">
      <div className="register-card w-[400px]">
        <h2 className="font-semibold mb-6 text-center" style={{ fontSize: 27 }}>
          Đăng ký cá nhân
        </h2>

        <Form
          layout="vertical"
          form={form}
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            label="Họ và tên"
            name="fullname"
            rules={[{ required: true, message: "Vui lòng nhập họ tên!" }]}
          >
            <Input placeholder="Nhập họ và tên" prefix={<UserOutlined />} />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập email!" },
              { type: "email", message: "Email không hợp lệ!" },
            ]}
          >
            <Input placeholder="Nhập email" prefix={<MailOutlined />} />
          </Form.Item>

          <Form.Item
            label="Số điện thoại"
            name="phone"
            rules={[
              { required: true, message: "Vui lòng nhập số điện thoại!" },
            ]}
          >
            <Input
              placeholder="Nhập số điện thoại"
              prefix={<PhoneOutlined />}
            />
          </Form.Item>

          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: "Vui lòng nhập mật khẩu!" }]}
          >
            <Input.Password
              placeholder="Nhập mật khẩu"
              prefix={<LockOutlined />}
            />
          </Form.Item>

          <div
            style={{
              fontSize: "13px",
              color: "#888",
              marginTop: -10,
              marginBottom: 10,
              textAlign: "left",
            }}
          >
            Sử dụng ít nhất 8 chữ cái, số và ký hiệu
          </div>

          <Form.Item
            label="Nhập lại mật khẩu"
            name="confirmPassword"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Vui lòng xác nhận mật khẩu!" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Mật khẩu không khớp!"));
                },
              }),
            ]}
          >
            <Input.Password
              placeholder="Nhập lại mật khẩu"
              prefix={<LockOutlined />}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
            >
              Đăng ký
            </Button>
          </Form.Item>

          <div
            style={{
              fontSize: "15px",
              color: "#ffffff",
              marginTop: 5,
              marginBottom: 5,
              textAlign: "center",
            }}
          >
            Đã có tài khoản?{" "}
            <u>
              <b>Đăng nhập</b>
            </u>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default PersonalRegister;
