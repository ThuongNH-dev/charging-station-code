import React, { useEffect, useState } from "react";
import { Form, Button, message, Upload, Image } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import CarField from "../form/Info/CarField";
import ProfileSidebar from "../form/Info/ProfileSidebar";
import "./VehicleInfo.css";
import MainLayout from "../../layouts/MainLayout";
import { getApiBase } from "../../utils/api";

const API_BASE = (getApiBase() || "").replace(/\/+$/, "");

/* ================== AUTH/TOKEN HELPERS ================== */
function getToken() {
  // ưu tiên object user như trang dưới
  try {
    const u = JSON.parse(
      localStorage.getItem("user") || sessionStorage.getItem("user") || "null"
    );
    if (u?.token) return u.token;
  } catch { }
  const t =
    localStorage.getItem("token") || sessionStorage.getItem("token") || null;
  return t || null;
}

function getIdentityFromStorage() {
  const customerId = Number(
    localStorage.getItem("customerId") || sessionStorage.getItem("customerId")
  );
  const companyId = Number(
    localStorage.getItem("companyId") || sessionStorage.getItem("companyId")
  );
  const accountId = Number(
    localStorage.getItem("accountId") || sessionStorage.getItem("accountId")
  );
  return {
    customerId: Number.isFinite(customerId) ? customerId : null,
    companyId: Number.isFinite(companyId) ? companyId : null,
    accountId: Number.isFinite(accountId) ? accountId : null,
  };
}

// helpers cho payload
function toNumberOrNull(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function trimOrNull(v) {
  const s = (v ?? "").trim();
  return s === "" ? null : s;
}
function statusOrDefault(v) {
  const s = (v ?? "").trim();
  return s ? s : "Active";
}
function vehicleTypeOrDefault(v) {
  const s = (v ?? "").trim();
  return s ? s : "Car";
}


async function apiListVehicles({
  page = 1,
  pageSize = 50,
  customerId,
  companyId,
}) {
  const token = getToken();
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));
  if (Number.isFinite(customerId)) qs.set("customerId", String(customerId));
  if (Number.isFinite(companyId)) qs.set("companyId", String(companyId));

  const res = await fetch(`${API_BASE}/Vehicles?${qs.toString()}`, {
    method: "GET",
    headers: {
      accept: "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GET /Vehicles ${res.status}: ${text}`);
  }
  const data = await res.json().catch(() => null);
  return Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data)
      ? data
      : [];
}

async function apiCreateVehicle(payload) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/Vehicles`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST /Vehicles ${res.status}: ${text}`);
  }
  return await res.json();
}

async function apiUpdateVehicle(id, payload) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/Vehicles/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PUT /Vehicles ${res.status}: ${text}`);
  }
  if (res.status === 204) return { ...payload, vehicleId: Number(id) };
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json"))
    return { ...payload, vehicleId: Number(id) };
  const data = await res.json().catch(() => null);
  return data ?? { ...payload, vehicleId: Number(id) };
}

/* Upload ảnh file → multipart */
async function apiUploadVehicleImage(id, file) {
  const token = getToken();
  const fd = new FormData();
  fd.append("VehicleId", String(id)); // key phải trùng [FromForm] id
  fd.append("File", file); // key phải trùng [FromForm] file

  const res = await fetch(`${API_BASE}/Vehicles/image/upload`, {
    method: "POST",
    headers: {
      accept: "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      // KHÔNG set Content-Type để browser tự set boundary
    },
    body: fd,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST /Vehicles/image/upload ${res.status}: ${text}`);
  }
  return await res.json(); // VehicleReadDto có ImageUrl mới
}

/* ================== COMPONENT ================== */
export default function VehicleInfo() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentVehicle, setCurrentVehicle] = useState(null);
  const pageTitle = currentVehicle ? "Cập nhật thông số xe" : "Thêm xe mới";
  

  // upload state
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  // Helper: đọc vehicleId đã lưu (ưu tiên localStorage)
  function getStoredVehicleId() {
    try {
      const a = localStorage.getItem("vehicleId");
      const b = sessionStorage.getItem("vehicleId");
      const n = Number(a ?? b);
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  }

  // Helper: lấy vehicleId từ object BE (hỗ trợ nhiều casing)
  function pickVehicleId(obj) {
    const raw = obj?.vehicleId ?? obj?.VehicleId ?? obj?.id ?? obj?.Id;
    const n = Number(raw);
    // chỉ chấp nhận số nguyên dương > 0
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  // Mirror BE: các trạng thái hợp lệ
  const ALLOWED_STATUSES = ["Active", "Inactive", "Blacklisted", "Retired"];
  function normalizeStatusFE(s) {
    const v = String(s || "").trim();
    return ALLOWED_STATUSES.includes(v) ? v : "Active";
  }

  // Tiện ích: loại bỏ "string"
  const stripStringLiteral = (val) => {
    const v = String(val ?? "").trim();
    return v.toLowerCase() === "string" ? "" : v;
  };

  // CHUẨN HOÁ record BE -> Form values (đảm bảo đúng kiểu)
  function normalizeVehicleForForm(r, fallbackCompanyId, fallbackCustomerId) {
    if (!r) {
      return {
        customerId: Number.isFinite(fallbackCustomerId)
          ? Number(fallbackCustomerId)
          : undefined,
        companyId: Number.isFinite(fallbackCompanyId)
          ? Number(fallbackCompanyId)
          : undefined,
        vehicleType: "Car",
        status: "Active",
        imageUrl: "", // không nạp "string"
      };
    }
    return {
      customerId:
        r?.customerId != null
          ? Number(r.customerId)
          : Number.isFinite(fallbackCustomerId)
            ? Number(fallbackCustomerId)
            : undefined,
      companyId:
        r?.companyId != null
          ? Number(r.companyId)
          : Number.isFinite(fallbackCompanyId)
            ? Number(fallbackCompanyId)
            : undefined,
      carMaker: r?.carMaker ?? "",
      model: r?.model ?? "",
      licensePlate: r?.licensePlate ?? "",
      connectorType: r?.connectorType ?? "",
      vehicleType: r?.vehicleType ?? "Car",
      status: normalizeStatusFE(r?.status),
      batteryCapacity:
        r?.batteryCapacity != null ? Number(r.batteryCapacity) : null,
      currentSoc: r?.currentSoc != null ? Number(r.currentSoc) : null,
      manufactureYear:
        r?.manufactureYear != null ? Number(r.manufactureYear) : null,
      imageUrl: stripStringLiteral(r?.imageUrl ?? ""),
    };
  }

  const fillForm = (v) => {
    const norm = normalizeVehicleForForm(
      v,
      currentUser?.companyId != null
        ? Number(currentUser.companyId)
        : undefined,
      currentUser?.customerId != null
        ? Number(currentUser.customerId)
        : undefined
    );
    form.setFieldsValue(norm);

    const raw = v?.imageUrl || v?.ImageUrl || norm?.imageUrl || "";
    const url = stripStringLiteral(raw);
    setPreviewUrl(url ? `${url}?t=${Date.now()}` : "");
  };

  useEffect(() => {
  document.title = currentVehicle ? "Cập nhật xe" : "Thêm xe";
}, [currentVehicle]);

  useEffect(() => {
    // luôn khóa status trên form:
    if (currentVehicle) {
      // edit mode: dùng status từ DB
      form.setFieldsValue({
        status: normalizeStatusFE(currentVehicle?.status || "Active"),
      });
    } else {
      // create mode: ép Active
      form.setFieldsValue({ status: "Active" });
    }
  }, [currentVehicle, initLoading]);


  useEffect(() => {
    (async () => {
      console.groupCollapsed(
        "%c[VehicleInfo] Init load",
        "color:#1677ff;font-weight:bold;"
      );
      console.time("[VehicleInfo] total");
      try {
        setInitLoading(true);

        const accountId = localStorage.getItem("accountId");
        const token = localStorage.getItem("token");
        console.debug("[VehicleInfo] localStorage:", {
          accountId,
          hasToken: !!token,
        });

        // lấy từ storage (login đã lưu)
        const iden = getIdentityFromStorage();
        const u = {
          accountId: iden.accountId,
          customerId: iden.customerId,
          companyId: iden.companyId,
        };
        setCurrentUser(u);
        form.setFieldsValue(
          normalizeVehicleForForm(null, u?.companyId, u?.customerId)
        );

        console.time("[VehicleInfo] apiListVehicles");
        const list = await apiListVehicles({
          page: 1,
          pageSize: 500,
          customerId: u?.customerId ?? undefined, // ƯU TIÊN lọc theo customerId
          companyId: u?.companyId ?? undefined,
        });
        console.timeEnd("[VehicleInfo] apiListVehicles");

        const uCustomerId = u?.customerId != null ? Number(u.customerId) : null;
        const uCompanyId = u?.companyId != null ? Number(u.companyId) : null;

        // Lọc “xe của tôi”: ưu tiên customerId, nếu không có thì companyId
        let listForMe = list;
        if (uCustomerId != null) {
          listForMe = list.filter((v) => Number(v?.customerId) === uCustomerId);
        } else if (uCompanyId != null) {
          listForMe = list.filter((v) => Number(v?.companyId) === uCompanyId);
        }

        // ƯU TIÊN: lấy theo vehicleId đã lưu
        let mine = null;
        {
          const storedVid = getStoredVehicleId();
          if (storedVid) {
            mine =
              listForMe.find((x) => pickVehicleId(x) === Number(storedVid)) ||
              null;
          }
        }

        // FALLBACK: lọc theo customerId / companyId
        if (!mine) {
          mine =
            listForMe.find((x) => {
              const xCustomer =
                x?.customerId != null ? Number(x.customerId) : null;
              const xCompany =
                x?.companyId != null ? Number(x.companyId) : null;
              const byCustomer =
                uCustomerId != null && xCustomer === uCustomerId;
              const byCompany = uCompanyId != null && xCompany === uCompanyId;
              return byCustomer || byCompany;
            }) || null;
        }

        setCurrentVehicle(mine);
        if (mine) {
          fillForm(mine);
          const vid = pickVehicleId(mine);
          if (vid) {
            try {
              const customerId = Number(
                currentUser?.customerId ??
                form.getFieldValue("customerId")
              );
              const keyGlobal = "vehicleId";
              const keyScoped = Number.isFinite(customerId) ? `vehicleId__${customerId}` : null;
              localStorage.setItem(keyGlobal, String(vid));
              sessionStorage.setItem(keyGlobal, String(vid));
              if (keyScoped) {
                localStorage.setItem(keyScoped, String(vid));
                sessionStorage.setItem(keyScoped, String(vid));
              }
            } catch { }
          }
        }
      } catch (e) {
        console.error("[VehicleInfo] load error:", e);
        message.error("Không tải được thông số xe.");
      } finally {
        setInitLoading(false);
        console.timeEnd("[VehicleInfo] total");
        console.groupEnd();
      }
    })();
  }, []); // eslint-disable-line

  /* ============ Upload ngay khi chọn file ============ */
  const handleUploadFile = async (options) => {
    const { file, onSuccess, onError } = options;
    try {
      const vid = pickVehicleId(currentVehicle);
      if (!vid) {
        message.warning("Bạn cần tạo/cập nhật xe trước rồi mới upload ảnh.");
        onError?.(new Error("VehicleId not found"));
        return;
      }
      setUploading(true);

      const updated = await apiUploadVehicleImage(vid, file);

      // cập nhật đầy đủ sau upload
      const url = (updated?.imageUrl || updated?.ImageUrl || "").trim();
      setCurrentVehicle(updated);
      form.setFieldValue("imageUrl", url);
      setPreviewUrl(url ? `${url}?t=${Date.now()}` : "");

      const newVid = pickVehicleId(updated);
      if (newVid) {
        localStorage.setItem("vehicleId", String(newVid));
        sessionStorage.setItem("vehicleId", String(newVid));
      }

      message.success("Tải ảnh thành công!");
      onSuccess?.("ok");
    } catch (e) {
      console.error("[VehicleInfo] upload error:", e);
      message.error(e?.message || "Upload ảnh thất bại!");
      onError?.(e);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (values) => {
    console.groupCollapsed(
      "%c[VehicleInfo] Submit",
      "color:#52c41a;font-weight:bold;"
    );
    console.debug("[VehicleInfo] form values:", values);
    console.debug("[VehicleInfo] currentUser:", currentUser);
    console.debug("[VehicleInfo] currentVehicle:", currentVehicle);
    console.debug(
      "[VehicleInfo] vehicleId (current):",
      pickVehicleId(currentVehicle)
    );

    setLoading(true);
    try {
      // Base là dữ liệu hiện có của xe (nếu có), sau đó override bởi Form values
      const base = currentVehicle || {};
      const normalizedImage = stripStringLiteral(
        (values.imageUrl ?? base.imageUrl ?? "").trim()
      );

      const payload = {
        // ID: null nếu không có
        customerId: toNumberOrNull(
          values.customerId ?? currentUser?.customerId ?? base.customerId
        ),
        companyId: toNumberOrNull(
          values.companyId ?? currentUser?.companyId ?? base.companyId
        ),

        // Text: null nếu trống
        carMaker: trimOrNull(values.carMaker ?? base.carMaker),
        model: trimOrNull(values.model ?? base.model),
        licensePlate: trimOrNull(values.licensePlate ?? base.licensePlate),
        connectorType: trimOrNull(values.connectorType ?? base.connectorType),
        imageUrl: trimOrNull(values.imageUrl ?? base.imageUrl),

        // Number optional: null nếu không nhập
        batteryCapacity: toNumberOrNull(values.batteryCapacity ?? base.batteryCapacity),
        currentSoc: toNumberOrNull(values.currentSoc ?? base.currentSoc),
        manufactureYear: toNumberOrNull(values.manufactureYear ?? base.manufactureYear),

        // Enum: giữ default nhưng vẫn là string hợp lệ
        vehicleType: vehicleTypeOrDefault(values.vehicleType ?? base.vehicleType),
        status: normalizeStatusFE(values.status ?? base.status ?? "Active"),
      };


      console.debug("[VehicleInfo] payload gửi lên:", payload);

      const currentVid = pickVehicleId(currentVehicle);

      if (currentVid != null) {
        // UPDATE /Vehicles/{id}
        console.time("[VehicleInfo] apiUpdateVehicle");
        const updated = await apiUpdateVehicle(currentVid, payload);
        console.timeEnd("[VehicleInfo] apiUpdateVehicle");
        const safeUpdated = updated ?? {
          ...currentVehicle,
          ...payload,
          vehicleId: currentVid,
        };

        message.success("Cập nhật thông số xe thành công!");
        setCurrentVehicle(safeUpdated);
        fillForm(safeUpdated);

        const vid = pickVehicleId(safeUpdated) ?? currentVid;
        if (vid) {
          localStorage.setItem("vehicleId", String(vid));
          sessionStorage.setItem("vehicleId", String(vid));
        }
      } else {
        // CREATE /Vehicles
        console.time("[VehicleInfo] apiCreateVehicle");
        const created = await apiCreateVehicle(payload);
        console.timeEnd("[VehicleInfo] apiCreateVehicle");

        message.success("Tạo thông số xe thành công!");
        setCurrentVehicle(created);
        fillForm(created);

        const vid = pickVehicleId(created);
        if (vid) {
          localStorage.setItem("vehicleId", String(vid));
          sessionStorage.setItem("vehicleId", String(vid));
        }
      }
    } catch (err) {
      console.error("[VehicleInfo] submit error:", err);
      message.error(err?.message || "Lỗi khi lưu thông tin xe!");
    } finally {
      setLoading(false);
      console.groupEnd();
    }
  };

  return (
    <MainLayout>
      <div className="vehicle-page-container">
        <div className="vehicle-wrapper">
          <div className="vehicle-sidebar">
            <ProfileSidebar />
          </div>

          <div className="vehicle-form-section">
            <h2 className="vehicle-title">{pageTitle}</h2>

            <Form
              layout="vertical"
              form={form}
              onFinish={handleSubmit}
              className="vehicle-info-form"
              disabled={initLoading}
              initialValues={{
                vehicleType: "Car",
                status: "Active",
              }}
            >
              <CarField lockStatus />

              {/* ========== ẢNH XE (Upload từ máy) ========== */}
              <Form.Item label="Ảnh xe (tải từ máy)">
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <Upload
                    accept="image/*"
                    showUploadList={false}
                    customRequest={handleUploadFile}
                    disabled={uploading || initLoading}
                  >
                    <Button icon={<UploadOutlined />} loading={uploading}>
                      Chọn ảnh &amp; tải lên
                    </Button>
                  </Upload>

                  {previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt="vehicle"
                      width={120}
                      height={120}
                      style={{ objectFit: "cover", borderRadius: 8 }}
                      placeholder
                    />
                  ) : (
                    <span style={{ opacity: 0.6 }}>Chưa có ảnh</span>
                  )}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.65 }}>
                  Ảnh sẽ được tải lên ngay sau khi bạn chọn file (không dùng
                  URL).
                </div>
              </Form.Item>

              {!currentVehicle && !initLoading && (
                <p style={{ marginTop: 8, opacity: 0.7 }}>
                  Bạn chưa có xe nào. Hãy điền thông tin và bấm “Lưu” để tạo
                  mới, sau đó mới có thể tải ảnh.
                </p>
              )}

              <div className="form-actions">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  className="save-btn"
                >
                  LƯU
                </Button>
                <Button
                  htmlType="button"
                  className="cancel-btn"
                  onClick={() =>
                    currentVehicle
                      ? fillForm(currentVehicle)
                      : form.resetFields()
                  }
                >
                  HỦY
                </Button>
              </div>
            </Form>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
