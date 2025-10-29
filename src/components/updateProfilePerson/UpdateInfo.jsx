// src/components/updateProfilePerson/UpdateInfo.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as profileApi from "../../api/profileApi";
import ProfileSidebar from "../form/Info/ProfileSidebar";
import "./UpdateProfile.css";
import MainLayout from "../../layouts/MainLayout";
import ChangePassword from "./ChangePassword";

export default function UpdateInfo() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("update-info");
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      console.groupCollapsed(
        "%c[UpdateInfo] Init load",
        "color:#1677ff;font-weight:bold;"
      );
      console.time("[UpdateInfo] total");
      try {
        const accountId = localStorage.getItem("accountId");
        const token = localStorage.getItem("token");
        console.debug("[UpdateInfo] localStorage:", {
          accountId,
          hasToken: !!token,
        });

        console.time("[UpdateInfo] profileApi.getCurrentUser");
        const current = await profileApi.getCurrentUser({ accountId });
        console.timeEnd("[UpdateInfo] profileApi.getCurrentUser");
        console.debug("[UpdateInfo] current user:", current);

        // Nếu là Staff → chuyển sang trang StaffInfo
        if ((current.role || "").toLowerCase() === "staff") {
          navigate("/profile/staff-info", { replace: true });
          return;
        }

        setUser(current);
        setForm({
          name: current.name || "",
          email: current.email || "",
          phone: current.phone || "",
          address: current.address || "",
        });
      } catch (err) {
        console.error("[UpdateInfo] init error:", err);
      } finally {
        setLoading(false);
        console.timeEnd("[UpdateInfo] total");
        console.groupEnd();
      }
    })();
  }, [navigate]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    console.groupCollapsed(
      "%c[UpdateInfo] Save",
      "color:#52c41a;font-weight:bold;"
    );
    setSaving(true);
    try {
      const payload = {
        ...form,
        role: user.role,
        customerId: user.customerId,
        companyId: user.companyId,
        companyName: user.companyName,
        taxCode: user.taxCode,
        imageUrl: user.avatarUrl,
      };
      const opts = {
        type: user.role?.toLowerCase() === "company" ? "company" : "customer",
      };
      console.debug("[UpdateInfo] payload:", payload, "opts:", opts);

      console.time("[UpdateInfo] profileApi.updateUser");
      const updated = await profileApi.updateUser(payload, opts);
      console.timeEnd("[UpdateInfo] profileApi.updateUser");

      console.debug("[UpdateInfo] updated user:", updated);
      setUser(updated);
      setForm({
        name: updated.name || "",
        email: updated.email || "",
        phone: updated.phone || "",
        address: updated.address || "",
      });
      setMsg("Cập nhật thành công!");
    } catch (err) {
      console.error("[UpdateInfo] save error:", err);
      setMsg(err?.message || "Cập nhật thất bại!");
    } finally {
      setSaving(false);
      console.groupEnd();
    }
  };

  if (loading) return <div>Đang tải...</div>;

  return (
    <MainLayout>
      <aside className="profile-page-layout">
        <ProfileSidebar activeTab={activeTab} onChangeTab={setActiveTab} />
        <div className="profile-main-card">
          {activeTab === "update-info" && (
            <>
              <h3>Cập nhật thông tin</h3>
              <form className="profile-form" onSubmit={handleSave}>
                <label>Họ tên</label>
                <input name="name" value={form.name} onChange={handleChange} />

                <label>Email</label>
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  disabled
                />

                <label>Số điện thoại</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                />

                <label>Địa chỉ</label>
                <input
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                />

                <div className="form-actions">
                  <button type="submit" className="btn save" disabled={saving}>
                    {saving ? "Đang lưu..." : "Lưu"}
                  </button>
                  <button
                    type="button"
                    className="btn cancel"
                    onClick={() => window.location.reload()}
                  >
                    Hủy
                  </button>
                </div>
                {msg && <p className="msg">{msg}</p>}
              </form>
            </>
          )}
          {activeTab === "change-password" && <ChangePassword />}
        </div>
      </aside>
    </MainLayout>
  );
}
