import React, { useState } from "react";
import { Card, Form, Input, Select, Button, message, Tabs } from "antd";
import { Send, User, Building, Megaphone } from "lucide-react";
import { notificationApi } from "../../../api/notificationApi";

/** Trang ADMIN chỉ để GỬI thông báo (không có inbox) */

function SendForm({ mode }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const isCustomer = mode === "customer";

  const onFinish = async (v) => {
    setSubmitting(true);
    try {
      const base = {
        title: v.title,
        message: v.message,
        type: v.type || "Booking",
        priority: v.priority || "Normal",
        bookingId: v.bookingId ?? null,
        invoiceId: v.invoiceId ?? null,
        subscriptionId: v.subscriptionId ?? null,
        senderAdminId: v.senderAdminId ?? 1,
      };
      const res = isCustomer
        ? await notificationApi.sendToCustomer({
            ...base,
            customerId: Number(v.targetId),
          })
        : await notificationApi.sendToCompany({
            ...base,
            companyId: Number(v.targetId),
          });

      message.success(`Đã gửi #${res.notificationId} – ${res.title}`);
      form.resetFields();
    } catch (e) {
      message.error(e?.message || "Lỗi gửi thông báo");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card
      className="rounded-2xl shadow-sm"
      title={
        <div className="flex items-center gap-2">
          {isCustomer ? <User size={18} /> : <Building size={18} />}
          <span>Gửi tới {isCustomer ? "khách hàng" : "công ty"}</span>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ type: "Booking", priority: "Normal" }}
      >
        <Form.Item
          label={isCustomer ? "Customer ID" : "Company ID"}
          name="targetId"
          rules={[{ required: true, message: "Nhập ID hợp lệ" }]}
        >
          <Input type="number" placeholder={isCustomer ? "VD: 4" : "VD: 2"} />
        </Form.Item>

        <Form.Item
          label="Tiêu đề"
          name="title"
          rules={[{ required: true, message: "Nhập tiêu đề" }]}
        >
          <Input maxLength={200} placeholder="VD: Hehe" />
        </Form.Item>

        <Form.Item
          label="Nội dung"
          name="message"
          rules={[{ required: true, message: "Nhập nội dung" }]}
        >
          <Input.TextArea rows={3} placeholder="VD: Ừ / ok ..." />
        </Form.Item>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <Form.Item label="Loại" name="type">
            <Select
              options={[
                { value: "Booking", label: "Booking" },
                { value: "Invoice", label: "Invoice" },
                { value: "Subscription", label: "Subscription" },
                { value: "System", label: "System" },
              ]}
            />
          </Form.Item>
          <Form.Item label="Ưu tiên" name="priority">
            <Select
              options={[
                { value: "Low", label: "Low" },
                { value: "Normal", label: "Normal" },
                { value: "High", label: "High" },
              ]}
            />
          </Form.Item>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
          }}
        >
          <Form.Item label="Booking ID" name="bookingId">
            <Input type="number" placeholder="(tuỳ chọn)" />
          </Form.Item>
          <Form.Item label="Invoice ID" name="invoiceId">
            <Input type="number" placeholder="(tuỳ chọn)" />
          </Form.Item>
          <Form.Item label="Subscription ID" name="subscriptionId">
            <Input type="number" placeholder="(tuỳ chọn)" />
          </Form.Item>
        </div>

        <Form.Item label="Sender Admin ID" name="senderAdminId">
          <Input type="number" placeholder="VD: 1" />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          icon={<Send size={16} />}
          loading={submitting}
        >
          Gửi thông báo
        </Button>
      </Form>
    </Card>
  );
}

function BroadcastForm() {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const onFinish = async (v) => {
    setSubmitting(true);
    try {
      const payload = {
        audience: v.audience, // All | Customers | Companies
        title: v.title,
        message: v.message,
        type: v.type || "System",
        priority: v.priority || "Normal",
        bookingId: v.bookingId ?? null,
        invoiceId: v.invoiceId ?? null,
        subscriptionId: v.subscriptionId ?? null,
        senderAdminId: v.senderAdminId ?? 1,
      };
      const count = await notificationApi.broadcast(payload);
      message.success(`Đã gửi broadcast: ${count} thông báo`);
      form.resetFields();
    } catch (e) {
      message.error(e?.message || "Lỗi broadcast");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card
      className="rounded-2xl shadow-sm"
      title={
        <div className="flex items-center gap-2">
          <Megaphone size={18} />
          <span>Broadcast</span>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ audience: "All", type: "System", priority: "Normal" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
          }}
        >
          <Form.Item label="Đối tượng" name="audience">
            <Select
              options={[
                { value: "All", label: "All" },
                { value: "Customers", label: "Customers" },
                { value: "Companies", label: "Companies" },
              ]}
            />
          </Form.Item>
          <Form.Item label="Loại" name="type">
            <Select
              options={[
                { value: "System", label: "System" },
                { value: "Booking", label: "Booking" },
                { value: "Invoice", label: "Invoice" },
                { value: "Subscription", label: "Subscription" },
              ]}
            />
          </Form.Item>
          <Form.Item label="Ưu tiên" name="priority">
            <Select
              options={[
                { value: "Low", label: "Low" },
                { value: "Normal", label: "Normal" },
                { value: "High", label: "High" },
              ]}
            />
          </Form.Item>
        </div>

        <Form.Item label="Tiêu đề" name="title" rules={[{ required: true }]}>
          <Input placeholder="VD: Bảo trì hệ thống" />
        </Form.Item>
        <Form.Item label="Nội dung" name="message" rules={[{ required: true }]}>
          <Input.TextArea rows={3} placeholder="Nội dung broadcast" />
        </Form.Item>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
          }}
        >
          <Form.Item label="Booking ID" name="bookingId">
            <Input type="number" placeholder="(tuỳ chọn)" />
          </Form.Item>
          <Form.Item label="Invoice ID" name="invoiceId">
            <Input type="number" placeholder="(tuỳ chọn)" />
          </Form.Item>
          <Form.Item label="Subscription ID" name="subscriptionId">
            <Input type="number" placeholder="(tuỳ chọn)" />
          </Form.Item>
        </div>

        <Form.Item label="Sender Admin ID" name="senderAdminId">
          <Input type="number" placeholder="VD: 1" />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          icon={<Send size={16} />}
          loading={submitting}
        >
          Gửi broadcast
        </Button>
      </Form>
    </Card>
  );
}

export default function AdminNotificationsSendPage() {
  return (
    <div className="p-4 grid gap-4">
      <Tabs
        defaultActiveKey="direct"
        items={[
          {
            key: "direct",
            label: "Gửi trực tiếp",
            children: (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 16,
                }}
                className="lg:grid-cols-2"
              >
                <SendForm mode="customer" />
                <SendForm mode="company" />
              </div>
            ),
          },
          {
            key: "broadcast",
            label: "Broadcast (tuỳ chọn)",
            children: <BroadcastForm />,
          },
        ]}
      />
    </div>
  );
}
