// src/components/admin/pages/pricing/PricingRuleModal.jsx
import React, { useEffect } from "react";
import { Modal, Select, InputNumber, Form, message } from "antd";

export default function PricingRuleModal({
  open,
  onClose,
  isEdit,
  initialData,
  onSave,
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        ...initialData,
        PricePerKwh: initialData?.PricePerKwh || 0,
        IdleFeePerMin: initialData?.IdleFeePerMin || 0,
        PowerKw: initialData?.PowerKw || 0,
      });
    } else {
      form.resetFields();
    }
  }, [open, initialData, form]);

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        onSave(values);
      })
      .catch(() => {
        message.warning(
          "Vui lòng điền đầy đủ và chính xác các trường bắt buộc."
        );
      });
  };

  return (
    <Modal
      title={
        isEdit
          ? `Sửa Quy tắc Giá #${initialData?.PricingRuleId}`
          : "Tạo Quy tắc Giá Mới"
      }
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText={isEdit ? "Lưu thay đổi" : "Tạo Rule"}
      cancelText="Hủy"
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        {/* 1. Loại sạc (ChargerType) */}
        <Form.Item
          name="ChargerType"
          label="Loại sạc"
          rules={[{ required: true, message: "Vui lòng chọn loại sạc!" }]}
        >
          <Select placeholder="Chọn loại sạc">
            <Select.Option value="DC">DC (Nhanh)</Select.Option>
            <Select.Option value="AC">AC (Thường)</Select.Option>
          </Select>
        </Form.Item>

        {/* 2. Công suất (PowerKw) */}
        <Form.Item
          name="PowerKw"
          label="Công suất (kW)"
          rules={[{ required: true, message: "Vui lòng nhập công suất!" }]}
        >
          <InputNumber
            min={1}
            style={{ width: "100%" }}
            placeholder="Ví dụ: 50, 120"
          />
        </Form.Item>

        {/* 3. Khung giờ (TimeRange) */}
        <Form.Item
          name="TimeRange"
          label="Khung giờ"
          rules={[{ required: true, message: "Vui lòng chọn khung giờ!" }]}
        >
          <Select placeholder="Chọn khung giờ áp dụng">
            <Select.Option value="Peak">Cao điểm (Peak)</Select.Option>
            <Select.Option value="Normal">Bình thường (Normal)</Select.Option>
            <Select.Option value="OffPeak">Thấp điểm (OffPeak)</Select.Option>
            <Select.Option value="Any">Bất kỳ (Any)</Select.Option>
          </Select>
        </Form.Item>

        {/* 4. Giá (PricePerKwh) */}
        <Form.Item
          name="PricePerKwh"
          label="Giá sạc (VNĐ/kWh)"
          rules={[{ required: true, message: "Vui lòng nhập giá/kWh!" }]}
        >
          <InputNumber
            min={0}
            style={{ width: "100%" }}
            formatter={(value) =>
              `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            placeholder="Ví dụ: 5000"
          />
        </Form.Item>

        {/* 5. Phí chờ (IdleFeePerMin) */}
        <Form.Item
          name="IdleFeePerMin"
          label="Phí chờ (VNĐ/phút)"
          rules={[{ required: true, message: "Vui lòng nhập phí chờ!" }]}
        >
          <InputNumber
            min={0}
            style={{ width: "100%" }}
            formatter={(value) =>
              `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            placeholder="Ví dụ: 10000"
          />
        </Form.Item>

        {/* 6. Trạng thái (Status) */}
        <Form.Item
          name="Status"
          label="Trạng thái"
          initialValue="Active"
          rules={[{ required: true, message: "Vui lòng chọn trạng thái!" }]}
        >
          <Select>
            <Select.Option value="Active">Active (Hoạt động)</Select.Option>
            <Select.Option value="Inactive">
              Inactive (Không hoạt động)
            </Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
}
