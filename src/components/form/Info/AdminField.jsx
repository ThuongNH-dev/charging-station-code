import React from "react";
import { Form, Input } from "antd";

export default function AdminField() {
  return (
    <>
      <Form.Item name="adminId" label="Mã quản trị viên">
        <Input disabled />
      </Form.Item>

      <Form.Item
        name="fullName"
        label="Họ và tên"
        rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        name="phone"
        label="Số điện thoại"
        rules={[{ required: true, message: "Vui lòng nhập số điện thoại" }]}
      >
        <Input />
      </Form.Item>

      <Form.Item name="address" label="Địa chỉ">
        <Input />
      </Form.Item>

      <Form.Item name="avatarUrl" label="Ảnh đại diện (URL)">
        <Input />
      </Form.Item>
    </>
  );
}
