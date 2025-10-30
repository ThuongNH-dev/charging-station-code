// src/components/updateProfilePerson/UpdateInfo.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as profileApi from "../../api/profileApi";
import ProfileSidebar from "../form/Info/ProfileSidebar";
import "./UpdateProfile.css";
import MainLayout from "../../layouts/MainLayout";
import ChangePassword from "./ChangePassword";

// BE cần: { customerId, fullName, phone, address, email }
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export default function UpdateInfo() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("update-info");
  const [user, setUser] = useState(null);
  const [emailOriginal, setEmailOriginal] = useState("");

  // Dùng đúng schema BE
  const [form, setForm] = useState({
    customerId: "",
    fullName: "",
    email: "",
    phone: "",
    address: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // { Email: '...', FullName: '...' }

  const emailChanged = useMemo(
    () => form.email.trim() !== emailOriginal.trim(),
    [form.email, emailOriginal]
  );

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

        console.time("[UpdateInfo] profileApi.getCurrentUser]");
        const current = await profileApi.getCurrentUser({ accountId });
        console.timeEnd("[UpdateInfo] profileApi.getCurrentUser]");
        console.debug("[UpdateInfo] current user:", current);

        // Nếu là Staff → điều hướng sang trang StaffInfo
        if ((current.role || "").toLowerCase() === "staff") {
          navigate("/profile/staff-info", { replace: true });
          return;
        }

        setUser(current);
        setEmailOriginal(current.email || "");
        setForm({
          customerId: current.customerId ?? "",
          fullName: current.fullName || current.name || "",
          email: current.email || "",
          phone: current.phone || "",
          address: current.address || "",
        });
      } catch (err) {
        console.error("[UpdateInfo] init error:", err);
        setErrMsg("Không tải được thông tin tài khoản. Vui lòng thử lại.");
      } finally {
        setLoading(false);
        console.timeEnd("[UpdateInfo] total");
        console.groupEnd();
      }
    })();
  }, [navigate]);

  const handleChange = (e) => {
    setErrMsg("");
    setMsg("");
    setFieldErrors({});
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  function validateClient() {
    const errs = {};
    if (!String(form.fullName || "").trim())
      errs.FullName = "Họ tên không được để trống.";
    if (!String(form.email || "").trim())
      errs.Email = "Email không được để trống.";
    else if (!emailRegex.test(String(form.email).trim()))
      errs.Email = "Email không hợp lệ.";
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      setErrMsg("Vui lòng kiểm tra lại các trường bị lỗi.");
      return false;
    }
    return true;
  }

  function parseAspNetErrors(errorObj) {
    const errs = {};
    const node =
      errorObj?.errors ||
      errorObj?.data?.errors ||
      errorObj?.response?.errors ||
      null;

    if (node && typeof node === "object") {
      for (const k of Object.keys(node)) {
        const arr = node[k];
        if (Array.isArray(arr) && arr.length) errs[k] = arr.join(" ");
      }
    } else if (errorObj?.message) {
      errs.General = errorObj.message;
    }
    return errs;
  }

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;

    setErrMsg("");
    setFieldErrors({});
    setMsg("");
    if (!validateClient()) return;

    console.groupCollapsed(
      "%c[UpdateInfo] Save",
      "color:#52c41a;font-weight:bold;"
    );
    setSaving(true);

    try {
      // Payload đúng theo Swagger
      const payload = {
        customerId: Number(form.customerId ?? user.customerId), // đảm bảo là số
        fullName: String(form.fullName || "").trim(),
        phone: String(form.phone || "").trim(),
        address: String(form.address || "").trim(),
        email: String(form.email || "").trim(),
      };

      console.debug("[UpdateInfo] payload (update-customer):", payload);

      // Gọi đúng API trong profileApi.updateUser (PUT /api/Auth/update-customer)
      const updated = await profileApi.updateUser(payload, {
        type: "customer",
      });

      console.debug("[UpdateInfo] updated user:", updated);
      setUser(updated);
      setEmailOriginal(updated.email || "");
      setForm({
        customerId: updated.customerId ?? "",
        fullName: updated.fullName || updated.name || "",
        email: updated.email || "",
        phone: updated.phone || "",
        address: updated.address || "",
      });

      setMsg("Cập nhật thành công!");
    } catch (err) {
      console.error("[UpdateInfo] save error:", err);
      const errs = parseAspNetErrors(err);
      if (Object.keys(errs).length) setFieldErrors(errs);
      setErrMsg(errs.General || err?.message || "Cập nhật thất bại!");
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

              {(msg || errMsg) && (
                <div
                  className={`alert ${
                    errMsg ? "alert-error" : "alert-success"
                  }`}
                  style={{ marginBottom: 12 }}
                >
                  {errMsg || msg}
                </div>
              )}

              <form className="profile-form" onSubmit={handleSave}>
                {/* CustomerId: hiển thị nhưng không cho sửa */}
                <label>Mã khách hàng</label>
                <input
                  name="customerId"
                  value={form.customerId}
                  readOnly
                  disabled
                  className="input-disabled"
                  title="Mã khách hàng – không thể chỉnh sửa"
                />

                <label>Họ tên</label>
                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  aria-invalid={!!fieldErrors.FullName}
                />
                {fieldErrors.FullName && (
                  <p className="field-error">{fieldErrors.FullName}</p>
                )}

                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  aria-invalid={!!fieldErrors.Email}
                />
                {fieldErrors.Email && (
                  <p className="field-error">{fieldErrors.Email}</p>
                )}

                <label>Số điện thoại</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  aria-invalid={!!fieldErrors.Phone}
                />
                {fieldErrors.Phone && (
                  <p className="field-error">{fieldErrors.Phone}</p>
                )}

                <label>Địa chỉ</label>
                <input
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  aria-invalid={!!fieldErrors.Address}
                />
                {fieldErrors.Address && (
                  <p className="field-error">{fieldErrors.Address}</p>
                )}

                {emailChanged && (
                  <p className="hint" style={{ marginTop: 8 }}>
                    Bạn đang thay đổi email đăng nhập. Sau khi lưu, có thể cần
                    đăng nhập lại hoặc làm mới phiên nếu hệ thống yêu cầu.
                  </p>
                )}

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
              </form>
            </>
          )}

          {activeTab === "change-password" && <ChangePassword />}
        </div>
      </aside>
    </MainLayout>
  );
}
