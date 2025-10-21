// src/components/updateProfilePerson/EnterpriseInfo.jsx
import React, { useEffect, useState } from "react";
import { Form, Button, message, Spin } from "antd";
import "../updateProfilePerson/UpdateProfile.css";
import ProfileSidebar from "../form/Info/ProfileSidebar";
import EnterpriseField from "../form/Info/EnterpriseField";

import MainLayout from "../../layouts/MainLayout";

// import API functions
// import { getEnterpriseInfo, updateEnterpriseInfo } from "../../api/profileApi";

export default function EnterpriseInfo() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // 👇 Lấy dữ liệu từ BE
        const data = await getEnterpriseInfo(); // trả về object
        form.setFieldsValue({
          enterpriseName: data.enterpriseName || "",
          industry: data.industry || "",
          representativeName: data.representativeName || "",
          phone: data.phone || "",
          taxCode: data.taxCode || "",
          address: data.address || "",
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [form]);

  const onFinish = async (values) => {
    setSaving(true);
    try {
      await updateEnterpriseInfo(values);
      message.success("Cập nhật thông tin doanh nghiệp thành công!");
    } catch (err) {
      message.error(err.message || "Cập nhật thất bại!");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spin tip="Đang tải..." />;

  return (
    <MainLayout>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: "40px",
          padding: "40px 0",
        }}
      >
        {/* Cột trái: menu sidebar */}
        <div style={{ flex: "0 0 280px" }}>
          <ProfileSidebar />
        </div>

        {/* Cột phải: form cập nhật */}
        <div style={{ flex: 1, maxWidth: 600 }}>
          <h3 style={{ marginBottom: 24 }}>Cập nhật thông tin doanh nghiệp</h3>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            style={{ width: "100%" }}
          >
            <EnterpriseField />

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={saving}>
                {saving ? "Đang lưu..." : "Lưu"}
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </MainLayout>
  );
}
