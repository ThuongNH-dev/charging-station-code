import React, { useEffect, useState } from "react";
import { Form, Button, message, Card, Space } from "antd";
import {
  CreditCardOutlined,
  DeleteOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import PaymentField from "../form/Info/PaymentField";
import ProfileSidebar from "../form/Info/ProfileSidebar";
import "./VehicleInfo.css"; // Dùng layout và style chung
import MainLayout from "../../layouts/MainLayout";

export default function PaymentMethods() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState([]); // ✅ Danh sách thẻ đã lưu

  // 🔹 Lấy danh sách thẻ đã lưu từ BE
  const fetchCards = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/payment-methods", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Không thể tải danh sách thẻ!");
      const data = await res.json();
      setCards(data); // Ví dụ: [{id:1, bank:"MB", cardNumber:"****6666", isDefault:true}]
    } catch (err) {
      console.error(err);
      message.error("Lỗi khi tải danh sách thẻ!");
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  // 🔹 Gửi dữ liệu thêm thẻ mới
  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:8080/api/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Cập nhật thất bại!");
      message.success("Thêm thẻ thành công!");
      form.resetFields();
      fetchCards(); // refresh danh sách
    } catch (err) {
      console.error(err);
      message.error("Lỗi khi thêm thẻ!");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Xóa thẻ
  const handleDelete = async (id) => {
    try {
      const res = await fetch(
        `http://localhost:8080/api/payment-methods/${id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!res.ok) throw new Error("Không thể xóa thẻ!");
      message.success("Đã xóa thẻ thành công!");
      fetchCards();
    } catch (err) {
      console.error(err);
      message.error("Lỗi khi xóa thẻ!");
    }
  };

  return (
    <MainLayout>
      <div className="vehicle-page-container">
        <div className="vehicle-wrapper">
          {/* Sidebar */}
          <div className="vehicle-sidebar">
            <ProfileSidebar />
          </div>

          {/* Form */}
          <div className="vehicle-form-section">
            <h2 className="vehicle-title">Phương thức thanh toán</h2>

            {/* 🔸 Danh sách thẻ đã lưu */}
            <h3 style={{ fontWeight: "bold", marginBottom: 16 }}>
              Thẻ tín dụng hoặc thẻ ghi nợ
            </h3>

            {cards.length === 0 ? (
              <p>Chưa có thẻ nào được lưu.</p>
            ) : (
              <Space direction="vertical" style={{ width: "100%" }}>
                {cards.map((card) => (
                  <Card
                    key={card.id}
                    style={{
                      borderRadius: 10,
                      border: "1px solid #e0e0e0",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <CreditCardOutlined
                          style={{ fontSize: 24, color: "#0070f3" }}
                        />
                        <div>
                          <div style={{ fontWeight: 600 }}>{card.bank}</div>
                          <div style={{ color: "#666" }}>{card.cardNumber}</div>
                          {card.isDefault && (
                            <span
                              style={{
                                fontSize: 12,
                                background: "#eee",
                                borderRadius: 5,
                                padding: "2px 6px",
                                marginTop: 4,
                                display: "inline-block",
                              }}
                            >
                              MẶC ĐỊNH
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(card.id)}
                      >
                        Hủy thẻ
                      </Button>
                    </div>
                  </Card>
                ))}
              </Space>
            )}

            {/* 🔸 Thêm thẻ mới */}
            <h3 style={{ fontWeight: "bold", margin: "32px 0 12px" }}>
              Thêm thẻ tín dụng / Ghi nợ
            </h3>

            <Form
              layout="vertical"
              form={form}
              onFinish={handleSubmit}
              className="vehicle-info-form"
            >
              <PaymentField />
              <div className="form-actions">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  className="save-btn"
                >
                  Thêm thẻ
                </Button>
              </div>
            </Form>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
