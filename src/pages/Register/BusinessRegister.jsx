import React, { useState } from "react";
import { Form, Input, Button, message } from "antd";
import {
  MailOutlined,
  LockOutlined,
  BankOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import "./Register.css"; // import chung

const API_URL = "https://68e336488e14f4523dacc3c1.mockapi.io/hehe/Business";

const BusinessRegister = () => {
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
      <div className="register-card w-[450px]">
        <h2
          className="font-semibold mb-6 text-center"
          style={{ fontSize: 28, color: "#fff" }}
        >
          Đăng ký doanh nghiệp
        </h2>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            label={<span style={{ color: "#fff" }}>Tên công ty</span>}
            name="company"
            rules={[{ required: true, message: "Vui lòng nhập tên công ty" }]}
          >
            <Input placeholder="Nhập tên công ty" prefix={<BankOutlined />} />
          </Form.Item>

          <Form.Item
            label={<span style={{ color: "#fff" }}>Email liên hệ</span>}
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập email" },
              { type: "email", message: "Email không hợp lệ" },
            ]}
          >
            <Input placeholder="Nhập email" prefix={<MailOutlined />} />
          </Form.Item>

          <Form.Item
            label={<span style={{ color: "#fff" }}>Số điện thoại</span>}
            name="phone"
            rules={[{ required: true, message: "Vui lòng nhập số điện thoại" }]}
          >
            <Input
              placeholder="Nhập số điện thoại"
              prefix={<PhoneOutlined />}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ color: "#fff" }}>Mật khẩu</span>}
            name="password"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu" },
              { min: 8, message: "Mật khẩu phải có ít nhất 8 ký tự" },
            ]}
          >
            <Input.Password
              placeholder="Nhập mật khẩu"
              prefix={<LockOutlined />}
            />
          </Form.Item>

          <div
            style={{
              fontSize: "13px",
              color: "#ccc",
              marginTop: -10,
              marginBottom: 10,
              textAlign: "left",
            }}
          >
            Sử dụng ít nhất 8 chữ cái, số và ký hiệu
          </div>

          <Form.Item
            label={<span style={{ color: "#fff" }}>Nhập lại mật khẩu</span>}
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
              block
              size="large"
              htmlType="submit"
              style={{
                backgroundColor: "#1677ff",
                borderRadius: 8,
                fontWeight: "bold",
              }}
            >
              Đăng ký
            </Button>
          </Form.Item>

          <div
            style={{
              fontSize: "15px",
              color: "#ffffff",
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

export default BusinessRegister;
