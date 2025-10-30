// ✅ src/pages/updateProfileEnterprise/EnterpriseInfo.jsx
import React, { useEffect, useState } from "react";
import { Form, Button, message, Spin, Alert } from "antd";
import "../updateProfilePerson/UpdateProfile.css";
import ProfileSidebar from "../form/Info/ProfileSidebar";
import EnterpriseField from "../form/Info/EnterpriseField";
import MainLayout from "../../layouts/MainLayout";
import { getEnterpriseInfo, updateEnterpriseInfo } from "../../api/profileApi";

function fixUrl(input) {
  const val = (input || "").trim();
  if (!val) return ""; // để trống
  if (/^https?:\/\//i.test(val)) return val;
  // auto thêm https:// nếu thiếu
  return `https://${val}`;
}

export default function EnterpriseInfo() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasCompany, setHasCompany] = useState(false);

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
        setHasCompany(!!data.companyId);
      } catch (err) {
        console.error("[EnterpriseInfo] load error:", err);
        message.error("Không tải được thông tin doanh nghiệp");
      } finally {
        setLoading(false);
      }
    })();
  }, [form]);

  const onFinish = async (values) => {
    if (!values.companyId) {
      message.error(
        "Tài khoản chưa gắn Doanh nghiệp (thiếu CompanyId). Không thể cập nhật."
      );
      return;
    }

    const key = "enterprise-save";
    setSaving(true);
    message.loading({ key, content: "Đang lưu...", duration: 0 });

    try {
      const payload = {
        companyId: values.companyId,
        name: (values.name || "").trim(),
        taxCode: (values.taxCode || "").trim(),
        email: (values.email || "").trim(),
        phone: (values.phone || "").trim(),
        address: (values.address || "").trim(),
        imageUrl: fixUrl(values.imageUrl), // ✅ tự thêm https:// nếu thiếu
      };

      const saved = await updateEnterpriseInfo(payload);
      form.setFieldsValue(saved);

      message.success({
        key,
        content: "Đã lưu thông tin doanh nghiệp!",
        duration: 2,
      });
    } catch (err) {
      // err.message có thể chứa nhiều dòng từ BE (đã gom trong profileApi.js)
      message.error({
        key,
        content: String(err?.message || "Cập nhật thất bại!"),
        duration: 4,
      });
      console.error("[EnterpriseInfo] save error:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spin tip="Đang tải..." />;

  return (
    <MainLayout>
      <aside className="profile-page-layout">
        <ProfileSidebar />

        <div className="profile-main-card">
          <h3>Cập nhật thông tin doanh nghiệp</h3>

          {!hasCompany && (
            <Alert
              style={{ margin: "8px 50px 0" }}
              type="warning"
              message="Tài khoản của bạn chưa gắn với doanh nghiệp nào (không có CompanyId). Liên hệ Admin để gắn doanh nghiệp trước khi cập nhật."
              showIcon
            />
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            className="profile-form"
            style={{ height: "auto", width: 500, marginTop: 10 }}
          >
            <EnterpriseField />

            <div className="form-actions" style={{ marginTop: 24 }}>
              <Button
                type="primary"
                htmlType="submit"
                className="btn save"
                loading={saving}
                disabled={!hasCompany}
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
