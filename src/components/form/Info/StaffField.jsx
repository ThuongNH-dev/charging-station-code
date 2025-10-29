// ✅ src/components/form/Info/StaffField.jsx
import React from "react";
import { Row, Col, Form, Input, InputNumber, Typography } from "antd";

const { Title } = Typography;

const trim = (v) => (typeof v === "string" ? v.trim() : v);

const urlValidator = async (_, v) => {
  const val = trim(v) || "";
  if (!val) return; // cho phép để trống
  const ok = /^https?:\/\/\S+$/i.test(val);
  if (!ok) throw new Error("URL phải bắt đầu bằng http:// hoặc https://");
};

const phoneValidator = async (_, v) => {
  const val = trim(v) || "";
  if (!val) throw new Error("Nhập số điện thoại");
  if (!/^(\+?84|0)\d{8,10}$/.test(val)) {
    throw new Error("SĐT không hợp lệ. Ví dụ: +84901234567 hoặc 0901234567");
  }
};

export default function StaffField() {
  console.log("[DEBUG] StaffField rendered"); // ✅ Debug

  return (
    <>
      <Title level={5} style={{ marginBottom: 12 }}>
        Thông tin nhân viên
      </Title>

      <Row gutter={[24, 0]}>
        <Col xs={24} md={12}>
          <Form.Item label="Mã nhân viên" name="staffId">
            <InputNumber style={{ width: "100%" }} disabled />
          </Form.Item>

          <Form.Item
            label="Họ và tên"
            name="fullName"
            normalize={trim}
            rules={[{ required: true, message: "Nhập họ và tên" }]}
          >
            <Input placeholder="Nguyễn Văn A" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            normalize={trim}
            rules={[{ type: "email", message: "Email không hợp lệ" }]}
          >
            <Input placeholder="user@example.com" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label="SĐT"
            name="phone"
            normalize={trim}
            rules={[{ validator: phoneValidator }]}
            tooltip="Bắt đầu bằng +84 hoặc 0"
          >
            <Input placeholder="+84xxxxxxxxxx hoặc 0xxxxxxxxx" />
          </Form.Item>

          <Form.Item label="Địa chỉ" name="address" normalize={trim}>
            <Input placeholder="Số 1, Đường A, Quận B" />
          </Form.Item>

          <Form.Item
            label="Avatar URL"
            name="avatarUrl"
            normalize={trim}
            rules={[{ validator: urlValidator }]}
            tooltip="Để trống hoặc dùng link http(s) hợp lệ"
          >
            <Input placeholder="https://example.com/avatar.png" allowClear />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}
