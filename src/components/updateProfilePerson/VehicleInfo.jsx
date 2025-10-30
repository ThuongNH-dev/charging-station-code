import React, { useEffect, useState } from "react";
import { Form, Button, message } from "antd";
import CarField from "../form/Info/CarField";
import ProfileSidebar from "../form/Info/ProfileSidebar";
import "./VehicleInfo.css";
import MainLayout from "../../layouts/MainLayout";
import { getApiBase } from "../../utils/api";

const API_BASE = (getApiBase() || "").replace(/\/+$/, "");

function getToken() {
  // ưu tiên object user như trang dưới
  try {
    const u = JSON.parse(
      localStorage.getItem("user") || sessionStorage.getItem("user") || "null"
    );
    if (u?.token) return u.token;
  } catch {}
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
  // BE của bạn trả JSON khi tạo – giữ nguyên
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
  // Nhiều BE trả 204/No Content → fallback trả về object gộp payload+id
  if (res.status === 204) return { ...payload, vehicleId: Number(id) };
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json"))
    return { ...payload, vehicleId: Number(id) };
  const data = await res.json().catch(() => null);
  return data ?? { ...payload, vehicleId: Number(id) };
}

export default function VehicleInfo() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentVehicle, setCurrentVehicle] = useState(null);

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
    const n = Number(obj?.vehicleId ?? obj?.VehicleId ?? obj?.id ?? obj?.Id);
    return Number.isFinite(n) ? n : null;
  }

  // Mirror BE: các trạng thái hợp lệ
  const ALLOWED_STATUSES = ["Active", "Inactive", "Blacklisted", "Retired"];
  function normalizeStatusFE(s) {
    const v = String(s || "").trim();
    return ALLOWED_STATUSES.includes(v) ? v : "Active";
  }

  // CHUẨN HOÁ record BE -> giá trị nạp vào Form (đảm bảo đúng kiểu)
  function normalizeVehicleForForm(r, fallbackCompanyId, fallbackCustomerId) {
    if (!r) {
      return {
        // tối thiểu hiển thị 2 ID nếu có
        customerId: Number.isFinite(fallbackCustomerId)
          ? Number(fallbackCustomerId)
          : undefined,
        companyId: Number.isFinite(fallbackCompanyId)
          ? Number(fallbackCompanyId)
          : undefined,
        vehicleType: "Car",
        status: "Active",
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
      imageUrl: r?.imageUrl ?? "",
    };
  }

  const fillForm = (v) => {
    console.debug("[VehicleInfo] fillForm with vehicle:", v);
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
  };

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
        //
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
        console.debug(`[VehicleInfo] tổng số xe trả về: ${list.length}`);
        if (list.length) {
          console.table(
            list.map((x) => ({
              id: x.id ?? x.vehicleId,
              vehicleId: x.vehicleId,
              customerId: x.customerId,
              companyId: x.companyId,
              licensePlate: x.licensePlate,
              carMaker: x.carMaker,
              model: x.model,
              vehicleType: x.vehicleType,
            }))
          );
        }

        const uCustomerId = u?.customerId != null ? Number(u.customerId) : null;
        const uCompanyId = u?.companyId != null ? Number(u.companyId) : null;

        if (uCustomerId != null)
          console.debug("[VehicleInfo] filter by customerId:", uCustomerId);
        if (uCompanyId != null)
          console.debug(
            "[VehicleInfo] fallback filter by companyId:",
            uCompanyId
          );

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
            if (mine) {
              console.debug(
                "[VehicleInfo] matched by stored vehicleId =",
                storedVid,
                mine
              );
            } else {
              console.warn(
                "[VehicleInfo] stored vehicleId",
                storedVid,
                "không khớp danh sách BE."
              );
            }
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

              if (byCustomer || byCompany) {
                console.debug(
                  "[VehicleInfo] matched vehicle (fallback filter):",
                  {
                    vid: pickVehicleId(x),
                    xCustomer,
                    xCompany,
                    byCustomer,
                    byCompany,
                  }
                );
              }
              return byCustomer || byCompany;
            }) || null;
        }

        if (!mine) {
          console.warn(
            "[VehicleInfo] Không tìm thấy xe thuộc user. Kiểm tra lại kiểu dữ liệu ID hoặc dữ liệu BE."
          );
          if (Array.isArray(listForMe) && listForMe[0]) {
            console.debug("[VehicleInfo] Ví dụ phần tử đầu:", listForMe[0]);
          }
        }

        setCurrentVehicle(mine);
        if (mine) fillForm(mine);
        if (mine) {
          const vid = pickVehicleId(mine);
          if (vid) {
            try {
              localStorage.setItem("vehicleId", String(vid));
              sessionStorage.setItem("vehicleId", String(vid));
            } catch {}
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
  }, []);

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
      const payload = {
        customerId: Number(
          values.customerId ??
            currentUser?.customerId ??
            base.customerId ??
            null
        ),
        companyId: Number(
          values.companyId ?? currentUser?.companyId ?? base.companyId ?? null
        ),

        carMaker: (values.carMaker ?? base.carMaker ?? "").trim(),
        model: (values.model ?? base.model ?? "").trim(),
        licensePlate: (values.licensePlate ?? base.licensePlate ?? "").trim(),

        batteryCapacity: Number(
          values.batteryCapacity ?? base.batteryCapacity ?? 0
        ),
        currentSoc: Number(values.currentSoc ?? base.currentSoc ?? 0),
        connectorType: (
          values.connectorType ??
          base.connectorType ??
          ""
        ).trim(),
        manufactureYear: Number(
          values.manufactureYear ?? base.manufactureYear ?? 0
        ),
        imageUrl: (values.imageUrl ?? base.imageUrl ?? "").trim(),

        vehicleType: (values.vehicleType ?? base.vehicleType ?? "Car").trim(),
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
        console.debug("[VehicleInfo] updated vehicle:", updated);

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
        console.debug("[VehicleInfo] created vehicle:", created);

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
            <h2 className="vehicle-title">Cập nhật thông số xe</h2>

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
              <CarField />

              {!currentVehicle && !initLoading && (
                <p style={{ marginTop: 8, opacity: 0.7 }}>
                  Bạn chưa có xe nào. Hãy điền thông tin và bấm “Lưu” để tạo
                  mới.
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
