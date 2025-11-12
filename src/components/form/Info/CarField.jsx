// src/components/form/Info/CarField.jsx
import React from "react";
import { Row, Col, Form, Input, InputNumber, Select, Typography } from "antd";

const { Option } = Select;
const { Title } = Typography;

export default function CarField({
  hideStatus = false,
  lockStatus = false,
}) {
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
            name="vehicleType" // ✅ trùng với VehicleInfo
            rules={[{ required: true, message: "Vui lòng chọn loại xe" }]}
          >
            <Select placeholder="Chọn loại xe">
              <Option value="Car">Ô tô</Option>
              <Option value="Motorbike">Xe máy</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label={<strong>Hãng xe</strong>}
            name="carMaker" // ✅
            rules={[{ required: true, message: "Vui lòng nhập hãng xe" }]}
          >
            <Input placeholder="VD: VinFast" />
          </Form.Item>

          <Form.Item
            label={<strong>Dòng xe</strong>}
            name="model" // ✅
            rules={[{ required: true, message: "Vui lòng nhập dòng xe" }]}
          >
            <Input placeholder="VD: VF8" />
          </Form.Item>

          <Form.Item
            label={<strong>Năm sản xuất</strong>}
            name="manufactureYear" // ✅
            rules={[{ required: true, message: "Vui lòng nhập năm sản xuất" }]}
          >
            <InputNumber
              style={{ width: "100%" }}
              placeholder="VD: 2025"
              min={1900}
              max={2100}
            />
          </Form.Item>

          <Form.Item
            name="connectorType" // ✅ Input text
            label={<strong>Cổng sạc</strong>}
            rules={[
              { required: true, message: "Nhập cổng sạc (VD: CCS2, Type2…)" },
              { max: 50, message: "Tối đa 50 ký tự" },
            ]}
          >
            <Input placeholder="VD: CCS2, Type2, CHAdeMO…" allowClear />
          </Form.Item>
        </Col>

        {/* Cột phải */}
        <Col xs={24} md={12}>
          <Form.Item
            label={<strong>Biển số xe</strong>}
            name="licensePlate" // ✅
            rules={[
              { required: true, message: "Vui lòng nhập biển số" },
              {
                pattern: /^[A-Z0-9.\-\s]{4,20}$/i,
                message: "Biển số không hợp lệ",
              },
            ]}
          >
            <Input placeholder="VD: 51H-123.45" />
          </Form.Item>

          {/* ➕ Mã công ty (không bắt buộc) */}
          <Form.Item
            label={<strong>Mã công ty</strong>}
            name="companyCode" // <— key lưu vào form
            rules={[
              { max: 50, message: "Tối đa 50 ký tự" }, // không required
            ]}
          >
            <Input placeholder="VD: C001, ABC-123..." allowClear />
          </Form.Item>

          <Form.Item
            label={<strong>Dung lượng pin (kWh)</strong>}
            name="batteryCapacity" // ✅
            rules={[{ required: true, message: "Nhập dung lượng pin" }]}
          >
            <InputNumber
              style={{ width: "100%" }}
              placeholder="VD: 82"
              min={0}
            />
          </Form.Item>

          <Form.Item
            label={<strong>Pin hiện tại (%)</strong>}
            name="currentSoc" // ✅
            rules={[{ required: true, message: "Nhập SOC hiện tại" }]}
          >
            <InputNumber
              style={{ width: "100%" }}
              placeholder="VD: 40"
              min={0}
              max={100}
            />
          </Form.Item>

          {/* <Form.Item
            label={<strong>Ảnh (URL)</strong>}
            name="imageUrl" // ✅ optional
          >
            <Input placeholder="https://..." allowClear />
          </Form.Item> */}

          {!hideStatus && (
            <Form.Item
              label={<strong>Trạng thái</strong>}
              name="status"
              rules={[{ required: true, message: "Chọn trạng thái" }]}
            >
              <Select
                placeholder="Chọn trạng thái"
                disabled={true /* luôn khóa ở UI */}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.85)",
                  color: "#000",
                  borderRadius: 6,
                }}
                dropdownStyle={{ backgroundColor: "#fff" }}
              >
                {/* Giá trị khớp với BE & ALLOWED_STATUSES */}
                <Select.Option value="Active">Hoạt động</Select.Option>
                <Select.Option value="Inactive">Vô hiệu hóa</Select.Option>
                <Select.Option value="Blacklisted">Cấm</Select.Option>
                <Select.Option value="Retired">Ngừng sử dụng</Select.Option>
              </Select>
            </Form.Item>
          )}
        </Col>
      </Row>
    </>
  );
}
