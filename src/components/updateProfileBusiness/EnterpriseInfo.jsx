import React, { useEffect, useState } from "react";
import { Form, Button, message, Spin } from "antd";
import "../updateProfilePerson/UpdateProfile.css";
import ProfileSidebar from "../form/Info/ProfileSidebar";
import EnterpriseField from "../form/Info/EnterpriseField";
import MainLayout from "../../layouts/MainLayout";

// ✅ import API mới (mock + BE)
import { getEnterpriseInfo, updateEnterpriseInfo } from "../../api/profileApi";

export default function EnterpriseInfo() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getEnterpriseInfo();
        form.setFieldsValue({
          companyId: data.companyId ?? undefined,
          name: data.name ?? "",
          taxCode: data.taxCode ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          address: data.address ?? "",
          imageUrl: data.imageUrl ?? "",
        });
      } catch (err) {
        console.error(err);
        message.error("Không tải được thông tin doanh nghiệp");
      } finally {
        setLoading(false);
      }
    })();
  }, [form]);

  const onFinish = async (values) => {
    setSaving(true);
    try {
      const saved = await updateEnterpriseInfo(values);
      form.setFieldsValue(saved);
      message.success("Cập nhật thông tin doanh nghiệp thành công!");
    } catch (err) {
      message.error(err?.message || "Cập nhật thất bại!");
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
          gap: 40,
          padding: "40px 0",
        }}
      >
        {/* Sidebar trái */}
        <div style={{ flex: "0 0 280px" }}>
          <ProfileSidebar />
        </div>

        {/* Form phải */}
        <div style={{ flex: 1, maxWidth: 680 }}>
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
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </Form.Item>
          </Form>

          {/* Gợi ý: liên kết sang trang đổi mật khẩu cá nhân */}
          <div style={{ marginTop: 8, opacity: 0.8 }}>
            Muốn đổi mật khẩu? Vào mục <b>Cá nhân → Đổi mật khẩu</b>.
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
