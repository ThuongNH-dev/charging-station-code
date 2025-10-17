import React, { useEffect, useState } from "react";
//import { getCurrentUser, updateUser } from "../../api/profileApi";
import ProfileSidebar from "../form/Info/ProfileSidebar";
import "./UpdateProfile.css";
import MainLayout from "../../layouts/MainLayout";
import ChangePassword from "./ChangePassword";
// import VehicleInfo from "./VehicleInfo";
// import PaymentMethods from "./PaymentMethods";

export default function UpdateInfo() {
  const [activeTab, setActiveTab] = useState("update-info");

  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        setForm({
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUser(form);
      setMsg("Cập nhật thành công!");
    } catch (err) {
      setMsg(err.message || "Cập nhật thất bại!");
    } finally {
      setSaving(false);
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
                />

                <label>Số điện thoại</label>
                <input
                  name="phone"
                  value={form.phone}
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

          {activeTab === "vehicle-info" && <VehicleInfo />}

          {activeTab === "payment-methods" && <PaymentMethods />}
        </div>
      </aside>
    </MainLayout>
  );
}
