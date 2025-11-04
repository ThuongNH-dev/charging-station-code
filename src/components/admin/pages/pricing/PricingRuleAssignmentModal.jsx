// src/components/admin/pages/pricing/PricingRuleAssignmentModal.jsx
import React, { useState } from "react";
import { Modal, Select, Form, message } from "antd";
import { pricingRuleApi } from "../../../../api/pricingRulesApi";

export default function PricingRuleAssignmentModal({ open, onClose, rules }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleAssign = () => {
    form.validateFields().then(async (values) => {
      setLoading(true);
      try {
        // targetIds là mảng các ID được chọn từ Select tags
        await pricingRuleApi.assignRules(values);
        message.success(
          `Đã gán Rule #${values.ruleId} cho ${values.targetIds.length} mục tiêu.`
        );
        onClose();
      } catch (error) {
        message.error(error.message || "Lỗi khi gán quy tắc giá hàng loạt.");
      } finally {
        setLoading(false);
      }
    });
  };

  // Tạo Options cho Select Rule
  const ruleOptions = rules.map((r) => ({
    value: r.PricingRuleId,
    label: `[#${r.PricingRuleId}] ${r.ChargerType} ${r.PowerKw}kW - ${
      r.TimeRange
    } (${Number(r.PricePerKwh).toLocaleString()}đ/kWh)`,
  }));

  return (
    <Modal
      title="Gán Quy tắc Giá Hàng loạt"
      open={open}
      onCancel={onClose}
      onOk={handleAssign}
      confirmLoading={loading}
      okText="Xác nhận Gán"
      cancelText="Hủy"
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        {/* Chọn Rule */}
        <Form.Item
          name="ruleId"
          label="Chọn Quy tắc Giá"
          rules={[
            { required: true, message: "Vui lòng chọn một Quy tắc giá!" },
          ]}
        >
          <Select placeholder="Chọn Rule cần áp dụng" options={ruleOptions} />
        </Form.Item>

        {/* Chọn Mục tiêu (Ports/Chargers) */}
        <Form.Item
          name="targetIds"
          label="ID Cổng/Bộ sạc áp dụng"
          rules={[
            {
              required: true,
              message: "Vui lòng nhập ít nhất một ID mục tiêu!",
            },
          ]}
        >
          <Select
            mode="tags"
            placeholder="Nhập Port ID hoặc Charger ID (Ví dụ: C001, P005, C003)"
            tokenSeparators={[",", " "]}
          />
        </Form.Item>
        <p style={{ color: "#999", fontSize: 13, marginTop: -10 }}>
          * Nhập các ID cách nhau bằng dấu phẩy (,) hoặc khoảng trắng.
        </p>
      </Form>
    </Modal>
  );
}
