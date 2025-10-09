// src/components/form/Info/PaymentField.jsx
import React from "react";
import { Form, Input, Row, Col, DatePicker, Typography } from "antd";
import { CreditCardOutlined, CalendarOutlined, LockOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Title } = Typography;

export default function PaymentField() {
  const mainColor = "#006d32";

  return (
    <>
      <Title level={5} style={{ marginBottom: 12 }}>Thẻ tín dụng / Ghi nợ</Title>

      {/* Số thẻ */}
      <Form.Item
        label={<strong>Số thẻ</strong>}
        name="cardNumber"
        // Chuẩn hoá: loại bỏ khoảng trắng khi nhập
        getValueFromEvent={(e) => (e?.target?.value || "").replace(/\s+/g, "")}
        rules={[
          { required: true, message: "Vui lòng nhập số thẻ" },
          { pattern: /^\d{16}$/, message: "Số thẻ phải gồm 16 chữ số" },
        ]}
      >
        <Input
          placeholder="VD: 4111111111111111"
          prefix={<CreditCardOutlined style={{ color: mainColor }} />}
          maxLength={16}
          inputMode="numeric"
        />
      </Form.Item>

      <Row gutter={16}>
        {/* Ngày hết hạn (MM/YY) với icon bên trái */}
        <Col span={12}>
          <Form.Item label={<strong>Ngày hết hạn (MM/YY)</strong>} required>
            <div style={{ position: "relative" }}>
              <CalendarOutlined
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 10,
                  transform: "translateY(-50%)",
                  color: mainColor,
                  fontSize: 16,
                  zIndex: 1,
                }}
              />
              <Form.Item
                name="expiry"
                noStyle
                rules={[{ required: true, message: "Vui lòng chọn ngày hết hạn" }]}
              >
                <DatePicker
                  picker="month"
                  format="MM/YY"
                  placeholder="MM/YY"
                  inputReadOnly
                  allowClear={false}
                  suffixIcon={null}         //     {/* ẩn icon mặc định của DatePicker */}
                  style={{ width: "100%", paddingLeft: 36 }}
                  disabledDate={(current) => current && current.isBefore(dayjs(), "month")}
                />
              </Form.Item>
            </div>
          </Form.Item>
        </Col>

        {/* CVC */}
        <Col span={12}>
          <Form.Item
            label={<strong>Mã bảo mật (CVC)</strong>}
            name="cvc"
            rules={[
              { required: true, message: "Vui lòng nhập mã bảo mật" },
              { pattern: /^\d{3}$/, message: "CVC phải gồm 3 chữ số" },
            ]}
          >
            <Input
              placeholder="000"
              prefix={<LockOutlined style={{ color: mainColor }} />}
              maxLength={3}
              inputMode="numeric"
            />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}
