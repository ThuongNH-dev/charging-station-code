import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Table, Input, Select, Button, Tag, Space, Pagination, Spin, Empty,
    Modal, Form, InputNumber, notification, Card, Statistic
} from "antd";
import { PlusOutlined, DownloadOutlined, SearchOutlined, EyeOutlined, EditOutlined } from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext";
import { getApiBase } from "../../utils/api";
import MainLayout from "../../layouts/MainLayout";
import "./ReManagerment.css"

const { Option } = Select;
const API_BASE = (getApiBase() || "").replace(/\/+$/, "");

// Helper: lấy companyId từ object xe
function getVehicleCompanyId(v) {
    return Number(
        v?.companyId ??
        v?.CompanyId ??
        v?.company?.companyId ??
        v?.company?.id ??
        null
    );
}

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
    // ===== Trạng thái hợp lệ (mirror BE) =====
    const ALLOWED_STATUSES = ["Active", "Inactive", "Blacklisted", "Retired"];

    function normalizeStatusFE(s) {
        const v = String(s || "").trim();
        return ALLOWED_STATUSES.indexOf(v) !== -1 ? v : "Active";
    }
    // Chuyển record BE -> giá trị form (đảm bảo kiểu số/chuỗi đúng)
    function normalizeVehicleForForm(r) {
        if (!r) return {};
        return {
            customerId: Number(r.customerId),
            // companyId trên form chỉ để hiển thị (disabled), lấy từ login (companyId) cho chắc
            companyId: Number(getVehicleCompanyId(r)) || Number(companyId) || undefined,
            carMaker: r.carMaker ?? "",
            model: r.model ?? "",
            licensePlate: r.licensePlate ?? "",
            batteryCapacity: Number(r.batteryCapacity),
            currentSoc: Number(r.currentSoc),
            connectorType: r.connectorType ?? "",
            manufactureYear: Number(r.manufactureYear),
            imageUrl: r.imageUrl ?? "",
            vehicleType: r.vehicleType ?? "Car",
            status: normalizeStatusFE(r.status),
        };
    }

    // ====== STATE CHÍNH ======
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [items, setItems] = useState([]);
    const [kw, setKw] = useState("");
    const [status, setStatus] = useState(""); // "", Active, Inactive, Suspended...

    // ====== HOÁ ĐƠN ======
    const [invoices, setInvoices] = useState([]);
    const [invLoading, setInvLoading] = useState(false);

    const fmtMoney = (n) =>
        (Number(n) || 0).toLocaleString("vi-VN", { style: "currency", currency: "VND" });

    const monthLabel = (m, y) =>
        `Tháng ${String(m).padStart(2, "0")}/${y}`;

    const normalizeInvoiceStatus = (s) => {
        const v = String(s || "").trim();
        if (v === "Paid") return "Paid";
        if (v === "Unpaid") return "Unpaid";
        if (v === "Pending") return "Pending";
        return v || "—";
    };
    function invTimeValue(inv) {
        // ƯU TIÊN ngày giờ nếu có
        const tUpdated = inv?.updatedAt ? new Date(inv.updatedAt).getTime() : 0;
        const tCreated = inv?.createdAt ? new Date(inv.createdAt).getTime() : 0;
        const t = Math.max(tUpdated, tCreated);
        if (t > 0) return { kind: "time", v: t };

        // Fall back theo năm/tháng
        const y = Number(inv?.billingYear) || 0;
        const m = Number(inv?.billingMonth) || 0;
        if (y > 0 && m > 0) return { kind: "ym", v: y * 100 + m }; // 202510…

        // Cuối cùng: id
        const id = Number(inv?.invoiceId) || 0;
        return { kind: "id", v: id };
    }

    function num(n) { return Number.isFinite(Number(n)) ? Number(n) : 0; }

    function pickLatestInvoice(list = []) {
        if (!Array.isArray(list) || list.length === 0) return null;

        // So sánh "mới hơn" theo chuỗi ưu tiên:
        // 1) updatedAt/createdAt lớn hơn
        // 2) billingYear,billingMonth lớn hơn
        // 3) invoiceId lớn hơn
        const cmp = (a, b) => {
            const tuA = a?.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const tuB = b?.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            if (tuA !== tuB) return tuB - tuA;

            const tcA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tcB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
            if (tcA !== tcB) return tcB - tcA;

            const ymA = num(a?.billingYear) * 100 + num(a?.billingMonth);
            const ymB = num(b?.billingYear) * 100 + num(b?.billingMonth);
            if (ymA !== ymB) return ymB - ymA;

            const idA = num(a?.invoiceId);
            const idB = num(b?.invoiceId);
            return idB - idA;
        };

        // Lấy phần tử “mới nhất” theo comparator trên
        let best = list[0];
        for (let i = 1; i < list.length; i++) {
            if (cmp(best, list[i]) > 0) best = list[i]; // nếu list[i] mới hơn -> chọn nó
        }
        return best;
    }


    // ====== STATE + FORM CHO MODAL THÊM XE ======
    const [addOpen, setAddOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm();
    // ====== STATE + FORM CHO MODAL SỬA XE ======
    const [editOpen, setEditOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editForm] = Form.useForm();
    const [editRecord, setEditRecord] = useState(null);

    async function fetchVehicles(p = page, ps = pageSize, keyword = kw, st = status) {
        if (!Number.isFinite(companyId)) return;

        setLoading(true);
        try {
            const qs = new URLSearchParams();
            qs.set("page", String(p));
            qs.set("pageSize", String(ps));
            // ép gửi companyId để BE sau này có thể filter
            qs.set("companyId", String(companyId));

            if (keyword?.trim()) qs.set("keyword", keyword.trim());
            if (st && ALLOWED_STATUSES.indexOf(st) !== -1) {
                qs.set("status", st);
            }

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
            const raw = Array.isArray(data?.items) ? data.items : [];

            // Lọc theo companyId hiện tại (nếu BE chưa filter)
            const filtered = raw.filter(
                (v) => Number(getVehicleCompanyId(v)) === Number(companyId)
            );

            setItems(filtered);
            setTotal(Number.isFinite(data && data.totalItems) ? data.totalItems : filtered.length);
        } catch (e) {
            console.error("[Vehicles] fetch error:", e);
            setItems([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }

    // Lấy danh sách hoá đơn theo companyId
    async function fetchInvoices() {
        if (!Number.isFinite(companyId)) return;
        setInvLoading(true);
        try {
            const url = `${API_BASE}/Invoices/by-company/${encodeURIComponent(companyId)}`;
            const res = await fetch(url, {
                method: "GET",
                headers: {
                    accept: "application/json",
                    ...(token ? { authorization: `Bearer ${token}` } : {}),
                },
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`GET /Invoices/by-company ${res.status}: ${text}`);
            }
            const data = await res.json();
            // BE trả về { message, data: [ ... ] }
            const list = Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : [];

            // 👉 Chỉ giữ hóa đơn mới nhất
            const latest = pickLatestInvoice(list);
            setInvoices(latest ? [latest] : []);
            // setInvoices(list);
        } catch (e) {
            console.error("[Invoices] fetch error:", e);
            setInvoices([]);
        } finally {
            setInvLoading(false);
        }
    }

    useEffect(() => {
        fetchVehicles(page, pageSize);
        fetchInvoices();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, pageSize, companyId]);

    // Fallback lọc client-side
    const dataSource = useMemo(() => {
        let list = items;
        if (!items.length) return list;

        const q = kw.trim().toLowerCase();
        if (q) {
            list = list.filter((v) => {
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
        if (status) {
            list = list.filter((v) => normalizeStatusFE(v && v.status) === status);
        }
        return list;
    }, [items, kw, status]);

    // ====== HANDLERS CHO MODAL THÊM XE ======
    function openAddModal() {
        form.resetFields();
        form.setFieldsValue({ vehicleType: "Car" }); // mặc định Car
        form.setFieldsValue({ status: "Active" }); // mặc định Active
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
                    description: "Không xác định được công ty từ phiên đăng nhập. Vui lòng đăng nhập lại.",
                });
                return;
            }

            // CHANGED: status là optional; nếu không nhập -> "Active"
            const statusVal = String(form.getFieldValue("status") ?? "Active").trim() || "Active";

            // Lấy tất cả từ form
            const payload = {
                customerId: Number(values.customerId),
                // ✅ Lấy companyId từ tài khoản đăng nhập
                companyId: Number(companyId),
                carMaker: String(values.carMaker ?? ""),
                model: String(values.model ?? ""),
                licensePlate: String(values.licensePlate ?? ""),
                batteryCapacity: Number(values.batteryCapacity),
                currentSoc: Number(values.currentSoc),
                connectorType: String(values.connectorType ?? ""),
                manufactureYear: Number(values.manufactureYear),
                vehicleType: String(values.vehicleType ?? ""),
                status: statusVal, // ✅ dùng giá trị người nhập hoặc mặc định Active
            };

            // imageUrl optional
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

            // đồng bộ lại danh sách
            await fetchVehicles(page, pageSize, kw, status);
            closeAddModal();
        } catch (err) {
            if (err?.errorFields) return; // validate Form
            console.error("Create vehicle error:", err);
            notification.error({
                message: "Thêm xe thất bại",
                description: String(err?.message || err),
            });
        } finally {
            setSubmitting(false);
        }
    }

    // ====== HANDLERS CHO MODAL SỬA XE ======
    function openEditModal(record) {
        setEditRecord(record || null);
        const initial = normalizeVehicleForForm(record);
        // Đổ dữ liệu cũ vào form
        editForm.resetFields();
        editForm.setFieldsValue(initial);
        setEditOpen(true);
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
                notification.error({ message: "Thiếu token", description: "Vui lòng đăng nhập lại." });
                return;
            }
            // Validate form (lưu ý: trường disabled sẽ không có trong values)
            const values = await editForm.validateFields();

            // Gộp payload: lấy từ form + ghép thêm các trường disabled/không submit
            const payload = {
                customerId: Number(editRecord.customerId),              // disabled -> lấy từ record cũ
                companyId: Number(companyId),                           // lấy từ tài khoản/logged in
                carMaker: String(values.carMaker ?? ""),
                model: String(values.model ?? ""),
                licensePlate: String(values.licensePlate ?? ""),
                batteryCapacity: Number(values.batteryCapacity),
                currentSoc: Number(values.currentSoc),
                connectorType: String(values.connectorType ?? ""),
                manufactureYear: Number(values.manufactureYear),
                imageUrl: values.imageUrl ? String(values.imageUrl) : "",
                vehicleType: String(values.vehicleType ?? "Car"),
                status: normalizeStatusFE(values.status),               // Select 4 trạng thái
            };

            setEditing(true);
            const url = `${API_BASE}/Vehicles/${encodeURIComponent(editRecord.vehicleId)}`;
            const res = await fetch(url, {
                method: "PUT",
                headers: {
                    accept: "application/json",
                    "Content-Type": "application/json",
                    ...(token ? { authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`PUT /Vehicles ${res.status}: ${text}`);
            }

            notification.success({ message: "Cập nhật xe thành công" });
            await fetchVehicles(page, pageSize, kw, status);
            closeEditModal();
        } catch (err) {
            if (err?.errorFields) return; // lỗi validate form
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
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => openEditModal(r)}
                    >
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

    return (
        <MainLayout>
            <div className="page vehicles">
                <h2 style={{ marginBottom: 16 }}>Quản lý xe</h2>

                <Space style={{ marginBottom: 16 }} wrap>
                    <Input
                        allowClear
                        prefix={<SearchOutlined />}
                        placeholder="Tìm kiếm"
                        value={kw}
                        onChange={(e) => setKw(e.target.value)}
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
                            fetchVehicles(1, pageSize, kw, status);
                        }}
                    >
                        Tìm Kiếm
                    </Button>

                    <span style={{ flex: 1 }} />

                    <Button icon={<PlusOutlined />} type="primary" onClick={openAddModal}>
                        Thêm xe
                    </Button>

                    <Button onClick={() => window.print()}>
                        In dữ liệu
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
                            dataSource={dataSource}
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
                                    fetchVehicles(p, ps, kw, status);
                                }}
                                showSizeChanger
                                pageSizeOptions={["5", "10", "20", "50"]}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* ===== HÓA ĐƠN GẦN ĐÂY ===== */}
            <div style={{ marginBottom: 12 }}>
                <Space style={{ width: "100%", justifyContent: "space-between" }}>
                    <h3 style={{ margin: 0, fontSize: "20px" }}>Hoá đơn kì tới</h3>
                </Space>
                {(!Number.isFinite(companyId)) ? (
                    <Empty description="Không tìm thấy companyId. Hãy đăng nhập lại." />
                ) : invLoading ? (
                    <div style={{ padding: 20, textAlign: "center" }}>
                        <Spin />
                    </div>
                ) : invoices.length === 0 ? (
                    <Empty description="Chưa có hoá đơn" />
                ) : (
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, minmax(220px, 1fr))",
                            gap: 16,
                            marginTop: 12,
                        }}
                    >
                        {invoices.map((inv) => {
                            const st = normalizeInvoiceStatus(inv.status);
                            const tag =
                                st === "Paid"
                                    ? { color: "green", label: "Paid" }
                                    : st === "Unpaid"
                                        ? { color: "red", label: "Unpaid" }
                                        : { color: "orange", label: st.toUpperCase() };
                            return (
                                <Card
                                    key={inv.invoiceId}
                                    hoverable
                                    onClick={() => navigate(`/invoiceDetail/${inv.invoiceId}`)}
                                    style={{ borderRadius: 12 }}
                                    bodyStyle={{ padding: 16 }}
                                >
                                    <Space style={{ width: "100%", justifyContent: "space-between" }}>
                                        <strong>{monthLabel(inv.billingMonth, inv.billingYear)}</strong>
                                        <Tag color={tag.color}>{tag.label}</Tag>
                                    </Space>
                                    <div style={{ marginTop: 8 }}>
                                        <Statistic title="Tổng tiền" value={fmtMoney(inv.total)} />
                                    </div>
                                    <div className="DetailButton" style={{ marginTop: 8 }}>
                                        <Button type="link" onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/invoiceDetail/${inv.invoiceId}`);
                                        }}>
                                            Xem chi tiết
                                        </Button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
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
                width={900}                 // NEW: form rộng hơn
            >
                <Form layout="vertical" form={form} preserve={false}>
                    {/* NEW: hiển thị mặc định Active */}
                    <div style={{ marginBottom: 8 }}>
                        <Tag color="green">Active</Tag>
                    </div>

                    {/* NEW: Lưới 3 cột cho form */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)", // ✅ 3 cột
                            gap: 16,
                        }}
                    >
                        <Form.Item
                            name="customerId"
                            label="Mã Nhân Viên"
                            rules={[{ required: true, message: "Nhập customerId" }]}
                        >
                            <InputNumber style={{ width: "100%" }} placeholder="VD: 10" />
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

                        <Form.Item
                            name="batteryCapacity"
                            label="Dung lượng pin"
                            rules={[{ required: true }]}
                        >
                            <InputNumber style={{ width: "100%" }} placeholder="VD: 100" />
                        </Form.Item>

                        <Form.Item name="currentSoc" label="Lượng pin hiện tại" rules={[{ required: true }]}>
                            <InputNumber style={{ width: "100%" }} placeholder="VD: 100" />
                        </Form.Item>

                        <Form.Item
                            name="connectorType"
                            label="Cổng sạc"
                            rules={[{ required: true }]}
                        >
                            <Input placeholder="VD: CCS2" />
                        </Form.Item>

                        <Form.Item
                            name="manufactureYear"
                            label="Năm sản xuất"
                            rules={[{ required: true }]}
                        >
                            <InputNumber style={{ width: "100%" }} placeholder="VD: 2024" />
                        </Form.Item>

                        {/* imageUrl optional */}
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


                        {/* CHANGED: status vẫn có ô nhập nhưng KHÔNG required */}
                        <Form.Item
                            name="status"
                            label="Trạng thái"
                            initialValue="Active"   // vì destroyOnClose nên initialValue sẽ áp
                        >
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
            >
                <Form
                    layout="vertical"
                    form={editForm}
                    preserve={false}
                    onValuesChange={() => {
                        // ép re-render để Tag hiển thị đúng status hiện tại
                        // (không cần setState, chỉ để kích vẽ lại)
                        setEditOpen((v) => v);
                    }}
                >
                    {/* Tag trạng thái hiện tại */}
                    <div style={{ marginBottom: 8 }}>
                        <Tag color={normalizeStatusFE(editForm.getFieldValue("status")) === "Active" ? "green" : "default"}>
                            {normalizeStatusFE(editForm.getFieldValue("status"))}
                        </Tag>
                    </div>

                    {/* Lưới 3 cột */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: 16,
                        }}
                    >
                        {/* customerId: hiển thị, không cho sửa */}
                        <Form.Item label="Mã Nhân Viên">
                            <InputNumber
                                style={{ width: "100%" }}
                                value={editRecord?.customerId}
                                disabled
                            />
                        </Form.Item>

                        {/* companyId: hiển thị, không cho sửa */}
                        <Form.Item label="Mã công ty">
                            <InputNumber
                                style={{ width: "100%" }}
                                value={companyId}
                                disabled
                            />
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

                        <Form.Item
                            name="batteryCapacity"
                            label="Dung lượng pin"
                            rules={[{ required: true }]}
                        >
                            <InputNumber style={{ width: "100%" }} placeholder="VD: 100" />
                        </Form.Item>

                        <Form.Item
                            name="currentSoc"
                            label="Lượng pin hiện tại"
                            rules={[{ required: true }]}
                        >
                            <InputNumber style={{ width: "100%" }} placeholder="VD: 100" />
                        </Form.Item>

                        <Form.Item
                            name="connectorType"
                            label="Cổng sạc"
                            rules={[{ required: true }]}
                        >
                            <Input placeholder="VD: CCS2" />
                        </Form.Item>

                        <Form.Item
                            name="manufactureYear"
                            label="Năm sản xuất"
                            rules={[{ required: true }]}
                        >
                            <InputNumber style={{ width: "100%" }} placeholder="VD: 2024" />
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

                        {/* status: Select 4 trạng thái, cho phép đổi */}
                        <Form.Item
                            name="status"
                            label="Trạng thái"
                            rules={[{ required: true }]}
                        >
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
