// src/components/form/Info/CarField.jsx
import React from "react";
import { Row, Col, Form, Input, Select, Typography } from "antd";

const { Option } = Select;
const { Title } = Typography;

export default function CarField() {
  return (
    <>
      <Title level={5} style={{ marginBottom: 12 }}>
        Thông tin xe
      </Title>

      <Row gutter={64}>
        {/* Cột trái */}
        <Col xs={24} md={12}>
          <Form.Item
            label={<strong>Loại xe</strong>}
            name="type"
            rules={[{ required: true, message: "Vui lòng chọn loại xe" }]}
          >
            <Select placeholder="Chọn loại xe">
              <Option value="car">Ô tô</Option>
              <Option value="motorbike">Xe máy</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label={<strong>Hãng xe</strong>}
            name="brand"
            rules={[{ required: true, message: "Vui lòng nhập hãng xe" }]}
          >
            <Input placeholder="VD: VinFast" />
          </Form.Item>

          <Form.Item
            label={<strong>Dòng xe</strong>}
            name="model"
            rules={[{ required: true, message: "Vui lòng nhập dòng xe" }]}
          >
            <Input placeholder="VD: VF8" />
          </Form.Item>

          <Form.Item
            label={<strong>Năm sản xuất</strong>}
            name="year"
            rules={[
              { required: true, message: "Vui lòng nhập năm sản xuất" },
              { pattern: /^(19|20)\d{2}$/, message: "Năm hợp lệ dạng 4 số (VD: 2025)" },
            ]}
          >
            <Input placeholder="VD: 2025" maxLength={4} inputMode="numeric" />
          </Form.Item>
        </Col>

        {/* Cột phải */}
        <Col xs={24} md={12}>
          <Form.Item
            label={<strong>Đầu sạc</strong>}
            name="charger"
            rules={[{ required: true, message: "Vui lòng chọn đầu sạc" }]}
          >
            <Select placeholder="Chọn đầu sạc">
              <Option value="GX16">GX16 (48–60V / 3–5A)</Option>
              <Option value="GX20">GX20 (48–72V / 5–10A)</Option>
              <Option value="Smart charging">Smart charging (48–72V)</Option>
              <Option value="AC">AC</Option>
              <Option value="DC">DC</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label={<strong>Biển số xe</strong>}
            name="license"
            rules={[
              {
                required: true,
                pattern: /^[0-9]{2}[A-Z]-[0-9]{3}\.[0-9]{2}$/i,
                message: "Biển số không hợp lệ! VD: 51A-123.45",
              },
            ]}
          >
            <Input placeholder="VD: 51H-123.45" />
          </Form.Item>

          <Form.Item
            label={<strong>Dung lượng pin (kWh)</strong>}
            name="battery"
            rules={[
              { required: true, message: "Vui lòng nhập dung lượng pin" },
              { pattern: /^[0-9]+(\.[0-9]+)?$/, message: "Chỉ nhập số (VD: 82 hoặc 82.5)" },
            ]}
          >
            <Input placeholder="VD: 82" inputMode="decimal" />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}
