import React, { useEffect, useMemo, useState } from "react";
import {
    Table, Input, Select, Button, Tag, Space, Pagination, Spin, Empty,
    Modal, Form, InputNumber, notification
} from "antd";
import { PlusOutlined, DownloadOutlined, SearchOutlined, EyeOutlined } from "@ant-design/icons";
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
    const { token, companyId } = getAuthTokenAndCompanyId(authUser);
    // ===== Trạng thái hợp lệ (mirror BE) =====
    const ALLOWED_STATUSES = ["Active", "Inactive", "Blacklisted", "Retired"];

    function normalizeStatusFE(s) {
        const v = String(s || "").trim();
        return ALLOWED_STATUSES.indexOf(v) !== -1 ? v : "Active";
    }

    // ====== STATE CHÍNH ======
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [items, setItems] = useState([]);
    const [kw, setKw] = useState("");
    const [status, setStatus] = useState(""); // "", Active, Inactive, Suspended...

    // ====== STATE + FORM CHO MODAL THÊM XE ======
    const [addOpen, setAddOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm();

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

    useEffect(() => {
        fetchVehicles(page, pageSize);
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

    const columns = [
        {
            title: "ID Xe",
            dataIndex: "vehicleId",
            key: "vehicleId",
            render: (id) => <a>A{id?.toString().padStart(3, "0")}</a>,
            width: 100,
        },
        { title: "Biển số", dataIndex: "licensePlate", key: "licensePlate", width: 130 },
        {
            title: "Chủ xe (customerId)",
            dataIndex: "customerId",
            key: "customerId",
            render: (cid) => <span>Người dùng #{cid}</span>,
            width: 160,
        },
        {
            title: "Model",
            key: "model",
            render: (_, r) => (
                <span>
                    {r?.carMaker} {r?.model}
                </span>
            ),
            width: 180,
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
            width: 130,
            render: (_, r) =>
                r?.maxChargePower ?? r?.chargingPower ?? r?.batteryCapacity ?? "-",
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            width: 130,
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
            title: "Chi tiết",
            key: "actions",
            fixed: "right",
            width: 90,
            render: (_, r) => (
                <Button
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => alert(`Xem xe #${r.vehicleId}`)}
                >
                    Xem
                </Button>
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

                    <Button icon={<DownloadOutlined />} onClick={() => alert("Tải file về…")}>
                        Tải file về
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
        </MainLayout>
    );
}
