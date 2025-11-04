import React, { useEffect, useState } from "react";
import { Form, Button, message, Spin } from "antd";
import "../../components/updateProfilePerson/UpdateProfile.css";

import ProfileSidebar from "../../components/form/Info/ProfileSidebar";
import AdminField from "../../components/form/Info/AdminField";
import MainLayout from "../../layouts/MainLayout";
import { getAdminInfo, updateAdminInfo } from "../../api/profileApi";

export default function AdminInfo() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasAdmin, setHasAdmin] = useState(false);

  useEffect(() => {
    console.log("[DEBUG] AdminInfo mounted");
    (async () => {
      try {
        const data = await getAdminInfo();
        console.log("[DEBUG] API getAdminInfo (normalized):", data);

        form.setFieldsValue({
          adminId: data.customerId ?? "",
          fullName: data.fullName ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          address: data.address ?? "",
          avatarUrl: data.avatarUrl ?? "",
        });

        setHasAdmin(!!data.customerId);
      } catch (err) {
        console.error("[AdminInfo] load error:", err);
        message.error("Không tải được thông tin admin");
      } finally {
        setLoading(false);
      }
    })();
  }, [form]);

  const onFinish = async (values) => {
    console.log("[DEBUG] onFinish values:", values);
    if (!values.adminId) {
      message.error("Không tìm thấy mã admin (adminId). Không thể cập nhật.");
      return;
    }

    const key = "admin-save";
    setSaving(true);
    message.loading({ key, content: "Đang lưu...", duration: 0 });

    try {
      const payload = {
        adminId: values.adminId,
        fullName: (values.fullName || "").trim(),
        phone: (values.phone || "").trim(),
        email: (values.email || "").trim(),
        address: (values.address || "").trim(),
        avatarUrl: (values.avatarUrl || "").trim(),
      };

      console.log("[DEBUG] Gửi updateAdminInfo:", payload);
      const saved = await updateAdminInfo(payload);
      console.log("[DEBUG] updateAdminInfo response:", saved);

      form.setFieldsValue(saved);
      message.success({
        key,
        content: "Đã lưu thông tin admin!",
        duration: 2,
      });
    } catch (err) {
      console.error("[AdminInfo] save error:", err);
      message.error({
        key,
        content: String(err?.message || "Cập nhật thất bại!"),
        duration: 4,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <Spin spinning tip="Đang tải..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <aside className="profile-page-layout">
        <ProfileSidebar />
        <div className="profile-main-card">
          <h3>Cập nhật thông tin quản trị viên</h3>

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            className="profile-form"
            style={{ height: "auto", width: 500, marginTop: 10 }}
          >
            <AdminField />

            <div className="form-actions" style={{ marginTop: 24 }}>
              <Button
                type="primary"
                htmlType="submit"
                className="nn btn-save"
                loading={saving}
                disabled={!hasAdmin}
              >
                {saving ? "Đang lưu..." : "LƯU"}
              </Button>
              <Button
                danger
                className="nn btn-cancel"
                onClick={() => window.location.reload()}
              >
                HỦY
              </Button>
            </div>
          </Form>
        </div>
      </aside>
    </MainLayout>
  );
}
