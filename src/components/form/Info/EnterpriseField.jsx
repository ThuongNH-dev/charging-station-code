// ✅ src/pages/form/Info/EnterpriseField.jsx
import React from "react";
import { Row, Col, Form, Input, InputNumber, Typography } from "antd";

const { Title } = Typography;

/* ---------- Validators ---------- */
const trim = (v) => (typeof v === "string" ? v.trim() : v);

const urlValidator = async (_, v) => {
  const val = trim(v) || "";
  if (!val) return; // cho phép để trống
  const ok = /^https?:\/\/\S+$/i.test(val);
  if (!ok) throw new Error("URL phải bắt đầu bằng http:// hoặc https://");
};

const taxCodeValidator = async (_, v) => {
  const val = trim(v) || "";
  if (!val) throw new Error("Nhập mã số thuế");
  // 10 hoặc 13 chữ số
  if (!/^\d{10}(\d{3})?$/.test(val)) {
    throw new Error("Mã số thuế phải 10 hoặc 13 chữ số");
  }
};

const phoneValidator = async (_, v) => {
  const val = trim(v) || "";
  if (!val) throw new Error("Nhập số điện thoại");
  // +84xxxxxxxxx... hoặc 0xxxxxxxxx...
  if (!/^(\+?84|0)\d{8,10}$/.test(val)) {
    throw new Error("SĐT không hợp lệ. Ví dụ: +84901234567 hoặc 0901234567");
  }
};

export default function EnterpriseField() {
  return (
    <>
      <Title level={5} style={{ marginBottom: 12 }}>
        Thông tin doanh nghiệp
      </Title>

      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Form.Item label="Mã công ty" name="companyId">
            <InputNumber style={{ width: "100%" }} disabled />
          </Form.Item>

          <Form.Item
            label="Tên công ty"
            name="name"
            normalize={trim}
            rules={[{ required: true, message: "Nhập tên công ty" }]}
          >
            <Input placeholder="Công ty TNHH ABC" />
          </Form.Item>

          <Form.Item
            label="Mã số thuế"
            name="taxCode"
            normalize={trim}
            rules={[{ validator: taxCodeValidator }]}
            tooltip="Chỉ chấp nhận 10 hoặc 13 chữ số"
          >
            <Input placeholder="10 hoặc 13 số" />
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
            label="Logo / Ảnh"
            name="imageUrl"
            normalize={trim}
            rules={[{ validator: urlValidator }]}
            tooltip="Để trống hoặc dùng link http(s) hợp lệ"
          >
            <Input placeholder="https://example.com/logo.png" allowClear />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}
