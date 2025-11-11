import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table, Input, Select, Button, Tag, Space, Pagination, Spin, Empty,
  Modal, Form, InputNumber, notification
} from "antd";
import {
  PlusOutlined, DownloadOutlined, SearchOutlined, EyeOutlined, EditOutlined
} from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext";
import { getApiBase } from "../../utils/api";
import MainLayout from "../../layouts/MainLayout";
import "./ReManagerment.css";

const { Option } = Select;
const API_BASE = (getApiBase() || "").replace(/\/+$/, "");

/* ================= CSV helpers ================= */
function csvEscape(v) {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function downloadCSV(filename, csvText) {
  const BOM = "\uFEFF"; // để Excel hiển thị Unicode
  const blob = new Blob([BOM + csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function buildVehiclesCSV(list = []) {
  const header = [
    "Vehicle ID",
    "License Plate",
    "Customer ID",
    "Car Maker",
    "Model",
    "Connector Type",
    "Vehicle Type",
    "Manufacture Year",
    "Battery Capacity (kWh)",
    "Current SoC (%)",
    "Max Charge Power (kW)",
    "Status",
    "Company ID",
  ];
  const rows = list.map((r) => [
    r?.vehicleId ?? "",
    r?.licensePlate ?? "",
    r?.customerId ?? "",
    r?.carMaker ?? "",
    r?.model ?? "",
    r?.connectorType ?? "",
    r?.vehicleType ?? "",
    r?.manufactureYear ?? "",
    r?.batteryCapacity ?? "",
    r?.currentSoc ?? "",
    (r?.maxChargePower ?? r?.chargingPower ?? r?.batteryCapacity ?? "") ?? "",
    r?.status ?? "",
    r?.companyId ?? r?.CompanyId ?? r?.company?.companyId ?? r?.company?.id ?? "",
  ]);

  const lines = [header, ...rows].map((row) => row.map(csvEscape).join(","));
  return lines.join("\n");
}
/* ===================================================== */

/* Helper: lấy companyId từ object xe */
function getVehicleCompanyId(v) {
  return Number(
    v?.companyId ??
    v?.CompanyId ??
    v?.company?.companyId ??
    v?.company?.id ??
    null
  );
}

/* Helpers chuyển kiểu an toàn */
function toNumOr(val, fallback) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}
function pick(v, fallback) {
  return v !== undefined && v !== null && v !== "" ? v : fallback;
}

/* Auth helpers */
function getAuthTokenAndCompanyId(authUser) {
  let token =
    authUser?.token ||
    (() => {
      try {
        const u = JSON.parse(
          localStorage.getItem("user") ||
          sessionStorage.getItem("user") ||
          "null"
        );
        return u?.token || null;
      } catch {
        return null;
      }
    })();

  let companyId =
    authUser?.companyId ||
    Number(localStorage.getItem("companyId")) ||
    Number(sessionStorage.getItem("companyId")) ||
    null;

  return { token, companyId: Number.isFinite(companyId) ? companyId : null };
}

export default function ResourceManagement() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const { token, companyId } = getAuthTokenAndCompanyId(authUser);

  /* ===== Trạng thái hợp lệ (mirror BE) ===== */
  const ALLOWED_STATUSES = ["Active", "Inactive", "Blacklisted", "Retired"];
  const normalizeStatusFE = (s) => {
    const v = String(s || "").trim();
    return ALLOWED_STATUSES.indexOf(v) !== -1 ? v : "Active";
  };

  /* Chuyển record BE -> giá trị form (đảm bảo kiểu số/chuỗi đúng) */
  function normalizeVehicleForForm(r) {
    if (!r) return {};
    return {
      customerId: Number(r.customerId),
      companyId:
        Number(getVehicleCompanyId(r)) || Number(companyId) || undefined,

      carMaker: r.carMaker ?? "",
      model: r.model ?? "",
      licensePlate: r.licensePlate ?? "",

      batteryCapacity: Number.isFinite(Number(r.batteryCapacity))
        ? Number(r.batteryCapacity)
        : undefined,
      currentSoc: Number.isFinite(Number(r.currentSoc))
        ? Number(r.currentSoc)
        : undefined,
      connectorType: r.connectorType ?? "",
      manufactureYear: Number.isFinite(Number(r.manufactureYear))
        ? Number(r.manufactureYear)
        : undefined,

      imageUrl: r.imageUrl ?? "",
      vehicleType: r.vehicleType ?? "Car",
      status: normalizeStatusFE(r.status),
    };
  }

  /* ====== STATE CHÍNH ====== */
  const [loading, setLoading] = useState(false);

  // Client-side paging mode (fallback khi BE chưa lọc companyId)
  const USE_CLIENT_SIDE_PAGING = true;

  // Dùng cho client-side paging
  const [allItemsRaw, setAllItemsRaw] = useState([]); // toàn bộ items BE trả (đã gom nhiều trang)

  // UI paging (client)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // dữ liệu đang hiển thị (đã slice theo page)
  const [items, setItems] = useState([]);

  // filter
  const [kw, setKw] = useState("");
  const [status, setStatus] = useState("");

  /* ====== STATE + FORM CHO MODAL THÊM/SỬA ====== */
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm] = Form.useForm();
  const [editRecord, setEditRecord] = useState(null);

  /* ====================== FETCH HELPERS (CLIENT MODE) ====================== */
  async function fetchAllVehiclesRaw(keyword = kw, st = status) {
    if (!Number.isFinite(companyId)) return [];
    // Lấy toàn bộ từ server bằng cách lặp trang server
    const pageSizeServer = 100; // chỉnh theo khả năng BE
    let p = 1;
    let out = [];
    for (;;) {
      const qs = new URLSearchParams();
      qs.set("page", String(p));
      qs.set("pageSize", String(pageSizeServer));
      // BE chưa lọc companyId -> không set companyId ở đây
      if (keyword?.trim()) qs.set("keyword", keyword.trim());
      if (st && ALLOWED_STATUSES.indexOf(st) !== -1) qs.set("status", st);

      const url = `${API_BASE}/Vehicles?${qs.toString()}`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`GET /Vehicles ${res.status}: ${text}`);
      }
      const data = await res.json();
      const itemsPage = Array.isArray(data?.items) ? data.items : [];
      out = out.concat(itemsPage);

      // Dừng nếu ít hơn pageSizeServer hoặc đã đủ totalItems
      if (itemsPage.length < pageSizeServer) break;
      const totalItemsServer = Number.isFinite(data?.totalItems) ? data.totalItems : null;
      if (totalItemsServer && out.length >= totalItemsServer) break;

      p += 1;
      if (p > 1000) break; // chốt chặn an toàn
    }
    return out;
  }

  function filterByCompanyKeywordStatus(list, keyword = kw, st = status) {
    let filtered = Array.isArray(list) ? list : [];

    // lọc theo companyId (bắt buộc)
    filtered = filtered.filter(
      (v) => Number(getVehicleCompanyId(v)) === Number(companyId)
    );

    // keyword
    const q = (keyword || "").trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((v) => {
        const s = [
          v?.licensePlate,
          v?.carMaker,
          v?.model,
          v?.connectorType,
          v?.vehicleType,
          v?.manufactureYear,
          v?.vehicleId,
          v?.customerId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return s.includes(q);
      });
    }

    // status
    const stNorm = st && ALLOWED_STATUSES.includes(st) ? st : "";
    if (stNorm) {
      filtered = filtered.filter((v) => normalizeStatusFE(v?.status) === stNorm);
    }
    return filtered;
  }

  function slicePage(list, p, ps) {
    const start = (p - 1) * ps;
    return list.slice(start, start + ps);
  }

  async function refreshVehicles(p = page, ps = pageSize, keyword = kw, st = status) {
    setLoading(true);
    try {
      if (!Number.isFinite(companyId)) {
        setItems([]);
        setTotal(0);
        return;
      }

      if (USE_CLIENT_SIDE_PAGING) {
        // 1) tải tất cả từ BE (chưa theo companyId)
        const all = await fetchAllVehiclesRaw(keyword, st);
        setAllItemsRaw(all);

        // 2) lọc theo companyId + keyword + status
        const filtered = filterByCompanyKeywordStatus(all, keyword, st);

        // 3) cắt trang
        const pageSlice = slicePage(filtered, p, ps);

        setItems(pageSlice);
        setTotal(filtered.length);
      } else {
        // (không dùng trong Cách 2)
      }
    } catch (e) {
      console.error("refreshVehicles error:", e);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  /* ====================== LIFECYCLE ====================== */
  useEffect(() => {
    refreshVehicles(page, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, companyId]);

  /* ====== HANDLERS THÊM XE ====== */
  function openAddModal() {
    form.resetFields();
    form.setFieldsValue({ vehicleType: "Car", status: "Active" });
    setAddOpen(true);
  }
  function closeAddModal() {
    setAddOpen(false);
  }

  async function submitAdd() {
    try {
      const values = await form.validateFields();
      if (!Number.isFinite(companyId)) {
        notification.error({
          message: "Thiếu companyId",
          description:
            "Không xác định được công ty từ phiên đăng nhập. Vui lòng đăng nhập lại.",
        });
        return;
      }
      const statusVal =
        String(form.getFieldValue("status") ?? "Active").trim() || "Active";

      const payload = {
        customerId: toNumOr(values.customerId, 0),
        companyId: Number(companyId),
        carMaker: String(values.carMaker ?? ""),
        model: String(values.model ?? ""),
        licensePlate: String(values.licensePlate ?? ""),
        batteryCapacity: toNumOr(values.batteryCapacity, 0),
        currentSoc: toNumOr(values.currentSoc, 0),
        connectorType: String(values.connectorType ?? ""),
        manufactureYear: toNumOr(values.manufactureYear, 0),
        vehicleType: String(values.vehicleType ?? ""),
        status: statusVal,
      };
      if (values.imageUrl && String(values.imageUrl).trim() !== "") {
        payload.imageUrl = String(values.imageUrl).trim();
      }
      if (!token) {
        notification.error({
          message: "Thiếu token đăng nhập",
          description: "Vui lòng đăng nhập lại.",
        });
        return;
      }
      setSubmitting(true);
      const url = `${API_BASE}/Vehicles`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`POST /Vehicles ${res.status}: ${text}`);
      }
      const created = await res.json();
      notification.success({
        message: "Thêm xe thành công",
        description: `Xe #${created?.vehicleId} đã được tạo.`,
      });

      // Sau khi tạo mới -> refresh lại theo filter hiện tại, về trang 1
      setPage(1);
      await refreshVehicles(1, pageSize, kw, status);
      closeAddModal();
    } catch (err) {
      if (err?.errorFields) return;
      console.error("Create vehicle error:", err);
      notification.error({
        message: "Thêm xe thất bại",
        description: String(err?.message || err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  /* ====== HANDLERS SỬA XE ====== */
  async function openEditModal(record) {
    try {
      const res = await fetch(`${API_BASE}/Vehicles/${record.vehicleId}`, {
        method: "GET",
        headers: {
          accept: "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      });
      const fresh = res.ok ? await res.json() : record;
      setEditRecord(fresh);
      setEditOpen(true); // mở trước, set form sau trong afterOpenChange
    } catch (e) {
      console.warn("GET vehicle before edit failed, fallback to record:", e);
      setEditRecord(record);
      setEditOpen(true);
    }
  }

  function closeEditModal() {
    setEditOpen(false);
    setEditRecord(null);
    editForm.resetFields();
  }

  async function submitEdit() {
    try {
      if (!editRecord?.vehicleId) {
        notification.error({ message: "Thiếu ID xe để sửa" });
        return;
      }
      if (!token) {
        notification.error({
          message: "Thiếu token",
          description: "Vui lòng đăng nhập lại.",
        });
        return;
      }

      const values = await editForm.validateFields();

      // MERGE an toàn: field nào user để trống -> giữ giá trị cũ
      const payload = {
        customerId: toNumOr(
          values.customerId,
          toNumOr(editRecord.customerId, 0)
        ),
        companyId: toNumOr(
          values.companyId,
          toNumOr(getVehicleCompanyId(editRecord) ?? companyId, 0)
        ),

        carMaker: pick(values.carMaker, editRecord.carMaker ?? ""),
        model: pick(values.model, editRecord.model ?? ""),
        licensePlate: pick(values.licensePlate, editRecord.licensePlate ?? ""),

        batteryCapacity: toNumOr(
          values.batteryCapacity,
          toNumOr(editRecord.batteryCapacity, 0)
        ),
        currentSoc: toNumOr(
          values.currentSoc,
          toNumOr(editRecord.currentSoc, 0)
        ),
        connectorType: pick(
          values.connectorType,
          editRecord.connectorType ?? ""
        ),
        manufactureYear: toNumOr(
          values.manufactureYear,
          toNumOr(editRecord.manufactureYear, 0)
        ),

        imageUrl: pick(values.imageUrl, editRecord.imageUrl ?? ""),
        vehicleType: pick(values.vehicleType, editRecord.vehicleType ?? "Car"),
        status: normalizeStatusFE(
          pick(values.status, editRecord.status ?? "Active")
        ),
      };

      setEditing(true);
      const url = `${API_BASE}/Vehicles/${encodeURIComponent(
        editRecord.vehicleId
      )}`;
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`PUT /Vehicles ${res.status}: ${text}`);
      }
      notification.success({ message: "Cập nhật xe thành công" });

      // Sau khi sửa -> refresh theo filter hiện tại, giữ trang hiện tại
      await refreshVehicles(page, pageSize, kw, status);
      closeEditModal();
    } catch (err) {
      if (err?.errorFields) return; // lỗi validate của antd
      console.error("Update vehicle error:", err);
      notification.error({
        message: "Sửa xe thất bại",
        description: String(err?.message || err),
      });
    } finally {
      setEditing(false);
    }
  }

  const columns = [
    {
      title: "ID Xe",
      dataIndex: "vehicleId",
      key: "vehicleId",
      render: (id) => <a>A{id?.toString().padStart(3, "0")}</a>,
      width: 60,
    },
    { title: "Biển số", dataIndex: "licensePlate", key: "licensePlate", width: 130 },
    {
      title: "Chủ xe (customerId)",
      dataIndex: "customerId",
      key: "customerId",
      render: (cid) => <span>Người dùng #{cid}</span>,
      width: 100,
    },
    {
      title: "Model",
      key: "model",
      render: (_, r) => (
        <span>
          {r?.carMaker} {r?.model}
        </span>
      ),
      width: 90,
    },
    {
      title: "Pin (kWh)",
      dataIndex: "batteryCapacity",
      key: "batteryCapacity",
      align: "right",
      width: 110,
    },
    {
      title: "Sạc tối đa (kW)",
      dataIndex: "maxChargePower",
      key: "maxChargePower",
      align: "right",
      width: 100,
      render: (_, r) =>
        r?.maxChargePower ?? r?.chargingPower ?? r?.batteryCapacity ?? "-",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (s) => {
        const v = normalizeStatusFE(s);
        const map = {
          Active: { color: "green", label: "● HOẠT ĐỘNG" },
          Inactive: { color: "default", label: "○ VÔ HIỆU HÓA" },
          Blacklisted: { color: "red", label: "● CẤM" },
          Retired: { color: "orange", label: "● NGỪNG SỬ DỤNG" },
        };
        const entry = map[v] || { color: "blue", label: v || "—" };
        return <Tag color={entry.color}>{entry.label}</Tag>;
      },
    },
    {
      title: "Hành động",
      key: "actions",
      fixed: "right",
      width: 160,
      render: (_, r) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEditModal(r)}>
            Sửa
          </Button>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() =>
              navigate(`/company/vehicles/${r.vehicleId}/sessions`, {
                state: {
                  vehicle: {
                    vehicleId: r.vehicleId,
                    licensePlate: r.licensePlate,
                    carMaker: r.carMaker,
                    model: r.model,
                  },
                },
              })
            }
          >
            Phiên sạc
          </Button>
        </Space>
      ),
    },
  ];

  /* ===== Export CSV handler ===== */
  const handleExportCSV = () => {
    try {
      // Xuất theo dữ liệu đang hiển thị (trang hiện tại)
      const csv = buildVehiclesCSV(items || []);
      const ts = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const stamp = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(
        ts.getDate()
      )}-${pad(ts.getHours())}${pad(ts.getMinutes())}`;
      const fname = `vehicles_${companyId || "all"}_${stamp}.csv`;
      downloadCSV(fname, csv);
    } catch (e) {
      console.error("Export CSV error:", e);
      notification.error({
        message: "Xuất CSV thất bại",
        description: String(e?.message || e),
      });
    }
  };

  /* InputNumber parser dùng chung */
  const parseNum = (v) => (v ?? "").toString().replace(/\s+/g, "");

  const statusChip = normalizeStatusFE(
    editForm.getFieldValue("status") || editRecord?.status || "Active"
  );
  const statusColor = statusChip === "Active" ? "green" : "default";

  return (
    <MainLayout>
      <div className="page vehicles">
        <h2 style={{ marginBottom: 16 }}>Quản lý xe</h2>

        {/* TOOLBAR + BẢNG */}
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Tìm kiếm"
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            onPressEnter={() => { setPage(1); refreshVehicles(1, pageSize, kw, status); }}
            style={{ width: 260 }}
          />
          <Select
            placeholder="Trạng thái"
            value={status || undefined}
            onChange={(v) => setStatus(v || "")}
            style={{ width: 160 }}
            allowClear
          >
            <Option value="Active">Hoạt động</Option>
            <Option value="Inactive">Vô hiệu hóa</Option>
            <Option value="Blacklisted">Cấm</Option>
            <Option value="Retired">Ngừng sử dụng</Option>
          </Select>

          <Button
            onClick={() => {
              setPage(1);
              refreshVehicles(1, pageSize, kw, status);
            }}
          >
            Tìm Kiếm
          </Button>

          <span style={{ flex: 1 }} />

          <Button icon={<PlusOutlined />} type="primary" onClick={openAddModal}>
            Thêm xe
          </Button>

          <Button icon={<DownloadOutlined />} onClick={handleExportCSV}>
            Tải CSV
          </Button>
        </Space>

        {!Number.isFinite(companyId) ? (
          <Empty description="Không tìm thấy companyId. Hãy đăng nhập lại." />
        ) : loading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <Spin />
          </div>
        ) : (
          <>
            <Table
              rowKey="vehicleId"
              dataSource={items}
              columns={columns}
              pagination={false}
              scroll={{ x: 900 }}
            />

            <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                onChange={(p, ps) => {
                  setPage(p);
                  setPageSize(ps);
                  refreshVehicles(p, ps, kw, status);
                }}
                showSizeChanger
                pageSizeOptions={["5", "10", "20", "50"]}
              />
            </div>
          </>
        )}
      </div>

      {/* Modal thêm xe */}
      <Modal
        title="Thêm xe"
        open={addOpen}
        onOk={submitAdd}
        onCancel={closeAddModal}
        confirmLoading={submitting}
        okText="Tạo"
        cancelText="Hủy"
        destroyOnClose
        width={900}
      >
        <Form layout="vertical" form={form} preserve={false}>
          <div style={{ marginBottom: 8 }}>
            <Tag color="green">Active</Tag>
          </div>

          <div className="vehicle-form-grid">
            <Form.Item
              name="customerId"
              label="Mã Nhân Viên"
              rules={[{ required: true, message: "Nhập customerId" }]}
            >
              <InputNumber style={{ width: "100%" }} placeholder="VD: 10" parser={parseNum} />
            </Form.Item>

            <Form.Item label="Mã công ty">
              <InputNumber style={{ width: "100%" }} value={companyId} disabled />
            </Form.Item>

            <Form.Item name="carMaker" label="Hãng xe" rules={[{ required: true }]}>
              <Input placeholder="VD: Vin" />
            </Form.Item>

            <Form.Item name="model" label="Model" rules={[{ required: true }]}>
              <Input placeholder="VD: VF2" />
            </Form.Item>

            <Form.Item name="licensePlate" label="Biển số" rules={[{ required: true }]}>
              <Input placeholder="VD: 1548877" />
            </Form.Item>

            <Form.Item name="batteryCapacity" label="Dung lượng pin" rules={[{ required: true }]}>
              <InputNumber style={{ width: "100%" }} placeholder="VD: 100" parser={parseNum} />
            </Form.Item>

            <Form.Item name="currentSoc" label="Lượng pin hiện tại" rules={[{ required: true }]}>
              <InputNumber style={{ width: "100%" }} placeholder="VD: 100" parser={parseNum} />
            </Form.Item>

            <Form.Item name="connectorType" label="Cổng sạc" rules={[{ required: true }]}>
              <Input placeholder="VD: CCS2" />
            </Form.Item>

            <Form.Item name="manufactureYear" label="Năm sản xuất" rules={[{ required: true }]}>
              <InputNumber style={{ width: "100%" }} placeholder="VD: 2024" parser={parseNum} />
            </Form.Item>

            <Form.Item name="imageUrl" label="Ảnh">
              <Input placeholder="https://..." />
            </Form.Item>

            <Form.Item
              name="vehicleType"
              label="Loại phương tiện"
              rules={[{ required: true, message: "Chọn loại xe" }]}
            >
              <Select placeholder="Chọn loại xe">
                <Option value="Car">Car</Option>
                <Option value="Motorbike">Motorbike</Option>
              </Select>
            </Form.Item>

            <Form.Item name="status" label="Trạng thái" initialValue="Active">
              <Input disabled />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* Modal sửa xe */}
      <Modal
        title={`Sửa xe${editRecord?.vehicleId ? ` #${editRecord.vehicleId}` : ""}`}
        open={editOpen}
        onOk={submitEdit}
        onCancel={closeEditModal}
        confirmLoading={editing}
        okText="Lưu"
        cancelText="Hủy"
        destroyOnClose
        width={900}
        forceRender
        afterOpenChange={(opened) => {
          if (opened && editRecord) {
            const initial = normalizeVehicleForForm(editRecord);
            editForm.setFieldsValue(initial);
          }
        }}
      >
        <Form layout="vertical" form={editForm} preserve={false}>
          {/* Field ẩn để giữ giá trị khi validate */}
          <Form.Item name="customerId" hidden initialValue={editRecord?.customerId}>
            <InputNumber />
          </Form.Item>
          <Form.Item name="companyId" hidden initialValue={companyId}>
            <InputNumber />
          </Form.Item>

          <div style={{ marginBottom: 8 }}>
            <Tag color={statusColor}>{statusChip}</Tag>
          </div>

          <div className="vehicle-form-grid">
            <Form.Item label="Mã Nhân Viên">
              <InputNumber style={{ width: "100%" }} value={editRecord?.customerId} disabled />
            </Form.Item>

            <Form.Item label="Mã công ty">
              <InputNumber style={{ width: "100%" }} value={companyId} disabled />
            </Form.Item>

            <Form.Item name="carMaker" label="Hãng xe" rules={[{ required: true }]}>
              <Input placeholder="VD: Vin" />
            </Form.Item>

            <Form.Item name="model" label="Model" rules={[{ required: true }]}>
              <Input placeholder="VD: VF2" />
            </Form.Item>

            <Form.Item name="licensePlate" label="Biển số" rules={[{ required: true }]}>
              <Input placeholder="VD: 1548877" />
            </Form.Item>

            <Form.Item name="batteryCapacity" label="Dung lượng pin" rules={[{ required: true }]}>
              <InputNumber style={{ width: "100%" }} placeholder="VD: 100" parser={parseNum} />
            </Form.Item>

            <Form.Item name="currentSoc" label="Lượng pin hiện tại" rules={[{ required: true }]}>
              <InputNumber style={{ width: "100%" }} placeholder="VD: 100" parser={parseNum} />
            </Form.Item>

            <Form.Item name="connectorType" label="Cổng sạc" rules={[{ required: true }]}>
              <Input placeholder="VD: CCS2" />
            </Form.Item>

            <Form.Item name="manufactureYear" label="Năm sản xuất" rules={[{ required: true }]}>
              <InputNumber style={{ width: "100%" }} placeholder="VD: 2024" parser={parseNum} />
            </Form.Item>

            <Form.Item name="imageUrl" label="Ảnh">
              <Input placeholder="https://..." />
            </Form.Item>

            <Form.Item
              name="vehicleType"
              label="Loại phương tiện"
              rules={[{ required: true, message: "Chọn loại xe" }]}
            >
              <Select placeholder="Chọn loại xe">
                <Option value="Car">Car</Option>
                <Option value="Motorbike">Motorbike</Option>
              </Select>
            </Form.Item>

            <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
              <Select placeholder="Chọn trạng thái">
                <Option value="Active">Hoạt động</Option>
                <Option value="Inactive">Vô hiệu hóa</Option>
                <Option value="Blacklisted">Cấm</Option>
                <Option value="Retired">Ngừng sử dụng</Option>
              </Select>
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </MainLayout>
  );
}
