import React from "react";
import { Row, Col, Form, Input, InputNumber, Select, Typography } from "antd";

const { Title } = Typography;

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
            rules={[{ required: true, message: "Nhập tên công ty" }]}
          >
            <Input placeholder="Công ty TNHH ABC" />
          </Form.Item>

          <Form.Item
            label="Mã số thuế"
            name="taxCode"
            rules={[{ required: true, message: "Nhập mã số thuế" }]}
          >
            <Input placeholder="10 hoặc 13 số" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[{ type: "email", message: "Email không hợp lệ" }]}
          >
            <Input placeholder="user@example.com" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label="SĐT"
            name="phone"
            rules={[{ required: true, message: "Nhập số điện thoại" }]}
          >
            <Input placeholder="+84xxxxxxxxxx" />
          </Form.Item>

          <Form.Item label="Địa chỉ" name="address">
            <Input placeholder="Số 1, Đường A, Quận B" />
          </Form.Item>

          <Form.Item label="Logo / Ảnh" name="imageUrl">
            <Input placeholder="https://..." allowClear />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}
