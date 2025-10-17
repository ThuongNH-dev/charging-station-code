// ✅ src/components/updateProfilePerson/VehicleInfo.jsx
import React, { useState } from "react";
import { Form, Button, message } from "antd";
import CarField from "../form/Info/CarField";
import ProfileSidebar from "../form/Info/ProfileSidebar";
import "./VehicleInfo.css";
import MainLayout from "../../layouts/MainLayout";

export default function VehicleInfo() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      console.log("🚗 Dữ liệu gửi BE:", values);

      // Gọi API (giả lập)
      const res = await fetch("https://api.example.com/vehicle-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) throw new Error("Cập nhật thất bại");
      message.success("Cập nhật thông số xe thành công!");
    } catch (err) {
      console.error(err);
      message.error("Lỗi khi cập nhật thông tin xe!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="vehicle-page-container">
        <div className="vehicle-wrapper">
          {/* Sidebar bên trái */}
          <div className="vehicle-sidebar">
            <ProfileSidebar />
          </div>

          {/* Form bên phải */}
          <div className="vehicle-form-section">
            <h2 className="vehicle-title">Cập nhật thông số xe</h2>

            <Form
              layout="vertical"
              form={form}
              onFinish={handleSubmit}
              className="vehicle-info-form"
            >
              <CarField />
              <div className="form-actions">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  className="save-btn"
                >
                  Lưu thay đổi
                </Button>
                <Button htmlType="button" className="cancel-btn">
                  Hủy
                </Button>
              </div>
            </Form>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
