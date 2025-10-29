// ✅ src/pages/updateProfileStaff/StaffInfo.jsx
import React, { useEffect, useState } from "react";
import { Form, Button, message, Spin } from "antd";
import "../../components/updateProfilePerson/UpdateProfile.css";

import ProfileSidebar from "../../components/form/Info/ProfileSidebar";
import StaffField from "../../components/form/Info/StaffField";
import MainLayout from "../../layouts/MainLayout";
import { getStaffInfo, updateStaffInfo } from "../../api/profileApi";

export default function StaffInfo() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasStaff, setHasStaff] = useState(false);

  useEffect(() => {
    console.log("[DEBUG] StaffInfo mounted");
    (async () => {
      try {
        const data = await getStaffInfo();
        console.log("[DEBUG] API getStaffInfo (normalized):", data);

        form.setFieldsValue({
          // 🚀 Giờ data.customerId đã có giá trị 3
          customerId: data.customerId ?? "",
          fullName: data.fullName ?? "",
          phone: data.phone ?? "",
          address: data.address ?? "",
          avatarUrl: data.avatarUrl ?? "",
        });

        // 🚀 Kiểm tra hasStaff dựa trên customerId đã chuẩn hóa
        setHasStaff(!!data.customerId);
      } catch (err) {
        console.error("[StaffInfo] load error:", err);
        message.error("Không tải được thông tin nhân viên");
      } finally {
        setLoading(false);
      }
    })();
  }, [form]);

  const onFinish = async (values) => {
    console.log("[DEBUG] onFinish values:", values);
    if (!values.customerId) {
      message.error(
        "Không tìm thấy mã nhân viên (customerId). Không thể cập nhật."
      );
      return;
    }

    const key = "staff-save";
    setSaving(true);
    message.loading({ key, content: "Đang lưu...", duration: 0 });

    try {
      const payload = {
        customerId: values.customerId, // 🚀 Gửi customerId
        fullName: (values.fullName || "").trim(),
        phone: (values.phone || "").trim(),
        address: (values.address || "").trim(),
        avatarUrl: (values.avatarUrl || "").trim(),
      };

      console.log("[DEBUG] Gửi updateStaffInfo:", payload);
      const saved = await updateStaffInfo(payload);
      console.log("[DEBUG] updateStaffInfo response:", saved);

      form.setFieldsValue(saved);
      message.success({
        key,
        content: "Đã lưu thông tin nhân viên!", // Hoặc "Lưu thành công!"
        duration: 2,
      });
    } catch (err) {
      console.error("[StaffInfo] save error:", err);
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
          <h3>Cập nhật thông tin nhân viên</h3>

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            className="profile-form"
            style={{ height: "auto", width: 500, marginTop: 10 }}
          >
            <StaffField />

            <div className="form-actions" style={{ marginTop: 24 }}>
              <Button
                type="primary"
                htmlType="submit"
                className="btn save"
                loading={saving}
                disabled={!hasStaff}
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </Button>
              <Button
                danger
                className="btn cancel"
                onClick={() => window.location.reload()}
              >
                Hủy
              </Button>
            </div>
          </Form>
        </div>
      </aside>
    </MainLayout>
  );
}
